// Maps a 0–1 fraction to an rgba string.
// Spectrum: dark purple (low) → cyan → green → bright yellow (peak)
export function spectrumColor(pct: number): string {
  const stops: [number, [number, number, number], number][] = [
    [0.00, [149, 128, 255], 0.10],
    [0.25, [149, 128, 255], 0.40],
    [0.55, [128, 255, 234], 0.70],
    [0.80, [138, 255, 128], 0.88],
    [1.00, [255, 255, 128], 1.00],
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i][0] && pct <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = lo[0] === hi[0] ? 1 : (pct - lo[0]) / (hi[0] - lo[0]);
  const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * t);
  const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * t);
  const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * t);
  const a = (lo[2] + (hi[2] - lo[2]) * t).toFixed(2);
  return `rgba(${r},${g},${b},${a})`;
}
