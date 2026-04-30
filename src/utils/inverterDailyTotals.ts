import type { SnapshotItem } from '@/api/types';

export interface DailyTotalRow {
  serial: string;
  whTotal: number;
  /** Online flag from the most recent snapshot in the period — for tooltip "currently online". */
  isOnline: boolean;
  /** Inverter contributed any energy during the period — for the summary count. */
  wasActive: boolean;
  latestWindow: number;
}

const WINDOW_MINUTES = 15;
const WH_PER_WATT = WINDOW_MINUTES / 60;

export function computeDailyTotals(snapshots: readonly SnapshotItem[]): DailyTotalRow[] {
  const map = new Map<string, DailyTotalRow>();

  for (const snap of snapshots) {
    const wh = snap.watts_output * WH_PER_WATT;
    const existing = map.get(snap.serial_number);
    if (!existing) {
      map.set(snap.serial_number, {
        serial: snap.serial_number,
        whTotal: wh,
        isOnline: snap.is_online,
        wasActive: wh > 0 || snap.is_online,
        latestWindow: snap.window_start,
      });
      continue;
    }
    existing.whTotal += wh;
    if (wh > 0 || snap.is_online) existing.wasActive = true;
    if (snap.window_start > existing.latestWindow) {
      existing.latestWindow = snap.window_start;
      existing.isOnline = snap.is_online;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.serial.localeCompare(b.serial));
}

export function formatKwh(wh: number): string {
  return `${(wh / 1000).toFixed(2)} kWh`;
}

export function computeMedian(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function formatSignedPercent(fraction: number, decimals = 1): string {
  const pct = fraction * 100;
  if (Math.abs(pct) < Math.pow(10, -decimals) / 2) return `0%`;
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(decimals)}%`;
}

export function formatRelativeTime(epochSeconds: number, nowSeconds: number): string {
  const diff = Math.max(0, nowSeconds - epochSeconds);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
