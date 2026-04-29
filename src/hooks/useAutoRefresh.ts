import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

const BASE_INTERVAL = 30;
const MAX_INTERVAL = 120;

function computeInterval(errorCount: number): number {
  if (errorCount === 0) return BASE_INTERVAL;
  return Math.min(BASE_INTERVAL * Math.pow(2, errorCount - 1), MAX_INTERVAL);
}

export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | null; error: Error | null; secondsUntilRefresh: number } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(BASE_INTERVAL);

  // Latest-ref pattern: sync via useLayoutEffect so we never write
  // to a ref during render (react-hooks/refs rule).
  const fetchFnRef = useRef(fetchFn);
  useLayoutEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const consecutiveErrors = useRef(0);
  const currentInterval = useRef(BASE_INTERVAL);

  // Stable doFetch — never recreated, reads latest fetchFn via ref.
  const doFetch = useCallback(async (onComplete?: () => void) => {
    try {
      const result = await fetchFnRef.current();
      setData(result);
      setError(null);
      consecutiveErrors.current = 0;
      currentInterval.current = BASE_INTERVAL;
    } catch (err) {
      consecutiveErrors.current += 1;
      currentInterval.current = computeInterval(consecutiveErrors.current);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      onComplete?.();
    }
  }, []); // stable — no deps

  useEffect(() => {
    let cancelled = false;
    let tickInterval: ReturnType<typeof setInterval>;
    let remaining = currentInterval.current;

    const startTick = () => {
      remaining = currentInterval.current;
      setSecondsUntilRefresh(remaining);

      tickInterval = setInterval(() => {
        if (cancelled || document.visibilityState === 'hidden') return;
        remaining = Math.max(0, remaining - 1);
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
      cancelled = true;
      clearInterval(tickInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doFetch, ...deps]); // doFetch is stable; deps trigger re-fetch when they change

  return { data, error, secondsUntilRefresh };
}
