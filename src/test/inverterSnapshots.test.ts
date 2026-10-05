import { it, expect, vi, afterEach } from 'vitest';
import { fetchSnapshotHistory } from '@/api/inverters';
afterEach(() => vi.unstubAllGlobals());
function page(total: number, offset: number, count: number) { return { total, offset, limit: 2000, snapshots: Array.from({ length: count }, (_, i) => ({ serial_number: `S${i + offset}`, window_start: 0, watts_output: 1, is_online: true })) }; }
it('collects multiple pages', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(page(2001, 0, 2000)))).mockResolvedValueOnce(new Response(JSON.stringify(page(2001, 2000, 1))));
  vi.stubGlobal('fetch', fetch);
  const result = await fetchSnapshotHistory(0, 100);
  expect(result.data.snapshots).toHaveLength(2001);
  expect(result.incomplete).toBe(false);
  expect(fetch.mock.calls[1][0]).toContain('offset=2000');
});
it('propagates a later page failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(page(2001, 0, 2000)))).mockResolvedValueOnce(new Response('failure', { status: 500 })));
  await expect(fetchSnapshotHistory(0, 100)).rejects.toThrow();
});
it('marks premature empty pages as incomplete', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(page(5, 0, 0)))));
  expect((await fetchSnapshotHistory(0, 100)).incomplete).toBe(true);
});
it('stops at the ceiling and deduplicates snapshots', async () => {
  let calls = 0;
  vi.stubGlobal('fetch', () => { const result = page(60000, calls++ * 2000, 2000); result.snapshots.fill(result.snapshots[0]); return Promise.resolve(new Response(JSON.stringify(result))); });
  const result = await fetchSnapshotHistory(0, 100);
  expect(calls).toBe(25);
  expect(result.incomplete).toBe(true);
  expect(result.data.snapshots).toHaveLength(25);
});
it('continues when the bridge reports each page length as total', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(page(2000, 0, 2000)))).mockResolvedValueOnce(new Response(JSON.stringify(page(1, 2000, 1))));
  vi.stubGlobal('fetch', fetch);
  const result = await fetchSnapshotHistory(0, 100);
  expect(result.data.snapshots).toHaveLength(2001);
  expect(result.incomplete).toBe(false);
});
