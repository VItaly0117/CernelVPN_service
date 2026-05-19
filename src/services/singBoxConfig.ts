import type {
  SplitTunnelMode,
  SplitTunnelRule,
  VpnProfile,
} from '../types/vpn';

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
}: {
  profile: VpnProfile;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  appPackageName: string;
}): SingBoxConfig {
  return {
    log: {
      level: 'info',
      timestamp: true,
    },
    dns: {
      servers: [
        {
          tag: 'cloudflare-doh',
          address: 'https://1.1.1.1/dns-query',
          detour: 'direct',
        },
        {tag: 'cloudflare-tcp', address: 'tcp://1.0.0.1', detour: 'direct'},
      ],
      final: 'cloudflare-doh',
      strategy: 'prefer_ipv4',
    },
    inbounds: [
      buildTunInbound(splitTunnelMode, splitTunnelRules, appPackageName),
    ],
    outbounds: [
      buildProxyOutbound(profile),
      {type: 'dns', tag: 'dns-out'},
      {type: 'direct', tag: 'direct'},
      {type: 'block', tag: 'block'},
    ],
    route: {
      auto_detect_interface: true,
      rules: buildRouteRules(profile),
      final: 'proxy',
    },
  };
}

export function buildSingBoxConfigJson(input: {
  profile: VpnProfile;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  appPackageName: string;
}): string {
  return JSON.stringify(buildSingBoxConfig(input));
}

function buildTunInbound(
  splitTunnelMode: SplitTunnelMode,
  splitTunnelRules: SplitTunnelRule[],
  appPackageName: string,
): SingBoxTunInbound {
  if (splitTunnelMode === 'vpn_all') {
    return {
      type: 'tun',
      tag: 'tun-in',
      address: buildTunAddresses(),
      mtu: 1500,
      auto_route: true,
      strict_route: false,
      stack: 'mixed',
      platform: {
        http_proxy: {
          enabled: false,
        },
      },
    };
  }

  const packageNames = uniqueStrings(
    splitTunnelRules
      .filter(rule => rule.enabled)
      .map(rule => rule.packageName)
      .concat(appPackageName),
  );
  const inbound: SingBoxTunInbound = {
    type: 'tun',
    tag: 'tun-in',
    address: buildTunAddresses(),
    mtu: 1500,
    auto_route: true,
    strict_route: false,
    stack: 'mixed',
    platform: {
      http_proxy: {
        enabled: false,
      },
    },
  };

  if (packageNames.length > 0) {
    if (splitTunnelMode === 'vpn_selected_only') {
      inbound.include_package = packageNames;
    } else {
      inbound.exclude_package = packageNames;
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
  return ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'];
}

function buildRouteRules(profile: VpnProfile): Array<Record<string, unknown>> {
  const rules: Array<Record<string, unknown>> = [
    {
      ip_cidr: '172.19.0.2/32',
      port: 53,
      outbound: 'dns-out',
    },
  ];

  if (needsUdpFallbackBlock(profile)) {
    rules.push({
      network: 'udp',
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
    network: normalizeNetwork(profile.transport),
    packet_encoding: 'xudp',
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
    security: 'auto',
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
    method: profile.method,
    password: profile.password,
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

function normalizeNetwork(transport: string | undefined): string {
  if (!transport || transport === 'tcp') {
    return 'tcp';
  }
  return transport === 'grpc' || transport === 'ws' ? 'tcp' : transport;
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
