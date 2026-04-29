import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchTodayWindows } from '@/api/energy';
import type { WindowsResponse } from '@/api/types';
import { computeDailySummary, toEnergy } from '@/utils/dailySummary';
import { StatCard } from './StatCard';
import styles from './TodaySummary.module.css';

export function TodaySummary() {
  const { data } = useAutoRefresh<WindowsResponse>(fetchTodayWindows);

  const summary = data ? computeDailySummary(data.windows) : null;
  const dash = '—';
  const fmt = (wh: number | undefined) => (wh === undefined ? dash : toEnergy(wh));

  return (
    <div className={styles.section}>
      <div className={styles.eyebrow}>Today</div>
      <div className={styles.grid}>
        <StatCard label="Produced" value={fmt(summary?.wh_produced)}    color="var(--signal-production)"  />
        <StatCard label="Consumed" value={fmt(summary?.wh_consumed)}    color="var(--signal-consumption)" />
        <StatCard label="Exported" value={fmt(summary?.wh_grid_export)} color="var(--signal-grid-export)" />
        <StatCard label="Imported" value={fmt(summary?.wh_grid_import)} color="var(--signal-grid-import)" />
      </div>
    </div>
  );
}
