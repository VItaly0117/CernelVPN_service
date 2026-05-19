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
