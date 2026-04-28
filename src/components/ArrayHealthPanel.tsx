import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchArrays } from '@/api/inverters';
import type { ArraysResponse, ArraySummary, InverterItem } from '@/api/types';
import styles from './ArrayHealthPanel.module.css';

function badgeColor(online: number, total: number): string {
  if (total === 0) return 'var(--fg-muted)';
  if (online === total) return 'var(--green)';
  if (online === 0) return 'var(--red)';
  return 'var(--orange)';
}

function ArrayRow({ arr }: { arr: ArraySummary }) {
  const color = badgeColor(arr.online_count, arr.total_count);
  return (
    <div className={styles.arrayRow}>
      <div className={styles.arrayHeader}>
        <span className={styles.arrayName}>{arr.name}</span>
        <span className={styles.badge} style={{ color }}>
          {arr.online_count} / {arr.total_count}
        </span>
        <span className={styles.watts}>{arr.total_watts.toFixed(1)} W</span>
      </div>
      <div className={styles.inverterList}>
        {arr.inverters.map((inv: InverterItem) => (
          <div key={inv.serial_number} className={styles.inverter}>
            <span
              className={styles.dot}
              style={{ background: inv.is_online ? 'var(--green)' : 'var(--red)' }}
            />
            <span className={styles.serial}>{inv.serial_number}</span>
            <span className={styles.inverterWatts}>{inv.watts_output.toFixed(1)} W</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArrayHealthPanel() {
  const { data } = useAutoRefresh<ArraysResponse>(fetchArrays);

  if (data === null) return <div className={styles.placeholder}>Loading arrays…</div>;
  if (data.window_start === null) return <div className={styles.placeholder}>Waiting for first poll…</div>;
  if (data.arrays.length === 0) return <div className={styles.placeholder}>No arrays configured — add serial numbers to config.toml</div>;

  return (
    <div className={styles.panel}>
      {data.arrays.map((arr: ArraySummary) => (
        <ArrayRow key={arr.name} arr={arr} />
      ))}
    </div>
  );
}
