import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { usePanelLayout } from '@/hooks/usePanelLayout';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it('cancel does not write and save survives reopening', () => {
  const { result } = renderHook(usePanelLayout);
  act(() => result.current.beginEdit());
  act(() => result.current.updateDraft({ version: 1, arrays: [{ id: 'a', name: 'A', columns: 12, rows: 12, panels: [] }] }));
  act(() => result.current.cancel());
  expect(localStorage.getItem('panelLayout.v1')).toBeNull();
  act(() => result.current.beginEdit());
  act(() => result.current.updateDraft({ version: 1, arrays: [{ id: 'a', name: 'A', columns: 12, rows: 12, panels: [] }] }));
  act(() => { expect(result.current.save()).toBe(true); });
  expect(renderHook(usePanelLayout).result.current.saved.arrays[0].name).toBe('A');
});
it('failed save keeps draft and saved value', () => {
  const { result } = renderHook(usePanelLayout);
  act(() => result.current.beginEdit());
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
  act(() => { expect(result.current.save()).toBe(false); });
  expect(result.current.draft).not.toBeNull();
  expect(result.current.saved.arrays).toEqual([]);
  expect(result.current.error).toMatch(/save/i);
});
it.each(['broken', '{"version":2,"arrays":[]}'])('does not overwrite invalid storage %s', (bytes) => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.setItem('panelLayout.v1', bytes);
  const { result } = renderHook(usePanelLayout);
  act(() => result.current.beginEdit());
  act(() => { expect(result.current.save()).toBe(false); });
  expect(localStorage.getItem('panelLayout.v1')).toBe(bytes);
  expect(result.current.error).not.toBeNull();
  act(() => { expect(result.current.resetSaved()).toBe(true); });
  expect(localStorage.getItem('panelLayout.v1')).toBeNull();
});
it('loads legacy canvases without writing the migrated arrangement', () => {
  const bytes = JSON.stringify({ version: 1, arrays: ['A', 'B'].map((serial) => ({ id: serial, name: serial, columns: 12, rows: 12, panels: [{ serial, column: 0, row: 0, orientation: 'portrait' }] })) });
  localStorage.setItem('panelLayout.v1', bytes);
  const { result } = renderHook(usePanelLayout);
  expect(result.current.saved.arrays[1].panels[0].row).toBe(3);
  expect(localStorage.getItem('panelLayout.v1')).toBe(bytes);
  act(() => result.current.beginEdit());
  act(() => result.current.cancel());
  expect(localStorage.getItem('panelLayout.v1')).toBe(bytes);
});
