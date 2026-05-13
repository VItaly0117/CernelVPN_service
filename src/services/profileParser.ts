/**
 * profileParser.ts — Parse protocol links into VpnProfile objects.
 *
 * Currently supports:
 *   - VLESS links (vless://...)
 *
 * Future:
 *   - VMess (vmess://...)
 *   - Trojan (trojan://...)
 *   - Shadowsocks (ss://...)
 */
import type {VpnProfile, VpnProtocol} from '../types/vpn';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ---------------------------------------------------------------------------
// VLESS parser
// ---------------------------------------------------------------------------

/**
 * Parse a VLESS link into a VpnProfile.
 *
 * Expected format:
 *   vless://UUID@HOST:PORT?type=tcp&security=reality&pbk=PUBLIC_KEY&sni=DOMAIN&sid=SHORT_ID&flow=xtls-rprx-vision#ProfileName
 */
function parseVlessLink(link: string): VpnProfile {
  // Strip the protocol prefix
  const withoutScheme = link.replace(/^vless:\/\//, '');

  // Separate the hash fragment (profile name)
  const [mainPart, fragment] = withoutScheme.split('#');
  const profileName = fragment
    ? decodeURIComponent(fragment)
    : 'Unnamed Profile';

  // Split user info and host
  const atIndex = mainPart.indexOf('@');
  if (atIndex === -1) {
    throw new Error('Invalid VLESS link: missing @ separator between UUID and host');
  }

  const uuid = mainPart.substring(0, atIndex);
  if (!uuid || uuid.length < 8) {
    throw new Error('Invalid VLESS link: UUID is missing or too short');
  }

  const hostPortAndParams = mainPart.substring(atIndex + 1);

  // Split host:port from query params
  const questionIndex = hostPortAndParams.indexOf('?');
  const hostPortStr =
    questionIndex >= 0
      ? hostPortAndParams.substring(0, questionIndex)
      : hostPortAndParams;
  const queryStr =
    questionIndex >= 0
      ? hostPortAndParams.substring(questionIndex + 1)
      : '';

  // Parse host and port
  const colonIndex = hostPortStr.lastIndexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid VLESS link: missing port');
  }

  const host = hostPortStr.substring(0, colonIndex);
  const portStr = hostPortStr.substring(colonIndex + 1);
  const port = parseInt(portStr, 10);

  if (!host) {
    throw new Error('Invalid VLESS link: host is empty');
  }
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid VLESS link: invalid port "${portStr}"`);
  }

  // Parse query parameters
  const params = new URLSearchParams(queryStr);

  const now = Date.now();

  return {
    id: generateId(),
    name: profileName,
    rawLink: link,
    protocol: 'vless',
    host,
    port,
    uuid,
    transport: params.get('type') || undefined,
    security: params.get('security') || undefined,
    publicKey: params.get('pbk') || undefined,
    sni: params.get('sni') || undefined,
    shortId: params.get('sid') || undefined,
    flow: params.get('flow') || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Protocol detection
// ---------------------------------------------------------------------------

function detectProtocol(link: string): VpnProtocol {
  const lower = link.toLowerCase().trim();
  if (lower.startsWith('vless://')) return 'vless';
  if (lower.startsWith('vmess://')) return 'vmess';
  if (lower.startsWith('trojan://')) return 'trojan';
  if (lower.startsWith('ss://')) return 'shadowsocks';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParseResult {
  success: boolean;
  profile?: VpnProfile;
  error?: string;
}

/**
 * Parse a VPN protocol link into a VpnProfile.
 * Returns a ParseResult with either a profile or an error message.
 */
export function parseProfileLink(link: string): ParseResult {
  if (!link || !link.trim()) {
    return {success: false, error: 'Link is empty'};
  }

  const trimmed = link.trim();
  const protocol = detectProtocol(trimmed);

  try {
    switch (protocol) {
      case 'vless':
        return {success: true, profile: parseVlessLink(trimmed)};

      case 'vmess':
        // TODO: Implement VMess parser
        return {
          success: false,
          error: 'VMess protocol is not yet supported. Coming soon.',
        };

      case 'trojan':
        // TODO: Implement Trojan parser
        return {
          success: false,
          error: 'Trojan protocol is not yet supported. Coming soon.',
        };

      case 'shadowsocks':
        // TODO: Implement Shadowsocks parser
        return {
          success: false,
          error: 'Shadowsocks protocol is not yet supported. Coming soon.',
        };

      default:
        return {
          success: false,
          error: `Unknown protocol. Supported prefixes: vless://, vmess://, trojan://, ss://`,
        };
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown parsing error';
    return {success: false, error: message};
  }
}

/**
 * Validate that a profile has minimum required fields.
 */
export function isProfileValid(profile: VpnProfile): boolean {
  return !!(
    profile.host &&
    profile.port > 0 &&
    profile.port <= 65535 &&
    profile.protocol !== 'unknown'
  );
}
