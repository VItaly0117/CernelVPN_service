import type {
  SplitTunnelMode,
  SplitTunnelRule,
  VpnProfile,
} from '../types/vpn';
import {appLogger} from './appLogger';

// Pre-defined list of Russian apps that should bypass the VPN
const RU_BYPASS_PACKAGES = [
  'ru.sberbankmobile', // Sberbank
  'com.idamob.tinkoff.android', // Tinkoff
  'ru.vtb.invest', // VTB Invest
  'ru.vtb.msa', // VTB
  'ru.yandex.searchplugin', // Yandex
  'ru.yandex.maps', // Yandex Maps
  'ru.yandex.taxi', // Yandex Go
  'ru.yandex.market', // Yandex Market
  'ru.mail.mailapp', // Mail.ru
  'ru.vk.store', // RuStore
  'com.vkontakte.android', // VK
  'ru.gosuslugi.app', // Gosuslugi
  'ru.fns.app', // Nalogi (FNS)
  'ru.ozon.app.android', // Ozon
  'com.wildberries.ru', // Wildberries
  'ru.avito.android', // Avito
  'ru.wb.app', // WB (new)
];

export interface SingBoxConfig {
  log: {
    level: string;
    timestamp: boolean;
  };
  dns: {
    servers: Array<{tag: string; address: string; detour: string}>;
    final: string;
    strategy: 'prefer_ipv4';
  };
  inbounds: SingBoxTunInbound[];
  outbounds: Array<Record<string, unknown>>;
  route: {
    auto_detect_interface: boolean;
    rules: Array<Record<string, unknown>>;
    final: string;
  };
}

export interface SingBoxTunInbound {
  type: 'tun';
  tag: string;
  address: string[];
  mtu: number;
  auto_route: boolean;
  strict_route: boolean;
  stack: 'mixed';
  platform: {
    http_proxy: {
      enabled: boolean;
    };
  };
  include_package?: string[];
  exclude_package?: string[];
}

export function buildSingBoxConfig({
  profile,
  splitTunnelMode,
  splitTunnelRules,
  appPackageName,
  adBlockEnabled = false,
  bypassDomains = [],
  proxyDomains = [],
  blockedApps = [],
  blockAppsEnabled = false,
  bypassLan = false,
}: {
  profile: VpnProfile;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  appPackageName: string;
  adBlockEnabled?: boolean;
  bypassDomains?: string[];
  proxyDomains?: string[];
  blockedApps?: string[];
  blockAppsEnabled?: boolean;
  bypassLan?: boolean;
}): SingBoxConfig {
  return {
    log: {
      level: 'info',
      timestamp: true,
    },
    dns: {
      servers: adBlockEnabled
        ? [
            {
              tag: 'adguard-doh',
              address: 'https://94.140.14.14/dns-query',
              detour: 'proxy',
            },
            {
              tag: 'bootstrap-dns',
              address: '8.8.8.8',
              detour: 'direct',
            },
          ]
        : [
            {
              tag: 'google-doh',
              address: 'https://8.8.8.8/dns-query',
              detour: 'proxy',
            },
            {
              tag: 'cloudflare-doh',
              address: 'https://1.1.1.1/dns-query',
              detour: 'proxy',
            },
            {
              tag: 'bootstrap-dns',
              address: '8.8.8.8',
              detour: 'direct',
            },
          ],
      final: adBlockEnabled ? 'adguard-doh' : 'google-doh',
      strategy: 'prefer_ipv4',
    },
    inbounds: [
      buildTunInbound(
        splitTunnelMode,
        splitTunnelRules,
        appPackageName,
        blockedApps,
        blockAppsEnabled,
      ),
    ],
    outbounds: [
      buildProxyOutbound(profile),
      {type: 'dns', tag: 'dns-out'},
      {type: 'direct', tag: 'direct'},
      {type: 'block', tag: 'block'},
    ],
    route: {
      auto_detect_interface: true,
      rules: buildRouteRules(
        profile,
        bypassDomains,
        proxyDomains,
        blockedApps,
        blockAppsEnabled,
        bypassLan,
      ),
      final: 'proxy',
    },
  };
}

