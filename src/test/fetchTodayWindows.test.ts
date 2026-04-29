import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as energyModule from '@/api/energy';
import * as clientModule from '@/api/client';
import { RANGE_LIMITS } from '@/hooks/useTimeRange';

describe('fetchTodayWindows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls fetchWindows with local midnight as start, current time as end, and limit=96', async () => {
    // Set a fixed time for predictable assertions
    const fixedNow = new Date('2026-04-29T14:30:00Z');
    const fixedNowMs = fixedNow.getTime();
    const fixedNowUnix = Math.floor(fixedNowMs / 1000);
    vi.setSystemTime(fixedNowMs);

    const mockResponse = { windows: [] };
    const apiFetchSpy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockResponse);

    await energyModule.fetchTodayWindows();

    // Extract the call to fetchWindows from the spy
    // Since fetchTodayWindows calls fetchWindows, which calls apiFetch,
    // we need to verify apiFetch was called with the right parameters.
    expect(apiFetchSpy).toHaveBeenCalledTimes(1);

    // The call to apiFetch should contain:
    // - start as RFC3339 of local midnight
    // - end as RFC3339 of fixedNowUnix
    // - limit=96
    const callArg = apiFetchSpy.mock.calls[0][0];
    expect(callArg).toContain('energy/windows?');
    expect(callArg).toContain('limit=96');

    // Parse the URL to extract the start and end parameters
    const url = new URL(`/api/${callArg}`, 'http://localhost');
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');
    const limitParam = url.searchParams.get('limit');

    // Expected midnight in UTC (since TZ=UTC in tests)
    const expectedEndUnix = fixedNowUnix;

    expect(limitParam).toBe('96');
    expect(limitParam).toBe(String(RANGE_LIMITS['today']));

    // Verify the start timestamp represents midnight (00:00:00)
    const startDate = new Date(startParam!);
    expect(startDate.getUTCHours()).toBe(0);
    expect(startDate.getUTCMinutes()).toBe(0);
    expect(startDate.getUTCSeconds()).toBe(0);

    // Verify the end timestamp is approximately now
    const endDate = new Date(endParam!);
    const endDateUnix = Math.floor(endDate.getTime() / 1000);
    expect(endDateUnix).toBe(expectedEndUnix);

    apiFetchSpy.mockRestore();
  });

  it('calls fetchWindows with approximately current time as end (within a few seconds)', async () => {
    const fixedNow = new Date('2026-04-29T12:45:30.500Z');
    const fixedNowMs = fixedNow.getTime();
    const fixedNowUnix = Math.floor(fixedNowMs / 1000);
    vi.setSystemTime(fixedNowMs);

    const mockResponse = { windows: [] };
    const apiFetchSpy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockResponse);

    await energyModule.fetchTodayWindows();

    const callArg = apiFetchSpy.mock.calls[0][0];
    const url = new URL(`/api/${callArg}`, 'http://localhost');
    const endParam = url.searchParams.get('end');

    const endDate = new Date(endParam!);
    const endDateUnix = Math.floor(endDate.getTime() / 1000);

    // End should be within a few seconds of now
    expect(Math.abs(endDateUnix - fixedNowUnix)).toBeLessThanOrEqual(1);

    apiFetchSpy.mockRestore();
  });
});
