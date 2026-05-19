import {isProfileValid, parseProfileLink} from './profileParser';

describe('profileParser', () => {
  it('parses VLESS REALITY links with decoded profile names', () => {
    const result = parseProfileLink(
      'vless://00000000-0000-0000-0000-000000000000@example.com:443?type=tcp&security=reality&pbk=PUBLIC_KEY&sni=example.com&sid=abcdef&flow=xtls-rprx-vision#Demo%20Profile',
    );

    expect(result.success).toBe(true);
    expect(result.profile).toMatchObject({
      name: 'Demo Profile',
      protocol: 'vless',
      host: 'example.com',
      port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      transport: 'tcp',
      security: 'reality',
      publicKey: 'PUBLIC_KEY',
      sni: 'example.com',
      shortId: 'abcdef',
      flow: 'xtls-rprx-vision',
    });
    expect(result.profile && isProfileValid(result.profile)).toBe(true);
  });

  it('rejects invalid ports', () => {
    const result = parseProfileLink(
      'vless://00000000-0000-0000-0000-000000000000@example.com:99999#Bad',
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid port');
  });

  it('parses Trojan links with password user info', () => {
    const result = parseProfileLink(
      'trojan://secret-password@vpn.example.org:443?sni=edge.example.org&type=tcp&security=tls#Trojan%20Edge',
    );

    expect(result.success).toBe(true);
    expect(result.profile).toMatchObject({
      name: 'Trojan Edge',
      protocol: 'trojan',
      host: 'vpn.example.org',
      port: 443,
      password: 'secret-password',
      sni: 'edge.example.org',
      transport: 'tcp',
      security: 'tls',
    });
  });

  it('parses SIP002 Shadowsocks links', () => {
    const result = parseProfileLink(
      'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@example.net:8388#SS%20Home',
    );

    expect(result.success).toBe(true);
    expect(result.profile).toMatchObject({
      name: 'SS Home',
      protocol: 'shadowsocks',
      host: 'example.net',
      port: 8388,
      method: 'aes-256-gcm',
      password: 'password',
    });
  });

  it('parses base64 VMess JSON links', () => {
    const payload = Buffer.from(
      JSON.stringify({
        v: '2',
        ps: 'VMess Node',
        add: 'vmess.example.com',
        port: '443',
        id: '11111111-1111-1111-1111-111111111111',
        net: 'ws',
        tls: 'tls',
        sni: 'front.example.com',
      }),
      'utf8',
    ).toString('base64');

    const result = parseProfileLink(`vmess://${payload}`);

    expect(result.success).toBe(true);
    expect(result.profile).toMatchObject({
      name: 'VMess Node',
      protocol: 'vmess',
      host: 'vmess.example.com',
      port: 443,
      uuid: '11111111-1111-1111-1111-111111111111',
      transport: 'ws',
      security: 'tls',
      sni: 'front.example.com',
    });
  });
});
