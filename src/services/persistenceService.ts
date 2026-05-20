import {appLogger} from './appLogger';
import * as NativeVpn from '../native/NativeVpn';
import {vpnStore} from '../store/vpnStore';
import {parsePersistedVpnState, serializeVpnState} from './statePersistence';

let persistenceStarted = false;
let unsubscribe: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydrateVpnStore(): Promise<void> {
  try {
    const raw = await NativeVpn.loadPersistedState();
    const persisted = parsePersistedVpnState(raw);
    if (persisted) {
      vpnStore.hydrateFromPersistedState(persisted);
      appLogger.info('persistence', 'Successfully hydrated VPN store from native storage');
    } else {
      appLogger.info('persistence', 'No persisted VPN state found, using defaults');
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown hydration error';
    appLogger.error('persistence', `Failed to hydrate VPN store: ${msg}`);
  }
}

export function startPersistingVpnStore(): () => void {
  if (persistenceStarted && unsubscribe) {
    return unsubscribe;
  }

  persistenceStarted = true;
  unsubscribe = vpnStore.subscribe(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      const raw = serializeVpnState(vpnStore.toPersistedState());
      NativeVpn.savePersistedState(raw).catch(error => {
        appLogger.warn('persistence', `Failed to save persisted state: ${error.message}`);
      });
    }, 150);
  });

  return () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    unsubscribe?.();
    unsubscribe = null;
    persistenceStarted = false;
  };
}
