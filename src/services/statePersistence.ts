import type {
  PersistedVpnState,
  PanelSettings,
  SplitTunnelMode,
  SplitTunnelRule,
  VpnProfile,
} from '../types/vpn';
import type {ThemeMode} from '../theme/theme';
import {DEFAULT_BYPASS_DOMAINS} from './routingDefaults';

const VALID_THEME_MODES = new Set<ThemeMode>(['system', 'light', 'dark']);
const VALID_SPLIT_MODES = new Set<SplitTunnelMode>([
  'vpn_all',
  'vpn_all_except_selected',
  'vpn_selected_only',
]);

export const PERSISTED_STATE_VERSION = 1;

export function serializeVpnState(state: PersistedVpnState): string {
  return JSON.stringify({
    version: PERSISTED_STATE_VERSION,
    savedProfiles: state.savedProfiles,
    serverHistory: state.serverHistory,
    activeProfileId: state.activeProfileId,
    splitTunnelMode: state.splitTunnelMode,
    splitTunnelRules: state.splitTunnelRules,
    splitTunnelRulesWifi: state.splitTunnelRulesWifi,
    splitTunnelRulesCellular: state.splitTunnelRulesCellular,
    differentiateNetworkRules: state.differentiateNetworkRules,
    adBlockEnabled: state.adBlockEnabled,
    bypassDomains: state.bypassDomains,
    proxyDomains: state.proxyDomains,
    blockedApps: state.blockedApps,
    blockAppsEnabled: state.blockAppsEnabled,
    lastRulesUpdate: state.lastRulesUpdate,
    themeMode: state.themeMode,
    panelSettings: state.panelSettings,
    persistedErrors: state.persistedErrors,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    autoConnect: state.autoConnect,
    killSwitchEnabled: state.killSwitchEnabled,
    bypassLan: state.bypassLan,
    blockedAdsCount: state.blockedAdsCount,
    dailyTraffic: state.dailyTraffic,
  });
}

export function parsePersistedVpnState(
  raw: string | null | undefined,
): PersistedVpnState | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const savedProfiles = Array.isArray(record.savedProfiles)
    ? record.savedProfiles.filter(isVpnProfile)
    : [];
  const serverHistory = Array.isArray(record.serverHistory)
    ? record.serverHistory.filter((id) => typeof id === 'string')
    : [];
  const splitTunnelRules = Array.isArray(record.splitTunnelRules)
    ? record.splitTunnelRules.filter(isSplitTunnelRule)
    : [];
  const splitTunnelRulesWifi = Array.isArray(record.splitTunnelRulesWifi)
    ? record.splitTunnelRulesWifi.filter(isSplitTunnelRule)
    : [];
  const splitTunnelRulesCellular = Array.isArray(record.splitTunnelRulesCellular)
    ? record.splitTunnelRulesCellular.filter(isSplitTunnelRule)
    : [];
  const differentiateNetworkRules =
    typeof record.differentiateNetworkRules === 'boolean'
      ? record.differentiateNetworkRules
      : false;
  const adBlockEnabled =
    typeof record.adBlockEnabled === 'boolean'
      ? record.adBlockEnabled
      : false;
  const bypassDomains = Array.isArray(record.bypassDomains)
    ? record.bypassDomains.filter(d => typeof d === 'string')
    : DEFAULT_BYPASS_DOMAINS;
  const proxyDomains = Array.isArray(record.proxyDomains)
    ? record.proxyDomains.filter(d => typeof d === 'string')
    : [];
  const blockedApps = Array.isArray(record.blockedApps)
    ? record.blockedApps.filter(d => typeof d === 'string')
    : [];
  const blockAppsEnabled =
    typeof record.blockAppsEnabled === 'boolean'
      ? record.blockAppsEnabled
      : false;
  const activeProfileId =
    typeof record.activeProfileId === 'string' &&
    savedProfiles.some(profile => profile.id === record.activeProfileId)
      ? record.activeProfileId
      : savedProfiles[0]?.id ?? null;
  const splitTunnelMode = VALID_SPLIT_MODES.has(
    record.splitTunnelMode as SplitTunnelMode,
  )
    ? (record.splitTunnelMode as SplitTunnelMode)
    : 'vpn_all_except_selected';
  const themeMode = VALID_THEME_MODES.has(record.themeMode as ThemeMode)
    ? (record.themeMode as ThemeMode)
    : 'system';
  const lastRulesUpdate =
    typeof record.lastRulesUpdate === 'number' && record.lastRulesUpdate > 0
      ? record.lastRulesUpdate
      : null;
  const panelSettings = isPanelSettings(record.panelSettings)
    ? record.panelSettings
    : null;
  const persistedErrors = Array.isArray(record.persistedErrors)
    ? record.persistedErrors
    : [];
  const hasCompletedOnboarding =
    typeof record.hasCompletedOnboarding === 'boolean'
      ? record.hasCompletedOnboarding
      : false;
  const autoConnect =
    typeof record.autoConnect === 'boolean'
      ? record.autoConnect
      : false;
  const killSwitchEnabled =
    typeof record.killSwitchEnabled === 'boolean'
      ? record.killSwitchEnabled
      : false;
  const bypassLan =
    typeof record.bypassLan === 'boolean'
      ? record.bypassLan
      : false;
  const blockedAdsCount =
    typeof record.blockedAdsCount === 'number'
      ? record.blockedAdsCount
      : 0;
  const dailyTraffic =
    typeof record.dailyTraffic === 'object' && record.dailyTraffic !== null
      ? (record.dailyTraffic as Record<string, {rx: number; tx: number}>)
      : {};

  return {
    savedProfiles,
    serverHistory,
    activeProfileId,
    splitTunnelMode,
    splitTunnelRules,
    splitTunnelRulesWifi,
    splitTunnelRulesCellular,
    differentiateNetworkRules,
    adBlockEnabled,
    bypassDomains,
    proxyDomains,
    blockedApps,
    blockAppsEnabled,
    lastRulesUpdate,
    themeMode,
    panelSettings,
    persistedErrors,
    hasCompletedOnboarding,
    autoConnect,
    killSwitchEnabled,
    bypassLan,
    blockedAdsCount,
    dailyTraffic,
  };
}

function isVpnProfile(value: unknown): value is VpnProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.rawLink === 'string' &&
    typeof record.protocol === 'string' &&
    typeof record.host === 'string' &&
    typeof record.port === 'number' &&
    record.port > 0 &&
    record.port <= 65535 &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number'
  );
}

function isSplitTunnelRule(value: unknown): value is SplitTunnelRule {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.packageName === 'string' &&
    typeof record.appName === 'string' &&
    (record.routing === 'direct' || record.routing === 'proxy') &&
    typeof record.enabled === 'boolean'
  );
}

function isPanelSettings(value: unknown): value is PanelSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.panelUrl !== 'string' || !record.panelUrl.trim()) {
    return false;
  }
  return (
    optionalString(record.username) &&
    optionalString(record.password) &&
    optionalString(record.sessionCookie) &&
    (record.lastStatusAt === undefined ||
      record.lastStatusAt === null ||
      (typeof record.lastStatusAt === 'number' && record.lastStatusAt > 0))
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}
