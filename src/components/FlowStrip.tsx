import { type CSSProperties } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchLatestWindow, fetchTodayWindows } from '@/api/energy';
import { ApiError } from '@/api/client';
import type { WindowItem, WindowsResponse } from '@/api/types';
import { computeDailySummary, toEnergy } from '@/utils/dailySummary';
import { toKw, toWh } from '@/utils/formatters';
import styles from './FlowStrip.module.css';

const DASH = '—';
// Below this Wh-per-15-min threshold, treat the segment as "no flow" (no dots).
const FLOW_EPSILON_WH = 0.5;

function formatTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNow(wh: number | undefined, isComplete: boolean | undefined): string {
  if (wh === undefined || isComplete === undefined) return DASH;
  return isComplete ? toKw(wh) : toWh(wh);
}

function formatTodaySigned(wh: number | null): string {
  if (wh === null) return DASH;
  if (Math.abs(wh) < 1) return '0 Wh';
  const sign = wh > 0 ? '+' : '−';
  return `${sign}${toEnergy(Math.abs(wh))}`;
}

interface GridState {
  arrow: '↑' | '↓' | '·';
  color: string;
}

function gridState(wh: number | null): GridState {
  if (wh === null || Math.abs(wh) < 0.01) {
    return { arrow: '·', color: 'var(--fg-muted)' };
  }
  return wh > 0
    ? { arrow: '↑', color: 'var(--signal-grid-export)' }
    : { arrow: '↓', color: 'var(--signal-grid-import)' };
}

interface FlowPipeProps {
  magnitudeWh: number | null;
  isComplete: boolean | undefined;
  color: string;
  direction: 'forward' | 'reverse';
}

function FlowPipe({ magnitudeWh, isComplete, color, direction }: FlowPipeProps) {
  const isIdle =
    magnitudeWh === null ||
    isComplete === undefined ||
    Math.abs(magnitudeWh) < FLOW_EPSILON_WH;
  const labelText = isIdle ? DASH : formatNow(Math.abs(magnitudeWh!), isComplete);
  const dotClass =
    direction === 'reverse'
      ? `${styles.dot} ${styles.dotReverse}`
      : styles.dot;

  return (
    <div
      className={styles.pipe}
      data-flow={isIdle ? 'idle' : 'active'}
      style={{ '--flow-color': isIdle ? 'var(--fg-muted)' : color } as CSSProperties}
    >
      <span className={styles.pipeSegment} aria-hidden="true">
        {!isIdle && (
          <>
            <span className={dotClass} style={{ animationDelay: '0s' }} aria-hidden="true" />
            <span className={dotClass} style={{ animationDelay: '4.8s' }} aria-hidden="true" />
          </>
        )}
      </span>
      <span className={styles.pipeLabel} style={{ color: isIdle ? undefined : color }}>
        {labelText}
      </span>
      <span className={styles.pipeSegment} aria-hidden="true">
        {!isIdle && (
          <>
            <span className={dotClass} style={{ animationDelay: '2.4s' }} aria-hidden="true" />
            <span className={dotClass} style={{ animationDelay: '7.2s' }} aria-hidden="true" />
          </>
        )}
      </span>
    </div>
  );
}

