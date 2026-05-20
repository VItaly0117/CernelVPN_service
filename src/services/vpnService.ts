/**
 * vpnService.ts — High-level VPN service orchestration.
 *
 * Wraps NativeVpn calls with state management and error handling.
 * Components should use this service rather than calling NativeVpn directly.
 */
import * as NativeVpn from '../native/NativeVpn';
import type {VpnStatus, VpnProfile, VpnDiagnosticResult} from '../types/vpn';
import {vpnStore} from '../store/vpnStore';
import {createVpnStartPayload} from './vpnStartPayload';

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

import {appLogger} from './appLogger';

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

let _connectionTimer: ReturnType<typeof setTimeout> | null = null;

function clearConnectionTimer(): void {
  if (_connectionTimer) {
    clearTimeout(_connectionTimer);
    _connectionTimer = null;
  }
}

/**
 * Attempt to connect using the given profile.
 * Handles permission request, status updates, and error reporting.
 */
export async function connect(profile: VpnProfile): Promise<void> {
  clearConnectionTimer();
  try {
    const state = vpnStore.getState();
    let splitRules = state.splitTunnelRules;

    if (state.differentiateNetworkRules) {
      const netType = await NativeVpn.getNetworkType();
      if (netType === 'wifi') {
        splitRules = state.splitTunnelRulesWifi;
      } else if (netType === 'cellular') {
        splitRules = state.splitTunnelRulesCellular;
      }
    }

    const enabledSplitRules = splitRules.filter(rule => rule.enabled);

    appLogger.info('frontend', `Initiating connection to profile: ${profile.name}`, {
      details: {
        protocol: profile.protocol,
        host: profile.host,
        port: profile.port,
        splitTunnelMode: state.splitTunnelMode,
        enabledAppsCount: enabledSplitRules.length,
        differentiateNetworkRules: state.differentiateNetworkRules,
        adBlockEnabled: state.adBlockEnabled,
      },
    });

    if (
      state.splitTunnelMode === 'vpn_selected_only' &&
      enabledSplitRules.length === 0
    ) {
      const errStr = 'Split tunneling is set to selected apps only. Select at least one app before connecting.';
      appLogger.warn('split-tunnel', errStr);
      throw new Error(errStr);
    }

    vpnStore.setStatus('connecting');
    vpnStore.setLastError(null);

    // 1. Ensure VPN permission
    const hasPermission = await NativeVpn.requestPermission();
    if (!hasPermission) {
      const errStr = 'VPN permission was denied by the user.';
      vpnStore.setStatus('permission_required');
      vpnStore.setLastError(errStr);
      appLogger.warn('native-vpn', errStr);
      return;
    }

    // 2. Start VPN service with profile and routing rules
    const payload = createVpnStartPayload({
      profile,
      splitTunnelMode: state.splitTunnelMode,
      splitTunnelRules: enabledSplitRules,
      adBlockEnabled: state.adBlockEnabled,
      bypassDomains: state.bypassDomains,
      proxyDomains: state.proxyDomains,
      blockedApps: state.blockedApps,
      blockAppsEnabled: state.blockAppsEnabled,
    });

    appLogger.info('native-vpn', 'Starting Foreground VPN Service with configuration payload');
    await NativeVpn.startVpn(JSON.stringify(payload));

    // 15-second frontend timeout if native service fails to report connected/error status
    _connectionTimer = setTimeout(async () => {
      const currentStatus = vpnStore.status;
      if (currentStatus === 'connecting') {
        const timeoutMsg = 'Connection timed out: Native layer did not transition to connected status.';
        appLogger.error('native-vpn', timeoutMsg, {code: 'CONN_TIMEOUT'});
        vpnStore.setStatus('error');
        vpnStore.setLastError(timeoutMsg);
        try {
          await NativeVpn.stopVpn();
        } catch (e: unknown) {
          appLogger.debug('native-vpn', 'Failed to stop VPN after timeout', {
            raw: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }, 15000);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error starting VPN';
    appLogger.error('native-vpn', `Failed to start VPN session: ${message}`, {
      raw: error instanceof Error ? error.stack : String(error),
    });
    vpnStore.setStatus('error');
    vpnStore.setLastError(message);
    throw error;
  }
}

/**
 * Disconnect the active VPN session.
 */
export async function disconnect(): Promise<void> {
  clearConnectionTimer();
  try {
    appLogger.info('frontend', 'Requesting active VPN session disconnection');
    vpnStore.setStatus('disconnecting');
    await NativeVpn.stopVpn();
    vpnStore.setStatus('disconnected');
    vpnStore.setLastError(null);
    appLogger.info('native-vpn', 'VPN session successfully disconnected');
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error stopping VPN';
    appLogger.error('native-vpn', `Error occurred during VPN session disconnect: ${message}`);
    vpnStore.setStatus('error');
    vpnStore.setLastError(message);
    throw error;
  }
}

/**
 * Refresh the current status from the native layer.
 */
export async function refreshStatus(): Promise<VpnStatus> {
  try {
    const status = await NativeVpn.getStatus();
    vpnStore.setStatus(status);
    return status;
  } catch (error: unknown) {
    vpnStore.setStatus('error');
    const msg = 'Failed to get VPN status from native layer';
    vpnStore.setLastError(msg);
    appLogger.error('native-vpn', msg, {
      raw: error instanceof Error ? error.message : String(error),
    });
    return 'error';
  }
}

/**
 * Fetch diagnostics from the native layer.
 */
export async function fetchDiagnostics(): Promise<VpnDiagnosticResult | null> {
  try {
    const diag = await NativeVpn.getDiagnostics();
    return diag;
  } catch (error: unknown) {
    appLogger.warn('native-vpn', 'Failed to fetch native diagnostics', {
      raw: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Event listener setup
// ---------------------------------------------------------------------------

let _unsubStatus: (() => void) | null = null;
let _unsubError: (() => void) | null = null;

/**
 * Start listening for native VPN events.
 * Should be called once on app startup.
 */
export function startListening(): void {
  if (_unsubStatus) {
    return; // already listening
  }

  _unsubStatus = NativeVpn.onVpnStatusChanged((status: VpnStatus) => {
    appLogger.info('native-vpn', `VPN status updated from native layer: ${status}`);
    vpnStore.setStatus(status);
    if (status === 'connected' || status === 'disconnected' || status === 'error') {
      clearConnectionTimer();
    }
    if (status === 'connected') {
      vpnStore.setLastError(null);
    }
  });

  _unsubError = NativeVpn.onVpnError((error) => {
    appLogger.error('native-vpn', `VPN native service error: ${error.message || 'Unknown native error'}`, {
      code: error.code,
    });
    vpnStore.setLastError(error.message || 'Unknown native error');
    vpnStore.setStatus('error');
    clearConnectionTimer();
  });
}

/**
 * Stop listening for native VPN events.
 */
export function stopListening(): void {
  _unsubStatus?.();
  _unsubError?.();
  _unsubStatus = null;
  _unsubError = null;
  clearConnectionTimer();
}
