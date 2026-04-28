import { useState } from 'react';

export type TimeRange = '24h' | '7d' | '30d';

const RANGE_SECONDS: Record<TimeRange, number> = {
  '24h': 86_400,
  '7d': 604_800,
  '30d': 2_592_000,
};

export const RANGE_LIMITS: Record<TimeRange, number> = {
  '24h': 100,
  '7d': 672,
  '30d': 2880,
};

export function useTimeRange(): {
  range: TimeRange;
  setRange: (r: TimeRange) => void;
  start: number;
  end: number;
  limit: number;
} {
  const [range, setRange] = useState<TimeRange>('24h');

  const now = Math.floor(Date.now() / 1000);
  const start = now - RANGE_SECONDS[range];
  const end = now;
  const limit = RANGE_LIMITS[range];

  return { range, setRange, start, end, limit };
}
