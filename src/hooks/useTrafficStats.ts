/**
 * useTrafficStats.ts — Hook for live VPN traffic monitoring.
 * Listens to native VpnTrafficStats events from VpnBridgeModule.
 */
import {useState, useEffect, useRef} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';

export interface TrafficStats {
  rxBytesPerSec: number;
  txBytesPerSec: number;
  totalRxBytes: number;
  totalTxBytes: number;
}

const EMPTY_STATS: TrafficStats = {
  rxBytesPerSec: 0,
  txBytesPerSec: 0,
  totalRxBytes: 0,
  totalTxBytes: 0,
};

export function useTrafficStats(active: boolean): TrafficStats {
  const [stats, setStats] = useState<TrafficStats>(EMPTY_STATS);
  const prevRx = useRef(0);
  const prevTx = useRef(0);

  useEffect(() => {
    if (!active) {
      setStats(EMPTY_STATS);
      prevRx.current = 0;
      prevTx.current = 0;
      return;
    }

    const vpnModule = NativeModules.VpnBridgeModule;
    if (!vpnModule) {return;}

    let emitterSub: ReturnType<NativeEventEmitter['addListener']> | null = null;
    try {
      const emitter = new NativeEventEmitter(vpnModule);
      emitterSub = emitter.addListener(
        'VpnTrafficStats',
        (data: {rxBytes: number; txBytes: number}) => {
          const rx = data.rxBytes ?? 0;
          const tx = data.txBytes ?? 0;
          const rxPerSec = Math.max(0, rx - prevRx.current);
          const txPerSec = Math.max(0, tx - prevTx.current);
          prevRx.current = rx;
          prevTx.current = tx;
          setStats({
            rxBytesPerSec: rxPerSec,
            txBytesPerSec: txPerSec,
            totalRxBytes: rx,
            totalTxBytes: tx,
          });
        },
      );
    } catch {}

    return () => {
      emitterSub?.remove();
    };
  }, [active]);

  return stats;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1_000_000) {
    return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`;
  } else if (bytesPerSec >= 1_000) {
    return `${(bytesPerSec / 1_000).toFixed(0)} KB/s`;
  }
  return `${bytesPerSec} B/s`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  } else if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}
