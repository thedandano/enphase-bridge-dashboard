import type { ReactNode } from 'react';
import { InverterHistoryContext, useHistoryFetch } from '@/hooks/useInverterHistory';

export function InverterHistoryProvider({ start, end, live, enabled = true, children }: {
  start: number; end: number; live: boolean; enabled?: boolean; children: ReactNode;
}) {
  const history = useHistoryFetch(start, end, live, enabled);
  return <InverterHistoryContext.Provider value={history}>{children}</InverterHistoryContext.Provider>;
}
