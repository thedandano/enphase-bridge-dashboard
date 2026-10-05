import type { InverterItem } from '@/api/types';
import type { HeatmapRow } from './heatmapTransform';

export type PanelOrientation = 'portrait' | 'landscape';
export interface PlacedPanel { serial: string; column: number; row: number; orientation: PanelOrientation }
export interface PanelArray { id: string; name: string; columns: number; rows: number; panels: readonly PlacedPanel[] }
export interface PanelLayout { version: 1; grid?: { columns: number; rows: number }; arrays: readonly PanelArray[] }
export type PanelTarget = { arrayId: string; column: number; row: number } | null;
export const EMPTY_LAYOUT: PanelLayout = { version: 1, grid: { columns: 12, rows: 8 }, arrays: [] };
export function panelSize(orientation: PanelOrientation) {
  return orientation === 'portrait' ? { columns: 1, rows: 2 } : { columns: 2, rows: 1 };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid layout object');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = Infinity): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${label}`);
  return value.trim();
}
function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${label}`);
  return value;
}
function parseArray(value: unknown, serials: Set<string>, ids: Set<string>, occupied = new Set<string>()): PanelArray {
  const a = object(value);
  const id = text(a.id, 'array ID');
  if (ids.has(id)) throw new Error('Duplicate array ID');
  ids.add(id);
  const columns = integer(a.columns, 'columns', 2, 40);
  const rows = integer(a.rows, 'rows', 2, 40);
  if (!Array.isArray(a.panels)) throw new Error('Invalid panels');
  const panels = a.panels.map((value): PlacedPanel => {
    const p = object(value);
    const serial = text(p.serial, 'serial');
    if (serials.has(serial)) throw new Error('A panel is assigned more than once');
    serials.add(serial);
    if (p.orientation !== 'portrait' && p.orientation !== 'landscape') throw new Error('Invalid orientation');
    const column = integer(p.column, 'column', 0, 39);
    const row = integer(p.row, 'row', 0, 39);
    const size = panelSize(p.orientation);
    if (column + size.columns > columns || row + size.rows > rows) throw new Error('Panel falls outside the array');
    for (let x = column; x < column + size.columns; x++) {
      for (let y = row; y < row + size.rows; y++) {
        const key = `${x},${y}`;
        if (occupied.has(key)) throw new Error('These cells are occupied');
        occupied.add(key);
      }
    }
    return { serial, column, row, orientation: p.orientation };
  });
  return { id, name: text(a.name, 'array name', 80), columns, rows, panels };
}
export function parsePanelLayout(value: unknown): PanelLayout {
  const layout = object(value);
  if (layout.version !== 1) throw new Error('Unsupported saved layout version');
  if (!Array.isArray(layout.arrays)) throw new Error('Invalid arrays');
  const serials = new Set<string>();
  const ids = new Set<string>();
  if (layout.grid) {
    const g = object(layout.grid);
    const grid = { columns: integer(g.columns, 'columns', 2, 40), rows: integer(g.rows, 'rows', 2, 40) };
    const occupied = new Set<string>();
    return { version: 1, grid, arrays: layout.arrays.map((a) => parseArray({ ...object(a), ...grid }, serials, ids, occupied)) };
  }
  // Older layouts had separate canvases. Keep each group's shape, with a blank row between groups.
  const arrays = layout.arrays.map((a) => parseArray(a, serials, ids)).map((a, _, all) => {
    const top = all.length > 1 && a.panels.length ? Math.min(...a.panels.map((p) => p.row)) : 0;
    return { ...a, panels: a.panels.map((p) => ({ ...p, row: p.row - top })) };
  });
  let nextRow = 0;
  const shifted = arrays.map((a) => {
    const panels = a.panels.map((p) => ({ ...p, row: p.row + nextRow }));
    if (panels.length) nextRow = Math.max(...panels.map((p) => p.row + panelSize(p.orientation).rows)) + 1;
    return { ...a, panels };
  });
  if (nextRow > 41) return packLegacyGroups(arrays);
  const grid = { columns: Math.max(12, ...arrays.map((a) => a.columns)), rows: Math.max(8, nextRow - 1) };
  return parsePanelLayout({ version: 1, grid, arrays: shifted });
}

function packLegacyGroups(arrays: readonly PanelArray[]): PanelLayout {
  // ponytail: shelf packing preserves each group's shape within the existing 40×40 limit.
  const groups = arrays.map((a) => {
    const left = a.panels.length ? Math.min(...a.panels.map((p) => p.column)) : 0;
    const panels = a.panels.map((p) => ({ ...p, column: p.column - left }));
    return { ...a, panels, width: Math.max(0, ...panels.map((p) => p.column + panelSize(p.orientation).columns)),
      height: Math.max(0, ...panels.map((p) => p.row + panelSize(p.orientation).rows)) };
  }).sort((a, b) => b.height - a.height);
  let column = 0;
  let row = 0;
  let shelfHeight = 0;
  const packed = new Map<string, readonly PlacedPanel[]>();
  for (const group of groups) {
    if (column + group.width > 40) { column = 0; row += shelfHeight; shelfHeight = 0; }
    if (row + group.height > 40) throw new Error('Saved groups cannot fit safely in one 40×40 grid. Original saved layout is preserved.');
    packed.set(group.id, group.panels.map((p) => ({ ...p, column: p.column + column, row: p.row + row })));
    column += group.width;
    shelfHeight = Math.max(shelfHeight, group.height);
  }
  return parsePanelLayout({ version: 1, grid: { columns: 40, rows: 40 },
    arrays: arrays.map((a) => ({ ...a, panels: packed.get(a.id)! })) });
}
export function placePanel(layout: PanelLayout, serial: string, target: PanelTarget, orientation: PanelOrientation): PanelLayout {
  if (!layout.grid) layout = { ...layout, grid: { columns: layout.arrays[0]?.columns ?? 12, rows: layout.arrays[0]?.rows ?? 8 } };
  if (target && !layout.arrays.some((a) => a.id === target.arrayId)) throw new Error('Array no longer exists');
  return parsePanelLayout({ ...layout, arrays: layout.arrays.map((a) => ({ ...a,
    panels: [...a.panels.filter((p) => p.serial !== serial), ...(target?.arrayId === a.id ? [{ serial, column: target.column, row: target.row, orientation }] : [])],
  })) });
}
export function resizeArray(layout: PanelLayout, arrayId: string, columns: number, rows: number): PanelLayout {
  if (!layout.arrays.some((a) => a.id === arrayId)) throw new Error('Array no longer exists');
  return parsePanelLayout({ ...layout, grid: { columns, rows } });
}
export function removeArray(layout: PanelLayout, arrayId: string): PanelLayout {
  return { ...layout, arrays: layout.arrays.filter((a) => a.id !== arrayId) };
}
export function orderedUnassignedSerials(layout: PanelLayout, serials: readonly string[], peakRows: readonly HeatmapRow[]): string[] {
  const assigned = new Set(layout.arrays.flatMap((a) => a.panels.map((p) => p.serial)));
  const remaining = new Set(serials.filter((s) => !assigned.has(s)));
  const ranked = peakRows.map((r) => r.serial).filter((s) => remaining.delete(s));
  return [...ranked, ...[...remaining].sort((a, b) => a.localeCompare(b))];
}

export function sharedPanelGrid(layout: PanelLayout, arrayId = layout.arrays[0]?.id ?? ''): PanelArray {
  return { id: arrayId, name: 'Roof', columns: layout.grid?.columns ?? layout.arrays[0]?.columns ?? 12,
    rows: layout.grid?.rows ?? layout.arrays[0]?.rows ?? 8, panels: layout.arrays.flatMap((a) => a.panels) };
}

export function maxPanelWatts(readings: readonly InverterItem[]): number {
  return Math.max(0, ...readings.filter((r) => r.is_online && Number.isFinite(r.watts_output)).map((r) => r.watts_output));
}