export function buildSingBoxConfigJson(input: {
  profile: VpnProfile;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  appPackageName: string;
  adBlockEnabled?: boolean;
  bypassDomains?: string[];
  proxyDomains?: string[];
  blockedApps?: string[];
  blockAppsEnabled?: boolean;
  bypassLan?: boolean;
}): string {
  return JSON.stringify(buildSingBoxConfig(input));
}

function buildTunInbound(
  splitTunnelMode: SplitTunnelMode,
  splitTunnelRules: SplitTunnelRule[],
  appPackageName: string,
  blockedApps: string[] = [],
  blockAppsEnabled = false,
): SingBoxTunInbound {
  if (splitTunnelMode === 'vpn_all') {
    return {
      type: 'tun',
      tag: 'tun-in',
      address: buildTunAddresses(),
      mtu: 9000,
      auto_route: true,
      strict_route: true,
      stack: 'mixed',
      platform: {
        http_proxy: {
          enabled: false,
        },
      },
    };
  }

  const inbound: SingBoxTunInbound = {
    type: 'tun',
    tag: 'tun-in',
    address: buildTunAddresses(),
    mtu: 1400,
    auto_route: true,
    strict_route: false,
    stack: 'mixed',
    platform: {
      http_proxy: {
        enabled: false,
      },
    },
  };

  if (splitTunnelMode === 'vpn_selected_only') {
    const includePackages = uniqueStrings(
      splitTunnelRules
        .filter(rule => rule.enabled)
        .map(rule => rule.packageName)
        .concat(blockAppsEnabled ? blockedApps : []),
    );
    if (includePackages.length > 0) {
      inbound.include_package = includePackages;
    }
  } else {
    // vpn_all_except_selected
    const excludePackages = uniqueStrings(
      splitTunnelRules
        .filter(rule => rule.enabled)
        .map(rule => rule.packageName),
    ).filter(pkg => {
      // Don't exclude the app if we want to block it
      return !(blockAppsEnabled && blockedApps.includes(pkg));
    });
    if (excludePackages.length > 0) {
      inbound.exclude_package = excludePackages;
    }
  }

  return inbound;
}

function buildProxyOutbound(profile: VpnProfile): Record<string, unknown> {
  switch (profile.protocol) {
    case 'vless':
      return buildVlessOutbound(profile);
    case 'vmess':
      return buildVmessOutbound(profile);
    case 'trojan':
      return buildTrojanOutbound(profile);
    case 'shadowsocks':
      return buildShadowsocksOutbound(profile);
    default:
      throw new Error(`Unsupported protocol: ${profile.protocol}`);
  }
}

function buildTunAddresses(): string[] {
  return ['172.19.0.1/30'];
}

function buildRouteRules(
  profile: VpnProfile,
  bypassDomains: string[] = [],
  proxyDomains: string[] = [],
  blockedApps: string[] = [],
  blockAppsEnabled = false,
  bypassLan = false,
): Array<Record<string, unknown>> {
  const rules: Array<Record<string, unknown>> = [
    {
      protocol: 'dns',
      outbound: 'dns-out',
    },
    {
      ip_cidr: '172.19.0.2/32',
      port: 53,
      outbound: 'dns-out',
    },
    {
      port: 53,
      outbound: 'dns-out',
    },
  ];

  if (blockAppsEnabled && blockedApps.length > 0) {
    rules.push({
      package_name: blockedApps,
      outbound: 'block',
    });
  }

  // Built-in routing for Russian apps to bypass the VPN proxy directly via sing-box
  if (RU_BYPASS_PACKAGES.length > 0) {
    rules.push({
      package_name: RU_BYPASS_PACKAGES,
      outbound: 'direct',
    });
  }

  if (bypassDomains.length > 0) {
    rules.push({
      domain: bypassDomains,
      outbound: 'direct',
    });
  }

  if (bypassLan) {
    rules.push({
      ip_cidr: [
        '192.168.0.0/16',
        '10.0.0.0/8',
        '172.16.0.0/12',
        'fc00::/7',
        'fe80::/10'
      ],
      outbound: 'direct',
    });
  }

  if (proxyDomains.length > 0) {
    rules.push({
      domain: proxyDomains,
      outbound: 'proxy',
    });
  }

  if (needsUdpFallbackBlock(profile)) {
    rules.push({
      network: 'udp',
      port: 443,
      outbound: 'block',
    });
  }

  return rules;
}

