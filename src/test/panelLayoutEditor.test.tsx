import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { PanelLayoutEditor } from '@/components/PanelLayoutEditor';
import type { PanelLayout } from '@/utils/panelLayout';
afterEach(cleanup);
function Harness() {
  const [draft, setDraft] = useState<PanelLayout>({ version: 1, arrays: [{ id: 'a', name: 'Roof', columns: 3, rows: 3, panels: [] }] });
  return <PanelLayoutEditor draft={draft} serials={['A', 'B']} suggestedOrder={['B', 'A']} readings={[]} error={null} onChange={setDraft} onSave={vi.fn()} onCancel={vi.fn()} />;
}
it('retains keyboard placement, rotation and unassignment', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Select panel A' }));
  fireEvent.click(screen.getByRole('gridcell', { name: /Row 1, column 1/ }));
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Select panel A' })).toHaveAttribute('data-orientation', 'portrait');
  fireEvent.click(screen.getByRole('button', { name: 'Rotate next panels' }));
  expect(screen.getByRole('button', { name: 'Select panel A' })).toHaveAttribute('data-orientation', 'portrait');
  fireEvent.click(screen.getByRole('button', { name: 'Return to unassigned' }));
  expect(screen.getByRole('region', { name: 'Unassigned panels' })).toContainElement(screen.getByRole('button', { name: 'Select panel A' }));
});
it('rejects collision and retains panels', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Select panel A' }));
  fireEvent.click(screen.getByRole('gridcell', { name: /Row 1, column 1/ }));
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Select panel B' }));
  fireEvent.click(screen.getByRole('gridcell', { name: /Row 2, column 1/ }));
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  expect(screen.getByRole('alert')).toHaveTextContent(/occupied/i);
  expect(screen.getByRole('region', { name: 'Unassigned panels' })).toContainElement(screen.getByRole('button', { name: 'Select panel B' }));
});
it('places with keyboard, clears selection and removes an array', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Select panel A' }));
  const grid = screen.getByRole('grid', { name: 'Roof panel grid' });
  fireEvent.keyDown(grid, { key: 'ArrowRight' });
  fireEvent.keyDown(grid, { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Select panel A' }).style.gridColumn).toBe('2 / span 1');
  fireEvent.keyDown(grid, { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Return to unassigned' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Remove array Roof' }));
  expect(screen.queryByRole('grid')).toBeNull();
  expect(screen.getByRole('region', { name: 'Unassigned panels' })).toContainElement(screen.getByRole('button', { name: 'Select panel A' }));
});
it('adds arrays and renames them', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: /Add array/ }));
  expect(screen.getAllByRole('grid')).toHaveLength(1);
  expect(screen.getByLabelText('Array for new panels')).toHaveDisplayValue('Array 2');
  fireEvent.change(screen.getByLabelText('Array name 2'), { target: { value: 'West' } });
  expect(screen.getAllByRole('grid')).toHaveLength(1);
  expect(screen.getByLabelText('Array for new panels')).toHaveDisplayValue('West');
});
it('refresh appends new panels without reordering the existing tray or losing assignments', () => {
  const draft: PanelLayout = { version: 1, arrays: [{ id: 'a', name: 'Roof', columns: 3, rows: 3, panels: [{ serial: 'MISSING', column: 0, row: 0, orientation: 'portrait' }] }] };
  const props = { draft, serials: ['MISSING', 'A', 'B'], suggestedOrder: ['B', 'A'], readings: [], error: null, onChange: vi.fn(), onSave: vi.fn(), onCancel: vi.fn() };
  const view = render(<PanelLayoutEditor {...props} />);
  view.rerender(<PanelLayoutEditor {...props} serials={['A', 'NEW', 'B']} suggestedOrder={['NEW', 'A', 'B']} readings={[{ serial_number: 'A', watts_output: 123, is_online: true }]} />);
  const tray = screen.getByRole('region', { name: 'Unassigned panels' });
  expect([...tray.querySelectorAll('[data-panel]')].map((p) => p.getAttribute('data-panel'))).toEqual(['B', 'A', 'NEW']);
  expect(screen.getByRole('button', { name: 'Select panel MISSING' }).style.gridColumn).toBe('1 / span 1');
  expect(screen.getByRole('button', { name: 'Select panel A' })).toHaveTextContent('123 W');
});
it('clicking an empty cell does not place a selected panel', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Select panel A' }));
  fireEvent.click(screen.getByRole('gridcell', { name: /Row 1, column 1/ }));
  expect(screen.getByRole('region', { name: 'Unassigned panels' })).toContainElement(screen.getByRole('button', { name: 'Select panel A' }));
});
it('changes panel grouping without moving it or adding another grid', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Select panel A' }));
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: /Add array/ }));
  const panel = screen.getByRole('button', { name: 'Select panel A' });
  const position = panel.style.gridColumn;
  const target = screen.getByLabelText('Array for new panels') as HTMLSelectElement;
  fireEvent.change(screen.getByLabelText('Panel array'), { target: { value: target.value } });
  expect(panel.style.gridColumn).toBe(position);
  expect(panel).toHaveTextContent('Array 2');
  expect(screen.getAllByRole('grid')).toHaveLength(1);
});
it('adds an array without secure-context UUID support', () => {
  const uuid = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('secure context required'); });
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: /Add array/ }));
  expect(screen.getByLabelText('Array for new panels')).toHaveDisplayValue('Array 2');
  expect(uuid).not.toHaveBeenCalled();
  uuid.mockRestore();
});
it('Escape clears a selected tray panel before later grid activation', () => {
  render(<Harness />);
  const panel = screen.getByRole('button', { name: 'Select panel A' });
  fireEvent.click(panel);
  fireEvent.keyDown(panel, { key: 'Escape' });
  expect(panel).toHaveAttribute('aria-pressed', 'false');
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  expect(screen.getByRole('region', { name: 'Unassigned panels' })).toContainElement(panel);
});
it('releasing outside the editor clears a pending press', () => {
  render(<Harness />);
  function pointer(target: HTMLElement | Window, type: string, id: number) {
    const event = new MouseEvent(type, { bubbles: true });
    Object.defineProperty(event, 'pointerId', { value: id });
    fireEvent(target, event);
  }
  pointer(screen.getByRole('button', { name: 'Select panel A' }), 'pointerdown', 1);
  pointer(window, 'pointerup', 1);
  pointer(screen.getByRole('button', { name: 'Select panel B' }), 'pointerdown', 2);
  expect(screen.getByRole('button', { name: 'Select panel B' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Select panel A' })).toHaveAttribute('aria-pressed', 'false');
});
