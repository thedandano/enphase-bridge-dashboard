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
  return apiFetch<SnapshotsResponse>(`inverters/snapshots?${query.toString()}`);
}

export function fetchSnapshotsByWindow(windowStart: number): Promise<WindowInvertersResponse> {
  return apiFetch<WindowInvertersResponse>(`inverters/snapshots/window/${windowStart}`);
}

export function fetchArrays(): Promise<ArraysResponse> {
  return apiFetch<ArraysResponse>('inverters/arrays');
}
