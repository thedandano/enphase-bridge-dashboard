import { describe, it, expect } from 'vitest';
import { parsePanelLayout, placePanel, resizeArray, removeArray, orderedUnassignedSerials, type PanelLayout } from '@/utils/panelLayout';
const layout: PanelLayout = { version: 1, arrays: [{ id: 'roof', name: 'Roof', columns: 12, rows: 12, panels: [{ serial: 'A', column: 0, row: 0, orientation: 'portrait' }] }] };
describe('panel layout', () => {
  it('moves without mutating its input', () => {
    const moved = placePanel(layout, 'A', { arrayId: 'roof', column: 3, row: 2 }, 'landscape');
    expect(moved.arrays[0].panels[0]).toMatchObject({ column: 3, row: 2, orientation: 'landscape' });
    expect(layout.arrays[0].panels[0].column).toBe(0);
  });
  it('rejects overlapping and out of bounds footprints', () => {
    expect(() => placePanel(layout, 'B', { arrayId: 'roof', column: 0, row: 1 }, 'landscape')).toThrow(/occupied/i);
    expect(() => placePanel(layout, 'B', { arrayId: 'roof', column: 11, row: 1 }, 'landscape')).toThrow(/outside/i);
  });
  it('rejects rotation into a neighbor and grid shrinking', () => {
    const two = placePanel(layout, 'B', { arrayId: 'roof', column: 1, row: 0 }, 'portrait');
    expect(() => placePanel(two, 'A', { arrayId: 'roof', column: 0, row: 0 }, 'landscape')).toThrow();
    const far = placePanel(layout, 'A', { arrayId: 'roof', column: 5, row: 0 }, 'portrait');
    expect(() => resizeArray(far, 'roof', 2, 2)).toThrow();
  });
  it('returns panels to unassigned and preserves missing assignments', () => {
    expect(orderedUnassignedSerials(layout, ['A', 'B', 'C'], [{ serial: 'C', series: [], peak: 1 }])).toEqual(['C', 'B']);
    expect(removeArray(layout, 'roof').arrays).toEqual([]);
    expect(parsePanelLayout(layout).arrays[0].panels[0].serial).toBe('A');
  });
  it.each([1, 41, 2.5])('rejects invalid dimensions %s', (columns) => {
    expect(() => parsePanelLayout({ ...layout, arrays: [{ ...layout.arrays[0], columns }] })).toThrow();
  });
  it('rejects duplicate serials, IDs, unsupported versions and invalid strings', () => {
    expect(() => parsePanelLayout({ ...layout, version: 2 })).toThrow();
    expect(() => parsePanelLayout({ ...layout, arrays: [layout.arrays[0], layout.arrays[0]] })).toThrow();
    for (const panels of [[layout.arrays[0].panels[0], layout.arrays[0].panels[0]], [{ serial: '', column: 0, row: 0, orientation: 'portrait' }]]) {
      expect(() => parsePanelLayout({ ...layout, arrays: [{ ...layout.arrays[0], panels }] })).toThrow();
    }
    for (const name of ['', 'x'.repeat(81)]) expect(() => parsePanelLayout({ ...layout, arrays: [{ ...layout.arrays[0], name }] })).toThrow();
  });
});

it('rejects collisions between groups on the shared grid', () => {
  const shared = { ...layout, grid: { columns: 12, rows: 12 }, arrays: [...layout.arrays, { id: 'west', name: 'West', columns: 12, rows: 12, panels: [] }] };
  expect(() => placePanel(shared, 'B', { arrayId: 'west', column: 0, row: 0 }, 'portrait')).toThrow(/occupied/i);
});
it('migrates separate canvases without overlapping or losing their groups', () => {
  const old = { ...layout, arrays: [...layout.arrays, { ...layout.arrays[0], id: 'west', name: 'West', panels: [{ serial: 'B', column: 0, row: 0, orientation: 'portrait' }] }] };
  const migrated = parsePanelLayout(old);
  expect(migrated.arrays[0].panels[0].row).toBe(0);
  expect(migrated.arrays[1].panels[0].row).toBe(3);
  expect(parsePanelLayout(migrated)).toEqual(migrated);
});
it('changing a group keeps the global position and orientation', () => {
  const shared = parsePanelLayout({ ...layout, arrays: [...layout.arrays, { id: 'west', name: 'West', columns: 12, rows: 12, panels: [] }] });
  const moved = placePanel(shared, 'A', { arrayId: 'west', column: 0, row: 0 }, 'portrait');
  expect(moved.arrays[0].panels).toHaveLength(0);
  expect(moved.arrays[1].panels[0]).toEqual(layout.arrays[0].panels[0]);
});
it('migrates bottom-aligned legacy groups within the shared grid bound', () => {
  const arrays = ['A', 'B'].map((serial) => ({ id: serial, name: serial, columns: 40, rows: 40, panels: [{ serial, column: 0, row: 38, orientation: 'portrait' }] }));
  const migrated = parsePanelLayout({ version: 1, arrays });
  expect(migrated.grid!.rows).toBeLessThanOrEqual(40);
  expect(migrated.arrays.flatMap((a) => a.panels).map((p) => p.serial)).toEqual(['A', 'B']);
});
it('packs tall legacy groups beside each other when vertical stacking cannot fit', () => {
  const arrays = ['A', 'B'].map((id) => ({ id, name: id, columns: 2, rows: 40, panels: [0, 38].map((row) => ({ serial: `${id}${row}`, column: 0, row, orientation: 'portrait' })) }));
  const migrated = parsePanelLayout({ version: 1, arrays });
  expect(migrated.grid!.rows).toBe(40);
  expect(migrated.arrays[1].panels[0].column).toBeGreaterThan(0);
  expect(migrated.arrays[1].panels[1].row - migrated.arrays[1].panels[0].row).toBe(38);
});