function needsUdpFallbackBlock(profile: VpnProfile): boolean {
  return profile.protocol === 'vless' && Boolean(profile.flow);
}

function buildVlessOutbound(profile: VpnProfile): Record<string, unknown> {
  if (!profile.uuid) {
    throw new Error('VLESS profile is missing UUID');
  }
  return removeEmptyValues({
    type: 'vless',
    tag: 'proxy',
    server: profile.host,
    server_port: profile.port,
    uuid: profile.uuid,
    flow: profile.flow,
    packet_encoding: 'xudp',
    tcp_fast_open: true,
    tls: buildTlsConfig(profile),
    transport: buildTransportConfig(profile),
  });
}

function buildVmessOutbound(profile: VpnProfile): Record<string, unknown> {
  if (!profile.uuid) {
    throw new Error('VMess profile is missing UUID');
  }
  return removeEmptyValues({
    type: 'vmess',
    tag: 'proxy',
    server: profile.host,
    server_port: profile.port,
    uuid: profile.uuid,
    security: profile.security || 'auto',
    packet_encoding: 'xudp',
    tcp_fast_open: true,
    tls: buildTlsConfig(profile),
    transport: buildTransportConfig(profile),
  });
}

function buildTrojanOutbound(profile: VpnProfile): Record<string, unknown> {
  if (!profile.password) {
    throw new Error('Trojan profile is missing password');
  }
  return removeEmptyValues({
    type: 'trojan',
    tag: 'proxy',
    server: profile.host,
    server_port: profile.port,
    password: profile.password,
    tcp_fast_open: true,
    tls: buildTlsConfig(profile, true),
    transport: buildTransportConfig(profile),
  });
}

function buildShadowsocksOutbound(profile: VpnProfile): Record<string, unknown> {
  if (!profile.method || !profile.password) {
    throw new Error('Shadowsocks profile is missing method or password');
  }
  return {
    type: 'shadowsocks',
    tag: 'proxy',
    server: profile.host,
    server_port: profile.port,
    method: profile.method || 'aes-256-gcm',
    password: profile.password,
    tcp_fast_open: true,
  };
}

function buildTlsConfig(
  profile: VpnProfile,
  defaultEnabled = false,
): Record<string, unknown> | undefined {
  const isReality = profile.security === 'reality';
  const enabled =
    defaultEnabled ||
    isReality ||
    profile.security === 'tls' ||
    Boolean(profile.sni || profile.publicKey);

  if (!enabled) {
    return undefined;
  }

  return removeEmptyValues({
    enabled: true,
    server_name: profile.sni,
    reality: isReality
      ? removeEmptyValues({
          enabled: true,
          public_key: profile.publicKey,
          short_id: profile.shortId,
        })
      : undefined,
    utls: {
      enabled: true,
      fingerprint: 'chrome',
    },
  });
}

function buildTransportConfig(
  profile: VpnProfile,
): Record<string, unknown> | undefined {
  switch (profile.transport) {
    case 'ws':
      return {type: 'ws'};
    case 'grpc':
      return {type: 'grpc'};
    case 'tcp':
    case undefined:
      return undefined;
    default:
      return {type: profile.transport};
  }
}

function removeEmptyValues<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null || value === '') {
        return false;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object') {
        return Object.keys(value).length > 0;
      }
      return true;
    }),
  ) as T;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
