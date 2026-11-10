import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

const BASE_INTERVAL = 30;
const MAX_INTERVAL = 120;

// Retries back off from 30 s whatever the base, so a slow-refreshing caller
// still recovers quickly from one failed fetch; the cap is the larger of 120 s
// and the caller's own base.
function computeInterval(errorCount: number, base: number): number {
  if (errorCount === 0) return base;
  return Math.min(BASE_INTERVAL * Math.pow(2, errorCount - 1), Math.max(MAX_INTERVAL, base));
}

export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  deps: readonly unknown[] = [],
  enabled = true,
  baseInterval = BASE_INTERVAL,
): { data: T | null; error: Error | null; secondsUntilRefresh: number } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(baseInterval);

  // Latest-ref pattern: sync via useLayoutEffect so we never write
  // to a ref during render (react-hooks/refs rule).
  const fetchFnRef = useRef(fetchFn);
  const baseIntervalRef = useRef(baseInterval);
  useLayoutEffect(() => {
    fetchFnRef.current = fetchFn;
    baseIntervalRef.current = baseInterval;
  });

  const requestGeneration = useRef(0);
  const inFlight = useRef<number | null>(null);
  const consecutiveErrors = useRef(0);
  const currentInterval = useRef(baseInterval);

  // Stable doFetch — never recreated, reads latest fetchFn via ref.
  const doFetch = useCallback(async (onComplete?: () => void) => {
    const generation = requestGeneration.current;
    if (inFlight.current === generation) return;
    inFlight.current = generation;
    try {
      const result = await fetchFnRef.current();
      if (generation !== requestGeneration.current) return;
      setData(result);
      setError(null);
      consecutiveErrors.current = 0;
      currentInterval.current = baseIntervalRef.current;
    } catch (err) {
      if (generation !== requestGeneration.current) {
        console.warn('Refresh for a superseded view failed; current view retained', err);
        return;
      }
      consecutiveErrors.current += 1;
      currentInterval.current = computeInterval(consecutiveErrors.current, baseIntervalRef.current);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (inFlight.current === generation) inFlight.current = null;
      if (generation === requestGeneration.current) onComplete?.();
    }
  }, []); // stable — no deps

  useEffect(() => {
    requestGeneration.current += 1;
    if (!enabled) return;
    let cancelled = false;
    let tickInterval: ReturnType<typeof setInterval>;
    let remaining = currentInterval.current;

    const startTick = () => {
      remaining = currentInterval.current;
      setSecondsUntilRefresh(remaining);

      tickInterval = setInterval(() => {
        if (cancelled || document.visibilityState === 'hidden') return;
        // A failure can shorten the interval mid-countdown (retry sooner than a
        // long base); honour it now rather than after the old countdown ends.
        remaining = Math.max(0, Math.min(remaining, currentInterval.current) - 1);
        setSecondsUntilRefresh(remaining);
        if (remaining <= 0) {
          remaining = currentInterval.current;
          setSecondsUntilRefresh(remaining);
          void doFetch();
        }
      }, 1000);
    };

    // Initial fetch
    void doFetch();
    startTick();

    const onVisibilityChange = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      clearInterval(tickInterval);
      void doFetch();
      startTick();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      requestGeneration.current += 1;
      cancelled = true;
      clearInterval(tickInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doFetch, enabled, ...deps]); // doFetch is stable; deps trigger re-fetch when they change

  return { data, error, secondsUntilRefresh };
}
