import { afterEach, expect, it, vi } from 'vitest';
import { nextLocalMidnightUnix } from '@/hooks/useTimeRange';
afterEach(() => vi.unstubAllEnvs());
it.each([['2026-03-08T00:00:00-08:00', 23], ['2026-11-01T00:00:00-07:00', 25]])('advances %s to the next local midnight (%s hours)', (date, hours) => {
  vi.stubEnv('TZ', 'America/Los_Angeles');
  const start = Date.parse(date) / 1000;
  const end = nextLocalMidnightUnix(start);
  expect(end - start).toBe(hours * 3600);
  expect(new Date(end * 1000).getHours()).toBe(0);
});
