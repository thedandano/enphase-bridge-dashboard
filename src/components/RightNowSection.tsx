import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchLatestWindow } from '@/api/energy';
import { ApiError } from '@/api/client';
import type { WindowItem } from '@/api/types';
import { toKw, toWh } from '@/utils/formatters';
import { StatCard } from './StatCard';
import styles from './RightNowSection.module.css';

function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RightNowSection() {
  const { data, error } = useAutoRefresh<WindowItem>(fetchLatestWindow);

  const noData = error instanceof ApiError && error.status === 404;
  const inProgress = !noData && data !== null && !data.is_complete;

  const dash = '—';
  const fmt = (wh: number) =>
    data === null || noData ? dash :
    data.is_complete ? toKw(wh) : toWh(wh);

  const windowRange = data
    ? `${fmtTime(data.window_start)} – ${fmtTime(data.window_start + 900)}`
    : null;

  return (
    <div className={styles.section}>
      <div className={styles.badge}>
        <span className={styles.pulseDot} />
        Right now
        {windowRange && <span className={styles.timeRange}>{windowRange}</span>}
      </div>
      <div className={styles.grid}>
        <StatCard label="Producing"  value={fmt(data?.wh_produced    ?? 0)} color="var(--signal-production)"  isInProgress={inProgress} />
        <StatCard label="Consuming"  value={fmt(data?.wh_consumed    ?? 0)} color="var(--signal-consumption)" isInProgress={inProgress} />
        <StatCard label="Exporting"  value={fmt(data?.wh_grid_export ?? 0)} color="var(--signal-grid-export)" isInProgress={inProgress} />
        <StatCard label="Importing"  value={fmt(data?.wh_grid_import ?? 0)} color="var(--signal-grid-import)" isInProgress={inProgress} />
      </div>
    </div>
  );
}
