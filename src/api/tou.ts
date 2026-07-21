import { apiFetch } from './client';
import type { EstimateResponse, TouRefreshResponse } from './types';
import { epochToRfc3339 } from './time';
import {
  buildBuckets,
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

export async function fetchTrueupSeries(
  start: number,
  end: number,
): Promise<TrueupBucketPoint[]> {
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

  return toBucketPoints(buckets, estimates);
}
