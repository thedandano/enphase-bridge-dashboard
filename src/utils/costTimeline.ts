import type { EstimateResponse, PeriodDetail, TimeRange, TouInterval, WindowItem } from '@/api/types';
import { addDays, type TrueupBucketPoint } from './trueupBuckets';

export type CostBucketStep = 'hour' | 'sixHour' | 'day';
type Bracket = TouInterval['bracket'];

const HOUR = 3600;
const SIX_HOURS = 6;
const BRACKETS: readonly Bracket[] = ['peak', 'off_peak', 'super_off_peak'];

const STEP_BY_RANGE: Record<TimeRange, CostBucketStep> = {
  today: 'hour',
  '24h': 'hour',
  '7d': 'sixHour',
  '30d': 'day',
};

export function bucketStepFor(range: TimeRange): CostBucketStep {
  return STEP_BY_RANGE[range];
}

const toEpoch = (d: Date) => Math.floor(d.getTime() / 1000);

function floorToStep(epoch: number, step: CostBucketStep): number {
  const d = new Date(epoch * 1000);
  if (step === 'day') d.setHours(0, 0, 0, 0);
  else if (step === 'sixHour') d.setHours(d.getHours() - (d.getHours() % SIX_HOURS), 0, 0, 0);
  else d.setMinutes(0, 0, 0);
  return toEpoch(d);
}

function nextEdge(edge: number, step: CostBucketStep): number {
  // Plain seconds for hours, so the repeated fall-back hour gets its own bucket.
  if (step === 'hour') return edge + HOUR;
  if (step === 'day') return addDays(edge, 1);
  const d = new Date(edge * 1000);
  return toEpoch(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + SIX_HOURS));
}

/** Bucket start edges aligned to the local clock; bucket i runs to edge i+1 (or the range end). */
export function clockBuckets(start: number, end: number, step: CostBucketStep): number[] {
  const edges: number[] = [];
  for (let edge = floorToStep(start, step); edge < end; edge = nextEdge(edge, step)) {
    edges.push(edge);
  }
  return edges;
}

export interface EstimateSlice {
  start: number;
  end: number;
}

function monthStartsBetween(start: number, end: number): number[] {
  const starts: number[] = [];
  const d = new Date(start * 1000);
  for (let m = new Date(d.getFullYear(), d.getMonth() + 1, 1); toEpoch(m) < end;
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    starts.push(toEpoch(m));
  }
  return starts;
}

// The bridge ranks peak/off-peak/super off-peak per calendar month and per
// schedule revision, so one period's dollars can only be shared out within a
// slice that has a single month and a single schedule.
// shortcut: months use the browser's timezone, not the utility's; upgrade if they ever differ.
export function estimateSlices(
  start: number,
  end: number,
  intervals: readonly TouInterval[],
): EstimateSlice[] {
  const scheduleChanges = intervals
    .filter((iv, i) => i > 0 && iv.schedule_id !== intervals[i - 1].schedule_id)
    .map((iv) => iv.start);
  const cuts = [...new Set([...monthStartsBetween(start, end), ...scheduleChanges])]
    .filter((t) => t > start && t < end)
    .sort((a, b) => a - b);
  const edges = [start, ...cuts, end];
  return edges.slice(0, -1).map((s, i) => ({ start: s, end: edges[i + 1] }));
}

const DAY = 86400;

// The bridge rejects an estimate shorter than a day (it checks the range before
// adding its inclusive-end day). A short slice that ends before now can't be
// asked for on its own, so it joins its neighbour, which blends that neighbour's
// month or schedule for under a day. A short slice reaching now is fine: its
// request is stretched to a day, and no windows exist past now.
export function mergeShortSlices(slices: readonly EstimateSlice[], now: number): EstimateSlice[] {
  const merged = slices.map((s) => ({ ...s }));
  for (let i = 0; i < merged.length && merged.length > 1; ) {
    const s = merged[i];
    if (s.end - s.start >= DAY || s.end >= now) {
      i += 1;
      continue;
    }
    console.warn(
      `[costTimeline] slice ${new Date(s.start * 1000).toISOString()} is under a day; ` +
        'pricing it with its neighbouring slice',
    );
    if (i > 0) merged[i - 1].end = s.end;
    else merged[1].start = s.start;
    merged.splice(i, 1);
  }
  return merged;
}

/** End to send for a slice: at least a day past its start, which the bridge requires. */
export function estimateRequestEnd(slice: EstimateSlice, now: number): number {
  const end = Math.max(slice.end, slice.start + DAY);
  if (end > slice.end && slice.end < now) {
    console.warn(
      `[costTimeline] ${new Date(slice.start * 1000).toISOString()} is a short past period ` +
        '(e.g. a DST day); its estimate also counts windows after it ends',
    );
  }
  return end;
}

