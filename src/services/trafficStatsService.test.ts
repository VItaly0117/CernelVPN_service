import {
  calculateTrafficRates,
  formatMbps,
  buildTrafficBars,
} from './trafficStatsService';

describe('trafficStatsService', () => {
  it('calculates download and upload Mbps from byte deltas', () => {
    const previous = {
      rxBytes: 1_000_000,
      txBytes: 2_000_000,
      timestampMs: 1_000,
    };
    const current = {
      rxBytes: 2_250_000,
      txBytes: 2_500_000,
      timestampMs: 2_000,
    };

    expect(calculateTrafficRates(previous, current)).toEqual({
      downloadMbps: 10,
      uploadMbps: 4,
    });
  });

  it('clamps invalid counter resets to zero speed', () => {
    const previous = {
      rxBytes: 5_000_000,
      txBytes: 5_000_000,
      timestampMs: 2_000,
    };
    const current = {
      rxBytes: 1_000_000,
      txBytes: 1_000_000,
      timestampMs: 3_000,
    };

    expect(calculateTrafficRates(previous, current)).toEqual({
      downloadMbps: 0,
      uploadMbps: 0,
    });
  });

  it('formats Mbps values for compact dashboard labels', () => {
    expect(formatMbps(0)).toBe('0.0');
    expect(formatMbps(4.24)).toBe('4.2');
    expect(formatMbps(148.88)).toBe('149');
  });

  it('builds stable 15-bar graph values from real rates', () => {
    const bars = buildTrafficBars({downloadMbps: 24, uploadMbps: 6});

    expect(bars).toHaveLength(15);
    expect(Math.min(...bars)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...bars)).toBeLessThanOrEqual(52);
    expect(bars[7]).toBeGreaterThan(bars[0]);
  });
});
