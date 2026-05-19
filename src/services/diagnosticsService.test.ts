import {
  buildDiagnosticsReport,
  formatDiagnostics,
} from './diagnosticsService';
import type {VpnDiagnosticResult} from '../types/vpn';

const diagnostics: VpnDiagnosticResult = {
  vpnPermissionGranted: true,
  serviceRunning: true,
  coreIntegrated: true,
  coreRunning: true,
  activeProfileName: 'Proxy_Reality',
  selectedProtocol: 'vless',
  deviceManufacturer: 'OnePlus',
  deviceModel: 'MT2111',
  androidVersion: 'Android 14 (API 34)',
  wakeLockHeld: true,
  splitTunnelMode: 'vpn_all_except_selected',
  splitTunnelRuleCount: 0,
  panelConnectionStatus: 'Not configured',
  batteryOptimizationWarning:
    'Battery optimization is enabled. This may cause the VPN service to be killed in the background.',
  timestamp: Date.parse('2026-05-19T20:00:00.000Z'),
};

describe('diagnosticsService', () => {
  it('includes device details in formatted diagnostics', () => {
    expect(formatDiagnostics(diagnostics)[0]).toEqual({
      label: 'Device',
      value: 'OnePlus MT2111 · Android 14 (API 34)',
      isWarning: false,
    });
  });

  it('builds a shareable diagnostics report without secrets', () => {
    const report = buildDiagnosticsReport(diagnostics);

    expect(report).toContain('Device: OnePlus MT2111 · Android 14 (API 34)');
    expect(report).toContain('VPN Core: Running');
    expect(report).toContain('Wake Lock: Held');
    expect(report).toContain('On OnePlus, set Battery -> KernelVPN -> Unrestricted.');
    expect(report).not.toContain('uuid');
    expect(report).not.toContain('password');
  });
});
