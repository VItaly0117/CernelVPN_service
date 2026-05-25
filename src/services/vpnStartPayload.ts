import type {
  SplitTunnelMode,
  SplitTunnelRule,
  VpnProfile,
  VpnStartPayload,
} from '../types/vpn';
import {buildSingBoxConfigJson} from './singBoxConfig';

const APP_PACKAGE_NAME = 'com.kernelvpn';

export function createVpnStartPayload({
  profile,
  splitTunnelMode,
  splitTunnelRules,
  adBlockEnabled = false,
  bypassDomains = [],
  proxyDomains = [],
  blockedApps = [],
  blockAppsEnabled = false,
  killSwitchEnabled = false,
  bypassLan = false,
}: {
  profile: VpnProfile;
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  adBlockEnabled?: boolean;
  bypassDomains?: string[];
  proxyDomains?: string[];
  blockedApps?: string[];
  blockAppsEnabled?: boolean;
  killSwitchEnabled?: boolean;
  bypassLan?: boolean;
}): VpnStartPayload {
  const enabledSplitTunnelRules = splitTunnelRules.filter(rule => rule.enabled);

  return {
    profile,
    splitTunnelMode,
    splitTunnelRules: enabledSplitTunnelRules,
    coreConfigJson: buildSingBoxConfigJson({
      profile,
      splitTunnelMode,
      splitTunnelRules: enabledSplitTunnelRules,
      appPackageName: APP_PACKAGE_NAME,
      adBlockEnabled,
      bypassDomains,
      proxyDomains,
      blockedApps,
      blockAppsEnabled,
      bypassLan,
    }),
    killSwitchEnabled,
    bypassLan,
  };
}
