import {generateDiagnosticReport} from './diagnosticReport';
import {appLogger, clearLogs} from './appLogger';
import type {VpnDiagnosticResult} from '../types/vpn';

describe('diagnosticReport', () => {
  beforeEach(() => {
    clearLogs();
  });

  const baseDiag: VpnDiagnosticResult = {
    vpnPermissionGranted: true,
    serviceRunning: true,
    coreIntegrated: true,
    coreRunning: true,
    activeProfileName: 'vless-confidential-node',
    selectedProtocol: 'vless',
    splitTunnelMode: 'vpn_all_except_selected',
    splitTunnelRuleCount: 5,
    underlyingNetworkCount: 1,
    defaultInterfaceName: 'wlan0',
    defaultNetworkTransport: 'wifi',
    lastError: 'Broken pipe in native tunnel execution',
    timestamp: 1716120000000, // May 19 2026
    androidVersion: 'Android 14 (API 34)',
    panelConnectionStatus: 'Connected',
  };

  it('compiles a beautifully formatted Markdown report', () => {
    // Populate some logs
    appLogger.info('frontend', 'Home screen loaded successfully');
    appLogger.warn('split-tunnel', 'Skipping system package com.android.settings');
    appLogger.error('core', 'sing-box failed to initialize client connection');

    const report = generateDiagnosticReport(baseDiag);

    // Assert headers
    expect(report).toContain('KernelVPN Diagnostic Report');
    expect(report).toContain('===========================');

    // Assert App & Device properties
    expect(report).toContain('Android: Android 14 (API 34)');
    expect(report).toContain('VPN state: Permission: Granted · Service: Running · Native Core: Active');
    expect(report).toContain('Underlying: 1 network(s) · wlan0 · wifi');

    // Assert sensitive fields are sanitized
    // 'vless-confidential-node' has no explicit secrets but we sanitize names to be extra safe
    expect(report).toContain('Active profile: vless-confidential-node (vless)');

    // Assert Last Error is listed
    expect(report).toContain('Last Error:');
    expect(report).toContain('- Message: Broken pipe in native tunnel execution');

    // Assert recent logs sections
    expect(report).toContain('Recent Errors:');
    expect(report).toContain('Recent Warnings:');
    expect(report).toContain('sing-box failed to initialize client connection');
    expect(report).toContain('Skipping system package com.android.settings');

    // Assert raw log tail exists
    expect(report).toContain('Raw Sanitized Log Tail:');
    expect(report).toContain('[INFO] [frontend] Home screen loaded successfully');
  });

  it('supports errors-only mode for focused debugging reports', () => {
    appLogger.info('frontend', 'Ignored log info');
    appLogger.warn('split-tunnel', 'Ignored warning');
    appLogger.error('core', 'Critical singbox crash');

    const report = generateDiagnosticReport(baseDiag, {errorsOnly: true});

    expect(report).toContain('Raw Sanitized Error Tail:');
    expect(report).toContain('Critical singbox crash');
    expect(report).not.toContain('Ignored log info');
    expect(report).not.toContain('Ignored warning');
  });
});
