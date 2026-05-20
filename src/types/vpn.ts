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
  password?: string;
  method?: string;
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
  coreIntegrated: boolean;
  coreRunning: boolean;
  activeProfileName?: string;
  selectedProtocol?: string;
  deviceManufacturer?: string;
  deviceModel?: string;
  androidVersion?: string;
  wakeLockHeld?: boolean;
  splitTunnelMode?: SplitTunnelMode;
  splitTunnelRuleCount?: number;
  lastError?: string;
  lastCoreError?: string;
  lastConnectionError?: string;
  panelConnectionStatus?: string;
  panelXrayStatus?: string;
  panelServerStatus?: string;
  batteryOptimizationWarning?: string;
  timestamp: number; // epoch ms
}

/**
 * Split tunneling mode.
 * - vpn_all: route all apps via VPN.
 * - vpn_all_except_selected: route everything via VPN, except selected apps go direct.
 * - vpn_selected_only: only selected apps go through VPN, rest is direct.
 */
export type SplitTunnelMode =
  | 'vpn_all'
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

export interface VpnStartPayload {
  profile: VpnProfile;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  coreConfigJson: string;
}

export interface PersistedVpnState {
  savedProfiles: VpnProfile[];
  activeProfileId: string | null;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  splitTunnelRulesWifi?: SplitTunnelRule[];
  splitTunnelRulesCellular?: SplitTunnelRule[];
  differentiateNetworkRules?: boolean;
  adBlockEnabled?: boolean;
  bypassDomains?: string[];
  proxyDomains?: string[];
  blockedApps?: string[];
  blockAppsEnabled?: boolean;
  lastRulesUpdate: number | null;
  themeMode: import('../theme/theme').ThemeMode;
  panelSettings: PanelSettings | null;
  persistedErrors?: any[];
}

export interface PanelSettings {
  panelUrl: string;
  username?: string;
  password?: string;
  sessionCookie?: string;
  lastStatusAt?: number | null;
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
