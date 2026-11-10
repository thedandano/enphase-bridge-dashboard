import type { TimeRange } from '@/api/types';
import { fetchCostTimeline } from '@/api/tou';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { bucketStepFor, sumEstimates, type CostBucketStep } from '@/utils/costTimeline';
import { getErrorMessage, TRUEUP_REFRESH_MS } from '@/utils/trueupEstimate';
import { TrueupChart } from './TrueupChart';
import { PeriodGrid, VerdictBlock } from './TrueupPanel';
import styles from './TrueupPanel.module.css';

const REFRESH_SECONDS = TRUEUP_REFRESH_MS / 1000;

const LABEL_FORMAT: Record<CostBucketStep, Intl.DateTimeFormatOptions> = {
  // Weekday too: a 24h range has 25 buckets, so its first and last share an hour.
  hour: { weekday: 'short', hour: 'numeric' },
  sixHour: { month: 'short', day: 'numeric', hour: 'numeric' },
  day: { month: 'short', day: 'numeric' },
};

interface Props {
  range: TimeRange;
  start: number;
  /** Data end for a past range; ignored while live. */
  end: number;
  /** Stable end of the viewed period; drives refetches instead of the ticking `end`. */
  displayEnd: number;
  /** Viewing today as it happens: each refresh reads the clock again. */
  live: boolean;
  periodLabel: string;
}

export function CostTimelinePanel({ range, start, end, displayEnd, live, periodLabel }: Props) {
  const step = bucketStepFor(range);
  const { data, error } = useAutoRefresh(
    () => {
      // ChartPanel only re-renders on user input, so a live `end` prop goes stale.
      const now = Math.floor(Date.now() / 1000);
      return fetchCostTimeline(start, live ? now : end, step, now);
    },
    [start, displayEnd, range, live],
    true,
    REFRESH_SECONDS,
  );

  const formatLabel = (epoch: number) =>
    new Date(epoch * 1000).toLocaleString(undefined, LABEL_FORMAT[step]);
  const totals = data ? sumEstimates(data.estimates) : null;
  const excluded = data?.estimates.reduce((n, e) => n + e.excluded_window_count, 0) ?? 0;
  const errorInfo = error ? getErrorMessage(error) : null;

  return (
    <section className={styles.panel} aria-labelledby="cost-timeline-title">
      <h2 id="cost-timeline-title" className={styles.title}>Cost Over Time · {periodLabel}</h2>

      {!data && !error && <div className={styles.loading}>Loading costs…</div>}

      {errorInfo && (
        <div
          className={`${styles.errorBox} ${
            errorInfo.type === 'no_schedule' ? styles['errorBox--warn'] : styles['errorBox--generic']
          }`}
        >
          {errorInfo.message}
        </div>
      )}

      {data && totals && (
        <>
          <VerdictBlock estimate={totals} rateLabel={data.estimates.at(-1)?.tou_schedule?.rate_label} />
          <PeriodGrid breakdown={totals.breakdown} />
          <TrueupChart
            points={data.points}
            title="Cost vs credit by time"
            formatLabel={formatLabel}
            centsScale={step !== 'day'}
          />
          <p className={styles.scheduleLabel}>
            Each period's estimate is shared across the bars by kWh.
            {excluded > 0 && ` ${excluded} windows were left out of the estimate.`}
          </p>
        </>
      )}
    </section>
  );
}
