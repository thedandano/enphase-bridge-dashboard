import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { InverterHeatmap } from '@/components/InverterHeatmap';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('initial heatmap failure is visible instead of endless loading', async () => {
  vi.stubGlobal('fetch', () => Promise.resolve(new Response('down', { status: 503 })));
  render(<InverterHeatmap range="today" start={0} end={1000} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/failed/i);
  expect(screen.queryByText('Loading inverter heatmap…')).toBeNull();
});
it('incomplete empty heatmap history remains visible', async () => {
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify({ snapshots: [], total: 3, limit: 2000, offset: 0 }))));
  render(<InverterHeatmap range="today" start={0} end={1000} />);
  expect(await screen.findByRole('status')).toHaveTextContent(/incomplete/);
});
