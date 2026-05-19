/**
 * diagnosticsService.ts — Diagnostics data fetching and display helpers.
 *
 * Wraps NativeVpn.getDiagnostics() with formatting and caching.
 */
import * as NativeVpn from '../native/NativeVpn';
import type {VpnDiagnosticResult} from '../types/vpn';

/**
 * Fetch a fresh diagnostics snapshot from the native layer.
 */
export async function fetchDiagnostics(): Promise<VpnDiagnosticResult> {
  try {
    const result = await NativeVpn.getDiagnostics();
    return result;
  } catch (error: unknown) {
    // Return a fallback diagnostics object when native layer is unavailable
    return {
      vpnPermissionGranted: false,
      serviceRunning: false,
      coreIntegrated: false,
      coreRunning: false,
      splitTunnelMode: 'vpn_all_except_selected',
      splitTunnelRuleCount: 0,
      lastError:
        error instanceof Error
          ? error.message
          : 'Failed to fetch diagnostics from native layer',
      batteryOptimizationWarning: undefined,
      timestamp: Date.now(),
    };
  }
}

/**
 * Format a diagnostic result into human-readable key-value pairs.
 */
export function formatDiagnostics(
  diag: VpnDiagnosticResult,
): Array<{label: string; value: string; isWarning: boolean}> {
  const items = [
    {
      label: 'VPN Permission',
      value: diag.vpnPermissionGranted ? 'Granted' : 'Not granted',
      isWarning: !diag.vpnPermissionGranted,
    },
    {
      label: 'VPN Service',
      value: diag.serviceRunning ? 'Running' : 'Stopped',
      isWarning: false,
    },
    {
      label: 'Core Integrated',
      value: diag.coreIntegrated ? 'Yes' : 'No (Skeleton Mode)',
      isWarning: !diag.coreIntegrated,
    },
    {
      label: 'VPN Core',
      value: diag.coreRunning ? 'Running' : 'Not started',
      isWarning: false,
    },
    {
      label: 'Split Tunnel',
      value: `${diag.splitTunnelMode ?? 'vpn_all_except_selected'} · ${
        diag.splitTunnelRuleCount ?? 0
      } app rule(s)`,
      isWarning: false,
    },
  ];

  if (diag.lastError) {
    items.push({
      label: 'Last Error',
      value: diag.lastError,
      isWarning: true,
    });
  }

  if (diag.batteryOptimizationWarning) {
    items.push({
      label: 'Battery Warning',
      value: diag.batteryOptimizationWarning,
      isWarning: true,
    });
  }

  items.push({
    label: 'Snapshot Time',
    value: new Date(diag.timestamp).toLocaleString(),
    isWarning: false,
  });

  return items;
}
