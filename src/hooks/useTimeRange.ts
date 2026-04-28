import { useState, useCallback } from 'react';

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

function computeBounds(r: TimeRange): { start: number; end: number } {
  const now = Math.floor(Date.now() / 1000);
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

  return { range, setRange, start: bounds.start, end: bounds.end, limit: RANGE_LIMITS[range] };
}
