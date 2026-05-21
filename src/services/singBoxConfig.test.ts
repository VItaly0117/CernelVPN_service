import {buildSingBoxConfig} from './singBoxConfig';
import type {VpnProfile, SplitTunnelRule} from '../types/vpn';

const vlessRealityProfile: VpnProfile = {
  id: 'profile-1',
  name: 'Reality Edge',
  rawLink: 'vless://00000000-0000-0000-0000-000000000000@example.com:443',
  protocol: 'vless',
  host: 'example.com',
  port: 443,
  uuid: '00000000-0000-0000-0000-000000000000',
  security: 'reality',
  transport: 'tcp',
  sni: 'www.microsoft.com',
  publicKey: 'PUBLIC_KEY',
  shortId: 'abcd',
  flow: 'xtls-rprx-vision',
  createdAt: 1,
  updatedAt: 1,
};

const rules: SplitTunnelRule[] = [
  {
    packageName: 'com.android.chrome',
    appName: 'Chrome',
    routing: 'proxy',
    enabled: true,
  },
  {
    packageName: 'com.spotify.music',
    appName: 'Spotify',
    routing: 'direct',
    enabled: false,
  },
];

describe('singBoxConfig', () => {
  it('builds a sing-box TUN config for VLESS REALITY profiles', () => {
    const config = buildSingBoxConfig({
      profile: vlessRealityProfile,
      splitTunnelMode: 'vpn_all_except_selected',
      splitTunnelRules: [],
      appPackageName: 'com.kernelvpn',
    });

    expect(config.inbounds[0]).toMatchObject({
      type: 'tun',
      tag: 'tun-in',
      auto_route: true,
      address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
      mtu: 1500,
      stack: 'mixed',
    });
    expect(config.outbounds[0]).toMatchObject({
      type: 'vless',
      tag: 'proxy',
      server: 'example.com',
      server_port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      flow: 'xtls-rprx-vision',
      network: 'tcp',
      tls: {
        enabled: true,
        server_name: 'www.microsoft.com',
        reality: {
          enabled: true,
          public_key: 'PUBLIC_KEY',
          short_id: 'abcd',
        },
        utls: {
          enabled: true,
          fingerprint: 'chrome',
        },
      },
    });
    expect(config.route.final).toBe('proxy');
  });

  it('routes TUN DNS queries through the internal DNS outbound', () => {
    const config = buildSingBoxConfig({
      profile: vlessRealityProfile,
      splitTunnelMode: 'vpn_all',
      splitTunnelRules: [],
      appPackageName: 'com.kernelvpn',
    });

    expect(config.dns.strategy).toBe('prefer_ipv4');
    expect(config.dns.servers).toEqual([
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
    ]);
    expect(config.outbounds).toContainEqual({type: 'dns', tag: 'dns-out'});
    expect(config.route.rules[0]).toEqual({
      protocol: 'dns',
      outbound: 'dns-out',
    });
    expect(config.route.rules).toContainEqual({
      ip_cidr: '172.19.0.2/32',
      port: 53,
      outbound: 'dns-out',
    });
  });

  it('blocks QUIC UDP/443 for VLESS Reality Vision so browsers fall back to TCP', () => {
    const config = buildSingBoxConfig({
      profile: vlessRealityProfile,
      splitTunnelMode: 'vpn_all',
      splitTunnelRules: [],
      appPackageName: 'com.kernelvpn',
    });

    expect(config.route.rules).toContainEqual({
      network: 'udp',
      port: 443,
      outbound: 'block',
    });
    expect(config.route.rules).not.toContainEqual({
      network: 'udp',
      outbound: 'block',
    });
  });

  it('applies split tunneling package rules in selected-only mode', () => {
    const config = buildSingBoxConfig({
      profile: vlessRealityProfile,
      splitTunnelMode: 'vpn_selected_only',
      splitTunnelRules: rules,
      appPackageName: 'com.kernelvpn',
    });

    expect(config.inbounds[0].include_package).toEqual([
      'com.android.chrome',
      'com.kernelvpn',
    ]);
    expect(config.inbounds[0].exclude_package).toBeUndefined();
  });

  it('routes all apps without package filters in all-apps mode', () => {
    const config = buildSingBoxConfig({
      profile: vlessRealityProfile,
      splitTunnelMode: 'vpn_all',
      splitTunnelRules: rules,
      appPackageName: 'com.kernelvpn',
    });

    expect(config.inbounds[0].include_package).toBeUndefined();
    expect(config.inbounds[0].exclude_package).toBeUndefined();
  });

  it('applies split tunneling package rules in all-except-selected mode', () => {
    const config = buildSingBoxConfig({
      profile: vlessRealityProfile,
      splitTunnelMode: 'vpn_all_except_selected',
      splitTunnelRules: rules,
      appPackageName: 'com.kernelvpn',
    });

    expect(config.inbounds[0].exclude_package).toEqual([
      'com.android.chrome',
      'com.kernelvpn',
    ]);
    expect(config.inbounds[0].include_package).toBeUndefined();
  });
});
