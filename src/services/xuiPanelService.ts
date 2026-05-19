import type {PanelSettings, VpnProfile} from '../types/vpn';
import {parseProfileLink} from './profileParser';

export interface NormalizedPanelSettings extends PanelSettings {
  origin: string;
  hostname: string;
  webBasePath: string;
}

export interface XuiMessage<T> {
  success: boolean;
  msg?: string;
  obj?: T;
}

export interface PanelBytePair {
  current: number;
  total: number;
}

export interface PanelServerStatus {
  cpu?: number;
  cpuCores?: number;
  logicalPro?: number;
  cpuSpeedMhz?: number;
  mem?: PanelBytePair;
  disk?: PanelBytePair;
  swap?: PanelBytePair;
  xray?: {
    state?: string;
    version?: string;
    errorMsg?: string;
  };
  netIO?: {
    up?: number;
    down?: number;
  };
  netTraffic?: {
    sent?: number;
    recv?: number;
  };
  loads?: number[];
  publicIP?: {
    ipv4?: string;
    ipv6?: string;
  };
  uptime?: number;
  appUptime?: number;
  appStats?: {
    threads?: number;
    mem?: number;
    uptime?: number;
  };
  tcpCount?: number;
  udpCount?: number;
}

export interface PanelInbound {
  id?: number;
  remark?: string;
  enable?: boolean;
  port?: number;
  protocol?: string;
  settings?: string | Record<string, unknown>;
  streamSettings?: string | Record<string, unknown>;
}

export interface PanelStatusSummary {
  xrayLabel: string;
  xrayVersion: string;
  cpuLabel: string;
  memoryLabel: string;
  diskLabel: string;
  netIoLabel: string;
  totalTrafficLabel: string;
  connectionsLabel: string;
  uptimeLabel: string;
}

interface PanelFetchResponse {
  ok: boolean;
  status: number;
  headers?: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
}

export type PanelFetch = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<PanelFetchResponse>;

const DEFAULT_TIMEOUT_MS = 12_000;

export function normalizePanelSettings(
  settings: PanelSettings,
): NormalizedPanelSettings {
  const rawUrl = settings.panelUrl.trim();
  if (!rawUrl) {
    throw new Error('Panel URL is empty');
  }

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl)
    ? rawUrl
    : `http://${rawUrl}`;
  const url = new URL(withScheme);
  const path = ensureTrailingSlash(url.pathname || '/');
  const panelIndex = path.indexOf('/panel');
  const loginIndex = path.indexOf('/login');
  const endpointIndex =
    panelIndex >= 0 ? panelIndex : loginIndex >= 0 ? loginIndex : -1;
  const webBasePath =
    endpointIndex >= 0
      ? ensureTrailingSlash(path.substring(0, endpointIndex + 1))
      : path;

  return {
    ...settings,
    panelUrl: rawUrl,
    origin: url.origin,
    hostname: url.hostname,
    webBasePath: webBasePath || '/',
  };
}

export function buildPanelApiUrl(
  settings: PanelSettings | NormalizedPanelSettings,
  endpoint: string,
): string {
  const normalized =
    'origin' in settings ? settings : normalizePanelSettings(settings);
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  return `${normalized.origin}${normalized.webBasePath}${cleanEndpoint}`;
}

export function createXuiPanelClient(
  settings: PanelSettings,
  fetchImpl: PanelFetch = globalThis.fetch as unknown as PanelFetch,
) {
  const normalized = normalizePanelSettings(settings);
  let sessionCookie = normalizeCookie(settings.sessionCookie);

  async function request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (sessionCookie) {
      headers.Cookie = sessionCookie;
    }
    const init: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {method, headers};
    if (method === 'POST') {
      headers['Content-Type'] =
        'application/x-www-form-urlencoded; charset=UTF-8';
      init.body = encodeFormBody(body ?? {});
    }

    const response = await withTimeout(
      fetchImpl(buildPanelApiUrl(normalized, endpoint), init),
      DEFAULT_TIMEOUT_MS,
    );
    return parseXuiResponse<T>(response);
  }

  return {
    settings: normalized,

    getSessionCookie(): string | undefined {
      return sessionCookie;
    },

    async login(): Promise<string | undefined> {
      if (!normalized.username || !normalized.password) {
        return sessionCookie;
      }
      const response = await withTimeout(
        fetchImpl(buildPanelApiUrl(normalized, '/login'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: encodeFormBody({
            username: normalized.username,
            password: normalized.password,
          }),
        }),
        DEFAULT_TIMEOUT_MS,
      );
      await parseXuiResponse<null>(response);
      sessionCookie =
        extractSessionCookie(response.headers?.get('set-cookie')) ??
        sessionCookie;
      return sessionCookie;
    },

    getServerStatus(): Promise<PanelServerStatus> {
      return request<PanelServerStatus>('GET', '/panel/api/server/status');
    },

    getInbounds(): Promise<PanelInbound[]> {
      return request<PanelInbound[]>('GET', '/panel/api/inbounds/list');
    },

    getConfigJson(): Promise<Record<string, unknown>> {
      return request<Record<string, unknown>>(
        'GET',
        '/panel/api/server/getConfigJson',
      );
    },

    stopXrayService(): Promise<null> {
      return request<null>('POST', '/panel/api/server/stopXrayService');
    },

    restartXrayService(): Promise<null> {
      return request<null>('POST', '/panel/api/server/restartXrayService');
    },
  };
}

