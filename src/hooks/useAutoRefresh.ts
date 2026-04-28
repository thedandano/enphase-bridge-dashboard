import { useState, useEffect, useRef, useCallback } from 'react';

const BASE_INTERVAL = 30;
const MAX_INTERVAL = 120;

export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
): { data: T | null; error: Error | null; secondsUntilRefresh: number } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(BASE_INTERVAL);

  const consecutiveErrors = useRef(0);
  const currentInterval = useRef(BASE_INTERVAL);
  const isMounted = useRef(true);

  const computeInterval = (errorCount: number): number => {
    if (errorCount === 0) return BASE_INTERVAL;
    return Math.min(BASE_INTERVAL * Math.pow(2, errorCount - 1), MAX_INTERVAL);
  };

  const doFetch = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (!isMounted.current) return;
      setData(result);
      setError(null);
      consecutiveErrors.current = 0;
      currentInterval.current = BASE_INTERVAL;
    } catch (err) {
      if (!isMounted.current) return;
      consecutiveErrors.current += 1;
      currentInterval.current = computeInterval(consecutiveErrors.current);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [fetchFn]);

  useEffect(() => {
    isMounted.current = true;

    // Initial fetch
    doFetch();

    let tickInterval: ReturnType<typeof setInterval>;
    let remaining = currentInterval.current;

    const startTick = () => {
      remaining = currentInterval.current;
      setSecondsUntilRefresh(remaining);

      tickInterval = setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        remaining -= 1;
        setSecondsUntilRefresh(remaining);
        if (remaining <= 0) {
          remaining = currentInterval.current;
          setSecondsUntilRefresh(remaining);
          doFetch();
        }
      }, 1000);
    };

    startTick();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume: reset countdown and fetch immediately
        clearInterval(tickInterval);
        doFetch();
        startTick();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isMounted.current = false;
      clearInterval(tickInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [doFetch]);

  return { data, error, secondsUntilRefresh };
}
