import { useMemo, useState, type MouseEvent } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchSnapshots } from '@/api/inverters';
import type { SnapshotsResponse } from '@/api/types';
import {
  computeDailyTotals,
  computeMedian,
  formatKwh,
  formatRelativeTime,
  formatSignedPercent,
  type DailyTotalRow,
} from '@/utils/inverterDailyTotals';
import styles from './InverterDailyTotals.module.css';

const UNDERPERFORM_THRESHOLD = 0.9;
// Soft tick — the "concerning" threshold, drawn as a marker on the track.
const DEVIATION_RANGE_SOFT = 0.10;
// Hard render range — values within this map to the visible track.
// Beyond this, the dot becomes an off-scale arrowhead at the edge.
const DEVIATION_RANGE_HARD = 0.25;

interface Props {
  start: number;
  end: number;
  periodLabel: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface RowDerived {
  row: DailyTotalRow;
  deviation: number;
  isOffscale: boolean;
  offscaleSide: 'left' | 'right' | null;
  dotLeft: number;
  underperforming: boolean;
  pctOfLeader: number;
}

function deriveRow(
  row: DailyTotalRow,
  median: number,
  peakWh: number,
): RowDerived {
  const deviation = median > 0 ? (row.whTotal - median) / median : 0;
  const isOffscale = Math.abs(deviation) > DEVIATION_RANGE_HARD;
  const offscaleSide = !isOffscale ? null : deviation < 0 ? 'left' : 'right';
  const normalized = clamp(deviation / DEVIATION_RANGE_HARD, -1, 1);
  const dotLeft = 50 + normalized * 50;
  const underperforming =
    peakWh > 0 && row.whTotal < peakWh * UNDERPERFORM_THRESHOLD;
  const pctOfLeader = peakWh > 0 ? row.whTotal / peakWh : 0;
  return { row, deviation, isOffscale, offscaleSide, dotLeft, underperforming, pctOfLeader };
}

interface TooltipState {
  serial: string;
  x: number;
  y: number;
  nowSeconds: number;
}

export function InverterDailyTotals({ start, end, periodLabel }: Props) {
  const { data } = useAutoRefresh<SnapshotsResponse>(
    () => fetchSnapshots({ start, end, limit: 2000 }),
    [start, end],
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    return computeDailyTotals(data.snapshots);
  }, [data]);

  const peakWh = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.whTotal), 0),
    [rows],
  );
  const totalWh = useMemo(
    () => rows.reduce((sum, r) => sum + r.whTotal, 0),
    [rows],
  );
  const median = useMemo(
    () => computeMedian(rows.map((r) => r.whTotal)),
    [rows],
  );
  const activeCount = rows.filter((r) => r.wasActive).length;
  const hasUnderperformer = rows.some(
    (r) => peakWh > 0 && r.whTotal < peakWh * UNDERPERFORM_THRESHOLD,
  );

  const derivedBySerial = useMemo(() => {
    const map = new Map<string, RowDerived>();
    for (const row of rows) {
      map.set(row.serial, deriveRow(row, median, peakWh));
    }
    return map;
  }, [rows, median, peakWh]);

  const tooltipDerived = tooltip ? derivedBySerial.get(tooltip.serial) : null;

  const isLoading = data === null;

  // Soft-tick positions along the hard-range track.
  const softPct = (DEVIATION_RANGE_SOFT / DEVIATION_RANGE_HARD) * 50;
  const softTickLeft = `${50 - softPct}%`;
  const softTickRight = `${50 + softPct}%`;

  const handleMouseMove = (e: MouseEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    const li = target.closest<HTMLLIElement>('li[data-serial]');
    if (!li) {
      setTooltip(null);
      return;
    }
    const serial = li.dataset.serial;
    if (!serial) return;
    // Flip the tooltip to the left of the cursor when it would extend
    // past the right edge of the viewport.
    const TOOLTIP_W = 280;
    const PAD = 16;
    const wouldOverflow = e.clientX + TOOLTIP_W + PAD * 2 > window.innerWidth;
    const x = wouldOverflow ? Math.max(PAD, e.clientX - TOOLTIP_W - PAD) : e.clientX + PAD;
    setTooltip({
      serial,
      x,
      y: e.clientY + PAD,
      nowSeconds: Math.floor(Date.now() / 1000),
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading}>INVERTERS {periodLabel}</h2>
        {!isLoading && rows.length > 0 && (
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              {activeCount} / {rows.length} active
            </span>
            <span className={styles.summaryDivider}>·</span>
            <span className={styles.summaryItem}>{formatKwh(totalWh)}</span>
            {hasUnderperformer && (
              <>
                <span className={styles.summaryDivider}>·</span>
                <span className={styles.summaryChip}>
                  <span aria-hidden="true">⚠</span> below 90% of leader
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {!isLoading && rows.length > 0 && (
        <p className={styles.subtitle}>
          Each dot is one inverter&rsquo;s output vs. the period median.
        </p>
      )}

      {isLoading ? (
        <div className={styles.stateBox}>
          <span className={styles.pulse} />
          Loading inverter totals…
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.stateBox}>No inverter data for today</div>
      ) : (
        <ul
          className={styles.list}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {rows.map((row) => {
            const d = derivedBySerial.get(row.serial)!;
            return (
              <li key={row.serial} className={styles.row} data-serial={row.serial}>
                <span className={styles.serial}>{row.serial}</span>
                <span className={styles.dotTrack} aria-hidden="true">
                  <span className={styles.trackLine} />
                  <span className={styles.tickSoft} style={{ left: softTickLeft }} />
                  <span className={styles.tickSoft} style={{ left: softTickRight }} />
                  <span className={styles.centerline} />
                  {d.isOffscale ? (
                    <span
                      className={
                        d.offscaleSide === 'left'
                          ? `${styles.offscale} ${styles.offscaleLeft}`
                          : `${styles.offscale} ${styles.offscaleRight}`
                      }
                    />
                  ) : (
                    <span
                      className={
                        d.underperforming
                          ? `${styles.dot} ${styles.dotOutlier}`
                          : styles.dot
                      }
                      style={{ left: `${d.dotLeft}%` }}
                    />
                  )}
                </span>
                <span
                  className={
                    d.underperforming || d.isOffscale
                      ? `${styles.deviation} ${styles.deviationAlert}`
                      : styles.deviation
                  }
                >
                  {formatSignedPercent(d.deviation)}
                </span>
                <span className={styles.kwh}>{formatKwh(row.whTotal)}</span>
                <span
                  className={d.underperforming ? styles.warn : styles.warnHidden}
                  aria-label={d.underperforming ? 'Below 90% of leader' : undefined}
                >
                  {d.underperforming ? '⚠' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {tooltip && tooltipDerived && (
        <div
          className={styles.tooltip}
          role="tooltip"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y + 16,
          }}
        >
          <div className={styles.tooltipSerial}>{tooltipDerived.row.serial}</div>
          <div className={styles.tooltipMetrics}>
            {formatSignedPercent(tooltipDerived.deviation)} vs median
            {' · '}
            {Math.round(tooltipDerived.pctOfLeader * 100)}% of leader
          </div>
          <div className={styles.tooltipMeta}>
            {tooltipDerived.row.isOnline ? 'Online' : 'Offline'}
            {' · '}
            last reported {formatRelativeTime(tooltipDerived.row.latestWindow, tooltip.nowSeconds)}
          </div>
        </div>
      )}
    </section>
  );
}
