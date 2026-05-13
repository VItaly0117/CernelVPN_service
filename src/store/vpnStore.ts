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
import type {
  VpnStatus,
  VpnProfile,
  SplitTunnelMode,
  SplitTunnelRule,
} from '../types/vpn';

// ---------------------------------------------------------------------------
// Listener type
// ---------------------------------------------------------------------------

type Listener = () => void;

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface VpnStoreState {
  status: VpnStatus;
  activeProfile: VpnProfile | null;
  savedProfiles: VpnProfile[];
  splitTunnelMode: SplitTunnelMode;
  splitTunnelRules: SplitTunnelRule[];
  lastError: string | null;
  lastRulesUpdate: number | null; // epoch ms
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

class VpnStore {
  private _state: VpnStoreState = {
    status: 'disconnected',
    activeProfile: null,
    savedProfiles: [],
    splitTunnelMode: 'vpn_all_except_selected',
    splitTunnelRules: [],
    lastError: null,
    lastRulesUpdate: null,
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

  get splitTunnelMode(): SplitTunnelMode {
    return this._state.splitTunnelMode;
  }

  get splitTunnelRules(): SplitTunnelRule[] {
    return this._state.splitTunnelRules;
  }

  get lastError(): string | null {
    return this._state.lastError;
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
    this._state = {...this._state, activeProfile: profile};
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

  setSplitTunnelMode(mode: SplitTunnelMode): void {
    this._state = {...this._state, splitTunnelMode: mode};
    this._notify();
  }

  setSplitTunnelRules(rules: SplitTunnelRule[]): void {
    this._state = {...this._state, splitTunnelRules: rules};
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

  setLastRulesUpdate(timestamp: number): void {
    this._state = {...this._state, lastRulesUpdate: timestamp};
    this._notify();
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const vpnStore = new VpnStore();

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
