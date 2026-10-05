import { useEffect, useMemo, useRef, useState } from 'react';
import { useInverterHistory } from '@/hooks/useInverterHistory';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchArrays, fetchSnapshotsByWindow, fetchSnapshotHistory } from '@/api/inverters';
import type { ArraysResponse, ArraySummary, InverterItem } from '@/api/types';
import { badgeColor } from '@/utils/formatters';
import { fetchHealth } from '@/api/health';
import { usePanelLayout } from '@/hooks/usePanelLayout';
import { buildHeatmapRows, type HeatmapRow } from '@/utils/heatmapTransform';
import { orderedUnassignedSerials, sharedPanelGrid, type PanelArray } from '@/utils/panelLayout';
import { PanelLayoutEditor } from './PanelLayoutEditor';
import { PanelLayoutGrid } from './PanelLayoutGrid';
import { computeDailyTotals, type DailyTotalRow } from '@/utils/inverterDailyTotals';
import { toEnergy } from '@/utils/dailySummary';
import { localMidnightUnix } from '@/hooks/useTimeRange';
import styles from './ArrayHealthPanel.module.css';

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

interface CurrentReadings { windowStart: number | null; readings: readonly InverterItem[] }
async function fetchCurrentReadings(): Promise<CurrentReadings> {
  const health = await fetchHealth();
  if (health.last_window_start === null) return { windowStart: null, readings: [] };
  const latest = await fetchSnapshotsByWindow(health.last_window_start);
  return { windowStart: latest.window_start, readings: latest.inverters };
}
function SavedArray({ array, readings, energyTotals, incomplete }: { array: PanelArray; readings: readonly InverterItem[]; energyTotals: readonly DailyTotalRow[]; incomplete: boolean }) {
  const matching = array.panels.map((p) => readings.find((r) => r.serial_number === p.serial));
  const reported = matching.filter((r): r is InverterItem => !!r);
  const energy = array.panels.map((p) => energyTotals.find((r) => r.serial === p.serial)).filter((r): r is DailyTotalRow => !!r);
  const wh = energy.reduce((total, r) => total + r.whTotal, 0);
  return <section className={styles.savedArray} aria-label={`Array ${array.name} summary`}>
    <div className={styles.arrayHeader}><h3>{array.name}</h3><span>{reported.filter((r) => r.is_online).length} / {array.panels.length} online</span><span className={styles.watts}>{energy.length ? `${toEnergy(wh)}${incomplete || energy.length < array.panels.length ? ' (partial)' : ''}` : 'Unavailable'}</span></div>
    {!array.panels.length && <p>No panels assigned.</p>}
  </section>;
}
interface History { serials: string[]; rows: HeatmapRow[]; note: string }
interface Props { start?: number; end?: number; live?: boolean; periodLabel?: string }
export function ArrayHealthPanel({ start = localMidnightUnix(), end, live = end === undefined, periodLabel = 'TODAY' }: Props = {}) {
  const rangeStart = live ? localMidnightUnix() : start;
  const requestKey = `${rangeStart}:${live ? 'live' : end}`;
  const { data: period, error: energyError } = useInverterHistory(start, end ?? 0, live);
  const energyTotals = useMemo(() => period?.key === requestKey ? computeDailyTotals(period.data.snapshots) : [], [period, requestKey]);
  const incomplete = period?.key === requestKey && period.incomplete;
  const { data, error: arraysError } = useAutoRefresh<ArraysResponse>(fetchArrays);
  const { data: current, error: readingsError } = useAutoRefresh<CurrentReadings>(fetchCurrentReadings);
  const layout = usePanelLayout();
  const editing = layout.draft !== null;
  const [history, setHistory] = useState<History | null>(null);
  const [notice, setNotice] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const entry = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.floor(endDate.getTime() / 1000);
    void fetchSnapshotHistory(start, end).then((result) => {
      if (cancelled) return;
      setHistory({ serials: [...new Set(result.data.snapshots.map((s) => s.serial_number))], rows: buildHeatmapRows(result.data.snapshots, start, end), note: result.incomplete ? 'History is incomplete. Peak order and discovered panels may be incomplete.' : 'Suggested order uses the last seven days of reported peak times, not physical roof position.' });
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.warn('Panel layout history fetch failed; editing known panels remains available without peak ordering', error);
      setHistory({ serials: [], rows: [], note: `Peak ordering unavailable: ${String(error)}` });
    });
    return () => { cancelled = true; };
  }, [editing]);
  const readings = current?.readings ?? [];
  const activeLayout = layout.draft ?? layout.saved;
  const serials = [...new Set([...(history?.serials ?? []), ...readings.map((r) => r.serial_number), ...energyTotals.map((r) => r.serial), ...(data?.arrays.flatMap((a) => a.inverters.map((r) => r.serial_number)) ?? []), ...activeLayout.arrays.flatMap((a) => a.panels.map((p) => p.serial))])];
  function close(save: boolean) {
    if (save && !layout.save()) return;
    if (!save) layout.cancel();
    setNotice(save ? 'Layout saved in this browser.' : 'Changes cancelled.');
    requestAnimationFrame(() => entry.current?.focus());
  }
  return <section className={styles.panel} aria-label="Array layout">
    <div className={styles.layoutHeader}><div><h2>ARRAY LAYOUT</h2><p>Arrange panels to match your roof.</p><p>{periodLabel} · Estimated energy from 15-minute readings.</p></div>{!editing && <button type="button" ref={entry} onClick={() => { setHistory(null); setNotice(''); layout.beginEdit(); }}>{layout.hasSaved ? 'Edit layout' : 'Create layout'}</button>}</div>
    {readingsError && <p role="status" className={styles.warning}>Current readings unavailable: {readingsError.message}{current ? '. Showing the last successful readings.' : ''}</p>}
    {energyError && <p role="status" className={styles.warning}>Energy totals unavailable: {energyError.message}{period?.key === requestKey ? ". Showing the last successful totals for this range." : ". No totals available for this range."}</p>}
    {incomplete && <p role="status" className={styles.warning}>Energy history is incomplete. Panel and array totals are partial.</p>}
    {arraysError && <p role="status" className={styles.warning}>Server array summaries unavailable: {arraysError.message}</p>}
    {layout.blocked && <div className={styles.warning}><p role="alert">{layout.error}</p>{confirmReset ? <><p>Reset the saved browser layout? The saved arrangement will be removed.</p><button type="button" onClick={() => { if (layout.resetSaved()) setConfirmReset(false); }}>Confirm reset</button><button type="button" onClick={() => setConfirmReset(false)}>Keep saved layout</button></> : <button type="button" onClick={() => setConfirmReset(true)}>Reset saved layout</button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {editing ? history ? <><p className={styles.historyNote}>{history.note}</p><PanelLayoutEditor draft={layout.draft!} serials={serials} suggestedOrder={orderedUnassignedSerials(activeLayout, serials, history.rows)} readings={readings} energyTotals={energyTotals} error={layout.error} onChange={layout.updateDraft} onSave={() => close(true)} onCancel={() => close(false)} /></> : <div className={styles.placeholder}><span>Loading panel history…</span><button type="button" onClick={() => close(false)}>Cancel</button></div>
      : layout.hasSaved ? <><div className={styles.arraySummaries} aria-label="Array summaries">{layout.saved.arrays.map((array) => <SavedArray key={array.id} array={array} readings={readings} energyTotals={energyTotals} incomplete={incomplete} />)}</div>{!!layout.saved.arrays.length && <PanelLayoutGrid array={sharedPanelGrid(layout.saved)} groups={layout.saved.arrays} readings={readings} energyTotals={energyTotals} editable={false} selectedSerial={null} onSelect={() => {}} onPlace={() => {}} />}{!layout.saved.arrays.length && <p>No arrays yet. Open Edit layout to add one.</p>}<p className={styles.historyNote}>Saved in this browser only. {serials.filter((s) => !layout.saved.arrays.some((a) => a.panels.some((p) => p.serial === s))).length} known panels unassigned.</p></>
      : data?.arrays.length ? data.arrays.map((arr) => <ArrayRow key={arr.name} arr={arr} />)
      : <p className={styles.historyNote}>{current?.windowStart === null ? 'Waiting for the first inverter poll.' : 'Create a layout to arrange your panels. No server array configuration is needed.'}</p>}
  </section>;
}
