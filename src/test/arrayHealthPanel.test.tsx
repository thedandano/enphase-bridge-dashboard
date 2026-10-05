import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { InverterDailyTotals } from '@/components/InverterDailyTotals';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
const api = vi.hoisted(() => ({ arrays: vi.fn(), health: vi.fn(), latest: vi.fn(), history: vi.fn() }));
vi.mock('@/api/inverters', () => ({ fetchArrays: api.arrays, fetchSnapshotsByWindow: api.latest, fetchSnapshotHistory: api.history }));
vi.mock('@/api/health', () => ({ fetchHealth: api.health }));
beforeEach(() => {
  localStorage.clear();
  api.arrays.mockReset().mockResolvedValue({ window_start: 1, arrays: [] });
  api.health.mockReset().mockResolvedValue({ last_window_start: 1 });
  api.latest.mockReset().mockResolvedValue({ window_start: 1, inverters: [{ serial_number: 'S', watts_output: 250, is_online: true }] });
  api.history.mockReset().mockResolvedValue({ data: { snapshots: [{ serial_number: 'S', window_start: Math.floor(Date.now() / 1000) - 3600, watts_output: 250, is_online: true }] }, incomplete: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('creates a layout without server configuration and restores it after reload', async () => {
  const view = render(<ArrayHealthPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Create layout' }));
  fireEvent.click(await screen.findByRole('button', { name: /Add array/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Select panel S' }));
  fireEvent.click(screen.getByRole('gridcell', { name: /^Row 1, column 1,/ }));
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  expect(await screen.findByLabelText('Panel S, 63 Wh produced, online')).toBeInTheDocument();
  view.unmount();
  render(<ArrayHealthPanel />);
  expect(await screen.findByLabelText('Panel S, 63 Wh produced, online')).toBeInTheDocument();
});
it('keeps missing panels and announces incomplete/failed history', async () => {
  localStorage.setItem('panelLayout.v1', JSON.stringify({ version: 1, arrays: [{ id: 'a', name: 'Roof', columns: 12, rows: 12, panels: [{ serial: 'OLD', column: 0, row: 0, orientation: 'portrait' }] }] }));
  api.history.mockRejectedValue(new Error('History unavailable'));
  render(<ArrayHealthPanel />);
  expect(screen.getByLabelText('Panel OLD, energy unavailable, status unavailable')).toHaveTextContent('Unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Edit layout' }));
  expect(await screen.findByText(/Peak ordering unavailable/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Select panel OLD' })).toBeInTheDocument();
});
it('preserves storage and the editor after failed saving', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(<ArrayHealthPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Create layout' }));
  await screen.findByRole('button', { name: /Add array/ });
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Cannot save/);
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(localStorage.getItem('panelLayout.v1')).toBeNull();
});
it('retains legacy arrays and shows failed current readings', async () => {
  api.arrays.mockResolvedValue({ window_start: 1, arrays: [{ name: 'Legacy', total_watts: 5, online_count: 1, total_count: 1, inverters: [] }] });
  api.health.mockRejectedValue(new Error('Bridge down'));
  render(<ArrayHealthPanel />);
  expect(await screen.findByText('Legacy')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/Current readings unavailable/)).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Create layout' })).toBeInTheDocument();
});
it('shows stale readings after a failed refresh without changing the layout', async () => {
  vi.useFakeTimers();
  localStorage.setItem('panelLayout.v1', JSON.stringify({ version: 1, arrays: [{ id: 'a', name: 'Roof', columns: 12, rows: 12, panels: [{ serial: 'S', column: 0, row: 0, orientation: 'portrait' }] }] }));
  api.latest.mockResolvedValueOnce({ window_start: 1, inverters: [{ serial_number: 'S', watts_output: 250, is_online: true }] }).mockRejectedValue(new Error('Connection lost'));
  render(<ArrayHealthPanel />);
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByLabelText('Panel S, 63 Wh produced, online')).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(screen.getByText(/Showing the last successful readings/)).toBeInTheDocument();
  expect(screen.getByLabelText('Panel S, 63 Wh produced, online')).toBeInTheDocument();
});
it('reset requires explicit confirmation and preserves bytes until then', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.setItem('panelLayout.v1', 'corrupt');
  render(<ArrayHealthPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Reset saved layout' }));
  expect(localStorage.getItem('panelLayout.v1')).toBe('corrupt');
  fireEvent.click(screen.getByRole('button', { name: 'Keep saved layout' }));
  expect(localStorage.getItem('panelLayout.v1')).toBe('corrupt');
  fireEvent.click(screen.getByRole('button', { name: 'Reset saved layout' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }));
  expect(localStorage.getItem('panelLayout.v1')).toBeNull();
  await act(async () => { await Promise.resolve(); });
});
it('announces incomplete history in the editor', async () => {
  api.history.mockResolvedValue({ data: { snapshots: [] }, incomplete: true });
  render(<ArrayHealthPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Create layout' }));
  expect(await screen.findByText(/History is incomplete/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Select panel S' })).toBeInTheDocument();
});
it('consolidates named array totals above a single roof grid', async () => {
  localStorage.setItem('panelLayout.v1', JSON.stringify({ version: 1, grid: { columns: 4, rows: 4 }, arrays: ['East', 'West'].map((name, column) => ({ id: name, name, columns: 4, rows: 4, panels: [{ serial: name, column, row: 0, orientation: 'portrait' }] })) }));
  api.latest.mockResolvedValue({ window_start: 1, inverters: ['East', 'West'].map((serial_number) => ({ serial_number, watts_output: 100, is_online: true })) });
  api.history.mockResolvedValue({ data: { snapshots: ['East', 'West'].map((serial_number) => ({ serial_number, window_start: 1, watts_output: 400, is_online: true })) }, incomplete: false });
  render(<ArrayHealthPanel />);
  const summaries = screen.getByLabelText('Array summaries');
  expect(summaries).toContainElement(screen.getByRole('region', { name: 'Array East summary' }));
  expect(summaries).toContainElement(screen.getByRole('region', { name: 'Array West summary' }));
  expect(screen.getAllByRole('region', { name: 'Roof layout' })).toHaveLength(1);
  await waitFor(() => expect(screen.getByRole('region', { name: 'Array East summary' })).toHaveTextContent('100 Wh'));
});
it('uses the existing cumulative calculation for the requested range, including energy from offline panels', async () => {
  localStorage.setItem('panelLayout.v1', JSON.stringify({ version: 1, grid: { columns: 4, rows: 4 }, arrays: [{ id: 'a', name: 'Roof', columns: 4, rows: 4, panels: [{ serial: 'S', column: 0, row: 0, orientation: 'portrait' }] }] }));
  api.latest.mockResolvedValue({ window_start: 1, inverters: [{ serial_number: 'S', watts_output: 0, is_online: false }] });
  api.history.mockResolvedValue({ data: { snapshots: [100, 200].map((watts_output, window_start) => ({ serial_number: 'S', window_start, watts_output, is_online: true })) }, incomplete: false });
  const view = render(<ArrayHealthPanel start={0} end={900} periodLabel="YESTERDAY" />);
  const panel = await screen.findByLabelText('Panel S, 75 Wh produced, offline');
  expect(panel).toHaveTextContent('75 Wh');
  expect(panel).toHaveAttribute('data-output', 'true');
  expect(api.history).toHaveBeenCalledWith(0, 900);
  api.history.mockRejectedValue(new Error('Range unavailable'));
  view.rerender(<ArrayHealthPanel start={900} end={1800} periodLabel="LAST 24H" />);
  expect(screen.queryByLabelText('Panel S, 75 Wh produced, offline')).toBeNull();
  expect(await screen.findByText(/No totals available for this range/)).toBeInTheDocument();
});

it('rolls live panel and performance totals to a new local day even when parent bounds stay unchanged', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-05T23:59:59'));
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const start = midnight.getTime() / 1000;
  const end = Math.floor(Date.now() / 1000);
  api.history.mockResolvedValue({ data: { snapshots: [] }, incomplete: false });
  render(<><ArrayHealthPanel start={start} end={end} live /><InverterDailyTotals start={start} end={end} live periodLabel="TODAY" /></>);
  await act(async () => { await Promise.resolve(); });
  expect(api.history.mock.calls.filter(([from]) => from === start)).toHaveLength(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(api.history.mock.calls.filter(([from]) => from === start + 86400)).toHaveLength(2);
});
