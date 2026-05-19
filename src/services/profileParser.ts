/**
 * profileParser.ts — Parse protocol links into VpnProfile objects.
 *
 * Currently supports:
 *   - VLESS links (vless://...)
 *   - VMess links (vmess://...)
 *   - Trojan links (trojan://...)
 *   - Shadowsocks links (ss://...)
 */
import type {VpnProfile, VpnProtocol} from '../types/vpn';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function parseQueryParams(query: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!query) {return result;}
  const pairs = query.split('&');
  for (const pair of pairs) {
    if (!pair) {continue;}
    const [key, ...valueParts] = pair.split('=');
    if (!key) {continue;}
    const value = valueParts.join('=');
    try {
      result[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      // Fallback to raw values if decodeURIComponent fails
      result[key] = value;
    }
  }
  return result;
}

function normalizeBase64(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  return padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
}

function decodeBase64(value: string): string {
  const normalized = normalizeBase64(value);
  const maybeBuffer = (globalThis as unknown as {
    Buffer?: {from(input: string, encoding: 'base64'): {toString(): string}};
  }).Buffer;

  if (maybeBuffer) {
    return maybeBuffer.from(normalized, 'base64').toString();
  }

  const maybeAtob = (globalThis as unknown as {atob?: (input: string) => string})
    .atob;
  if (maybeAtob) {
    return decodeURIComponent(
      maybeAtob(normalized)
        .split('')
        .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  }

  throw new Error('Base64 decoding is not available in this runtime');
}

function splitName(linkWithoutScheme: string): {
  mainPart: string;
  profileName: string;
} {
  const hashIndex = linkWithoutScheme.indexOf('#');
  if (hashIndex === -1) {
    return {mainPart: linkWithoutScheme, profileName: 'Unnamed Profile'};
  }

  return {
    mainPart: linkWithoutScheme.substring(0, hashIndex),
    profileName:
      decodeURIComponent(linkWithoutScheme.substring(hashIndex + 1)) ||
      'Unnamed Profile',
  };
}

function parseHostPort(hostPortStr: string, protocolName: string): {
  host: string;
  port: number;
} {
  const colonIndex = hostPortStr.lastIndexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Invalid ${protocolName} link: missing port`);
  }

  const host = hostPortStr.substring(0, colonIndex);
  const portStr = hostPortStr.substring(colonIndex + 1);
  const port = parseInt(portStr, 10);

  if (!host) {
    throw new Error(`Invalid ${protocolName} link: host is empty`);
  }
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid ${protocolName} link: invalid port "${portStr}"`);
  }

  return {host, port};
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
  const {mainPart, profileName} = splitName(withoutScheme);

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

  const {host, port} = parseHostPort(hostPortStr, 'VLESS');

  // Parse query parameters
  const params = parseQueryParams(queryStr);

  const now = Date.now();

  return {
    id: generateId(),
    name: profileName,
    rawLink: link,
    protocol: 'vless',
    host,
    port,
    uuid,
    transport: params.type || undefined,
    security: params.security || undefined,
    publicKey: params.pbk || undefined,
    sni: params.sni || undefined,
    shortId: params.sid || undefined,
    flow: params.flow || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function parseTrojanLink(link: string): VpnProfile {
  const withoutScheme = link.replace(/^trojan:\/\//, '');
  const {mainPart, profileName} = splitName(withoutScheme);
  const atIndex = mainPart.indexOf('@');
  if (atIndex === -1) {
    throw new Error('Invalid Trojan link: missing @ separator');
  }

  const password = decodeURIComponent(mainPart.substring(0, atIndex));
  if (!password) {
    throw new Error('Invalid Trojan link: password is empty');
  }

  const hostPortAndParams = mainPart.substring(atIndex + 1);
  const questionIndex = hostPortAndParams.indexOf('?');
  const hostPortStr =
    questionIndex >= 0
      ? hostPortAndParams.substring(0, questionIndex)
      : hostPortAndParams;
  const queryStr =
    questionIndex >= 0
      ? hostPortAndParams.substring(questionIndex + 1)
      : '';
  const params = parseQueryParams(queryStr);
  const {host, port} = parseHostPort(hostPortStr, 'Trojan');
  const now = Date.now();

  return {
    id: generateId(),
    name: profileName,
    rawLink: link,
    protocol: 'trojan',
    host,
    port,
    password,
    transport: params.type || undefined,
    security: params.security || (params.allowInsecure ? 'tls' : undefined),
    sni: params.sni || params.peer || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function parseShadowsocksLink(link: string): VpnProfile {
  const withoutScheme = link.replace(/^ss:\/\//, '');
  const {mainPart, profileName} = splitName(withoutScheme);
  const questionIndex = mainPart.indexOf('?');
  const body = questionIndex >= 0 ? mainPart.substring(0, questionIndex) : mainPart;
  const queryStr = questionIndex >= 0 ? mainPart.substring(questionIndex + 1) : '';
  const params = parseQueryParams(queryStr);

  let methodAndPassword = '';
  let hostPortStr = '';
  const atIndex = body.indexOf('@');

  if (atIndex >= 0) {
    methodAndPassword = decodeBase64(body.substring(0, atIndex));
    hostPortStr = body.substring(atIndex + 1);
  } else {
    const decoded = decodeBase64(body);
    const decodedAtIndex = decoded.indexOf('@');
    if (decodedAtIndex === -1) {
      throw new Error('Invalid Shadowsocks link: missing server address');
    }
    methodAndPassword = decoded.substring(0, decodedAtIndex);
    hostPortStr = decoded.substring(decodedAtIndex + 1);
  }

  const separatorIndex = methodAndPassword.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error('Invalid Shadowsocks link: missing method or password');
  }

  const method = methodAndPassword.substring(0, separatorIndex);
  const password = methodAndPassword.substring(separatorIndex + 1);
  if (!method || !password) {
    throw new Error('Invalid Shadowsocks link: method or password is empty');
  }

  const {host, port} = parseHostPort(hostPortStr, 'Shadowsocks');
  const now = Date.now();

  return {
    id: generateId(),
    name: profileName,
    rawLink: link,
    protocol: 'shadowsocks',
    host,
    port,
    method,
    password,
    transport: params.plugin || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function parseVmessLink(link: string): VpnProfile {
  const encoded = link.replace(/^vmess:\/\//, '').trim();
  if (!encoded) {
    throw new Error('Invalid VMess link: payload is empty');
  }

  const decoded = decodeBase64(encoded);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(decoded);
  } catch {
    throw new Error('Invalid VMess link: payload is not valid JSON');
  }

  const host = String(data.add || '');
  const port = Number(data.port);
  const uuid = String(data.id || '');
  if (!uuid) {
    throw new Error('Invalid VMess link: UUID is missing');
  }
  if (!host) {
    throw new Error('Invalid VMess link: host is empty');
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid VMess link: invalid port "${String(data.port)}"`);
  }

  const now = Date.now();
  return {
    id: generateId(),
    name: String(data.ps || 'VMess Profile'),
    rawLink: link,
    protocol: 'vmess',
    host,
    port,
    uuid,
    transport: String(data.net || '') || undefined,
    security: String(data.tls || '') || undefined,
    sni: String(data.sni || data.host || '') || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Protocol detection
// ---------------------------------------------------------------------------

function detectProtocol(link: string): VpnProtocol {
  const lower = link.toLowerCase().trim();
  if (lower.startsWith('vless://')) {return 'vless';}
  if (lower.startsWith('vmess://')) {return 'vmess';}
  if (lower.startsWith('trojan://')) {return 'trojan';}
  if (lower.startsWith('ss://')) {return 'shadowsocks';}
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
        return {success: true, profile: parseVmessLink(trimmed)};

      case 'trojan':
        return {success: true, profile: parseTrojanLink(trimmed)};

      case 'shadowsocks':
        return {success: true, profile: parseShadowsocksLink(trimmed)};

      default:
        return {
          success: false,
          error: 'Unknown protocol. Supported prefixes: vless://, vmess://, trojan://, ss://',
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
