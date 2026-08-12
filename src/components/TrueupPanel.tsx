import { useState, useEffect, useLayoutEffect, useRef, useCallback, useReducer } from 'react';
import { fetchTrueupEstimate, fetchTrueupSeries, type TrueupSeries } from '@/api/tou';
import { ApiError } from '@/api/client';
import type { EstimateResponse, PeriodDetail } from '@/api/types';
import { TrueupChart } from './TrueupChart';
import styles from './TrueupPanel.module.css';

function dateInputToEpoch(value: string): number {
  // value is "YYYY-MM-DD"
  return Math.floor(new Date(value + 'T00:00:00').getTime() / 1000);
}

function epochToDateInput(epoch: number): string {
  const d = new Date(epoch * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function todayDateInput(): string {
  return epochToDateInput(Math.floor(Date.now() / 1000));
}

function thirtyDaysAgoDateInput(): string {
  return epochToDateInput(Math.floor(Date.now() / 1000) - 30 * 86400);
}

const PINNED_START_KEY = 'trueup.pinnedStart';

// A corrupt stored value would feed NaN into the fetch range — treat it as unset.
function readPinnedStart(): string | null {
  const v = localStorage.getItem(PINNED_START_KEY);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

interface ErrorInfo {
  type: 'no_schedule' | 'no_data' | 'generic';
  message: string;
}

function getErrorMessage(err: unknown): ErrorInfo {
  if (err instanceof ApiError) {
    if (err.code === 'no_tou_schedule') {
      return {
        type: 'no_schedule',
        message:
          'TOU not configured — configure OpenEI in bridge config.toml',
      };
    }
    if (err.code === 'insufficient_data') {
      return { type: 'no_data', message: 'No energy data for the selected period' };
    }
  }
  return {
    type: 'generic',
    message: err instanceof Error ? err.message : 'Unknown error',
  };
}

function formatUsd(amount: number): string {
  return amount.toFixed(2);
}

// --- Estimate reducer ---

const EMPTY_SERIES: TrueupSeries = { points: [], truncatedAt: null };

interface EstimateState {
  isLoading: boolean;
  estimate: EstimateResponse | null;
  series: TrueupSeries;
  estimateError: ErrorInfo | null;
}

type EstimateAction =
  | { type: 'fetch_start' }
  | { type: 'fetch_success'; estimate: EstimateResponse; series: TrueupSeries }
  | { type: 'fetch_error'; error: ErrorInfo };

function estimateReducer(state: EstimateState, action: EstimateAction): EstimateState {
  switch (action.type) {
    case 'fetch_start':
      return { ...state, isLoading: true, estimateError: null };
    case 'fetch_success':
      return {
        isLoading: false,
        estimate: action.estimate,
        series: action.series,
        estimateError: null,
      };
    case 'fetch_error':
      return {
        isLoading: false,
        estimate: null,
        series: EMPTY_SERIES,
        estimateError: action.error,
      };
  }
}

// --- Verdict block ---

// net_cost_usd is positive when the user owes, negative when they're in credit.
// The panel never shows that sign — it states the verdict in words instead.
function sumBreakdown(
  breakdown: EstimateResponse['breakdown'],
  field: 'import_cost_usd' | 'export_credit_usd',
): number {
  return (
    breakdown.peak[field] + breakdown.off_peak[field] + breakdown.super_off_peak[field]
  );
}

interface VerdictBlockProps {
  estimate: EstimateResponse;
  rateLabel?: string;
}

function VerdictBlock({ estimate, rateLabel }: VerdictBlockProps) {
  const net = estimate.net_cost_usd;
  const totalCost = sumBreakdown(estimate.breakdown, 'import_cost_usd');
  const totalCredit = sumBreakdown(estimate.breakdown, 'export_credit_usd');

  const verdict = net === 0 ? 'BREAK EVEN' : net < 0 ? 'CREDIT' : 'OWED';
  const verdictColor =
    net === 0 ? 'var(--fg)' : net < 0 ? 'var(--green)' : 'var(--red)';

  // Bar segments are proportional to dollars; the longer segment is the verdict.
  const barTotal = totalCost + totalCredit;
  const costPct = barTotal > 0 ? (totalCost / barTotal) * 100 : 50;

  return (
    <div className={styles.verdictBlock}>
      <span
        className={styles.verdictLabel}
        style={{ color: verdictColor }}
        data-testid="trueup-verdict"
      >
        {verdict}
      </span>
      <span
        className={styles.verdictValue}
        style={{ color: verdictColor }}
        data-testid="trueup-verdict-amount"
      >
        ${Math.abs(net).toFixed(2)}
      </span>
      <span className={styles.verdictSubline}>
        exports earned ${formatUsd(totalCredit)} · imports cost ${formatUsd(totalCost)}
      </span>

      <div
        className={styles.balanceBar}
        role="img"
        aria-label={`Imports cost $${formatUsd(totalCost)}, exports earned $${formatUsd(totalCredit)}`}
      >
        <div
          className={styles.balanceCost}
          style={{ width: `${costPct}%` }}
        />
        <div
          className={styles.balanceCredit}
          style={{ width: `${100 - costPct}%` }}
        />
      </div>

      {rateLabel && <span className={styles.scheduleLabel}>{rateLabel}</span>}
    </div>
  );
}

// --- Period card ---

interface PeriodCardProps {
  label: string;
  detail: PeriodDetail;
}

function PeriodCard({ label, detail }: PeriodCardProps) {
  // Same sign convention as the headline: positive means this period cost more
  // than it earned. The card shows the word, never the sign.
  const net = detail.import_cost_usd - detail.export_credit_usd;
  const netVerdict = net === 0 ? 'EVEN' : net < 0 ? 'CREDIT' : 'OWED';
  const netColor = net === 0 ? 'var(--fg)' : net < 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className={styles.periodCard}>
      <div className={styles.periodName}>{label}</div>
      <div className={styles.metricGrid}>
        <div className={styles.metricCell}>
          <span className={styles.metricLabel}>Import kWh</span>
          <span className={styles.metricValue}>{detail.import_kwh.toFixed(2)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.metricLabel}>Export kWh</span>
          <span className={styles.metricValue}>{detail.export_kwh.toFixed(2)}</span>
        </div>
        <div className={`${styles.metricCell} ${styles.metricCellCost}`}>
          <span className={styles.metricLabel}>Import Cost</span>
          <span className={styles.metricValue}>${formatUsd(detail.import_cost_usd)}</span>
        </div>
        <div className={`${styles.metricCell} ${styles.metricCellCost}`}>
          <span className={styles.metricLabel}>Export Credit</span>
          <span className={styles.metricValue}>${formatUsd(detail.export_credit_usd)}</span>
        </div>
      </div>

      <div className={styles.periodNet}>
        <span className={styles.metricLabel}>Net</span>
        <span className={styles.periodNetValue} style={{ color: netColor }}>
          ${formatUsd(Math.abs(net))}
          <span className={styles.periodNetVerdict}>{netVerdict}</span>
        </span>
      </div>
    </div>
  );
}

// --- Main component ---

export function TrueupPanel() {
  const [startDate, setStartDate] = useState<string>(
    () => readPinnedStart() ?? thirtyDaysAgoDateInput(),
  );
  const [endDate, setEndDate] = useState<string>(todayDateInput);
  const [pinnedStart, setPinnedStart] = useState<string | null>(readPinnedStart);

  const isPinned = pinnedStart === startDate;
  const togglePin = () => {
    if (isPinned) {
      localStorage.removeItem(PINNED_START_KEY);
      setPinnedStart(null);
    } else {
      localStorage.setItem(PINNED_START_KEY, startDate);
      setPinnedStart(startDate);
    }
  };

  const [estimateState, dispatchEstimate] = useReducer(estimateReducer, {
    isLoading: false,
    estimate: null,
    series: EMPTY_SERIES,
    estimateError: null,
  });

  // Latest-ref pattern for dates — stable doFetch with empty deps
  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  useLayoutEffect(() => {
    startDateRef.current = startDate;
    endDateRef.current = endDate;
  });

  // Stable fetch — dispatch is stable, refs hold latest dates
  const doFetch = useCallback(async () => {
    dispatchEstimate({ type: 'fetch_start' });
    const start = dateInputToEpoch(startDateRef.current);
    const end = dateInputToEpoch(endDateRef.current);

    // The range is half-open, and the API layer shifts `end` back a day to match
    // the bridge's inclusive-end semantics. An empty or backwards range would
    // therefore be sent as end-before-start; reject it here instead.
    if (end <= start) {
      dispatchEstimate({
        type: 'fetch_error',
        error: { type: 'generic', message: 'End date must be after start date' },
      });
      return;
    }

    try {
      // Summary and series are fetched together so the panel never renders a
      // verdict that disagrees with the chart below it.
      const [result, series] = await Promise.all([
        fetchTrueupEstimate(start, end),
        fetchTrueupSeries(start, end),
      ]);
      dispatchEstimate({ type: 'fetch_success', estimate: result, series });
    } catch (err) {
      dispatchEstimate({ type: 'fetch_error', error: getErrorMessage(err) });
    }
  }, []); // stable — no deps

  // Re-fetch on date changes (doFetch is stable; fetchTrigger forces re-run on date change)
  const fetchTrigger = `${startDate}|${endDate}`;
  useEffect(() => {
    void doFetch();
    // fetchTrigger is a derived string that changes when start/end change;
    // including it alongside stable doFetch is intentional to re-run on date changes.
  }, [doFetch, fetchTrigger]);

  const { isLoading, estimate, series, estimateError } = estimateState;

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>TOU / True-up Estimate</h2>

      <div className={styles.dateRow}>
        <label className={styles.dateLabel}>
          Start
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`${styles.pinBtn} ${isPinned ? styles.pinBtnActive : ''}`}
          onClick={togglePin}
          aria-pressed={isPinned}
          aria-label="Pin start date so it loads on refresh"
          title="Pin start date so it loads on refresh"
        >
          📌
        </button>
        <label className={styles.dateLabel}>
          End
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button
          className={styles.fetchBtn}
          onClick={() => void doFetch()}
          disabled={isLoading}
        >
          {isLoading ? 'Loading…' : 'Fetch'}
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading estimate…</div>}

      {!isLoading && estimateError && (
        <div
          className={`${styles.errorBox} ${
            estimateError.type === 'no_schedule'
              ? styles['errorBox--warn']
              : styles['errorBox--generic']
          }`}
        >
          {estimateError.message}
        </div>
      )}

      {!isLoading && estimate && (
        <>
          <VerdictBlock
            estimate={estimate}
            rateLabel={estimate.tou_schedule?.rate_label}
          />

          <div className={styles.periodGrid}>
            <PeriodCard label="Peak" detail={estimate.breakdown.peak} />
            <PeriodCard label="Off-Peak" detail={estimate.breakdown.off_peak} />
            <PeriodCard label="Super Off-Peak" detail={estimate.breakdown.super_off_peak} />
          </div>

          <TrueupChart points={series.points} truncatedAt={series.truncatedAt} />
        </>
      )}
    </div>
  );
}
