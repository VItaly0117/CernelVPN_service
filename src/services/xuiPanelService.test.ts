import {
  buildPanelApiUrl,
  createXuiPanelClient,
  extractVlessProfilesFromInbounds,
  formatBytes,
  normalizePanelSettings,
  summarizeServerStatus,
} from './xuiPanelService';

describe('xuiPanelService', () => {
  it('normalizes 3X-UI URLs with a hidden web base path', () => {
    const settings = normalizePanelSettings({
      panelUrl: 'http://panel.example:27390/Gm8beG4wnwGGqhurIA/panel/',
      username: 'admin',
      password: 'secret',
    });

    expect(settings.origin).toBe('http://panel.example:27390');
    expect(settings.webBasePath).toBe('/Gm8beG4wnwGGqhurIA/');
    expect(buildPanelApiUrl(settings, '/panel/api/server/status')).toBe(
      'http://panel.example:27390/Gm8beG4wnwGGqhurIA/panel/api/server/status',
    );
    expect(buildPanelApiUrl(settings, '/login')).toBe(
      'http://panel.example:27390/Gm8beG4wnwGGqhurIA/login',
    );
  });

  it('logs in with form data and uses the session cookie for status requests', async () => {
    const calls: Array<{url: string; init?: {headers?: Record<string, string>; body?: string}}> = [];
    const fetchImpl = jest.fn(async (url: string, init?: {headers?: Record<string, string>; body?: string}) => {
      calls.push({url, init});
      if (url.endsWith('/login')) {
        return {
          ok: true,
          status: 200,
          headers: {get: (name: string) => name.toLowerCase() === 'set-cookie' ? 'session=abc123; Path=/; HttpOnly' : null},
          json: async () => ({success: true, msg: '', obj: null}),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: {get: () => null},
        json: async () => ({
          success: true,
          msg: '',
          obj: {
            cpu: 12.5,
            mem: {current: 512, total: 1024},
            disk: {current: 256, total: 1024},
            swap: {current: 0, total: 0},
            xray: {state: 'running', version: 'v26.2.6'},
            netIO: {up: 10, down: 20},
            netTraffic: {sent: 30, recv: 40},
            loads: [0.1, 0.2, 0.3],
            publicIP: {ipv4: '203.0.113.1', ipv6: 'N/A'},
            uptime: 100,
            appUptime: 50,
            tcpCount: 2,
            udpCount: 1,
          },
        }),
      };
    });

    const client = createXuiPanelClient(
      {
        panelUrl: 'http://panel.example/base/',
        username: 'admin',
        password: 'secret',
      },
      fetchImpl,
    );

    await expect(client.login()).resolves.toBe('session=abc123');
    await expect(client.getServerStatus()).resolves.toMatchObject({
      xray: {state: 'running'},
      cpu: 12.5,
    });

    expect(calls[0].url).toBe('http://panel.example/base/login');
    expect(calls[0].init?.body).toBe('username=admin&password=secret');
    expect(calls[1].url).toBe(
      'http://panel.example/base/panel/api/server/status',
    );
    expect(calls[1].init?.headers?.Cookie).toBe('session=abc123');
  });

  it('summarizes server status values for the mobile dashboard', () => {
    const summary = summarizeServerStatus({
      cpu: 49.96,
      cpuCores: 1,
      mem: {current: 500 * 1024 * 1024, total: 1024 * 1024 * 1024},
      disk: {current: 5 * 1024 * 1024 * 1024, total: 10 * 1024 * 1024 * 1024},
      swap: {current: 0, total: 0},
      xray: {state: 'running', version: 'v26.2.6'},
      netIO: {up: 442, down: 65},
      netTraffic: {sent: 98_790_000_000, recv: 81_820_000_000},
      loads: [0.08, 0.05, 0.01],
      publicIP: {ipv4: '203.0.113.1', ipv6: 'N/A'},
      uptime: 4_731_000,
      appUptime: 277_000,
      tcpCount: 58,
      udpCount: 7,
    });

    expect(summary.xrayLabel).toBe('Running');
    expect(summary.memoryLabel).toBe('500 MB / 1 GB');
    expect(summary.diskLabel).toBe('5 GB / 10 GB');
    expect(summary.netIoLabel).toBe('442 B/s up · 65 B/s down');
    expect(summary.connectionsLabel).toBe('TCP 58 · UDP 7');
    expect(formatBytes(98_790_000_000)).toBe('98.79 GB');
  });

  it('extracts VLESS REALITY profiles from 3X-UI inbounds', () => {
    const profiles = extractVlessProfilesFromInbounds(
      [
        {
          id: 1,
          remark: 'Main Reality',
          enable: true,
          port: 443,
          protocol: 'vless',
          settings: JSON.stringify({
            clients: [
              {
                id: '00000000-0000-0000-0000-000000000000',
                email: 'friend',
                flow: 'xtls-rprx-vision',
                enable: true,
              },
            ],
          }),
          streamSettings: JSON.stringify({
            network: 'tcp',
            security: 'reality',
            realitySettings: {
              serverNames: ['www.microsoft.com'],
              shortIds: ['abcd'],
              settings: {
                publicKey: 'PUBLIC_KEY',
                fingerprint: 'chrome',
              },
            },
          }),
        },
      ],
      'vpn.example.com',
    );

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      name: 'friend',
      protocol: 'vless',
      host: 'vpn.example.com',
      port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      security: 'reality',
      transport: 'tcp',
      sni: 'www.microsoft.com',
      shortId: 'abcd',
      publicKey: 'PUBLIC_KEY',
      flow: 'xtls-rprx-vision',
    });
    expect(profiles[0].rawLink).toContain('security=reality');
    expect(profiles[0].rawLink).toContain('pbk=PUBLIC_KEY');
  });
});
