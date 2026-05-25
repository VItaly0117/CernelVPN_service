/**
 * vpnStore.ts — Simple in-memory state store for VPN state.
 *
 * This is a minimal reactive store that holds VPN status, active profile,
 * saved profiles, split tunnel settings, etc.
 *
 * Components subscribe to changes and re-render accordingly.
 * No external dependencies (no Redux, MobX, etc.).
 *
 * Storage abstraction:
 *   Currently in-memory only.
 *   TODO: Persist to AsyncStorage / MMKV when available.
 */
import {
  VpnProfile,
  VpnStatus,
  SplitTunnelMode,
  SplitTunnelRule,
  VpnSubscription,
  PanelSettings,
} from '../types/vpn';
import i18n from '../locales/i18n';
import type {ThemeMode} from '../theme/theme';
import {DEFAULT_BYPASS_DOMAINS} from '../services/routingDefaults';

// ---------------------------------------------------------------------------
// Listener type
// ---------------------------------------------------------------------------

type Listener = () => void;

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

import type {LogEvent} from '../services/appLogger';

export interface VpnStoreState {
  status: VpnStatus;
  activeProfile: VpnProfile | null;
  savedProfiles: VpnProfile[];
  serverHistory: string[]; // profile IDs
  subscriptions: VpnSubscription[];
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  splitTunnelRulesWifi: SplitTunnelRule[];
  splitTunnelRulesCellular: SplitTunnelRule[];
  differentiateNetworkRules: boolean;
  adBlockEnabled: boolean;
  bypassDomains: string[];
  proxyDomains: string[];
  blockedApps: string[];
  blockAppsEnabled: boolean;
  lastError: string | null;
  lastRulesUpdate: number | null; // epoch ms
  themeMode: ThemeMode;
  language: string;
  panelSettings: PanelSettings | null;
  hasCompletedOnboarding: boolean;
  persistedErrors: LogEvent[];
  autoConnect: boolean;
  killSwitchEnabled: boolean;
  bypassLan: boolean;
  blockedAdsCount: number;
  dailyTraffic: Record<string, {rx: number; tx: number}>;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

class VpnStore {
  private _state: VpnStoreState = {
    status: 'disconnected',
    activeProfile: null,
    savedProfiles: [],
    serverHistory: [],
    subscriptions: [],
    splitTunnelMode: 'vpn_all_except_selected',
    splitTunnelRules: [],
    splitTunnelRulesWifi: [],
    splitTunnelRulesCellular: [],
    differentiateNetworkRules: false,
    adBlockEnabled: false,
    bypassDomains: DEFAULT_BYPASS_DOMAINS,
    proxyDomains: [],
    blockedApps: [],
    blockAppsEnabled: false,
    lastError: null,
    lastRulesUpdate: null,
    themeMode: 'system',
    language: 'en',
    panelSettings: null,
    hasCompletedOnboarding: true,
    persistedErrors: [],
    autoConnect: false,
    killSwitchEnabled: false,
    bypassLan: false,
    blockedAdsCount: 0,
    dailyTraffic: {},
  };

  private _listeners: Set<Listener> = new Set();

  // ---- Subscriptions ----

