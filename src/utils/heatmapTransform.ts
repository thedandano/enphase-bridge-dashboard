import type { SnapshotItem } from '@/api/types';

export interface HeatmapRow {
  serial: string;
  series: number[]; // length 96, one per 15-min slot
  peak: number;     // per-inverter max, minimum 1
}

export interface SeasonalHeatmapResult {
  days: number[];
  rows: HeatmapRow[];
  peak: number;
}

const WINDOW_MINUTES = 15;
const WH_PER_WATT = WINDOW_MINUTES / 60;

function localDayStart(epochSeconds: number): number {
  const d = new Date(epochSeconds * 1000);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

// Index of the row's highest value. All-zero rows sort last.
function peakSeriesIndex(series: readonly number[]): number {
  let peakIndex = -1;
  let peakValue = 0;
  series.forEach((value, index) => {
    if (value > peakValue) {
      peakValue = value;
      peakIndex = index;
    }
  });
  return peakIndex === -1 ? Number.POSITIVE_INFINITY : peakIndex;
}

function sortRowsByPeakTime(rows: HeatmapRow[]): HeatmapRow[] {
  return rows.sort((left, right) => {
    const leftIndex = peakSeriesIndex(left.series);
    const rightIndex = peakSeriesIndex(right.series);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    const leftPeak = Number.isFinite(leftIndex) ? left.series[leftIndex] : 0;
    const rightPeak = Number.isFinite(rightIndex) ? right.series[rightIndex] : 0;

    if (leftPeak !== rightPeak) {
      return rightPeak - leftPeak;
    }

    return left.serial.localeCompare(right.serial);
  });
}

// Builds one HeatmapRow per inverter sorted by time of peak production.
// start/end: Unix epoch bounds for the selected period. Values are averaged
// into one 96-slot day shape by local time of day.
export function buildHeatmapRows(
  snapshots: readonly SnapshotItem[],
  start: number,
  end = start + 96 * 15 * 60,
): HeatmapRow[] {
  const bucketCount = 96;
  const totalMap = new Map<string, number[]>();
  const countMap = new Map<string, number[]>();

  for (const snap of snapshots) {
    if (snap.window_start < start || snap.window_start >= end) continue;
    const snapDate = new Date(snap.window_start * 1000);
    const slotIdx = snapDate.getHours() * 4 + Math.floor(snapDate.getMinutes() / 15);

    let totals = totalMap.get(snap.serial_number);
    let counts = countMap.get(snap.serial_number);
    if (!totals || !counts) {
      totals = new Array<number>(bucketCount).fill(0);
      counts = new Array<number>(bucketCount).fill(0);
      totalMap.set(snap.serial_number, totals);
      countMap.set(snap.serial_number, counts);
    }
    totals[slotIdx] += snap.watts_output;
    counts[slotIdx] += 1;
  }

  const rows = Array.from(totalMap.keys()).map((serial) => {
    const totals = totalMap.get(serial)!;
    const counts = countMap.get(serial)!;
    const series = totals.map((total, idx) =>
      counts[idx] > 0 ? total / counts[idx] : 0
    );
    const peak = Math.max(...series, 1);
    return { serial, series, peak };
  });

  return sortRowsByPeakTime(rows);
}

export function buildSeasonalHeatmapRows(
  snapshots: readonly SnapshotItem[],
  start: number,
  end: number,
): SeasonalHeatmapResult {
  const startDay = localDayStart(start);
  const endDay = localDayStart(Math.max(start, end - 1));
  const days: number[] = [];
  for (let day = startDay; day <= endDay; day += 86400) {
    days.push(day);
  }

  const dayIndex = new Map(days.map((day, idx) => [day, idx]));
  const seriesMap = new Map<string, number[]>();

  for (const snap of snapshots) {
    if (snap.window_start < start || snap.window_start >= end) continue;
    const idx = dayIndex.get(localDayStart(snap.window_start));
    if (idx === undefined) continue;

    let series = seriesMap.get(snap.serial_number);
    if (!series) {
      series = new Array<number>(days.length).fill(0);
      seriesMap.set(snap.serial_number, series);
    }
    series[idx] += snap.watts_output * WH_PER_WATT;
  }

  const peak = Math.max(
    ...Array.from(seriesMap.values()).flat(),
    1,
  );
  const rows = sortRowsByPeakTime(
    Array.from(seriesMap.keys()).map((serial) => ({
      serial,
      series: seriesMap.get(serial)!,
      peak,
    })),
  );

  return { days, rows, peak };
}
