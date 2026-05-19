import * as NativeVpn from '../native/NativeVpn';
import {vpnStore} from '../store/vpnStore';
import type {VpnProfile} from '../types/vpn';
import {connect} from './vpnService';

jest.mock('../native/NativeVpn', () => ({
  requestPermission: jest.fn(),
  startVpn: jest.fn(),
  onVpnStatusChanged: jest.fn(() => jest.fn()),
  onVpnError: jest.fn(() => jest.fn()),
}));

const profile: VpnProfile = {
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

describe('vpnService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vpnStore.setStatus('disconnected');
    vpnStore.setLastError(null);
    vpnStore.setSplitTunnelMode('vpn_all_except_selected');
    vpnStore.setSplitTunnelRules([]);
  });

  it('does not mark the VPN connected until native confirms core startup', async () => {
    jest.mocked(NativeVpn.requestPermission).mockResolvedValue(true);
    jest.mocked(NativeVpn.startVpn).mockResolvedValue();

    await connect(profile);

    expect(vpnStore.getState().status).toBe('connecting');
    expect(NativeVpn.startVpn).toHaveBeenCalledWith(
      expect.stringContaining('"coreConfigJson"'),
    );
  });
});