// Index of the last start <= t, or -1. Inputs are sorted ascending.
function indexAt(starts: readonly number[], t: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

interface PricedWindow {
  window: WindowItem;
  slice: number;
  bracket: Bracket;
}

type SliceTotals = Record<Bracket, { importWh: number; exportWh: number }>;

function emptyTotals(): SliceTotals {
  return {
    peak: { importWh: 0, exportWh: 0 },
    off_peak: { importWh: 0, exportWh: 0 },
    super_off_peak: { importWh: 0, exportWh: 0 },
  };
}

function emptyPoint(start: number): TrueupBucketPoint {
  return {
    start,
    peak_cost: 0,
    off_peak_cost: 0,
    super_off_peak_cost: 0,
    peak_credit: 0,
    off_peak_credit: 0,
    super_off_peak_credit: 0,
    net: 0,
    cumulative_net: 0,
  };
}

const share = (part: number, whole: number, dollars: number) =>
  whole > 0 ? (part / whole) * dollars : 0;

// Dollars the bridge priced that no window here can carry (the two sides saw
// different windows) would silently vanish from the chart, so say so.
function warnUnallocated(totals: readonly SliceTotals[], estimates: readonly EstimateResponse[]) {
  totals.forEach((sliceTotals, s) => {
    for (const bracket of BRACKETS) {
      const priced = estimates[s].breakdown[bracket];
      const { importWh, exportWh } = sliceTotals[bracket];
      if ((priced.import_cost_usd > 0 && importWh === 0) || (priced.export_credit_usd > 0 && exportWh === 0)) {
        console.warn(
          `[costTimeline] ${bracket} dollars in slice ${s} have no matching windows; ` +
            'the chart will total less than the estimate',
        );
      }
    }
  });
}

export interface CostTimelineInput {
  windows: readonly WindowItem[];
  intervals: readonly TouInterval[];
  slices: readonly EstimateSlice[];
  estimates: readonly EstimateResponse[];
  bucketStarts: readonly number[];
}

/**
 * Shares each slice's per-period dollars across time buckets by each bucket's
 * share of that period's kWh, so the buckets add back up to the bridge's totals.
 */
export function buildCostTimeline(input: CostTimelineInput): TrueupBucketPoint[] {
  const { windows, intervals, slices, estimates, bucketStarts } = input;
  // Positional pairing; a mismatch would price one slice with another's dollars.
  if (slices.length !== estimates.length) {
    throw new Error(`cost timeline mismatch: ${slices.length} slices, ${estimates.length} estimates`);
  }

  const sliceStarts = slices.map((s) => s.start);
  const intervalStarts = intervals.map((iv) => iv.start);
  const totals = slices.map(emptyTotals);
  const priced: PricedWindow[] = [];

  for (const window of windows) {
    const slice = indexAt(sliceStarts, window.window_start);
    const iv = intervals[indexAt(intervalStarts, window.window_start)];
    if (slice < 0 || window.window_start >= slices[slice].end || !iv) continue;
    totals[slice][iv.bracket].importWh += window.wh_grid_import;
    totals[slice][iv.bracket].exportWh += window.wh_grid_export;
    priced.push({ window, slice, bracket: iv.bracket });
  }
  warnUnallocated(totals, estimates);

  const points = bucketStarts.map(emptyPoint);
  for (const { window, slice, bracket } of priced) {
    const point = points[indexAt(bucketStarts, window.window_start)];
    if (!point) continue;
    const dollars = estimates[slice].breakdown[bracket];
    const sliceTotals = totals[slice][bracket];
    point[`${bracket}_cost`] += share(window.wh_grid_import, sliceTotals.importWh, dollars.import_cost_usd);
    // Credits are stored negated so they stack below zero, like toBucketPoints.
    point[`${bracket}_credit`] -= share(window.wh_grid_export, sliceTotals.exportWh, dollars.export_credit_usd);
  }

  let running = 0;
  for (const point of points) {
    point.net = BRACKETS.reduce((sum, b) => sum + point[`${b}_cost`] + point[`${b}_credit`], 0);
    running += point.net;
    point.cumulative_net = running;
  }
  return points;
}

function addDetail(a: PeriodDetail, b: PeriodDetail): PeriodDetail {
  return {
    import_kwh: a.import_kwh + b.import_kwh,
    export_kwh: a.export_kwh + b.export_kwh,
    import_cost_usd: a.import_cost_usd + b.import_cost_usd,
    export_credit_usd: a.export_credit_usd + b.export_credit_usd,
  };
}

export type EstimateTotals = Pick<EstimateResponse, 'net_cost_usd' | 'breakdown'>;

export function sumEstimates(estimates: readonly EstimateResponse[]): EstimateTotals {
  const zero: PeriodDetail = { import_kwh: 0, export_kwh: 0, import_cost_usd: 0, export_credit_usd: 0 };
  return estimates.reduce<EstimateTotals>(
    (acc, e) => ({
      net_cost_usd: acc.net_cost_usd + e.net_cost_usd,
      breakdown: {
        peak: addDetail(acc.breakdown.peak, e.breakdown.peak),
        off_peak: addDetail(acc.breakdown.off_peak, e.breakdown.off_peak),
        super_off_peak: addDetail(acc.breakdown.super_off_peak, e.breakdown.super_off_peak),
      },
    }),
    { net_cost_usd: 0, breakdown: { peak: zero, off_peak: zero, super_off_peak: zero } },
  );
}
