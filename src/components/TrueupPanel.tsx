import { useState, useEffect, useLayoutEffect, useRef, useCallback, useReducer } from 'react';
import { fetchTrueupEstimate } from '@/api/tou';
import { ApiError } from '@/api/client';
import type { EstimateResponse, PeriodDetail } from '@/api/types';
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

interface EstimateState {
  isLoading: boolean;
  estimate: EstimateResponse | null;
  estimateError: ErrorInfo | null;
}

type EstimateAction =
  | { type: 'fetch_start' }
  | { type: 'fetch_success'; estimate: EstimateResponse }
  | { type: 'fetch_error'; error: ErrorInfo };

function estimateReducer(state: EstimateState, action: EstimateAction): EstimateState {
  switch (action.type) {
    case 'fetch_start':
      return { ...state, isLoading: true, estimateError: null };
    case 'fetch_success':
      return { isLoading: false, estimate: action.estimate, estimateError: null };
    case 'fetch_error':
      return { isLoading: false, estimate: null, estimateError: action.error };
  }
}

// --- Breakdown row ---

interface BreakdownRowProps {
  label: string;
  detail: PeriodDetail;
}

function BreakdownRow({ label, detail }: BreakdownRowProps) {
  return (
    <tr className={styles.breakdownRow}>
      <td className={styles.tierLabel}>{label}</td>
      <td className={styles.breakdownCell}>{detail.import_kwh.toFixed(2)}</td>
      <td className={styles.breakdownCell}>{detail.export_kwh.toFixed(2)}</td>
      <td className={styles.breakdownCell}>${formatUsd(detail.import_cost_usd)}</td>
      <td className={styles.breakdownCell}>${formatUsd(detail.export_credit_usd)}</td>
    </tr>
  );
}

// --- Main component ---

export function TrueupPanel() {
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoDateInput);
  const [endDate, setEndDate] = useState<string>(todayDateInput);

  const [estimateState, dispatchEstimate] = useReducer(estimateReducer, {
    isLoading: false,
    estimate: null,
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
    try {
      const result = await fetchTrueupEstimate(start, end);
      dispatchEstimate({ type: 'fetch_success', estimate: result });
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

  const { isLoading, estimate, estimateError } = estimateState;

  const netCostColor =
    estimate && estimate.net_cost_usd < 0 ? 'var(--green)' : 'var(--red)';

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
          <div className={styles.netCostBlock}>
            <span className={styles.netCostLabel}>Net Cost</span>
            <span className={styles.netCostValue} style={{ color: netCostColor }}>
              {estimate.net_cost_usd < 0 ? '-' : ''}$
              {Math.abs(estimate.net_cost_usd).toFixed(2)}
            </span>
            {estimate.tou_schedule && (
              <span className={styles.scheduleLabel}>
                {estimate.tou_schedule.rate_label}
              </span>
            )}
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.breakdownTable}>
              <thead>
                <tr>
                  <th className={styles.tableHeader}>Period</th>
                  <th className={styles.tableHeader}>Import kWh</th>
                  <th className={styles.tableHeader}>Export kWh</th>
                  <th className={styles.tableHeader}>Import Cost</th>
                  <th className={styles.tableHeader}>Export Credit</th>
                </tr>
              </thead>
              <tbody>
                <BreakdownRow label="Peak" detail={estimate.breakdown.peak} />
                <BreakdownRow label="Off-Peak" detail={estimate.breakdown.off_peak} />
                <BreakdownRow
                  label="Super Off-Peak"
                  detail={estimate.breakdown.super_off_peak}
                />
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
