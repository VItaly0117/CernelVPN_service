import {createVpnStartPayload} from './vpnStartPayload';

describe('vpnStartPayload', () => {
  it('includes profile, mode, and only enabled split tunnel rules', () => {
    const payload = createVpnStartPayload({
      profile: {
        id: 'profile-1',
        name: 'Edge',
        rawLink: 'vless://uuid@example.com:443',
        protocol: 'vless',
        host: 'example.com',
        port: 443,
        uuid: 'uuid',
        createdAt: 1,
        updatedAt: 1,
      },
      splitTunnelMode: 'vpn_selected_only',
      splitTunnelRules: [
        {
          packageName: 'com.youtube',
          appName: 'YouTube',
          routing: 'proxy',
          enabled: true,
        },
        {
          packageName: 'com.spotify.music',
          appName: 'Spotify',
          routing: 'proxy',
          enabled: false,
        },
      ],
    });

    expect(payload.splitTunnelMode).toBe('vpn_selected_only');
    expect(payload.splitTunnelRules).toHaveLength(1);
    expect(payload.splitTunnelRules[0].packageName).toBe('com.youtube');
    expect(payload.coreConfigJson).toContain('"type":"tun"');
    expect(payload.coreConfigJson).toContain('"include_package":["com.youtube"');
  });
});
