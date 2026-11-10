import { describe, it, expect, vi, afterEach } from 'vitest';
import * as clientModule from '@/api/client';
import { fetchWindows } from '@/api/energy';
import { fetchCostTimeline } from '@/api/tou';

const epoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const zero = { import_kwh: 0, export_kwh: 0, import_cost_usd: 0, export_credit_usd: 0 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchWindows', () => {
  it('sends formula_filter only when asked', async () => {
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue({ windows: [] });
    await fetchWindows(0, 900, 10);
    await fetchWindows(0, 900, 10, 'current');
    expect(spy.mock.calls[0][0]).not.toContain('formula_filter');
    expect(spy.mock.calls[1][0]).toContain('formula_filter=current');
  });
});

describe('fetchCostTimeline', () => {
  const start = epoch('2026-10-31T00:00:00');
  const nov1 = epoch('2026-11-01T00:00:00');
  const end = epoch('2026-11-02T00:00:00');

  function stubBridge() {
    return vi.spyOn(clientModule, 'apiFetch').mockImplementation(async (path: string) => {
      if (path.startsWith('energy/windows')) {
        return { windows: [{ window_start: start, wh_produced: 0, wh_consumed: 0,
          wh_grid_import: 1000, wh_grid_export: 0, is_complete: true }], total: 1, limit: 2880, offset: 0 };
      }
      if (path.startsWith('tou/intervals')) {
        return { timezone: 'UTC', schedules: [{ id: 1, source_id: 'x' }],
          intervals: [{ start, end, bracket: 'off_peak', schedule_id: 1 }] };
      }
      return { net_cost_usd: 0.3, breakdown: { peak: zero, off_peak: { ...zero, import_kwh: 1, import_cost_usd: 0.3 },
        super_off_peak: zero }, excluded_window_count: 0 };
    });
  }

  it('asks for one estimate per month slice and prices current windows only', async () => {
    const spy = stubBridge();
    const result = await fetchCostTimeline(start, end, 'day');
    const paths = spy.mock.calls.map((c) => c[0] as string);
    expect(paths.find((p) => p.startsWith('energy/windows'))).toContain('formula_filter=current');
    expect(paths.filter((p) => p.startsWith('trueup/estimate'))).toHaveLength(2);
    expect(result.estimates).toHaveLength(2);
    expect(result.points.map((p) => p.start)).toEqual([start, nov1]);
    expect(result.points[0].off_peak_cost).toBeCloseTo(0.3);
  });

  it('prices a live partial day up to now without a short-period warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const now = nov1 + 9 * 3600;
    const spy = vi.spyOn(clientModule, 'apiFetch').mockImplementation(async (path: string) => {
      if (path.startsWith('energy/windows')) return { windows: [], total: 0, limit: 2880, offset: 0 };
      if (path.startsWith('tou/intervals')) {
        return { timezone: 'UTC', schedules: [{ id: 1, source_id: 'x' }],
          intervals: [{ start: nov1, end: now, bracket: 'off_peak', schedule_id: 1 }] };
      }
      return { net_cost_usd: 0, breakdown: { peak: zero, off_peak: zero, super_off_peak: zero },
        excluded_window_count: 0 };
    });
    await fetchCostTimeline(nov1, now, 'hour', now);
    const estimatePath = spy.mock.calls.map((c) => c[0] as string).find((p) => p.startsWith('trueup/estimate'))!;
    // The bridge needs a full day; fetchTrueupEstimate shifts the end back a day, so it sends `start`.
    expect(decodeURIComponent(estimatePath)).toContain(`end=${new Date(nov1 * 1000).toISOString()}`);
    expect(warn).not.toHaveBeenCalled();
  });
});
