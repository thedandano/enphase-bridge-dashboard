import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  bucketStepFor,
  clockBuckets,
  estimateSlices,
  estimateRequestEnd,
  mergeShortSlices,
  buildCostTimeline,
  sumEstimates,
} from '@/utils/costTimeline';
import type { EstimateResponse, TouInterval, WindowItem } from '@/api/types';

const HOUR = 3600;
const DAY = 86400;
const epoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

function detail(import_kwh = 0, import_cost_usd = 0, export_kwh = 0, export_credit_usd = 0) {
  return { import_kwh, import_cost_usd, export_kwh, export_credit_usd };
}

function estimate(breakdown: Partial<EstimateResponse['breakdown']>): EstimateResponse {
  const full = { peak: detail(), off_peak: detail(), super_off_peak: detail(), ...breakdown };
  const cost = full.peak.import_cost_usd + full.off_peak.import_cost_usd + full.super_off_peak.import_cost_usd;
  const credit = full.peak.export_credit_usd + full.off_peak.export_credit_usd
    + full.super_off_peak.export_credit_usd;
  return {
    period_start: 0,
    period_end: 0,
    net_cost_usd: cost - credit,
    breakdown: full,
    tou_schedule: { id: 1, rate_label: 'TEST', effective_date: null },
    tou_schedules: [],
    computed_at: 0,
    excluded_window_count: 0,
  };
}

function win(window_start: number, wh_grid_import: number, wh_grid_export = 0): WindowItem {
  return { window_start, wh_produced: 0, wh_consumed: 0, wh_grid_import, wh_grid_export, is_complete: true };
}

function interval(start: number, end: number, bracket: TouInterval['bracket'], schedule_id = 1): TouInterval {
  return { start, end, bracket, schedule_id };
}

describe('bucketStepFor', () => {
  it('uses hours for today and 24h, six hours for 7d, days for 30d', () => {
    expect(bucketStepFor('today')).toBe('hour');
    expect(bucketStepFor('24h')).toBe('hour');
    expect(bucketStepFor('7d')).toBe('sixHour');
    expect(bucketStepFor('30d')).toBe('day');
  });
});

describe('clockBuckets', () => {
  it('aligns a 24h range that starts mid-hour to the top of the hour', () => {
    const start = epoch('2026-11-09T10:20:00');
    const edges = clockBuckets(start, start + DAY, 'hour');
    expect(edges[0]).toBe(epoch('2026-11-09T10:00:00'));
    expect(edges).toHaveLength(25);
  });

  it('aligns six-hour buckets to 00/06/12/18 local', () => {
    const start = epoch('2026-11-03T07:45:00');
    const edges = clockBuckets(start, epoch('2026-11-04T00:00:00'), 'sixHour');
    expect(edges).toEqual([
      epoch('2026-11-03T06:00:00'),
      epoch('2026-11-03T12:00:00'),
      epoch('2026-11-03T18:00:00'),
    ]);
  });

  it('aligns day buckets to local midnight', () => {
    const edges = clockBuckets(epoch('2026-10-11T13:00:00'), epoch('2026-10-14T13:00:00'), 'day');
    expect(edges).toEqual([
      epoch('2026-10-11T00:00:00'),
      epoch('2026-10-12T00:00:00'),
      epoch('2026-10-13T00:00:00'),
      epoch('2026-10-14T00:00:00'),
    ]);
  });

  describe('across a DST change', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('gives 25 hourly buckets on the fall-back day and keeps days on midnight', () => {
      vi.stubEnv('TZ', 'America/Los_Angeles');
      const dayStart = Math.floor(new Date(2026, 10, 1).getTime() / 1000);
      const nextDay = Math.floor(new Date(2026, 10, 2).getTime() / 1000);
      expect(clockBuckets(dayStart, nextDay, 'hour')).toHaveLength(25);
      const days = clockBuckets(dayStart, dayStart + 3 * DAY, 'day');
      for (const edge of days) expect(new Date(edge * 1000).getHours()).toBe(0);
    });
  });
});

describe('estimateSlices', () => {
  it('keeps a range inside one month and one schedule as a single slice', () => {
    const start = epoch('2026-11-10T00:00:00');
    const end = start + DAY;
    expect(estimateSlices(start, end, [interval(start, end, 'off_peak')])).toEqual([{ start, end }]);
  });

  it('splits at a local month boundary', () => {
    const start = epoch('2026-10-30T00:00:00');
    const end = epoch('2026-11-02T00:00:00');
    const nov1 = epoch('2026-11-01T00:00:00');
    expect(estimateSlices(start, end, [interval(start, end, 'off_peak')])).toEqual([
      { start, end: nov1 },
      { start: nov1, end },
    ]);
  });

  it('splits where the schedule changes', () => {
    const start = epoch('2026-11-10T00:00:00');
    const change = start + 12 * HOUR;
    const end = start + DAY;
    const intervals = [interval(start, change, 'off_peak', 1), interval(change, end, 'off_peak', 2)];
    expect(estimateSlices(start, end, intervals)).toEqual([
      { start, end: change },
      { start: change, end },
    ]);
  });
});

