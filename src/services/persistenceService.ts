import * as NativeVpn from '../native/NativeVpn';
import {vpnStore} from '../store/vpnStore';
import {parsePersistedVpnState, serializeVpnState} from './statePersistence';

let persistenceStarted = false;
let unsubscribe: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydrateVpnStore(): Promise<void> {
  const raw = await NativeVpn.loadPersistedState();
  const persisted = parsePersistedVpnState(raw);
  if (persisted) {
    vpnStore.hydrateFromPersistedState(persisted);
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
        console.warn('[Persistence] Failed to save state', error);
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