export function FlowStrip() {
  const { data: latest, error } = useAutoRefresh<WindowItem>(fetchLatestWindow);
  const { data: today } = useAutoRefresh<WindowsResponse>(fetchTodayWindows);

  const noLatest = error instanceof ApiError && error.status === 404;
  const summary = today ? computeDailySummary(today.windows) : null;

  const isComplete = !noLatest && latest !== null ? latest.is_complete : undefined;
  const productionNow = !noLatest ? latest?.wh_produced : undefined;
  const consumptionNow = !noLatest ? latest?.wh_consumed : undefined;
  const gridNowSigned =
    !noLatest && latest !== null
      ? latest.wh_grid_export - latest.wh_grid_import
      : null;

  const gridTodaySigned = summary
    ? summary.wh_grid_export - summary.wh_grid_import
    : null;

  // Segment magnitudes for the pipes.
  const pToHWh =
    !noLatest && latest !== null
      ? Math.min(latest.wh_produced, latest.wh_consumed)
      : null;
  const hgSegmentSigned = gridNowSigned;

  const grid = gridState(gridNowSigned);
  const gridAbs = gridNowSigned !== null ? Math.abs(gridNowSigned) : undefined;

  const isProducing =
    productionNow !== undefined && productionNow > FLOW_EPSILON_WH;
  const isImporting =
    gridNowSigned !== null && gridNowSigned < -FLOW_EPSILON_WH;

  const pipe1Active =
    pToHWh !== null && isComplete !== undefined && Math.abs(pToHWh) > FLOW_EPSILON_WH;
  const pipe2Active =
    hgSegmentSigned !== null &&
    isComplete !== undefined &&
    Math.abs(hgSegmentSigned) > FLOW_EPSILON_WH;
  const pipe2Color =
    hgSegmentSigned !== null && hgSegmentSigned >= 0
      ? 'var(--signal-grid-export)'
      : 'var(--signal-grid-import)';
  const sectionStyle = {
    ...(pipe1Active && { '--rail-flow-1': 'var(--signal-production)' }),
    ...(pipe2Active && { '--rail-flow-2': pipe2Color }),
  } as CSSProperties;

  const windowRange =
    !noLatest && latest !== null
      ? `${formatTime(latest.window_start)} – ${formatTime(latest.window_start + 900)}`
      : null;

  return (
    <section
      className={styles.section}
      aria-label="Energy flow summary"
      style={sectionStyle}
    >
      {/* PRODUCTION */}
      <div className={styles.node}>
        <div className={styles.label}>
          <span
            className={styles.pulseDot}
            data-active={isProducing ? 'true' : 'false'}
            title={windowRange ?? undefined}
            aria-hidden="true"
          />
          Production
        </div>
        <div
          className={styles.now}
          style={{ color: 'var(--signal-production)' }}
        >
          {formatNow(productionNow, isComplete)}
        </div>
        <div className={styles.tickRow} aria-hidden="true" />
        <div className={styles.today}>
          today {summary ? toEnergy(summary.wh_produced) : DASH}
        </div>
      </div>

      <FlowPipe
        magnitudeWh={pToHWh}
        isComplete={isComplete}
        color="var(--signal-production)"
        direction="forward"
      />

      {/* HOME */}
      <div className={styles.node}>
        <div className={styles.label}>Home</div>
        <div
          className={styles.now}
          style={{ color: 'var(--signal-consumption)' }}
        >
          {formatNow(consumptionNow, isComplete)}
        </div>
        <div className={styles.tickRow} aria-hidden="true" />
        <div className={styles.today}>
          today {summary ? toEnergy(summary.wh_consumed) : DASH}
        </div>
      </div>

      <FlowPipe
        magnitudeWh={hgSegmentSigned}
        isComplete={isComplete}
        color={
          hgSegmentSigned !== null && hgSegmentSigned >= 0
            ? 'var(--signal-grid-export)'
            : 'var(--signal-grid-import)'
        }
        direction={
          hgSegmentSigned !== null && hgSegmentSigned < 0 ? 'reverse' : 'forward'
        }
      />

      {/* GRID */}
      <div className={styles.node}>
        <div className={styles.label}>
          <span
            className={`${styles.pulseDot} ${styles.pulseDotImport}`}
            data-active={isImporting ? 'true' : 'false'}
            aria-hidden="true"
          />
          Grid
        </div>
        <div className={styles.now} style={{ color: grid.color }}>
          {gridNowSigned === null || isComplete === undefined ? (
            DASH
          ) : (
            <>
              <span className={styles.gridArrow}>{grid.arrow}</span>
              {' '}
              {gridAbs !== undefined ? formatNow(gridAbs, isComplete) : DASH}
            </>
          )}
        </div>
        <div className={styles.tickRow} aria-hidden="true" />
        <div className={styles.today}>
          today {formatTodaySigned(gridTodaySigned)}
        </div>
      </div>
    </section>
  );
}
