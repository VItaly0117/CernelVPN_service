import {applyRulesManifest} from './rulesService';
import {vpnStore} from '../store/vpnStore';
import type {RulesManifest} from '../types/vpn';

describe('rulesService', () => {
  it('applies direct and proxy domains from a validated manifest', async () => {
    const manifest: RulesManifest = {
      version: 7,
      updatedAt: '2026-05-20T00:00:00Z',
      minAppVersion: '0.4.0',
      rules: {
        directApps: [],
        directDomains: ['connectivitycheck.gstatic.com', 'play.googleapis.com'],
        proxyDomains: ['ifconfig.me'],
      },
    };

    await applyRulesManifest(manifest);

    const state = vpnStore.getState();
    expect(state.bypassDomains).toEqual([
      'connectivitycheck.gstatic.com',
      'play.googleapis.com',
    ]);
    expect(state.proxyDomains).toEqual(['ifconfig.me']);
    expect(state.lastRulesUpdate).toEqual(expect.any(Number));
  });
});