export function summarizeServerStatus(
  status: PanelServerStatus,
): PanelStatusSummary {
  return {
    xrayLabel: formatXrayState(status.xray?.state),
    xrayVersion: status.xray?.version || 'Unknown',
    cpuLabel: `${formatNumber(status.cpu ?? 0)}%`,
    memoryLabel: formatBytePair(status.mem, 1024),
    diskLabel: formatBytePair(status.disk, 1024),
    netIoLabel: `${formatBytes(status.netIO?.up ?? 0)}/s up · ${formatBytes(
      status.netIO?.down ?? 0,
    )}/s down`,
    totalTrafficLabel: `${formatBytes(
      status.netTraffic?.sent ?? 0,
    )} sent · ${formatBytes(status.netTraffic?.recv ?? 0)} recv`,
    connectionsLabel: `TCP ${status.tcpCount ?? 0} · UDP ${status.udpCount ?? 0}`,
    uptimeLabel: `Xray ${formatDuration(
      status.appUptime ?? 0,
    )} · OS ${formatDuration(status.uptime ?? 0)}`,
  };
}

export function extractVlessProfilesFromInbounds(
  inbounds: PanelInbound[],
  serverHost: string,
): VpnProfile[] {
  const profiles: VpnProfile[] = [];

  for (const inbound of inbounds) {
    if (inbound.protocol !== 'vless' || inbound.enable === false) {
      continue;
    }

    const port = Number(inbound.port);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      continue;
    }

    const settings = parseMaybeJson(inbound.settings);
    const streamSettings = parseMaybeJson(inbound.streamSettings);
    const clients = Array.isArray(settings?.clients)
      ? settings.clients
      : [];
    const network = readString(streamSettings?.network) || 'tcp';
    const security = readString(streamSettings?.security) || undefined;
    const reality = parseMaybeJson(streamSettings?.realitySettings);
    const realitySettings = parseMaybeJson(reality?.settings);
    const publicKey =
      readString(realitySettings?.publicKey) || readString(reality?.publicKey);
    const sni =
      firstString(reality?.serverNames) ||
      readString(reality?.serverName) ||
      readString(realitySettings?.serverName);
    const shortId =
      firstString(reality?.shortIds) || readString(reality?.shortId);
    const fingerprint = readString(realitySettings?.fingerprint);

    for (const client of clients) {
      const clientRecord = parseMaybeJson(client);
      if (clientRecord?.enable === false) {
        continue;
      }
      const uuid = readString(clientRecord?.id);
      if (!uuid) {
        continue;
      }
      const name =
        readString(clientRecord?.email) ||
        readString(inbound.remark) ||
        '3X-UI VLESS';
      const query: Record<string, string> = {
        type: network,
      };
      if (security) {
        query.security = security;
      }
      if (publicKey) {
        query.pbk = publicKey;
      }
      if (sni) {
        query.sni = sni;
      }
      if (shortId) {
        query.sid = shortId;
      }
      if (fingerprint) {
        query.fp = fingerprint;
      }
      const flow = readString(clientRecord?.flow);
      if (flow) {
        query.flow = flow;
      }

      const rawLink = `vless://${encodeURIComponent(uuid)}@${serverHost}:${port}?${encodeQuery(
        query,
      )}#${encodeURIComponent(name)}`;
      const parsed = parseProfileLink(rawLink);
      if (parsed.success && parsed.profile) {
        profiles.push(parsed.profile);
      }
    }
  }

  return profiles;
}

export function formatBytes(bytes: number, base: 1000 | 1024 = 1000): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= base && unitIndex < units.length - 1) {
    value /= base;
    unitIndex += 1;
  }
  if (unitIndex === 0) {
    return `${Math.round(value)} ${units[unitIndex]}`;
  }
  return `${formatNumber(value)} ${units[unitIndex]}`;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function encodeFormBody(
  body: Record<string, string | number | boolean | undefined>,
): string {
  return Object.entries(body)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
}

function encodeQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&');
}

async function parseXuiResponse<T>(
  response: PanelFetchResponse,
): Promise<T> {
  if (!response.ok) {
    throw new Error(`3X-UI request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as XuiMessage<T> | T;
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload
  ) {
    const message = payload as XuiMessage<T>;
    if (!message.success) {
      throw new Error(message.msg || '3X-UI request failed');
    }
    return message.obj as T;
  }

  return payload as T;
}

function extractSessionCookie(
  setCookie: string | null | undefined,
): string | undefined {
  if (!setCookie) {
    return undefined;
  }
  const sessionMatch = setCookie.match(/(?:^|,\s*)(session=[^;,\s]+)/i);
  if (sessionMatch?.[1]) {
    return sessionMatch[1];
  }
  return normalizeCookie(setCookie);
}

function normalizeCookie(cookie: string | null | undefined): string | undefined {
  const trimmed = cookie?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.split(';')[0];
}

function parseMaybeJson(value: unknown): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function firstString(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.find(item => typeof item === 'string' && item.trim());
}

function formatBytePair(
  pair: PanelBytePair | undefined,
  base: 1000 | 1024,
): string {
  if (!pair) {
    return '0 B / 0 B';
  }
  return `${formatBytes(pair.current, base)} / ${formatBytes(pair.total, base)}`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function formatXrayState(state: string | undefined): string {
  switch (state) {
    case 'running':
      return 'Running';
    case 'stop':
      return 'Stopped';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0m';
  }
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('3X-UI request timed out')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
