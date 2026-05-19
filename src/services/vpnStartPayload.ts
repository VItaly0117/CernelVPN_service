import type {
  SplitTunnelMode,
  SplitTunnelRule,
  VpnProfile,
  VpnStartPayload,
} from '../types/vpn';

export function createVpnStartPayload({
  profile,
  splitTunnelMode,
  splitTunnelRules,
}: {
  profile: VpnProfile;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
}): VpnStartPayload {
  return {
    profile,
    splitTunnelMode,
    splitTunnelRules: splitTunnelRules.filter(rule => rule.enabled),
  };
}
