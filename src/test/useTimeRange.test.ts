import { describe, it, expect } from 'vitest';
import { localMidnightUnix } from '@/hooks/useTimeRange';

describe('localMidnightUnix', () => {
  it('returns a Unix timestamp <= now', () => {
    const nowUnix = Math.floor(Date.now() / 1000);
    expect(localMidnightUnix()).toBeLessThanOrEqual(nowUnix);
  });

  it('returns a value within 90000 seconds before now (DST-safe)', () => {
    const result = localMidnightUnix();
    const nowUnix = Math.floor(Date.now() / 1000);
    // midnight is at most 90000 seconds before now (25 h covers fall-back DST day)
    expect(nowUnix - result).toBeLessThanOrEqual(90_000);
  });

  it('returns a timestamp with zero hours, minutes, and seconds in local time', () => {
    const result = localMidnightUnix();
    const d = new Date(result * 1000);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});

describe('today range bounds', () => {
  it('midnight start is before current time', () => {
    const midnight = localMidnightUnix();
    const now = Math.floor(Date.now() / 1000);
    expect(midnight).toBeLessThanOrEqual(now);
  });

  it('midnight start is within the past 25 hours (DST-safe)', () => {
    const midnight = localMidnightUnix();
    const now = Math.floor(Date.now() / 1000);
    expect(now - midnight).toBeLessThanOrEqual(90_000);
  });
});
