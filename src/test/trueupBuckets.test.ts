import { describe, it, expect } from 'vitest';
import {
  chooseBucketSize,
  buildBuckets,
  toBucketPoints,
  bucketsAreTruncated,
  MAX_BUCKETS,
} from '@/utils/trueupBuckets';
import type { EstimateResponse } from '@/api/types';

const DAY = 86400;
const START = Math.floor(new Date('2026-01-01T00:00:00').getTime() / 1000);

function estimate(net: number, overrides: Partial<EstimateResponse['breakdown']> = {}) {
  const zero = {
    import_kwh: 0,
    export_kwh: 0,
    import_cost_usd: 0,
    export_credit_usd: 0,
  };
  return {
    period_start: 0,
    period_end: 0,
    net_cost_usd: net,
    breakdown: {
      peak: { ...zero },
      off_peak: { ...zero },
      super_off_peak: { ...zero },
      ...overrides,
    },
    tou_schedule: { id: 1, rate_label: 'TEST', effective_date: null },
    computed_at: 0,
  } as EstimateResponse;
}

describe('chooseBucketSize', () => {
  it('uses days for short ranges', () => {
    expect(chooseBucketSize(START, START + 14 * DAY)).toBe('day');
  });

  it('uses weeks for mid ranges', () => {
    expect(chooseBucketSize(START, START + 30 * DAY)).toBe('week');
  });

  it('uses months for long ranges', () => {
    expect(chooseBucketSize(START, START + 365 * DAY)).toBe('month');
  });
});

describe('buildBuckets', () => {
  it('produces one bucket per day and clamps the last to the range end', () => {
    const buckets = buildBuckets(START, START + 3 * DAY, 'day');
    expect(buckets).toHaveLength(3);
    expect(buckets[0].start).toBe(START);
    expect(buckets[2].end).toBe(START + 3 * DAY);
  });

  it('never exceeds MAX_BUCKETS', () => {
    const buckets = buildBuckets(START, START + 400 * DAY, 'day');
    expect(buckets).toHaveLength(MAX_BUCKETS);
  });

  it('steps months by calendar, not by fixed 30 days', () => {
    const buckets = buildBuckets(START, START + 90 * DAY, 'month');
    // Jan has 31 days, so the second bucket starts Feb 1.
    expect(buckets[1].start - buckets[0].start).toBe(31 * DAY);
  });

  it('covers a partial trailing day', () => {
    const buckets = buildBuckets(START, START + DAY + 3600, 'day');
    expect(buckets).toHaveLength(2);
    expect(buckets[1].end).toBe(START + DAY + 3600);
  });
});

describe('toBucketPoints', () => {
  it('negates credits so they render below the zero axis', () => {
    const buckets = buildBuckets(START, START + DAY, 'day');
    const points = toBucketPoints(buckets, [
      estimate(-5, {
        peak: {
          import_kwh: 0,
          export_kwh: 10,
          import_cost_usd: 2,
          export_credit_usd: 7,
        },
      }),
    ]);
    expect(points[0].peak_cost).toBe(2);
    expect(points[0].peak_credit).toBe(-7);
  });

  it('accumulates net across buckets', () => {
    const buckets = buildBuckets(START, START + 3 * DAY, 'day');
    const points = toBucketPoints(buckets, [estimate(10), estimate(-4), estimate(-9)]);
    expect(points.map((p) => p.cumulative_net)).toEqual([10, 6, -3]);
  });
});

describe('addMonth boundary handling', () => {
  // Date.setMonth overflows: Jan 31 + 1 month lands on Mar 3, skipping February.
  it('clamps to the last day of a shorter month instead of overflowing', () => {
    const jan31 = Math.floor(new Date('2026-01-31T00:00:00').getTime() / 1000);
    const buckets = buildBuckets(jan31, jan31 + 120 * DAY, 'month');
    const secondStart = new Date(buckets[1].start * 1000);
    expect(secondStart.getMonth()).toBe(1); // February, not March
    expect(secondStart.getDate()).toBe(28); // 2026 is not a leap year
  });

  it('keeps the day of month when the target month is long enough', () => {
    const jan15 = Math.floor(new Date('2026-01-15T00:00:00').getTime() / 1000);
    const buckets = buildBuckets(jan15, jan15 + 120 * DAY, 'month');
    const secondStart = new Date(buckets[1].start * 1000);
    expect(secondStart.getMonth()).toBe(1);
    expect(secondStart.getDate()).toBe(15);
  });
});

describe('bucketsAreTruncated', () => {
  it('reports truncation when MAX_BUCKETS cuts the range short', () => {
    const end = START + 400 * DAY;
    const buckets = buildBuckets(START, end, 'day');
    expect(buckets).toHaveLength(MAX_BUCKETS);
    expect(bucketsAreTruncated(buckets, end)).toBe(true);
  });

  it('reports no truncation when the buckets reach the range end', () => {
    const end = START + 3 * DAY;
    expect(bucketsAreTruncated(buildBuckets(START, end, 'day'), end)).toBe(false);
  });

  it('reports no truncation for an empty bucket list', () => {
    expect(bucketsAreTruncated([], START)).toBe(false);
  });
});

describe('toBucketPoints input validation', () => {
  // Positional pairing means a length mismatch would attribute one bucket's
  // numbers to another's date.
  it('throws rather than mispairing when lengths disagree', () => {
    const buckets = buildBuckets(START, START + 3 * DAY, 'day');
    expect(() => toBucketPoints(buckets, [estimate(1)])).toThrow(/mismatch/);
  });
});