describe('mergeShortSlices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  const nov1 = epoch('2026-11-01T00:00:00');
  const now = epoch('2026-11-10T12:00:00');

  it('folds a past slice under a day into its neighbour', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slices = [
      { start: nov1 - 10 * HOUR, end: nov1 },
      { start: nov1, end: nov1 + 3 * DAY },
    ];
    expect(mergeShortSlices(slices, now)).toEqual([{ start: nov1 - 10 * HOUR, end: nov1 + 3 * DAY }]);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('keeps a short slice that runs up to now', () => {
    const slices = [{ start: epoch('2026-11-10T00:00:00'), end: now }];
    expect(mergeShortSlices(slices, now)).toEqual(slices);
  });
});

describe('estimateRequestEnd', () => {
  it('stretches a live slice to a full day, which the bridge requires', () => {
    const start = epoch('2026-11-10T00:00:00');
    const now = start + 12 * HOUR;
    expect(estimateRequestEnd({ start, end: now }, now)).toBe(start + DAY);
  });

  it('leaves slices of a day or more alone', () => {
    const start = epoch('2026-11-01T00:00:00');
    expect(estimateRequestEnd({ start, end: start + 3 * DAY }, start + 9 * DAY)).toBe(start + 3 * DAY);
  });
});

describe('buildCostTimeline', () => {
  const start = epoch('2026-11-10T00:00:00');
  const peakStart = epoch('2026-11-10T16:00:00');
  const peakEnd = epoch('2026-11-10T21:00:00');
  const end = start + DAY;
  const intervals = [
    interval(start, peakStart, 'off_peak'),
    interval(peakStart, peakEnd, 'peak'),
    interval(peakEnd, end, 'off_peak'),
  ];

  it('shares each period\'s dollars by kWh so buckets add up to the estimate', () => {
    const windows = [
      win(start + 2 * HOUR, 1000),
      win(start + 3 * HOUR, 3000),
      win(peakStart, 2000, 500),
    ];
    const est = estimate({
      off_peak: detail(4, 1.2),
      peak: detail(2, 1.0, 0.5, 0.25),
    });
    const points = buildCostTimeline({
      windows,
      intervals,
      slices: [{ start, end }],
      estimates: [est],
      bucketStarts: clockBuckets(start, end, 'hour'),
    });

    expect(points).toHaveLength(24);
    expect(points[2].off_peak_cost).toBeCloseTo(0.3);
    expect(points[3].off_peak_cost).toBeCloseTo(0.9);
    // The 16:00 window is the first window of peak, not the last of off-peak.
    expect(points[16].peak_cost).toBeCloseTo(1.0);
    expect(points[16].peak_credit).toBeCloseTo(-0.25);
    expect(points[16].off_peak_cost).toBe(0);
    const total = points.reduce((sum, p) => sum + p.net, 0);
    expect(total).toBeCloseTo(est.net_cost_usd);
    expect(points.at(-1)!.cumulative_net).toBeCloseTo(est.net_cost_usd);
  });

  it('gives a period with no kWh zero dollars instead of failing', () => {
    const points = buildCostTimeline({
      windows: [win(start + HOUR, 0)],
      intervals,
      slices: [{ start, end }],
      estimates: [estimate({})],
      bucketStarts: clockBuckets(start, end, 'hour'),
    });
    expect(points.every((p) => p.net === 0)).toBe(true);
  });

  it('shares each slice\'s own estimate across its own windows', () => {
    const mid = start + 12 * HOUR;
    const slicedIntervals = [interval(start, mid, 'off_peak', 1), interval(mid, end, 'off_peak', 2)];
    const points = buildCostTimeline({
      windows: [win(start + HOUR, 1000), win(mid + HOUR, 1000)],
      intervals: slicedIntervals,
      slices: [{ start, end: mid }, { start: mid, end }],
      estimates: [estimate({ off_peak: detail(1, 0.1) }), estimate({ off_peak: detail(1, 0.5) })],
      bucketStarts: clockBuckets(start, end, 'hour'),
    });
    expect(points[1].off_peak_cost).toBeCloseTo(0.1);
    expect(points[13].off_peak_cost).toBeCloseTo(0.5);
  });

  it('rejects a slice/estimate count mismatch', () => {
    expect(() => buildCostTimeline({
      windows: [],
      intervals,
      slices: [{ start, end }],
      estimates: [],
      bucketStarts: [start],
    })).toThrow(/mismatch/);
  });
});

describe('sumEstimates', () => {
  it('adds net and every period field across slices', () => {
    const total = sumEstimates([
      estimate({ peak: detail(1, 0.5, 2, 0.2) }),
      estimate({ peak: detail(3, 1.5, 0, 0), off_peak: detail(1, 0.3) }),
    ]);
    expect(total.breakdown.peak).toEqual(detail(4, 2, 2, 0.2));
    expect(total.breakdown.off_peak.import_cost_usd).toBeCloseTo(0.3);
    expect(total.net_cost_usd).toBeCloseTo(2.1);
  });
});
