import { useState } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchSnapshots, fetchSnapshotsByWindow } from '@/api/inverters';
import { useTimeRange } from '@/hooks/useTimeRange';
import type { SnapshotsResponse, WindowInvertersResponse, SnapshotItem, InverterItem } from '@/api/types';
import styles from './InverterTable.module.css';

interface Props {
  selectedWindowTs: number | null;
  onClearWindow: () => void;
}

function formatTs(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(epochSeconds * 1000),
  );
}

function StatusBadge({ isOnline }: { isOnline: boolean }) {
  return (
    <span className={styles.badge}>
      <span
        className={styles.dot}
        style={{ background: isOnline ? 'var(--green)' : 'var(--red)' }}
      />
      <span style={{ color: isOnline ? 'var(--green)' : 'var(--red)' }}>
        {isOnline ? 'online' : 'offline'}
      </span>
    </span>
  );
}

interface DefaultTableProps {
  serialFilter: string;
}

function DefaultTable({ serialFilter }: DefaultTableProps) {
  const { start, end } = useTimeRange();
  const { data: snapData } = useAutoRefresh<SnapshotsResponse>(
    () => fetchSnapshots({ start, end, serial: serialFilter || undefined, limit: 200 }),
  );

  if (snapData === null) {
    return <div className={styles.empty}>Loading inverter data…</div>;
  }

  if (snapData.snapshots.length === 0) {
    return <div className={styles.empty}>No inverter data for this period</div>;
  }

  const showLimit = snapData.total === snapData.limit;

  return (
    <>
      {showLimit && (
        <p className={styles.note}>Showing up to 200 results</p>
      )}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Serial</th>
              <th>Watts</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {snapData.snapshots.map((row: SnapshotItem, i: number) => (
              <tr key={`${row.serial_number}-${row.window_start}-${i}`}>
                <td>{formatTs(row.window_start)}</td>
                <td className={styles.mono}>{row.serial_number}</td>
                <td>{row.watts_output.toFixed(1)} W</td>
                <td><StatusBadge isOnline={row.is_online} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface DrillDownTableProps {
  windowTs: number;
}

function DrillDownTable({ windowTs }: DrillDownTableProps) {
  const { data: windowData } = useAutoRefresh<WindowInvertersResponse>(
    () => fetchSnapshotsByWindow(windowTs),
  );

  if (windowData === null) {
    return <div className={styles.empty}>Loading inverter data…</div>;
  }

  if (windowData.inverters.length === 0) {
    return <div className={styles.empty}>No inverter data for this period</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Serial</th>
            <th>Watts</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {windowData.inverters.map((inv: InverterItem) => (
            <tr key={inv.serial_number}>
              <td className={styles.mono}>{inv.serial_number}</td>
              <td>{inv.watts_output.toFixed(1)} W</td>
              <td><StatusBadge isOnline={inv.is_online} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InverterTable({ selectedWindowTs, onClearWindow }: Props) {
  const [serialFilter, setSerialFilter] = useState<string>('');

  const isDrillDown = selectedWindowTs !== null;

  return (
    <section className={styles.section}>
      <div className={styles.toolbar}>
        {isDrillDown ? (
          <>
            <button className={styles.back} onClick={onClearWindow}>← Back to snapshots</button>
            <h2 className={styles.heading}>Inverters at {formatTs(selectedWindowTs)}</h2>
          </>
        ) : (
          <>
            <h2 className={styles.heading}>Inverter Snapshots</h2>
            <input
              className={styles.filter}
              type="text"
              placeholder="Filter by serial…"
              value={serialFilter}
              onChange={(e) => setSerialFilter(e.target.value)}
            />
          </>
        )}
      </div>

      {isDrillDown ? (
        <DrillDownTable key={selectedWindowTs} windowTs={selectedWindowTs} />
      ) : (
        <DefaultTable key={`${serialFilter}`} serialFilter={serialFilter} />
      )}
    </section>
  );
}
