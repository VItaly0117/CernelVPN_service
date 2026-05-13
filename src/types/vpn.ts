/**
 * VPN connection status enum.
 * Maps directly to statuses emitted from the Kotlin native layer.
 */
export type VpnStatus =
  | 'disconnected'
  | 'permission_required'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

/**
 * Supported VPN/proxy protocols.
 * Start with VLESS; others are placeholders for future work.
 */
export type VpnProtocol =
  | 'vless'
  | 'vmess'
  | 'trojan'
  | 'shadowsocks'
  | 'unknown';

/**
 * A saved VPN profile, parsed from a protocol link.
 */
export interface VpnProfile {
  id: string;
  name: string;
  rawLink: string;
  protocol: VpnProtocol;
  host: string;
  port: number;
  uuid?: string;
  sni?: string;
  publicKey?: string;
  shortId?: string;
  flow?: string;
  /** Transport type: tcp, ws, grpc, etc. */
  transport?: string;
  /** Security layer: reality, tls, none */
  security?: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

/**
 * Diagnostics snapshot returned from the native layer.
 */
export interface VpnDiagnosticResult {
  vpnPermissionGranted: boolean;
  serviceRunning: boolean;
  coreRunning: boolean;
  lastError?: string;
  batteryOptimizationWarning?: string;
  timestamp: number; // epoch ms
}

/**
 * Split tunneling mode.
 * - vpn_all_except_selected: route everything via VPN, except selected apps go direct.
 * - vpn_selected_only: only selected apps go through VPN, rest is direct.
 */
export type SplitTunnelMode =
  | 'vpn_all_except_selected'
  | 'vpn_selected_only';

/**
 * Per-app split tunnel routing decision.
 */
export type SplitTunnelRouting = 'direct' | 'proxy';

/**
 * Rule for a single app in split tunneling.
 */
export interface SplitTunnelRule {
  packageName: string;
  appName: string;
  routing: SplitTunnelRouting;
  enabled: boolean;
}

/**
 * Installed app info returned from the native layer.
 */
export interface InstalledAppInfo {
  packageName: string;
  appName: string;
}

/**
 * Remote rules manifest for configuration updates.
 */
export interface RulesManifest {
  version: number;
  updatedAt: string;
  minAppVersion: string;
  rules: {
    directApps: string[];
    directDomains: string[];
    proxyDomains: string[];
  };
  profiles?: {
    preferred?: string;
    fallback?: string[];
  };
  /** TODO: Ed25519 signature field for integrity verification */
  signature?: string;
}

/**
 * VPN error info emitted from the native layer.
 */
export interface VpnError {
  code: string;
  message: string;
  timestamp: number;
}
