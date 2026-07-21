import type { EstimateResponse } from '@/api/types';

export type BucketSize = 'day' | 'week' | 'month';

export interface Bucket {
  start: number; // Unix epoch, local midnight of bucket start
  end: number;   // Unix epoch, exclusive
}

export interface TrueupBucketPoint {
  start: number;
  peak_cost: number;
  off_peak_cost: number;
  super_off_peak_cost: number;
  peak_credit: number;
  off_peak_credit: number;
  super_off_peak_credit: number;
  net: number;
  cumulative_net: number;
}

// Hard ceiling on requests per Fetch — the bridge answers one estimate call per
// bucket, so bucket size steps up rather than letting call count grow.
export const MAX_BUCKETS = 16;

const DAY = 86400;

function localDayStart(epochSeconds: number): number {
  const d = new Date(epochSeconds * 1000);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function addMonth(epochSeconds: number): number {
  const d = new Date(epochSeconds * 1000);
  d.setMonth(d.getMonth() + 1);
  return Math.floor(d.getTime() / 1000);
}

// Coarsest resolution that keeps the range within MAX_BUCKETS calls.
export function chooseBucketSize(start: number, end: number): BucketSize {
  const days = Math.max(1, Math.ceil((end - start) / DAY));
  if (days <= 14) return 'day';
  if (days <= 112) return 'week';
  return 'month';
}

export function buildBuckets(start: number, end: number, size: BucketSize): Bucket[] {
  const buckets: Bucket[] = [];
  let cursor = localDayStart(start);

  while (cursor < end && buckets.length < MAX_BUCKETS) {
    const next =
      size === 'month' ? addMonth(cursor) : cursor + (size === 'week' ? 7 * DAY : DAY);
    buckets.push({ start: cursor, end: Math.min(next, end) });
    cursor = next;
  }

  return buckets;
}

// Flattens one estimate into a chart point. Credits are negated so the chart
// mirrors below the zero axis, matching the EnergyChart convention.
export function toBucketPoint(
  start: number,
  estimate: EstimateResponse,
  runningNet: number,
): TrueupBucketPoint {
  const { peak, off_peak, super_off_peak } = estimate.breakdown;
  const cumulative_net = runningNet + estimate.net_cost_usd;

  return {
    start,
    peak_cost: peak.import_cost_usd,
    off_peak_cost: off_peak.import_cost_usd,
    super_off_peak_cost: super_off_peak.import_cost_usd,
    peak_credit: -peak.export_credit_usd,
    off_peak_credit: -off_peak.export_credit_usd,
    super_off_peak_credit: -super_off_peak.export_credit_usd,
    net: estimate.net_cost_usd,
    cumulative_net,
  };
}

export function toBucketPoints(
  buckets: readonly Bucket[],
  estimates: readonly EstimateResponse[],
): TrueupBucketPoint[] {
  let running = 0;
  return buckets.map((bucket, idx) => {
    const point = toBucketPoint(bucket.start, estimates[idx], running);
    running = point.cumulative_net;
    return point;
  });
}