  /**
   * Subscribe to store changes. Returns unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    this._listeners.forEach(fn => fn());
  }

  // ---- Getters ----

  getState(): Readonly<VpnStoreState> {
    return this._state;
  }

  get status(): VpnStatus {
    return this._state.status;
  }

  get activeProfile(): VpnProfile | null {
    return this._state.activeProfile;
  }

  get savedProfiles(): VpnProfile[] {
    return this._state.savedProfiles;
  }

  get serverHistory(): string[] {
    return this._state.serverHistory;
  }

  get subscriptions(): VpnSubscription[] {
    return this._state.subscriptions;
  }

  get splitTunnelMode(): SplitTunnelMode {
    return this._state.splitTunnelMode;
  }

  get splitTunnelRules(): SplitTunnelRule[] {
    return this._state.splitTunnelRules;
  }

  get splitTunnelRulesWifi(): SplitTunnelRule[] {
    return this._state.splitTunnelRulesWifi;
  }

  get splitTunnelRulesCellular(): SplitTunnelRule[] {
    return this._state.splitTunnelRulesCellular;
  }

  get differentiateNetworkRules(): boolean {
    return this._state.differentiateNetworkRules;
  }

  get adBlockEnabled(): boolean {
    return this._state.adBlockEnabled;
  }

  get bypassDomains(): string[] {
    return this._state.bypassDomains;
  }

  get proxyDomains(): string[] {
    return this._state.proxyDomains;
  }

  get blockedApps(): string[] {
    return this._state.blockedApps;
  }

  get blockAppsEnabled(): boolean {
    return this._state.blockAppsEnabled;
  }

  get lastError(): string | null {
    return this._state.lastError;
  }

  get themeMode(): ThemeMode {
    return this._state.themeMode;
  }

  get panelSettings(): PanelSettings | null {
    return this._state.panelSettings;
  }

  get hasCompletedOnboarding(): boolean {
    return this._state.hasCompletedOnboarding;
  }

  // ---- Setters ----

  setStatus(status: VpnStatus): void {
    if (this._state.status !== status) {
      this._state = {...this._state, status};
      this._notify();
    }
  }

  setLastError(error: string | null): void {
    this._state = {...this._state, lastError: error};
    this._notify();
  }

  setActiveProfile(profile: VpnProfile | null): void {
    let newHistory = this._state.serverHistory;
    if (profile) {
      newHistory = [profile.id, ...newHistory.filter(id => id !== profile.id)].slice(0, 5);
    }
    this._state = {...this._state, activeProfile: profile, serverHistory: newHistory};
    this._notify();
  }

  addProfile(profile: VpnProfile): void {
    const exists = this._state.savedProfiles.some(p => p.id === profile.id);
    if (!exists) {
      this._state = {
        ...this._state,
        savedProfiles: [...this._state.savedProfiles, profile],
      };
      this._notify();
    }
  }

  updateProfile(profile: VpnProfile): void {
    this._state = {
      ...this._state,
      savedProfiles: this._state.savedProfiles.map(p => (p.id === profile.id ? profile : p)),
      activeProfile: this._state.activeProfile?.id === profile.id ? profile : this._state.activeProfile,
    };
    this._notify();
  }

  removeProfile(profileId: string): void {
    this._state = {
      ...this._state,
      savedProfiles: this._state.savedProfiles.filter(p => p.id !== profileId),
      activeProfile:
        this._state.activeProfile?.id === profileId
          ? null
          : this._state.activeProfile,
    };
    this._notify();
  }

  addSubscription(sub: VpnSubscription): void {
    const exists = this._state.subscriptions.some(s => s.id === sub.id);
    if (!exists) {
      this._state = {
        ...this._state,
        subscriptions: [...this._state.subscriptions, sub],
      };
      this._notify();
    }
  }

  updateSubscription(sub: VpnSubscription, profiles: VpnProfile[]): void {
    this._state = {
      ...this._state,
      subscriptions: this._state.subscriptions.map(s => (s.id === sub.id ? sub : s)),
      // Remove old profiles for this sub, add new ones
      savedProfiles: [
        ...this._state.savedProfiles.filter(p => p.subscriptionId !== sub.id),
        ...profiles,
      ],
    };
    this._notify();
  }

  removeSubscription(subId: string): void {
    this._state = {
      ...this._state,
      subscriptions: this._state.subscriptions.filter(s => s.id !== subId),
      savedProfiles: this._state.savedProfiles.filter(p => p.subscriptionId !== subId),
    };
    this._notify();
  }

  setSplitTunnelMode(mode: SplitTunnelMode): void {
    this._state = {...this._state, splitTunnelMode: mode};
    this._notify();
  }

  setSplitTunnelRules(rules: SplitTunnelRule[]): void {
    this._state = {...this._state, splitTunnelRules: rules};
    this._notify();
  }

  setSplitTunnelRulesWifi(rules: SplitTunnelRule[]): void {
    this._state = {...this._state, splitTunnelRulesWifi: rules};
    this._notify();
  }

  setSplitTunnelRulesCellular(rules: SplitTunnelRule[]): void {
    this._state = {...this._state, splitTunnelRulesCellular: rules};
    this._notify();
  }

  updateSplitTunnelRule(
    packageName: string,
    update: Partial<SplitTunnelRule>,
  ): void {
    this._state = {
      ...this._state,
      splitTunnelRules: this._state.splitTunnelRules.map(rule =>
        rule.packageName === packageName ? {...rule, ...update} : rule,
      ),
    };
    this._notify();
  }

  updateSplitTunnelRuleWifi(
    packageName: string,
    update: Partial<SplitTunnelRule>,
  ): void {
    this._state = {
      ...this._state,
      splitTunnelRulesWifi: this._state.splitTunnelRulesWifi.map(rule =>
        rule.packageName === packageName ? {...rule, ...update} : rule,
      ),
    };
    this._notify();
  }

  updateSplitTunnelRuleCellular(
    packageName: string,
    update: Partial<SplitTunnelRule>,
  ): void {
    this._state = {
      ...this._state,
      splitTunnelRulesCellular: this._state.splitTunnelRulesCellular.map(rule =>
        rule.packageName === packageName ? {...rule, ...update} : rule,
      ),
    };
    this._notify();
  }

  setDifferentiateNetworkRules(enabled: boolean): void {
    this._state = {...this._state, differentiateNetworkRules: enabled};
    this._notify();
  }

  setAdBlockEnabled(enabled: boolean): void {
    this._state = {...this._state, adBlockEnabled: enabled};
    this._notify();
  }

  setBypassDomains(domains: string[]): void {
    this._state = {...this._state, bypassDomains: domains};
    this._notify();
  }

  setProxyDomains(domains: string[]): void {
    this._state = {...this._state, proxyDomains: domains};
    this._notify();
  }

  setBlockedApps(apps: string[]): void {
    this._state = {...this._state, blockedApps: apps};
    this._notify();
  }

  setBlockAppsEnabled(enabled: boolean): void {
    this._state = {...this._state, blockAppsEnabled: enabled};
    this._notify();
  }

  setLastRulesUpdate(timestamp: number): void {
    this._state = {...this._state, lastRulesUpdate: timestamp};
    this._notify();
  }

  setThemeMode(mode: ThemeMode) {
    this._state = {...this._state, themeMode: mode};
    this._notify();
  }

  setLanguage(lang: string) {
    this._state = {...this._state, language: lang};
    i18n.changeLanguage(lang);
    this._notify();
  }

  setAutoConnect(value: boolean): void {
    this._state = {...this._state, autoConnect: value};
    this._notify();
  }

  get autoConnect(): boolean {
    return this._state.autoConnect;
  }

  setKillSwitchEnabled(value: boolean): void {
    this._state = {...this._state, killSwitchEnabled: value};
    this._notify();
  }

  get killSwitchEnabled(): boolean {
    return this._state.killSwitchEnabled;
  }

  setBypassLan(value: boolean): void {
    this._state = {...this._state, bypassLan: value};
    this._notify();
  }

  get bypassLan(): boolean {
    return this._state.bypassLan;
  }

  get blockedAdsCount(): number {
    return this._state.blockedAdsCount;
  }

  get dailyTraffic(): Record<string, {rx: number; tx: number}> {
    return this._state.dailyTraffic;
  }

  incrementBlockedAds(): void {
    this._state = {...this._state, blockedAdsCount: this._state.blockedAdsCount + 1};
    this._notify();
  }

  addDailyTraffic(dateString: string, rx: number, tx: number): void {
    const current = this._state.dailyTraffic[dateString] || {rx: 0, tx: 0};
    this._state = {
      ...this._state,
      dailyTraffic: {
        ...this._state.dailyTraffic,
        [dateString]: {
          rx: current.rx + rx,
          tx: current.tx + tx,
        },
      },
    };
    this._notify();
  }

  setPanelSettings(panelSettings: PanelSettings | null): void {
    this._state = {...this._state, panelSettings};
    this._notify();
  }

  setHasCompletedOnboarding(completed: boolean): void {
    this._state = {...this._state, hasCompletedOnboarding: completed};
    this._notify();
  }

  addPersistedError(error: LogEvent): void {
    const exists = this._state.persistedErrors.some(e => e.id === error.id);
    if (!exists) {
      const nextErrors = [error, ...this._state.persistedErrors].slice(0, 15);
      this._state = {...this._state, persistedErrors: nextErrors};
      this._notify();
    }
  }

  hydrateFromPersistedState(state: PersistedVpnState): void {
    const activeProfile =
      state.savedProfiles.find(profile => profile.id === state.activeProfileId) ??
      null;
    this._state = {
      ...this._state,
      activeProfile,
      savedProfiles: state.savedProfiles,
      serverHistory: state.serverHistory || [],
      splitTunnelMode: state.splitTunnelMode,
      splitTunnelRules: state.splitTunnelRules,
      splitTunnelRulesWifi: state.splitTunnelRulesWifi || [],
      splitTunnelRulesCellular: state.splitTunnelRulesCellular || [],
      differentiateNetworkRules: state.differentiateNetworkRules ?? false,
      adBlockEnabled: state.adBlockEnabled ?? false,
      bypassDomains: state.bypassDomains || DEFAULT_BYPASS_DOMAINS,
      proxyDomains: state.proxyDomains || [],
      blockedApps: state.blockedApps || [],
      blockAppsEnabled: state.blockAppsEnabled ?? false,
      lastRulesUpdate: state.lastRulesUpdate,
      themeMode: state.themeMode,
      language: state.language || 'en',
      panelSettings: state.panelSettings,
      hasCompletedOnboarding: state.hasCompletedOnboarding ?? true,
      persistedErrors: state.persistedErrors || [],
      autoConnect: state.autoConnect ?? false,
      killSwitchEnabled: state.killSwitchEnabled ?? false,
      bypassLan: state.bypassLan ?? false,
      blockedAdsCount: state.blockedAdsCount ?? 0,
      dailyTraffic: state.dailyTraffic ?? {},
    };
    this._notify();

    // Load persisted errors back into logger
    const {loadPersistedErrors} = require('../services/appLogger');
    loadPersistedErrors(state.persistedErrors || []);
  }

  toPersistedState(): PersistedVpnState {
    return {
      savedProfiles: this._state.savedProfiles,
      serverHistory: this._state.serverHistory,
      activeProfileId: this._state.activeProfile?.id ?? null,
      splitTunnelMode: this._state.splitTunnelMode,
      splitTunnelRules: this._state.splitTunnelRules,
      splitTunnelRulesWifi: this._state.splitTunnelRulesWifi,
      splitTunnelRulesCellular: this._state.splitTunnelRulesCellular,
      differentiateNetworkRules: this._state.differentiateNetworkRules,
      adBlockEnabled: this._state.adBlockEnabled,
      bypassDomains: this._state.bypassDomains,
      proxyDomains: this._state.proxyDomains,
      blockedApps: this._state.blockedApps,
      blockAppsEnabled: this._state.blockAppsEnabled,
      lastRulesUpdate: this._state.lastRulesUpdate,
      themeMode: this._state.themeMode,
      language: this._state.language,
      panelSettings: this._state.panelSettings,
      hasCompletedOnboarding: this._state.hasCompletedOnboarding,
      persistedErrors: this._state.persistedErrors,
      autoConnect: this._state.autoConnect,
      killSwitchEnabled: this._state.killSwitchEnabled,
      bypassLan: this._state.bypassLan,
      blockedAdsCount: this._state.blockedAdsCount,
      dailyTraffic: this._state.dailyTraffic,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const vpnStore = new VpnStore();

const {setStoreRef} = require('../services/appLogger');
setStoreRef(vpnStore);

// ---------------------------------------------------------------------------
// React hook helper
// ---------------------------------------------------------------------------

/**
 * Custom hook to subscribe to the VPN store.
 * Usage: const state = useVpnStore();
 *
 * Requires React to be imported in the consuming file.
 */
import {useState, useEffect} from 'react';

export function useVpnStore(): Readonly<VpnStoreState> {
  const [state, setState] = useState(vpnStore.getState());

  useEffect(() => {
    const unsubscribe = vpnStore.subscribe(() => {
      setState(vpnStore.getState());
    });
    return unsubscribe;
  }, []);

  return state;
}
