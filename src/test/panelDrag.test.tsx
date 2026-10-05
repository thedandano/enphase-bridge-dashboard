import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PanelLayoutEditor } from '@/components/PanelLayoutEditor';
import type { PanelLayout } from '@/utils/panelLayout';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Harness() {
  const [draft, setDraft] = useState<PanelLayout>({ version: 1, grid: { columns: 4, rows: 4 }, arrays: [{ id: 'a', name: 'Roof', columns: 4, rows: 4, panels: [] }] });
  return <PanelLayoutEditor draft={draft} serials={['A', 'B']} suggestedOrder={['A', 'B']} readings={[]} error={null} onChange={setDraft} onSave={vi.fn()} onCancel={vi.fn()} />;
}
function pointer(panel: HTMLElement, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  fireEvent(panel, event);
}
it('locks orientation for upcoming panels without rotating the last placement', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Select panel A' }));
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Rotate next panels' }));
  expect(screen.getByRole('button', { name: 'Select panel A' })).toHaveAttribute('data-orientation', 'portrait');
  expect(screen.getByRole('button', { name: 'Select panel B' })).toHaveAttribute('data-orientation', 'landscape');
  fireEvent.click(screen.getByRole('button', { name: 'Select panel B' }));
  fireEvent.click(screen.getByRole('gridcell', { name: /Row 3, column 2/ }));
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Select panel B' })).toHaveAttribute('data-orientation', 'landscape');
  fireEvent.click(screen.getByRole('button', { name: 'Rotate next panels' }));
  expect(screen.getByRole('button', { name: 'Select panel B' })).toHaveAttribute('data-orientation', 'landscape');
});
it('keeps the grab point inside the ghost and snaps its origin instead of the pointer', () => {
  const view = render(<Harness />);
  const panel = screen.getByRole('button', { name: 'Select panel A' });
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 88, height: 180 } as DOMRect);
  const grid = screen.getByRole('grid');
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => grid });
  vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 300, right: 464, bottom: 664, width: 364, height: 364 } as DOMRect);
  for (const cell of screen.getAllByRole('gridcell')) {
    const x = Number(cell.getAttribute('data-column')) * 92 + 100;
    const y = Number(cell.getAttribute('data-row')) * 92 + 300;
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({ left: x, top: y, width: 88, height: 88 } as DOMRect);
  }
  pointer(panel, 'pointerdown', 50, 150); // 40px across and 130px down the panel.
  pointer(panel, 'pointermove', 232, 430); // Ghost origin is column 2, row 1.
  const ghost = view.container.querySelector('[data-drag-ghost]') as HTMLElement;
  expect(ghost.style.left).toBe('192px');
  expect(ghost.style.top).toBe('300px');
  expect(view.container.firstElementChild).toHaveAttribute('data-dragging', 'true');
  pointer(panel, 'lostpointercapture', 232, 430); // Touch capture transferring from tile to editor must keep the drag alive.
  expect(view.container.querySelector('[data-drag-ghost]')).not.toBeNull();
  expect(view.container.querySelector('[data-preview]')).toHaveStyle({ gridColumn: '2 / span 1', gridRow: '1 / span 2' });
  pointer(panel, 'pointerup', 232, 430);
  const placed = screen.getByRole('button', { name: 'Select panel A' });
  expect(placed.style.gridColumn).toBe('2 / span 1');
  expect(placed.style.gridRow).toBe('1 / span 2');
  expect(view.container.querySelector('[data-drag-ghost]')).toBeNull();
  expect(view.container.firstElementChild).toHaveAttribute('data-dragging', 'false');
});
