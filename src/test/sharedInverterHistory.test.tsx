import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InverterHistoryProvider } from '@/context/InverterHistoryProvider';
import { useInverterHistory } from '@/hooks/useInverterHistory';
import * as api from '@/api/inverters';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
function Consumer({ name }: { name: string }) {
  const { data, error } = useInverterHistory(100, 200);
  return <div>{name}: {error?.message ?? data?.data.snapshots.length ?? 'loading'}</div>;
}
function Dashboard() {
  return <InverterHistoryProvider start={100} end={200} live={false}>
    <Consumer name="Heatmap" /><Consumer name="Performance" /><Consumer name="Roof" />
  </InverterHistoryProvider>;
}
it('shares one history refresh and its failures across dashboard consumers', async () => {
  vi.useFakeTimers();
  const fetch = vi.spyOn(api, 'fetchSnapshotHistory').mockResolvedValue({ data: { snapshots: [], total: 0, offset: 0, limit: 0 }, incomplete: false });
  render(<Dashboard />);
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Heatmap: 0')).toBeInTheDocument();
  expect(screen.getByText('Performance: 0')).toBeInTheDocument();
  expect(screen.getByText('Roof: 0')).toBeInTheDocument();
  fetch.mockRejectedValue(new Error('History unavailable'));
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText(/History unavailable/)).toHaveLength(3);
});
it('does not start another history cycle while paging is still running', async () => {
  vi.useFakeTimers();
  let resolve!: (value: Awaited<ReturnType<typeof api.fetchSnapshotHistory>>) => void;
  const fetch = vi.spyOn(api, 'fetchSnapshotHistory').mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<Dashboard />);
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ data: { snapshots: [], total: 0, offset: 0, limit: 0 }, incomplete: false }); });
  expect(screen.getByText('Roof: 0')).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(fetch).toHaveBeenCalledTimes(2);
});
