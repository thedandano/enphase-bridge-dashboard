import { describe, it, expect, vi, afterEach } from 'vitest';
import * as clientModule from '@/api/client';
import { fetchTrueupEstimate } from '@/api/tou';

const DAY = 86400;

function queriedRange(path: string): { start: string; end: string } {
  const params = new URLSearchParams(path.split('?')[1]);
  return { start: params.get('start')!, end: params.get('end')! };
}

describe('fetchTrueupEstimate range handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The bridge treats `end` as inclusive of the whole day it lands in. Callers
  // pass a half-open [start, end) range, so the request must shift end back a
  // day — otherwise adjacent buckets overlap and double-count energy.
  it('shifts the requested end back one day', async () => {
    const spy = vi
      .spyOn(clientModule, 'apiFetch')
      .mockResolvedValue({} as never);

    const start = Date.UTC(2026, 6, 1) / 1000;
    const end = start + 7 * DAY;
    await fetchTrueupEstimate(start, end);

    const { start: qStart, end: qEnd } = queriedRange(spy.mock.calls[0][0]);
    expect(qStart).toBe(new Date(start * 1000).toISOString());
    expect(qEnd).toBe(new Date((end - DAY) * 1000).toISOString());
  });

  it('requests start === end for a single-day range', async () => {
    const spy = vi
      .spyOn(clientModule, 'apiFetch')
      .mockResolvedValue({} as never);

    const start = Date.UTC(2026, 6, 1) / 1000;
    await fetchTrueupEstimate(start, start + DAY);

    const { start: qStart, end: qEnd } = queriedRange(spy.mock.calls[0][0]);
    expect(qEnd).toBe(qStart);
  });
});
