import {
  parsePersistedVpnState,
  PERSISTED_STATE_VERSION,
  serializeVpnState,
} from './statePersistence';
import type {PersistedVpnState} from '../types/vpn';

const persistedState: PersistedVpnState = {
  savedProfiles: [
    {
      id: 'profile-1',
      name: 'Edge',
      rawLink: 'trojan://password@example.com:443#Edge',
      protocol: 'trojan',
      host: 'example.com',
      port: 443,
      password: 'password',
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  activeProfileId: 'profile-1',
  splitTunnelMode: 'vpn_selected_only',
  splitTunnelRules: [
    {
      packageName: 'com.netflix.mediaclient',
      appName: 'Netflix',
      routing: 'proxy',
      enabled: true,
    },
  ],
  lastRulesUpdate: 123,
  themeMode: 'dark',
  panelSettings: {
    panelUrl: 'http://panel.example/base/',
    username: 'admin',
    password: 'secret',
    sessionCookie: 'session=abc123',
    lastStatusAt: 456,
  },
};

describe('statePersistence', () => {
  it('serializes and parses persisted VPN state', () => {
    const raw = serializeVpnState(persistedState);
    const parsed = JSON.parse(raw);

    expect(parsed.version).toBe(PERSISTED_STATE_VERSION);
    expect(parsePersistedVpnState(raw)).toEqual(persistedState);
  });

  it('returns null for malformed JSON', () => {
    expect(parsePersistedVpnState('{bad json')).toBeNull();
  });

  it('sanitizes unknown modes and broken rows', () => {
    const raw = JSON.stringify({
      savedProfiles: [{id: 'broken'}],
      activeProfileId: 'missing',
      splitTunnelMode: 'bad',
      splitTunnelRules: [{packageName: 'x'}],
      lastRulesUpdate: -1,
      themeMode: 'sepia',
    });

    expect(parsePersistedVpnState(raw)).toEqual({
      savedProfiles: [],
      activeProfileId: null,
      splitTunnelMode: 'vpn_all_except_selected',
      splitTunnelRules: [],
      lastRulesUpdate: null,
      themeMode: 'system',
      panelSettings: null,
    });
  });
});
