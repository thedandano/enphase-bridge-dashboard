import { apiFetch } from './client';
import type { EstimateResponse, TouRefreshResponse } from './types';
import { epochToRfc3339 } from './time';

export function refreshTou(): Promise<TouRefreshResponse> {
  return apiFetch<TouRefreshResponse>('tou/refresh', { method: 'POST' });
}

export function fetchTrueupEstimate(start: number, end: number): Promise<EstimateResponse> {
  const params = new URLSearchParams({ start: epochToRfc3339(start), end: epochToRfc3339(end) });
  return apiFetch<EstimateResponse>(`trueup/estimate?${params.toString()}`);
}
