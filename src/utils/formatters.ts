// Pure formatting helpers extracted for testability
import type { WindowItem, TimeRange } from '@/api/types';

/** Convert Wh from a complete 15-min window to a kW string (×4 factor). */
export function toKw(wh: number): string {
  return `${(wh * 4 / 1000).toFixed(2)} kW`;
}

/** Format raw Wh for an in-progress window. Matches the 2-decimal precision of toKw. */
export function toWh(wh: number): string {
  return `~${wh.toFixed(2)} Wh`;
}

/** Format uptime seconds as "Xd Yh" or "Zm". */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

export type TokenStatus = 'ok' | 'warning' | 'expired';

/** Classify token expiry relative to now. */
export function tokenStatus(expiresAt: number): TokenStatus {
  const nowMs = Date.now();
  const expiresMs = expiresAt * 1000;
  if (expiresMs <= nowMs) return 'expired';
  if (expiresMs - nowMs <= 7 * 86400 * 1000) return 'warning';
  return 'ok';
}

/** Badge color for an inverter array based on online count. */
export function badgeColor(online: number, total: number): string {
  if (total === 0) return 'var(--fg-muted)';
  if (online === total) return 'var(--green)';
  if (online === 0) return 'var(--red)';
  return 'var(--orange)';
}

/** Format the date label shown above the chart for each time range. */
export function formatDateLabel(range: TimeRange, start: number, end: number, locale?: string, timeZone?: string): string {
  const fmt = (epochSec: number) =>
    new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', ...(timeZone && { timeZone }) }).format(
      new Date(epochSec * 1000)
    );
  if (range === 'today') return `Today · ${fmt(end)}`;
  if (range === '24h') return `Last 24h · ${fmt(end)}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

export const CHART_FONT = 'JetBrains Mono, monospace';
export const CHART_FONT_UI = 'Barlow Condensed, Arial Narrow, sans-serif';

export const X_TICK_STEP: Record<TimeRange, number> = {
  today: 2 * 3600,
  '24h': 2 * 3600,
  '7d': 24 * 3600,
  '30d': 4 * 24 * 3600,
};

export function computeXTicks(range: TimeRange, start: number, end: number): number[] {
  const step = X_TICK_STEP[range];
  const first = Math.ceil(start / step) * step;
  const ticks: number[] = [];
  for (let t = first; t <= end; t += step) ticks.push(t);
  return ticks;
}

export function formatChartTick(range: TimeRange, epochSeconds: number): string {
  const opts: Intl.DateTimeFormatOptions =
    range === 'today' || range === '24h'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(undefined, opts).format(new Date(epochSeconds * 1000));
}

/** Negate consumed and grid-export values so they render below the axis. */
export function toDisplayData(windows: readonly WindowItem[]): WindowItem[] {
  return windows.map((w) => ({
    ...w,
    wh_consumed: -w.wh_consumed,
    wh_grid_export: -w.wh_grid_export,
  }));
}
