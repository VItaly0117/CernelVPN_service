/**
 * diagnosticsService.ts — Diagnostics data fetching and display helpers.
 *
 * Wraps NativeVpn.getDiagnostics() with formatting and caching.
 */
import * as NativeVpn from '../native/NativeVpn';
import type {VpnDiagnosticResult} from '../types/vpn';
import {vpnStore} from '../store/vpnStore';
import {
  createXuiPanelClient,
  summarizeServerStatus,
} from './xuiPanelService';

/**
 * Fetch a fresh diagnostics snapshot from the native layer.
 */
export async function fetchDiagnostics(): Promise<VpnDiagnosticResult> {
  const state = vpnStore.getState();
  try {
    const result = await NativeVpn.getDiagnostics();
    return enrichDiagnosticsWithPanel({
      ...result,
      activeProfileName:
        result.activeProfileName ?? state.activeProfile?.name ?? undefined,
      selectedProtocol:
        result.selectedProtocol ?? state.activeProfile?.protocol ?? undefined,
    });
  } catch (error: unknown) {
    // Return a fallback diagnostics object when native layer is unavailable
    return enrichDiagnosticsWithPanel({
      vpnPermissionGranted: false,
      serviceRunning: false,
      coreIntegrated: false,
      coreRunning: false,
      activeProfileName: state.activeProfile?.name,
      selectedProtocol: state.activeProfile?.protocol,
      splitTunnelMode: 'vpn_all_except_selected',
      splitTunnelRuleCount: 0,
      lastError:
        error instanceof Error
          ? error.message
          : 'Failed to fetch diagnostics from native layer',
      batteryOptimizationWarning: undefined,
      timestamp: Date.now(),
    });
  }
}

async function enrichDiagnosticsWithPanel(
  diagnostics: VpnDiagnosticResult,
): Promise<VpnDiagnosticResult> {
  const panelSettings = vpnStore.getState().panelSettings;
  if (!panelSettings) {
    return {
      ...diagnostics,
      panelConnectionStatus: 'Not configured',
    };
  }

  try {
    const client = createXuiPanelClient(panelSettings);
    if (panelSettings.username && panelSettings.password) {
      await client.login();
    }
    const status = await client.getServerStatus();
    const summary = summarizeServerStatus(status);
    return {
      ...diagnostics,
      panelConnectionStatus: 'Connected',
      panelXrayStatus: `${summary.xrayLabel} · ${summary.xrayVersion}`,
      panelServerStatus: `CPU ${summary.cpuLabel} · RAM ${summary.memoryLabel} · ${summary.connectionsLabel}`,
    };
  } catch (error: unknown) {
    return {
      ...diagnostics,
      panelConnectionStatus: `Error: ${
        error instanceof Error ? error.message : 'Panel request failed'
      }`,
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
      label: 'Active Profile',
      value: diag.activeProfileName ?? 'None',
      isWarning: !diag.activeProfileName,
    },
    {
      label: 'Protocol',
      value: diag.selectedProtocol ?? 'Unknown',
      isWarning: !diag.selectedProtocol,
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

  if (diag.lastCoreError && diag.lastCoreError !== diag.lastError) {
    items.push({
      label: 'Last Core Error',
      value: diag.lastCoreError,
      isWarning: true,
    });
  }

  if (
    diag.lastConnectionError &&
    diag.lastConnectionError !== diag.lastError
  ) {
    items.push({
      label: 'Last Connection Error',
      value: diag.lastConnectionError,
      isWarning: true,
    });
  }

  if (diag.panelConnectionStatus) {
    items.push({
      label: '3X-UI Panel',
      value: diag.panelConnectionStatus,
      isWarning: diag.panelConnectionStatus !== 'Connected',
    });
  }

  if (diag.panelXrayStatus) {
    items.push({
      label: 'Panel Xray',
      value: diag.panelXrayStatus,
      isWarning: !diag.panelXrayStatus.toLowerCase().includes('running'),
    });
  }

  if (diag.panelServerStatus) {
    items.push({
      label: 'Panel Server',
      value: diag.panelServerStatus,
      isWarning: false,
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
