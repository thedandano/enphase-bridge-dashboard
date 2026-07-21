import { describe, it, expect } from 'vitest';
import type { WindowItem } from '@/api/types';
import { toDisplayData } from '@/utils/formatters';

// Every fixture must satisfy the bridge's invariant:
//   produced + imported === consumed + exported
// An unbalanced window is physically impossible and would make the mirrored
// chart's two halves disagree for reasons unrelated to the transform.
function balanced(w: Omit<WindowItem, 'window_start' | 'is_complete'>): WindowItem {
  const inWh = w.wh_produced + w.wh_grid_import;
  const outWh = w.wh_consumed + w.wh_grid_export;
  if (Math.abs(inWh - outWh) > 0.05) {
    throw new Error(`unbalanced fixture: in ${inWh} != out ${outWh}`);
  }
  return { window_start: 1_000_000, is_complete: true, ...w };
}

// Net exporting: export 200 - import 50 = 150 net export.
const base = balanced({
  wh_produced: 500,
  wh_consumed: 350,
  wh_grid_import: 50,
  wh_grid_export: 200,
});

// Net importing: import 200 - export 50 = 150 net import.
const importing = balanced({
  wh_produced: 100,
  wh_consumed: 250,
  wh_grid_import: 200,
  wh_grid_export: 50,
});

describe('toDisplayData', () => {
  it('negates wh_consumed', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_consumed).toBe(-350);
  });

  it('leaves wh_produced unchanged', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_produced).toBe(500);
  });

  it('preserves window_start and is_complete', () => {
    const [result] = toDisplayData([base]);
    expect(result.window_start).toBe(1_000_000);
    expect(result.is_complete).toBe(true);
  });

  it('handles an empty array', () => {
    expect(toDisplayData([])).toEqual([]);
  });

  // The bridge reports gross flows, so one window can hold both import and
  // export. The chart shows a single net grid direction instead — otherwise a
  // net-exporting window also draws an import bar above the axis.
  describe('grid netting', () => {
    it('shows only net export, below the axis, when exporting on balance', () => {
      const [result] = toDisplayData([base]);
      expect(result.wh_grid_export).toBe(-150);
      expect(result.wh_grid_import).toBe(0);
    });

    it('shows only net import, above the axis, when importing on balance', () => {
      const [result] = toDisplayData([importing]);
      expect(result.wh_grid_import).toBe(150);
      expect(result.wh_grid_export).toBe(0);
    });

    it('shows neither when import and export cancel out', () => {
      const [result] = toDisplayData([
        balanced({
          wh_produced: 400,
          wh_consumed: 400,
          wh_grid_import: 100,
          wh_grid_export: 100,
        }),
      ]);
      expect(result.wh_grid_import).toBe(0);
      expect(result.wh_grid_export).toBe(0);
    });

    // Both halves of the mirrored chart must sum to the same magnitude, or the
    // bars stop lining up across the zero axis.
    it('keeps the mirrored halves balanced', () => {
      const realWindow = balanced({
        // real bridge window, 09:15 local — both import and export present
        wh_produced: 549.95,
        wh_consumed: 389.15,
        wh_grid_import: 66.55,
        wh_grid_export: 227.36,
      });

      for (const w of [base, importing, realWindow]) {
        const [r] = toDisplayData([w]);
        const above = r.wh_produced + r.wh_grid_import;
        const below = -r.wh_consumed + -r.wh_grid_export;
        expect(above).toBeCloseTo(below, 1);
      }
    });
  });
});
