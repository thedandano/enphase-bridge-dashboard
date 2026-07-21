// Solar serving the house directly = consumption not covered by grid import.
// Math.min(produced, consumed) is only equivalent when a window is purely
// importing or purely exporting. A 15-minute window can contain both (the house
// flips either side of break-even within it), and min() then overstates this
// segment by the imported amount.
export function solarToHomeWh(consumedWh: number, gridImportWh: number): number {
  return Math.max(0, consumedWh - gridImportWh);
}

/**
 * Tallest stack in either direction, for sizing the mirrored chart's Y axis.
 *
 * Takes display data (post-toDisplayData), where consumed and grid export are
 * negated and grid flow is netted. Sizing from the raw API values instead would
 * scale the axis for gross import/export stacks that are never drawn.
 */
export function mirroredMaxWh(
  displayWindows: readonly {
    wh_produced: number;
    wh_consumed: number;
    wh_grid_import: number;
    wh_grid_export: number;
  }[],
  fallback = 1000,
): number {
  if (displayWindows.length === 0) return fallback;
  return Math.max(
    ...displayWindows.map((w) =>
      Math.max(
        w.wh_produced + w.wh_grid_import,
        Math.abs(w.wh_consumed) + Math.abs(w.wh_grid_export),
      ),
    ),
  );
}
