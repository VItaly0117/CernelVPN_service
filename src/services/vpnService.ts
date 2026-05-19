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

/**
 * Attempt to connect using the given profile.
 * Handles permission request, status updates, and error reporting.
 */
export async function connect(profile: VpnProfile): Promise<void> {
  try {
    const state = vpnStore.getState();
    const enabledSplitRules = state.splitTunnelRules.filter(rule => rule.enabled);
    if (
      state.splitTunnelMode === 'vpn_selected_only' &&
      enabledSplitRules.length === 0
    ) {
      throw new Error(
        'Split tunneling is set to selected apps only. Select at least one app before connecting.',
      );
    }

    vpnStore.setStatus('connecting');
    vpnStore.setLastError(null);

    // 1. Ensure VPN permission
    const hasPermission = await NativeVpn.requestPermission();
    if (!hasPermission) {
      vpnStore.setStatus('permission_required');
      vpnStore.setLastError('VPN permission was denied by the user.');
      return;
    }

    // 2. Start VPN service with profile and routing rules
    const payload = createVpnStartPayload({
      profile,
      splitTunnelMode: state.splitTunnelMode,
      splitTunnelRules: enabledSplitRules,
    });
    await NativeVpn.startVpn(JSON.stringify(payload));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error starting VPN';
    vpnStore.setStatus('error');
    vpnStore.setLastError(message);
    throw error;
  }
}

/**
 * Disconnect the active VPN session.
 */
export async function disconnect(): Promise<void> {
  try {
    vpnStore.setStatus('disconnecting');
    await NativeVpn.stopVpn();
    vpnStore.setStatus('disconnected');
    vpnStore.setLastError(null);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error stopping VPN';
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
  } catch {
    vpnStore.setStatus('error');
    vpnStore.setLastError('Failed to get VPN status from native layer');
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
  } catch {
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
    vpnStore.setStatus(status);
  });

  _unsubError = NativeVpn.onVpnError((error) => {
    vpnStore.setLastError(error.message || 'Unknown native error');
    vpnStore.setStatus('error');
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
}
