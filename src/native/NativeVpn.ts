/**
 * NativeVpn — TypeScript bridge to the Android Kotlin VpnBridgeModule.
 *
 * Wraps NativeModules.VpnBridgeModule and provides typed async methods
 * plus event subscription helpers.
 */
import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import type {
  VpnStatus,
  VpnDiagnosticResult,
  InstalledAppInfo,
} from '../types/vpn';
import type {NativeTrafficStatsSnapshot} from '../services/trafficStatsService';

// ---------------------------------------------------------------------------
// Module reference
// ---------------------------------------------------------------------------

const {VpnBridgeModule} = NativeModules;

if (Platform.OS === 'android' && !VpnBridgeModule) {
  console.error(
    '[NativeVpn] VpnBridgeModule is not available. ' +
      'Did you rebuild the native project after adding the module?',
  );
}

// ---------------------------------------------------------------------------
// Event emitter
// ---------------------------------------------------------------------------

const vpnEmitter =
  Platform.OS === 'android' && VpnBridgeModule
    ? new NativeEventEmitter(VpnBridgeModule)
    : null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Request VPN permission from the system.
 * Returns true if permission was already granted or user accepted the dialog.
 */
export async function requestPermission(): Promise<boolean> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.requestPermission();
}

/**
 * Start VPN with the given profile JSON.
 * The native side will start a foreground VpnService.
 */
export async function startVpn(profileJson: string): Promise<void> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.startVpn(profileJson);
}

export async function savePersistedState(stateJson: string): Promise<void> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.savePersistedState(stateJson);
}

export async function loadPersistedState(): Promise<string | null> {
  if (!VpnBridgeModule) {
    return null;
  }
  return VpnBridgeModule.loadPersistedState();
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.openBatteryOptimizationSettings();
}

/**
 * Stop the running VPN service.
 */
export async function stopVpn(): Promise<void> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.stopVpn();
}

/**
 * Get the current VPN connection status.
 */
export async function getStatus(): Promise<VpnStatus> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.getStatus();
}

/**
 * Get a diagnostics snapshot from the native layer.
 */
export async function getDiagnostics(): Promise<VpnDiagnosticResult> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.getDiagnostics();
}

/**
 * Get list of user-installed (launchable) apps on the device.
 */
export async function getInstalledApps(): Promise<InstalledAppInfo[]> {
  if (!VpnBridgeModule) {
    throw new Error('VpnBridgeModule is not available');
  }
  return VpnBridgeModule.getInstalledApps();
}

/**
 * Get the current active network type: 'wifi', 'cellular', 'other', or 'none'.
 */
export async function getNetworkType(): Promise<'wifi' | 'cellular' | 'other' | 'none'> {
  if (!VpnBridgeModule) {
    return 'none';
  }
  return VpnBridgeModule.getNetworkType();
}

/**
 * Get device-level Android TrafficStats counters since boot.
 * JS computes deltas to render real-time dashboard speeds.
 */
export async function getTrafficStats(): Promise<NativeTrafficStatsSnapshot> {
  if (!VpnBridgeModule) {
    return {rxBytes: 0, txBytes: 0, timestampMs: Date.now()};
  }
  return VpnBridgeModule.getTrafficStats();
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

export type VpnStatusListener = (status: VpnStatus) => void;
export type VpnErrorListener = (error: {code: string; message: string}) => void;

/**
 * Subscribe to VPN status changes from the native layer.
 * Returns an unsubscribe function.
 */
export function onVpnStatusChanged(listener: VpnStatusListener): () => void {
  if (!vpnEmitter) {
    console.warn('[NativeVpn] Event emitter not available');
    return () => {};
  }
  const subscription = vpnEmitter.addListener('VpnStatusChanged', listener);
  return () => subscription.remove();
}

/**
 * Subscribe to VPN errors from the native layer.
 * Returns an unsubscribe function.
 */
export function onVpnError(listener: VpnErrorListener): () => void {
  if (!vpnEmitter) {
    console.warn('[NativeVpn] Event emitter not available');
    return () => {};
  }
  const subscription = vpnEmitter.addListener('VpnError', listener);
  return () => subscription.remove();
}

export type NetworkTypeListener = (networkType: 'wifi' | 'cellular' | 'other' | 'none') => void;

/**
 * Subscribe to active network type switches from the native layer.
 * Returns an unsubscribe function.
 */
export function onNetworkTypeChanged(listener: NetworkTypeListener): () => void {
  if (!vpnEmitter) {
    console.warn('[NativeVpn] Event emitter not available');
    return () => {};
  }
  const subscription = vpnEmitter.addListener('NetworkTypeChanged', listener);
  return () => subscription.remove();
}
