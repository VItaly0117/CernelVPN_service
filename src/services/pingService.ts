import TcpSocket from 'react-native-tcp-socket';
import {vpnStore} from '../store/vpnStore';
import type {VpnProfile} from '../types/vpn';
import {appLogger} from './appLogger';

/**
 * Measures the TCP connection latency to a proxy server.
 * This is an accurate representation of the network path to the node.
 */
export async function pingProfile(profile: VpnProfile): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let isFinished = false;

    const timeout = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        try {
          client.destroy();
        } catch (e) {}
        updateProfilePing(profile.id, -1);
        reject(new Error('Ping timeout'));
      }
    }, 3000); // 3 seconds timeout for ping

    const client = TcpSocket.createConnection(
      {
        port: profile.port,
        host: profile.host,
        tls: false,
      },
      () => {
        if (!isFinished) {
          isFinished = true;
          clearTimeout(timeout);
          const latency = Date.now() - start;
          try {
            client.destroy();
          } catch (e) {}
          updateProfilePing(profile.id, latency);
          resolve(latency);
        }
      },
    );

    client.on('error', error => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeout);
        try {
          client.destroy();
        } catch (e) {}
        updateProfilePing(profile.id, -1);
        reject(error);
      }
    });
  });
}

/**
 * Helper to update the ping value in the global store.
 */
function updateProfilePing(profileId: string, latency: number) {
  const state = vpnStore.getState();
  const profile = state.savedProfiles.find(p => p.id === profileId);
  if (profile) {
    const updatedProfile = {...profile, lastPingMs: latency};
    vpnStore.updateProfile(updatedProfile);
  }
}

/**
 * Pings all profiles concurrently.
 */
export async function pingAllProfiles(): Promise<void> {
  const profiles = vpnStore.getState().savedProfiles;
  appLogger.info('ping', `Starting ping test for ${profiles.length} profiles`);
  
  // Ping all in parallel
  await Promise.allSettled(profiles.map(p => pingProfile(p)));
  appLogger.info('ping', 'Ping test completed');
}

/**
 * Finds the profile with the lowest ping and connects to it.
 * Uses existing pings or triggers a new ping test if none are found.
 */
export async function connectToBestProfile(): Promise<VpnProfile | null> {
  const profiles = vpnStore.getState().savedProfiles;
  if (profiles.length === 0) return null;

  // If most profiles don't have a ping, run a test first
  const unpinged = profiles.filter(p => p.lastPingMs === undefined || p.lastPingMs === -1);
  if (unpinged.length > profiles.length / 2) {
    await pingAllProfiles();
  }

  // Get fresh state
  const freshProfiles = vpnStore.getState().savedProfiles;
  
  // Find valid ping > 0, sort ascending
  const sorted = [...freshProfiles]
    .filter(p => p.lastPingMs && p.lastPingMs > 0)
    .sort((a, b) => (a.lastPingMs as number) - (b.lastPingMs as number));

  if (sorted.length > 0) {
    const best = sorted[0];
    appLogger.info('ping', `Best profile selected: ${best.name} (${best.lastPingMs}ms)`);
    return best;
  }
  return null;
}
