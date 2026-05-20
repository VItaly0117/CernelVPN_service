import type {AppStateStatus} from 'react-native';
import type {VpnStatus} from '../types/vpn';

export interface NativeTrafficStatsSnapshot {
  rxBytes: number;
  txBytes: number;
  timestampMs: number;
}

export interface TrafficRates {
  downloadMbps: number;
  uploadMbps: number;
}

export function calculateTrafficRates(
  previous: NativeTrafficStatsSnapshot,
  current: NativeTrafficStatsSnapshot,
): TrafficRates {
  const elapsedSeconds = (current.timestampMs - previous.timestampMs) / 1000;
  if (elapsedSeconds <= 0) {
    return {
      downloadMbps: 0,
      uploadMbps: 0,
    };
  }

  const rxDelta = Math.max(0, current.rxBytes - previous.rxBytes);
  const txDelta = Math.max(0, current.txBytes - previous.txBytes);

  return {
    downloadMbps: roundRate((rxDelta * 8) / elapsedSeconds / 1_000_000),
    uploadMbps: roundRate((txDelta * 8) / elapsedSeconds / 1_000_000),
  };
}

export function formatMbps(value: number): string {
  if (value >= 100) {
    return Math.round(value).toString();
  }
  return value.toFixed(1);
}

export function buildTrafficBars(rates: TrafficRates): number[] {
  const combined = Math.max(0, rates.downloadMbps + rates.uploadMbps);
  if (combined <= 0) {
    return Array.from({length: 15}, () => 3);
  }

  const normalized = Math.min(1, combined / 80);
  return Array.from({length: 15}, (_, index) => {
    const centerDistance = Math.abs(index - 7) / 7;
    const wave = 1 - centerDistance * 0.72;
    const ripple = 0.82 + Math.sin(index * 1.45 + combined / 12) * 0.12;
    return clampBarHeight(3 + normalized * 49 * wave * ripple);
  });
}

export function shouldPollTraffic(
  status: VpnStatus,
  appState: AppStateStatus,
): boolean {
  return status === 'connected' && appState === 'active';
}

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampBarHeight(value: number): number {
  return Math.max(3, Math.min(52, Math.round(value)));
}
