// Pure formatting helpers extracted for testability
import type { WindowItem } from '@/api/types';

/** Convert Wh from a complete 15-min window to a kW string (×4 factor). */
export function toKw(wh: number): string {
  return `${(wh * 4 / 1000).toFixed(2)} kW`;
}

/** Format raw Wh for an in-progress window. */
export function toWh(wh: number): string {
  return `~${Math.round(wh)} Wh`;
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

/** Negate consumed and grid-export values so they render below the axis. */
export function toDisplayData(windows: readonly WindowItem[]): WindowItem[] {
  return windows.map((w) => ({
    ...w,
    wh_consumed: -w.wh_consumed,
    wh_grid_export: -w.wh_grid_export,
  }));
}
