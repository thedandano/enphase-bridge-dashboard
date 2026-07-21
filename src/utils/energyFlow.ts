// Solar serving the house directly = consumption not covered by grid import.
// Math.min(produced, consumed) is only equivalent when a window is purely
// importing or purely exporting. A 15-minute window can contain both (the house
// flips either side of break-even within it), and min() then overstates this
// segment by the imported amount.
export function solarToHomeWh(consumedWh: number, gridImportWh: number): number {
  return Math.max(0, consumedWh - gridImportWh);
}
