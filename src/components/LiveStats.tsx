import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchLatestWindow } from '@/api/energy';
import { ApiError } from '@/api/client';
import type { WindowItem } from '@/api/types';
import { StatCard } from './StatCard';
import styles from './LiveStats.module.css';

function toKw(wh: number): string {
  return `${(wh * 4 / 1000).toFixed(2)} kW`;
}

function toWh(wh: number): string {
  return `~${Math.round(wh)} Wh`;
}

export function LiveStats() {
  const { data, error } = useAutoRefresh<WindowItem>(fetchLatestWindow);

  const noData = error instanceof ApiError && error.status === 404;

  const dash = '—';
  const inProgress = !noData && data !== null && !data.is_complete;

  const fmt = (wh: number) =>
    data === null || noData ? dash :
    data.is_complete ? toKw(wh) : toWh(wh);

  return (
    <div className={styles.grid}>
      <StatCard label="Producing"  value={fmt(data?.wh_produced  ?? 0)} color="var(--signal-production)"  isInProgress={inProgress} />
      <StatCard label="Consuming"  value={fmt(data?.wh_consumed  ?? 0)} color="var(--signal-consumption)" isInProgress={inProgress} />
      <StatCard label="Exporting"  value={fmt(data?.wh_grid_export ?? 0)} color="var(--signal-grid-export)" isInProgress={inProgress} />
      <StatCard label="Importing"  value={fmt(data?.wh_grid_import ?? 0)} color="var(--signal-grid-import)" isInProgress={inProgress} />
    </div>
  );
}
