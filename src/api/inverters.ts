import { apiFetch } from './client';
import type {
  ArraysResponse,
  SnapshotsResponse,
  WindowInvertersResponse,
} from './types';
import { epochToRfc3339 } from './time';

export interface FetchSnapshotsParams {
  start: number;
  end: number;
  serial?: string;
  limit?: number;
  offset?: number;
}

export function fetchSnapshots(params: FetchSnapshotsParams): Promise<SnapshotsResponse> {
  const query = new URLSearchParams({
    start: epochToRfc3339(params.start),
    end: epochToRfc3339(params.end),
  });
  if (params.serial !== undefined) {
    query.set('serial', params.serial);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  return apiFetch<SnapshotsResponse>(`inverters/snapshots?${query.toString()}`);
}

export function fetchSnapshotsByWindow(windowStart: number): Promise<WindowInvertersResponse> {
  return apiFetch<WindowInvertersResponse>(`inverters/snapshots/window/${windowStart}`);
}

export function fetchArrays(): Promise<ArraysResponse> {
  return apiFetch<ArraysResponse>('inverters/arrays');
}

export async function fetchSnapshotHistory(start: number, end: number): Promise<{ data: SnapshotsResponse; incomplete: boolean }> {
  const pageLimit = 2000;
  // ponytail: 50k samples covers 30 days for 12 panels; larger sites get an explicit partial result.
  const ceiling = 50000;
  const snapshots = new Map<string, SnapshotsResponse['snapshots'][number]>();
  let offset = 0;
  let total = 0;
  let finished = false;
  let hasGlobalTotal = false;
  while (offset < ceiling) {
    const limit = Math.min(pageLimit, ceiling - offset);
    const page = await fetchSnapshots({ start, end, limit, offset });
    total = Math.max(total, page.total);
    hasGlobalTotal ||= page.total > page.snapshots.length;
    for (const snapshot of page.snapshots) snapshots.set(`${snapshot.window_start}:${snapshot.serial_number}`, snapshot);
    offset += page.snapshots.length;
    if (page.snapshots.length === 0 || (hasGlobalTotal && offset >= total) || (page.snapshots.length < limit && offset >= total)) { finished = true; break; }
  }
  return { data: { snapshots: [...snapshots.values()], total: Math.max(total, offset), offset: 0, limit: snapshots.size }, incomplete: !finished || offset < total };
}
