import { apiFetch } from './client';
import type { EstimateResponse, TouRefreshResponse, TouIntervalsResponse } from './types';
import { epochToRfc3339 } from './time';
import { fetchWindows } from './energy';
import { validateTouIntervals } from '@/utils/touIntervals';
import {
  buildCostTimeline,
  clockBuckets,
  estimateRequestEnd,
  estimateSlices,
  mergeShortSlices,
  type CostBucketStep,
} from '@/utils/costTimeline';
import {
  buildBuckets,
  bucketsAreTruncated,
  chooseBucketSize,
  toBucketPoints,
  type TrueupBucketPoint,
} from '@/utils/trueupBuckets';

export function refreshTou(): Promise<TouRefreshResponse> {
  return apiFetch<TouRefreshResponse>('tou/refresh', { method: 'POST' });
}

const DAY_SECONDS = 86400;

// The bridge treats `end` as inclusive of the whole day it falls in: asking for
// Jul 1 -> Jul 8 returns Jul 1 -> Jul 9. Callers here pass a half-open [start, end)
// range, so shift `end` back a day to get the range that was actually asked for.
// Without this, adjacent buckets overlap by a day and double-count energy.
export function fetchTrueupEstimate(start: number, end: number): Promise<EstimateResponse> {
  const params = new URLSearchParams({
    start: epochToRfc3339(start),
    end: epochToRfc3339(end - DAY_SECONDS),
  });
  return apiFetch<EstimateResponse>(`trueup/estimate?${params.toString()}`);
}

// The bridge exposes no time-series endpoint, so a per-bucket series costs one
// estimate call per bucket. Bucket size steps up with range length to cap the
// call count at MAX_BUCKETS; batches keep concurrent load on the daemon low.
const FETCH_BATCH_SIZE = 4;

export interface TrueupSeries {
  points: TrueupBucketPoint[];
  /** Set when MAX_BUCKETS cut the range short; the epoch the chart stops at. */
  truncatedAt: number | null;
}

export async function fetchTrueupSeries(
  start: number,
  end: number,
): Promise<TrueupSeries> {
  const buckets = buildBuckets(start, end, chooseBucketSize(start, end));
  const estimates: EstimateResponse[] = [];

  for (let i = 0; i < buckets.length; i += FETCH_BATCH_SIZE) {
    const batch = buckets.slice(i, i + FETCH_BATCH_SIZE);
    // Any bucket failing rejects the whole series — no silent gaps in the chart.
    const results = await Promise.all(
      batch.map((b) => fetchTrueupEstimate(b.start, b.end)),
    );
    estimates.push(...results);
  }

  const truncated = bucketsAreTruncated(buckets, end);
  if (truncated) {
    console.warn(
      `[trueup] range exceeds MAX_BUCKETS; chart covers through ` +
        `${new Date(buckets[buckets.length - 1].end * 1000).toISOString()} ` +
        `of a range ending ${new Date(end * 1000).toISOString()}`,
    );
  }

  return {
    points: toBucketPoints(buckets, estimates),
    truncatedAt: truncated ? buckets[buckets.length - 1].end : null,
  };
}

// The bridge clamps energy/windows to 2880 rows: exactly 30 days of 15-minute
// windows, the longest range the selector offers. It reports only the rows it
// returned, so an overflow can't be detected here; keep ranges at 30 days or less.
const WINDOW_FETCH_LIMIT = 2880;

export interface CostTimeline {
  points: TrueupBucketPoint[];
  estimates: EstimateResponse[];
}

// Bridge dollars shared out across clock-aligned buckets. One estimate per
// month/schedule slice; any failure rejects the whole timeline (no silent gaps).
// For a live range pass end === now, read once, so windows, slices and the
// stretched live estimate all stop at the same second.
export async function fetchCostTimeline(
  start: number,
  end: number,
  step: CostBucketStep,
  now: number = Math.floor(Date.now() / 1000),
): Promise<CostTimeline> {
  const [windowsResponse, tou] = await Promise.all([
    fetchWindows(start, end, WINDOW_FETCH_LIMIT, 'current'),
    fetchTouIntervals(start, end),
  ]);
  const slices = mergeShortSlices(estimateSlices(start, end, tou.intervals), now);
  const estimates = await Promise.all(
    slices.map((s) => fetchTrueupEstimate(s.start, estimateRequestEnd(s, now))),
  );
  const points = buildCostTimeline({
    windows: windowsResponse.windows,
    intervals: tou.intervals,
    slices,
    estimates,
    bucketStarts: clockBuckets(start, end, step),
  });
  return { points, estimates };
}

export async function fetchTouIntervals(start: number, end: number): Promise<TouIntervalsResponse> {
  const params = new URLSearchParams({ start: String(start), end: String(end) });
  const data = await apiFetch<TouIntervalsResponse>(`tou/intervals?${params}`);
  return validateTouIntervals(data, start, end);
}
