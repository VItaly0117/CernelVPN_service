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
      label: 'Device',
      value: formatDeviceLabel(diag),
      isWarning: false,
    },
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
      label: 'Wake Lock',
      value: diag.wakeLockHeld ? 'Held' : 'Not held',
      isWarning: diag.serviceRunning && diag.coreRunning && !diag.wakeLockHeld,
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

export function buildDiagnosticsReport(diag: VpnDiagnosticResult): string {
  const lines = [
    'KernelVPN Diagnostics',
    `Device: ${formatDeviceLabel(diag)}`,
    `VPN Permission: ${diag.vpnPermissionGranted ? 'Granted' : 'Not granted'}`,
    `VPN Service: ${diag.serviceRunning ? 'Running' : 'Stopped'}`,
    `Core Integrated: ${diag.coreIntegrated ? 'Yes' : 'No'}`,
    `VPN Core: ${diag.coreRunning ? 'Running' : 'Not started'}`,
    `Wake Lock: ${diag.wakeLockHeld ? 'Held' : 'Not held'}`,
    `Active Profile: ${diag.activeProfileName ?? 'None'}`,
    `Protocol: ${diag.selectedProtocol ?? 'Unknown'}`,
    `Split Tunnel: ${diag.splitTunnelMode ?? 'unknown'} · ${
      diag.splitTunnelRuleCount ?? 0
    } app rule(s)`,
    `3X-UI Panel: ${diag.panelConnectionStatus ?? 'Unknown'}`,
    `Battery: ${diag.batteryOptimizationWarning ? 'Optimization enabled' : 'OK'}`,
    `Last Error: ${diag.lastError ?? 'None'}`,
    `Last Core Error: ${diag.lastCoreError ?? 'None'}`,
    `Last Connection Error: ${diag.lastConnectionError ?? 'None'}`,
    `Snapshot: ${new Date(diag.timestamp).toISOString()}`,
    '',
    'Quick checks:',
    '- If VPN Core is Running but sites fail, open https://ifconfig.me in Chrome.',
    '- On OnePlus, set Battery -> KernelVPN -> Unrestricted.',
    '- If Chrome fails but Telegram works, close Chrome fully and reopen it to drop cached QUIC/UDP sessions.',
    '- If VPN Permission is not granted or VPN Core is Not started, reconnect inside KernelVPN and grant Android VPN permission.',
  ];

  return lines.join('\n');
}

function formatDeviceLabel(diag: VpnDiagnosticResult): string {
  const device = [diag.deviceManufacturer, diag.deviceModel]
    .filter(Boolean)
    .join(' ');
  const android = diag.androidVersion;

  if (device && android) {
    return `${device} · ${android}`;
  }

  return device || android || 'Unknown';
}
