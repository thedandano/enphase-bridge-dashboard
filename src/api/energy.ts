import { apiFetch } from './client';
import type { WindowItem, WindowsResponse } from './types';
import { epochToRfc3339 } from './time';

/** Throws ApiError(status=404) when no windows exist — handle as empty-state, not an error. */
export function fetchLatestWindow(): Promise<WindowItem> {
  return apiFetch<WindowItem>('energy/windows/latest');
}

export function fetchWindows(
  start: number,
  end: number,
  limit: number,
): Promise<WindowsResponse> {
  const params = new URLSearchParams({
    start: epochToRfc3339(start),
    end: epochToRfc3339(end),
    limit: String(limit),
  });
  return apiFetch<WindowsResponse>(`energy/windows?${params.toString()}`);
}
