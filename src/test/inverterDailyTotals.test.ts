import { describe, it, expect } from 'vitest';
import {
  computeDailyTotals,
  computeMedian,
  formatKwh,
  formatRelativeTime,
  formatSignedPercent,
} from '@/utils/inverterDailyTotals';
import type { SnapshotItem } from '@/api/types';

const snap = (overrides: Partial<SnapshotItem> = {}): SnapshotItem => ({
  window_start: 1714262400,
  serial_number: 'S1',
  watts_output: 0,
  is_online: true,
  ...overrides,
});

describe('computeDailyTotals', () => {
  it('returns empty array for no snapshots', () => {
    expect(computeDailyTotals([])).toEqual([]);
  });

  it('converts watts_output to Wh assuming 15-min windows', () => {
    const rows = computeDailyTotals([snap({ serial_number: 'S1', watts_output: 240 })]);
    expect(rows).toEqual([
      { serial: 'S1', whTotal: 60, isOnline: true, wasActive: true, latestWindow: 1714262400 },
    ]);
  });

  it('marks an inverter as active when it produced energy at any point', () => {
    const rows = computeDailyTotals([
      // produced earlier in the day, then went offline (e.g., post-sunset)
      snap({ serial_number: 'S1', watts_output: 200, is_online: true, window_start: 1 }),
      snap({ serial_number: 'S1', watts_output: 0, is_online: false, window_start: 100 }),
    ]);
    expect(rows[0].wasActive).toBe(true);
    expect(rows[0].isOnline).toBe(false);
  });

  it('marks an inverter as inactive only when it never produced and was never online', () => {
    const rows = computeDailyTotals([
      snap({ serial_number: 'S1', watts_output: 0, is_online: false, window_start: 1 }),
      snap({ serial_number: 'S1', watts_output: 0, is_online: false, window_start: 2 }),
    ]);
    expect(rows[0].wasActive).toBe(false);
  });

  it('sums watts across multiple windows for the same serial', () => {
    const rows = computeDailyTotals([
      snap({ serial_number: 'S1', watts_output: 200, window_start: 1 }),
      snap({ serial_number: 'S1', watts_output: 400, window_start: 2 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].whTotal).toBeCloseTo(150);
  });

  it('uses online status from the latest window per serial', () => {
    const rows = computeDailyTotals([
      snap({ serial_number: 'S1', is_online: true, window_start: 1 }),
      snap({ serial_number: 'S1', is_online: false, window_start: 2 }),
    ]);
    expect(rows[0].isOnline).toBe(false);
    expect(rows[0].latestWindow).toBe(2);
  });

  it('sorts results alphabetically by serial', () => {
    const rows = computeDailyTotals([
      snap({ serial_number: 'C' }),
      snap({ serial_number: 'A' }),
      snap({ serial_number: 'B' }),
    ]);
    expect(rows.map((r) => r.serial)).toEqual(['A', 'B', 'C']);
  });
});

describe('formatKwh', () => {
  it('formats Wh as kWh with 2 decimals', () => {
    expect(formatKwh(0)).toBe('0.00 kWh');
    expect(formatKwh(1234)).toBe('1.23 kWh');
    expect(formatKwh(2510)).toBe('2.51 kWh');
  });
});

describe('computeMedian', () => {
  it('returns 0 for an empty array', () => {
    expect(computeMedian([])).toBe(0);
  });

  it('returns the single value', () => {
    expect(computeMedian([42])).toBe(42);
  });

  it('returns the middle value for odd-length arrays', () => {
    expect(computeMedian([3, 1, 2])).toBe(2);
    expect(computeMedian([1, 2, 3, 4, 5])).toBe(3);
  });

  it('returns the average of the two middles for even-length arrays', () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
    expect(computeMedian([2.48, 2.49])).toBeCloseTo(2.485, 5);
  });

  it('does not mutate the input array', () => {
    const input = [3, 1, 2];
    computeMedian(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('formatSignedPercent', () => {
  it('formats positive deviations with + sign', () => {
    expect(formatSignedPercent(0.052)).toBe('+5.2%');
  });

  it('formats negative deviations with a unicode minus', () => {
    expect(formatSignedPercent(-0.107)).toBe('−10.7%');
  });

  it('rounds zero-ish values cleanly', () => {
    expect(formatSignedPercent(0)).toBe('0%');
    expect(formatSignedPercent(0.0001)).toBe('0%');
  });

  it('respects the decimals argument', () => {
    expect(formatSignedPercent(0.0526, 2)).toBe('+5.26%');
  });
});

describe('formatRelativeTime', () => {
  const NOW = 1714508400; // arbitrary fixed epoch seconds

  it('returns "just now" for sub-minute diffs', () => {
    expect(formatRelativeTime(NOW - 5, NOW)).toBe('just now');
    expect(formatRelativeTime(NOW - 59, NOW)).toBe('just now');
  });

  it('returns minute granularity below an hour', () => {
    expect(formatRelativeTime(NOW - 60, NOW)).toBe('1m ago');
    expect(formatRelativeTime(NOW - 5 * 60, NOW)).toBe('5m ago');
  });

  it('returns hour granularity below a day', () => {
    expect(formatRelativeTime(NOW - 3600, NOW)).toBe('1h ago');
    expect(formatRelativeTime(NOW - 6 * 3600, NOW)).toBe('6h ago');
  });

  it('returns day granularity for older timestamps', () => {
    expect(formatRelativeTime(NOW - 86400, NOW)).toBe('1d ago');
    expect(formatRelativeTime(NOW - 3 * 86400, NOW)).toBe('3d ago');
  });

  it('clamps future timestamps to "just now"', () => {
    expect(formatRelativeTime(NOW + 100, NOW)).toBe('just now');
  });
});
