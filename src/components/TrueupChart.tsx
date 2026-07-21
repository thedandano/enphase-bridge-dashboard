import {
  ComposedChart, Bar, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TrueupBucketPoint } from '@/utils/trueupBuckets';
import { CHART_FONT, CHART_FONT_UI } from '@/utils/formatters';
import styles from './TrueupChart.module.css';

// Hue encodes direction (import vs export), opacity encodes TOU period. Keeps
// six stacked series legible with only the two colors the dashboard already
// uses for grid import/export.
const IMPORT_COLOR = 'var(--signal-grid-import)';
const EXPORT_COLOR = 'var(--signal-grid-export)';

const SERIES = [
  { key: 'peak_cost', label: 'Peak cost', color: IMPORT_COLOR, opacity: 1 },
  { key: 'off_peak_cost', label: 'Off-peak cost', color: IMPORT_COLOR, opacity: 0.65 },
  { key: 'super_off_peak_cost', label: 'Super off-peak cost', color: IMPORT_COLOR, opacity: 0.4 },
  { key: 'peak_credit', label: 'Peak credit', color: EXPORT_COLOR, opacity: 1 },
  { key: 'off_peak_credit', label: 'Off-peak credit', color: EXPORT_COLOR, opacity: 0.65 },
  { key: 'super_off_peak_credit', label: 'Super off-peak credit', color: EXPORT_COLOR, opacity: 0.4 },
] as const;

function formatBucketLabel(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDollarTick(value: number): string {
  return `$${Math.abs(value).toFixed(0)}`;
}

// Symmetric ticks on a nice step, so zero is always a labelled gridline rather
// than falling between ticks.
function niceSymmetricTicks(maxMagnitude: number): { domain: [number, number]; ticks: number[] } {
  const rawStep = maxMagnitude / 2;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10]
    .map((m) => m * magnitude)
    .find((candidate) => candidate >= rawStep) ?? 10 * magnitude;
  const bound = step * 2;
  return { domain: [-bound, bound], ticks: [-bound, -step, 0, step, bound] };
}

function tooltipFormatter(value: unknown, name: unknown) {
  // Credits are stored negated so they stack below zero; show them positive.
  const amount = typeof value === 'number' ? Math.abs(value) : 0;
  return [`$${amount.toFixed(2)}`, String(name)] as [string, string];
}

function tooltipLabelFormatter(label: unknown): string {
  return typeof label === 'number' ? formatBucketLabel(label) : '';
}

interface TrueupChartProps {
  points: readonly TrueupBucketPoint[];
}

export function TrueupChart({ points }: TrueupChartProps) {
  if (points.length === 0) return null;

  const maxMagnitude = Math.max(
    ...points.flatMap((p) => [
      p.peak_cost + p.off_peak_cost + p.super_off_peak_cost,
      Math.abs(p.peak_credit + p.off_peak_credit + p.super_off_peak_credit),
    ]),
    1,
  );
  const { domain, ticks } = niceSymmetricTicks(maxMagnitude);

  return (
    <div className={styles.chartBlock}>
      <h3 className={styles.chartTitle}>Cost vs credit over time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={points as TrueupBucketPoint[]}
          stackOffset="sign"
          margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
        >
          <XAxis
            dataKey="start"
            tickFormatter={formatBucketLabel}
            tick={{ fill: 'var(--fg-muted)', fontSize: 11, fontFamily: CHART_FONT_UI }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="dollars"
            domain={domain}
            ticks={ticks}
            tickFormatter={formatDollarTick}
            tick={{ fill: 'var(--fg-muted)', fontSize: 11, fontFamily: CHART_FONT }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tickFormatter={formatDollarTick}
            tick={{ fill: 'var(--purple)', fontSize: 11, fontFamily: CHART_FONT }}
            stroke="var(--border)"
          />
          <ReferenceLine yAxisId="dollars" y={0} stroke="var(--border)" />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={tooltipLabelFormatter}
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontFamily: CHART_FONT,
              fontSize: '12px',
            }}
          />
          <Legend
            wrapperStyle={{ fontFamily: CHART_FONT_UI, fontSize: '11px' }}
          />
          {SERIES.map((s) => (
            <Bar
              key={s.key}
              yAxisId="dollars"
              dataKey={s.key}
              stackId="usd"
              name={s.label}
              fill={s.color}
              fillOpacity={s.opacity}
            />
          ))}
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulative_net"
            name="Cumulative net"
            stroke="var(--purple)"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className={styles.chartHint}>
        Bars: cost above the line, credit below. Line: running net — below zero means
        you're ahead.
      </p>
    </div>
  );
}
