import { describe, expect, it } from 'vitest';
import type { TouIntervalsResponse } from '@/api/types';
import { formatTouTransition, touTransitions, validateTouIntervals } from '@/utils/touIntervals';

const data: TouIntervalsResponse = {
  timezone: 'America/Los_Angeles', schedules: [{ id: 1, source_id: 'revision' }],
  intervals: [
    { start: 1000, end: 1900, bracket: 'off_peak', schedule_id: 1 },
    { start: 1900, end: 2800, bracket: 'peak', schedule_id: 1 },
    { start: 2800, end: 3700, bracket: 'peak', schedule_id: 1 },
  ],
};

describe('TOU interval contract', () => {
  it('accepts exact half-open coverage and only marks entering brackets', () => {
    expect(validateTouIntervals(data, 1000, 3700)).toBe(data);
    expect(touTransitions(data).map((item) => item.start)).toEqual([1900]);
  });
  it.each([
    { start: 1901 }, { end: 4000 }, { end: 1900 },
    { bracket: 'guessed' }, { schedule_id: 2 },
  ])('rejects invalid interval metadata %j', (change) => {
    const invalid = { ...data, intervals: data.intervals.map((item, index) => index === 1 ? { ...item, ...change } : item) } as TouIntervalsResponse;
    expect(() => validateTouIntervals(invalid, 1000, 3700)).toThrow('Invalid TOU response');
  });
  it('rejects missing coverage or utility timezone', () => {
    expect(() => validateTouIntervals({ ...data, intervals: [] }, 1000, 3700)).toThrow('coverage');
    expect(() => validateTouIntervals({ ...data, timezone: '' }, 1000, 3700)).toThrow('timezone');
  });
  it('formats repeated daylight-saving hours in utility time regardless of browser time', () => {
    const first = Date.parse('2026-11-01T08:00:00Z') / 1000;
    const second = Date.parse('2026-11-01T09:00:00Z') / 1000;
    expect(formatTouTransition(first, data.timezone, 'peak')).toBe('1:00 AM PDT · Peak');
    expect(formatTouTransition(second, data.timezone, 'peak')).toBe('1:00 AM PST · Peak');
    expect(formatTouTransition(first, 'Asia/Tokyo', 'peak')).toBe('5:00 PM GMT+9 · Peak');
  });
});
