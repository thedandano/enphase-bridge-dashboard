import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { PanelLayoutGrid } from '@/components/PanelLayoutGrid';
import { PanelLayoutEditor } from '@/components/PanelLayoutEditor';
import type { PanelLayout } from '@/utils/panelLayout';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function gridGeometry(panel: HTMLElement) {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => screen.getByRole('grid') });
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 88, height: 180 } as DOMRect);
  vi.spyOn(screen.getByRole('grid'), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 276, bottom: 276 } as DOMRect);
  for (const cell of screen.getAllByRole('gridcell')) {
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({ left: Number(cell.dataset.column) * 92, top: Number(cell.dataset.row) * 92, width: 88, height: 88 } as DOMRect);
  }
}
it('read-only grid reports missing readings rather than zero', () => {
  render(<PanelLayoutGrid array={{ id: 'a', name: 'A', columns: 12, rows: 12, panels: [{ serial: 'MISSING', column: 0, row: 0, orientation: 'portrait' }] }} readings={[]} editable={false} selectedSerial={null} onSelect={vi.fn()} onPlace={vi.fn()} />);
  expect(screen.getByLabelText('Panel MISSING, reading unavailable')).toHaveTextContent('Unavailable');
  expect(screen.queryByRole('gridcell')).toBeNull();
});
it('pointer placement and cancellation preserve one assignment', () => {
  function Harness() {
    const [draft, setDraft] = useState<PanelLayout>({ version: 1, arrays: [{ id: 'a', name: 'A', columns: 3, rows: 3, panels: [] }] });
    return <PanelLayoutEditor draft={draft} serials={['S']} suggestedOrder={['S']} readings={[]} error={null} onChange={setDraft} onSave={vi.fn()} onCancel={vi.fn()} />;
  }
  render(<Harness />);
  const panel = screen.getByRole('button', { name: 'Select panel S' });
  const handle = panel.querySelector('[data-drag]')!;
  gridGeometry(panel);
  // jsdom lacks PointerEvent; use MouseEvent with the pointer fields supplied.
  function pointer(type: string, x: number) { const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 10 }); Object.defineProperty(e, 'pointerId', { value: 1 }); return e; }
  fireEvent(handle, pointer('pointerdown', 10));
  fireEvent(handle, pointer('pointermove', 102));
  fireEvent(handle, pointer('pointercancel', 102));
  expect(screen.getByRole('region', { name: 'Unassigned panels' })).toContainElement(panel);
  fireEvent(handle, pointer('pointerdown', 10));
  fireEvent(handle, pointer('pointermove', 102));
  fireEvent(handle, pointer('pointerup', 102));
  expect(screen.getByRole('button', { name: 'Select panel S' }).style.gridColumn).toBe('2 / span 1');
});
it('keyboard can select a placed panel from its occupied footprint', () => {
  const select = vi.fn();
  render(<PanelLayoutGrid array={{ id: 'a', name: 'A', columns: 3, rows: 3, panels: [{ serial: 'SAVED', column: 0, row: 0, orientation: 'portrait' }] }} readings={[]} editable selectedSerial={null} onSelect={select} onPlace={vi.fn()} />);
  const grid = screen.getByRole('grid');
  fireEvent.keyDown(grid, { key: 'ArrowDown' });
  fireEvent.keyDown(grid, { key: 'Enter' });
  expect(select).toHaveBeenCalledWith('SAVED');
  expect(screen.getByRole('gridcell', { name: /Row 2, column 1/ })).toHaveAccessibleName(/SAVED/);
});
it('preview uses the source orientation across arrays', () => {
  const { container } = render(<PanelLayoutGrid array={{ id: 'a', name: 'A', columns: 3, rows: 3, panels: [] }} readings={[]} editable selectedSerial="OTHER" onSelect={vi.fn()} onPlace={vi.fn()} preview={{ arrayId: 'a', column: 0, row: 0 }} previewValid previewOrientation="landscape" />);
  const preview = container.querySelector('[data-preview]') as HTMLElement;
  expect(preview.style.gridColumn).toBe('1 / span 2');
  expect(preview.style.gridRow).toBe('1 / span 1');
});
it('keeps the keyboard cursor within a resized grid', () => {
  const array = { id: 'a', name: 'A', columns: 4, rows: 4, panels: [] };
  const props = { array, readings: [], editable: true, selectedSerial: null, onSelect: vi.fn(), onPlace: vi.fn() };
  const view = render(<PanelLayoutGrid {...props} />);
  const grid = screen.getByRole('grid');
  fireEvent.keyDown(grid, { key: 'ArrowRight' });
  fireEvent.keyDown(grid, { key: 'ArrowRight' });
  fireEvent.keyDown(grid, { key: 'ArrowDown' });
  fireEvent.keyDown(grid, { key: 'ArrowDown' });
  view.rerender(<PanelLayoutGrid {...props} array={{ ...array, columns: 2, rows: 2 }} />);
  expect(document.getElementById(grid.getAttribute('aria-activedescendant')!)).toHaveAccessibleName(/^Row 2, column 2/);
});
it('pointer selection restores keyboard grid focus and cursor', () => {
  const clear = vi.fn();
  const place = vi.fn();
  render(<PanelLayoutGrid array={{ id: 'a', name: 'A', columns: 3, rows: 3, panels: [] }} readings={[]} editable selectedSerial="S" onSelect={vi.fn()} onPlace={place} onClear={clear} />);
  const cell = screen.getByRole('gridcell', { name: /^Row 1, column 2,/ });
  cell.focus();
  fireEvent.click(cell);
  const grid = screen.getByRole('grid');
  expect(grid).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  expect(place).toHaveBeenLastCalledWith('S', { arrayId: 'a', column: 1, row: 1 });
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(clear).toHaveBeenCalled();
});
it('dragging another tray panel retains the locked orientation', () => {
  function Harness() {
    const [draft, setDraft] = useState<PanelLayout>({ version: 1, arrays: [{ id: 'a', name: 'A', columns: 3, rows: 3, panels: [] }] });
    return <PanelLayoutEditor draft={draft} serials={['A', 'B']} suggestedOrder={['A', 'B']} readings={[]} error={null} onChange={setDraft} onSave={vi.fn()} onCancel={vi.fn()} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Select panel A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rotate next panels' }));
  const handle = screen.getByRole('button', { name: 'Select panel B' }).querySelector('[data-drag]')!;
  gridGeometry(screen.getByRole('button', { name: 'Select panel B' }));
  for (const [type, x] of [['pointerdown', 10], ['pointermove', 40], ['pointerup', 40]] as const) {
    const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 10 });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    fireEvent(handle, e);
  }
  expect(screen.getByRole('button', { name: 'Select panel B' })).toHaveAttribute('data-orientation', 'landscape');
});
it('drags from the panel body, shows a ghost, and preserves group while moving', () => {
  function Harness() {
    const [draft, setDraft] = useState<PanelLayout>({ version: 1, grid: { columns: 3, rows: 3 }, arrays: [
      { id: 'a', name: 'East', columns: 3, rows: 3, panels: [{ serial: 'S', column: 0, row: 0, orientation: 'portrait' }] },
      { id: 'b', name: 'West', columns: 3, rows: 3, panels: [] },
    ] });
    return <PanelLayoutEditor draft={draft} serials={['S']} suggestedOrder={['S']} readings={[]} error={null} onChange={setDraft} onSave={vi.fn()} onCancel={vi.fn()} />;
  }
  const view = render(<Harness />);
  fireEvent.change(screen.getByLabelText('Array for new panels'), { target: { value: 'b' } });
  const panel = screen.getByRole('button', { name: 'Select panel S' });
  gridGeometry(panel);
  function pointer(type: string, x: number) {
    const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 10 });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    fireEvent(panel, e);
  }
  pointer('pointerdown', 10);
  pointer('pointermove', 194);
  expect(view.container.querySelector('[aria-hidden=true] [aria-label="Panel S, reading unavailable"]')).toBeInTheDocument();
  pointer('pointerup', 194);
  expect(screen.getByRole('button', { name: 'Select panel S' }).style.gridColumn).toBe('3 / span 1');
  expect(screen.getByRole('button', { name: 'Select panel S' })).toHaveTextContent('East');
  expect(view.container.querySelector('[data-preview]')).toBeNull();
});
it('leaves a simple panel press uncaptured so click restores grid focus', () => {
  const layout: PanelLayout = { version: 1, grid: { columns: 3, rows: 3 }, arrays: [{ id: 'a', name: 'A', columns: 3, rows: 3, panels: [{ serial: 'S', column: 1, row: 0, orientation: 'portrait' }] }] };
  const view = render(<PanelLayoutEditor draft={layout} serials={['S']} suggestedOrder={['S']} readings={[]} error={null} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} />);
  const capture = vi.fn();
  Object.defineProperty(view.container.firstElementChild!, 'setPointerCapture', { value: capture });
  const panel = screen.getByRole('button', { name: 'Select panel S' });
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  fireEvent(panel, event);
  expect(event.defaultPrevented).toBe(false);
  expect(capture).not.toHaveBeenCalled();
  fireEvent.click(panel);
  const grid = screen.getByRole('grid');
  expect(grid).toHaveFocus();
  expect(document.getElementById(grid.getAttribute('aria-activedescendant')!)).toHaveAccessibleName(/^Row 1, column 2/);
});
it('shades current output on one shared scale, keeping unavailable/offline panels neutral', () => {
  const view = render(<PanelLayoutGrid array={{ id: 'a', name: 'Roof', columns: 4, rows: 4, panels: ['LOW', 'HIGH', 'MISSING', 'OFF'].map((serial, column) => ({ serial, column, row: 0, orientation: 'portrait' })) }} readings={[
    { serial_number: 'LOW', watts_output: 50, is_online: true },
    { serial_number: 'HIGH', watts_output: 100, is_online: true },
    { serial_number: 'OFF', watts_output: 200, is_online: false },
  ]} editable={false} selectedSerial={null} onSelect={vi.fn()} onPlace={vi.fn()} />);
  expect(screen.getByLabelText('Panel LOW, 50 watts, online')).toHaveStyle({ '--panel-output': '50%' });
  expect(screen.getByLabelText('Panel HIGH, 100 watts, online')).toHaveStyle({ '--panel-output': '100%' });
  expect(screen.getByLabelText('Panel MISSING, reading unavailable')).not.toHaveAttribute('data-output');
  expect(screen.getByLabelText('Panel OFF, 200 watts, offline')).not.toHaveAttribute('data-output');
  expect(view.container.querySelectorAll('[data-solar-cells]')).toHaveLength(4);
  expect(screen.getByLabelText('Panel output color scale')).toHaveTextContent('100 W');
});
