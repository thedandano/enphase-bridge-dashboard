import { createContext, useContext } from 'react';
import { fetchSnapshotHistory } from '@/api/inverters';
import { useAutoRefresh } from './useAutoRefresh';
import { localMidnightUnix } from './useTimeRange';

type History = Awaited<ReturnType<typeof fetchSnapshotHistory>> & { key: string; start: number; end: number };
type HistoryState = ReturnType<typeof useAutoRefresh<History>>;
export const InverterHistoryContext = createContext<HistoryState | null>(null);

export function useHistoryFetch(start: number, end: number, live: boolean, enabled: boolean) {
  const rangeStart = live ? localMidnightUnix() : start;
  const key = `${rangeStart}:${live ? 'live' : end}`;
  return useAutoRefresh(async () => {
    const rangeEnd = live ? Math.floor(Date.now() / 1000) : end;
    return { ...await fetchSnapshotHistory(rangeStart, rangeEnd), key, start: rangeStart, end: rangeEnd };
  }, [key], enabled);
}

export function useInverterHistory(start: number, end: number, live = false) {
  const shared = useContext(InverterHistoryContext);
  const standalone = useHistoryFetch(start, end, live, shared === null);
  return shared ?? standalone;
}
