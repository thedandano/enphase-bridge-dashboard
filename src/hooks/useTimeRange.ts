import { useState, useCallback } from 'react';
import type { TimeRange } from '@/api/types';


const RANGE_SECONDS: Record<TimeRange, number> = {
  today: 0, // sentinel — unused; computeBounds handles 'today' via absolute midnight
  '24h': 86_400,
  '7d': 604_800,
  '30d': 2_592_000,
};

export const RANGE_LIMITS: Record<TimeRange, number> = {
  today: 96,
  '24h': 100,
  '7d': 672,
  '30d': 2880,
};

export function localMidnightUnix(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function computeBounds(r: TimeRange): { start: number; end: number } {
  const now = Math.floor(Date.now() / 1000);
  if (r === 'today') {
    return { start: localMidnightUnix(), end: now };
  }
  return { start: now - RANGE_SECONDS[r], end: now };
}

export function useTimeRange(): {
  range: TimeRange;
  setRange: (r: TimeRange) => void;
  start: number;
  end: number;
  limit: number;
} {
  const [range, setRangeState] = useState<TimeRange>('24h');
  // Lazy initializer: Date.now() called once at mount, not on every render.
  const [bounds, setBounds] = useState(() => computeBounds('24h'));

  // setRange updates both the range label and snaps start/end to the new "now".
  const setRange = useCallback((r: TimeRange) => {
    setRangeState(r);
    setBounds(computeBounds(r));
  }, []);

  const resolvedBounds = range === 'today' ? computeBounds('today') : bounds;
  return { range, setRange, start: resolvedBounds.start, end: resolvedBounds.end, limit: RANGE_LIMITS[range] };
}
