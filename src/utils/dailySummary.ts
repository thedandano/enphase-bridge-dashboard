import type { WindowItem } from '@/api/types';

export interface DailySummary {
  wh_produced: number;
  wh_consumed: number;
  wh_grid_import: number;
  wh_grid_export: number;
}

export function computeDailySummary(windows: readonly WindowItem[]): DailySummary {
  return windows.reduce(
    (acc, w) => ({
      wh_produced:    acc.wh_produced    + w.wh_produced,
      wh_consumed:    acc.wh_consumed    + w.wh_consumed,
      wh_grid_import: acc.wh_grid_import + w.wh_grid_import,
      wh_grid_export: acc.wh_grid_export + w.wh_grid_export,
    }),
    { wh_produced: 0, wh_consumed: 0, wh_grid_import: 0, wh_grid_export: 0 },
  );
}

/** Format Wh as kWh when ≥ 1000, otherwise as whole Wh. */
export function toEnergy(wh: number): string {
  return wh >= 1000
    ? `${(wh / 1000).toFixed(2)} kWh`
    : `${Math.round(wh)} Wh`;
}
