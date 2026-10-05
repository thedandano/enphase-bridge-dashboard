import type { TouIntervalsResponse } from '@/api/types';

export const TOU_LABELS = {
  peak: 'Peak',
  off_peak: 'Off-peak',
  super_off_peak: 'Super off-peak',
} as const;

export function validateTouIntervals(data: TouIntervalsResponse, start: number, end: number): TouIntervalsResponse {
  if (typeof data.timezone !== 'string' || !data.timezone) {
    throw new Error('Invalid TOU response: missing utility timezone');
  }
  // Invalid timezone names must fail visibly rather than use the browser timezone.
  new Intl.DateTimeFormat('en-US', { timeZone: data.timezone });
  if (!Array.isArray(data.intervals) || !Array.isArray(data.schedules)) {
    throw new Error('Invalid TOU response: missing intervals or schedules');
  }
  const scheduleIds = new Set(data.schedules.map((schedule) => schedule.id));
  let boundary = start;
  for (const interval of data.intervals) {
    if (!Number.isSafeInteger(interval.start) || !Number.isSafeInteger(interval.end)
      || interval.start !== boundary || interval.end <= interval.start || interval.end > end
      || !Object.hasOwn(TOU_LABELS, interval.bracket) || !scheduleIds.has(interval.schedule_id)) {
      throw new Error('Invalid TOU response: interval bounds, bracket, or schedule');
    }
    boundary = interval.end;
  }
  if (boundary !== end) throw new Error('Invalid TOU response: incomplete coverage');
  return data;
}

export function touTransitions(data: TouIntervalsResponse) {
  return data.intervals.filter((interval, index, intervals) =>
    index > 0 && interval.bracket !== intervals[index - 1].bracket);
}

export function formatTouTransition(start: number, timezone: string, bracket: keyof typeof TOU_LABELS) {
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(start * 1000));
  return `${time} · ${TOU_LABELS[bracket]}`;
}
