/**
 * diagnosticReport.ts — Generate sanitized diagnostic report summaries.
 */
import type {VpnDiagnosticResult} from '../types/vpn';
import {getLogs} from './appLogger';
import {sanitize} from './logSanitizer';

export function generateDiagnosticReport(
  diag: VpnDiagnosticResult,
  options?: {errorsOnly?: boolean},
): string {
  const logs = getLogs();
  const recentErrors = logs.filter(l => l.level === 'error');
  const recentWarnings = logs.filter(l => l.level === 'warn');

  const lines = [
    'KernelVPN Diagnostic Report',
    '===========================',
    `Generated: ${new Date(diag.timestamp).toLocaleString()}`,
    'App: Version 0.4.0',
    `Android: ${diag.androidVersion || 'Unknown'}`,
    `VPN state: Permission: ${diag.vpnPermissionGranted ? 'Granted' : 'Not Granted'} · Service: ${diag.serviceRunning ? 'Running' : 'Stopped'} · Native Core: ${diag.coreRunning ? 'Active' : 'Idle'}`,
    `Core state: ${diag.coreRunning ? 'Running' : 'Not running'}`,
    `Underlying: ${formatUnderlyingNetworkLabel(diag)}`,
    `Active profile: ${diag.activeProfileName ? sanitize(diag.activeProfileName) : 'None'} (${diag.selectedProtocol || 'Unknown'})`,
    `Panel: ${diag.panelConnectionStatus || 'Not configured'}`,
    `Split: Mode: ${diag.splitTunnelMode || 'vpn_all_except_selected'} · Count: ${diag.splitTunnelRuleCount ?? 0}`,
    '',
  ];

  if (diag.lastError) {
    lines.push('Last Error:');
    lines.push(`- Message: ${sanitize(diag.lastError)}`);
    lines.push('');
  }

  if (recentErrors.length > 0) {
    lines.push('Recent Errors:');
    recentErrors.slice(0, 5).forEach(err => {
      lines.push(`- [${err.timestamp}] [${err.source}] ${err.message}`);
    });
    lines.push('');
  }

  if (!options?.errorsOnly && recentWarnings.length > 0) {
    lines.push('Recent Warnings:');
    recentWarnings.slice(0, 5).forEach(wrn => {
      lines.push(`- [${wrn.timestamp}] [${wrn.source}] ${wrn.message}`);
    });
    lines.push('');
  }

  if (!options?.errorsOnly) {
    lines.push('Raw Sanitized Log Tail:');
    logs.slice(0, 20).forEach(log => {
      lines.push(
        `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`,
      );
    });
  } else {
    lines.push('Raw Sanitized Error Tail:');
    recentErrors.slice(0, 20).forEach(log => {
      lines.push(
        `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`,
      );
    });
  }

  return lines.join('\n');
}

function formatUnderlyingNetworkLabel(diag: VpnDiagnosticResult): string {
  const label = [
    `${diag.underlyingNetworkCount ?? 0} network(s)`,
    diag.defaultInterfaceName,
    diag.defaultNetworkTransport,
  ]
    .filter(Boolean)
    .join(' · ');

  if (!diag.underlyingNetworkError) {
    return label;
  }

  return `${label} · error: ${sanitize(diag.underlyingNetworkError)}`;
}
