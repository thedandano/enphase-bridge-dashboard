import {
  AreaChart, Area,
  BarChart, Bar, ReferenceLine, ReferenceArea,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import type { TimeRange, TouIntervalsResponse } from "@/api/types";
import { fetchWindows } from "@/api/energy";
import type { WindowsResponse, WindowItem } from "@/api/types";
import { toDisplayData, formatDateLabel, computeXTicks, formatChartTick, CHART_FONT } from "@/utils/formatters";
import { mirroredMaxWh } from "@/utils/energyFlow";
import { fetchTouIntervals } from '@/api/tou';
import { TOU_LABELS, touTransitions, formatTouTransition } from '@/utils/touIntervals';
import styles from "./EnergyChart.module.css";

interface Props {
  range: TimeRange;
  start: number;
  end: number;
  displayEnd?: number;
  limit: number;
  onWindowSelect?: (windowStart: number) => void;
}

// Separate stacks keep zero grid flow on its own side of the axis. Recharts
// signed stacking otherwise sends zero export points to the positive stack.
const SERIES = [
  { key: "wh_produced", label: "Production", color: "var(--signal-production)", opacity: 1, stack: "supply" },
  { key: "wh_grid_import", label: "Grid import", color: "var(--chart-grid)", opacity: 0.75, stack: "supply" },
  { key: "wh_consumed", label: "Consumption", color: "var(--signal-consumption)", opacity: 1, stack: "demand" },
  { key: "wh_grid_export", label: "Grid export", color: "var(--chart-grid)", opacity: 0.68, stack: "demand" },
] as const;

// Recharts' default bar cursor fills the whole category band, which reads as
// another bar. Draw a thin centred line instead.
const HOVER_CURSOR_WIDTH = 2;

const TOU_BANDS = {
  peak: { color: 'var(--orange)', opacity: 0.22 },
  off_peak: { color: 'var(--fg-muted)', opacity: 0.16 },
  super_off_peak: { color: 'var(--cyan)', opacity: 0.12 },
} as const;

interface HoverCursorProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function HoverCursor({ x = 0, y = 0, width = 0, height = 0 }: HoverCursorProps) {
  return (
    <rect
      x={x + width / 2 - HOVER_CURSOR_WIDTH / 2}
      y={y}
      width={HOVER_CURSOR_WIDTH}
      height={height}
      fill="var(--fg-muted)"
      fillOpacity={0.45}
    />
  );
}

const NEGATED_LABELS = new Set<string>(
  SERIES.filter((s) => s.key === "wh_consumed" || s.key === "wh_grid_export").map((s) => s.label)
);

function formatTooltip(value: unknown, name: unknown) {
  const v = typeof value === "number" ? value : 0;
  const n = String(name ?? "");
  if (v === 0) return null;
  const display = NEGATED_LABELS.has(n) ? Math.abs(v) : v;
  return [`${display.toFixed(2)} Wh`, n];
}

export function EnergyChart({ range, start, end, displayEnd = end, limit, onWindowSelect }: Props) {
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>(() => {
    const v = localStorage.getItem('energyChart.style');
    return v === 'area' || v === 'bar' ? v : 'bar';
  });
  const { data } = useAutoRefresh<WindowsResponse>(() => fetchWindows(start, end, limit), [start]);

  const showTou = range === 'today' || range === '24h';
  const { data: tou, error: touError } = useAutoRefresh<TouIntervalsResponse | null>(
    () => showTou ? fetchTouIntervals(start, displayEnd) : Promise.resolve(null),
    [start, displayEnd, showTou],
  );
  // Never reuse stale range data or cached intervals after a failed refresh.
  const touMatchesRange = tou?.intervals?.[0]?.start === start
    && tou?.intervals?.at(-1)?.end === displayEnd;
  const intervals = showTou && tou && !touError && touMatchesRange ? tou.intervals : [];
  const transitions = intervals.length && tou ? touTransitions(tou) : [];
  const touBands = intervals.map((interval) => (
    <ReferenceArea
      key={`band-${interval.start}`}
      x1={interval.start}
      x2={interval.end}
      ifOverflow="discard"
      zIndex={0}
      fill={TOU_BANDS[interval.bracket].color}
      fillOpacity={TOU_BANDS[interval.bracket].opacity}
      stroke="none"
      pointerEvents="none"
    />
  ));
  const touLines = transitions.map((interval) => (
    <ReferenceLine
      key={interval.start}
      x={interval.start}
      ifOverflow="discard"
      zIndex={50}
      stroke="var(--fg-muted)"
      strokeOpacity={0.65}
      strokeDasharray="3 5"
      label={({ viewBox }) => {
        const box = viewBox as { x: number; y: number };
        const x = box.x + 8;
        const y = box.y + 12;
        return <text x={x} y={y} transform={`rotate(-90 ${x} ${y})`} textAnchor="end" fill="var(--fg-muted)" fontSize={10} fontFamily={CHART_FONT}>{TOU_LABELS[interval.bracket]}</text>;
      }}
      shape={({ x1, y1, x2, y2 }) => (
        <g data-tou-transition={interval.start}>
          <title>{formatTouTransition(interval.start, tou!.timezone, interval.bracket)}</title>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--fg-muted)" strokeOpacity={0.65} strokeDasharray="3 5" />
        </g>
      )}
    />
  ));

  const tooltipLabel = (value: unknown) => {
    if (typeof value !== 'number') return String(value);
    const label = formatChartTick(range, value);
    const interval = showTou && tou && !touError && touMatchesRange
      ? tou.intervals.find((item) => item.start <= value && value < item.end) : undefined;
    return interval ? `${label} · ${TOU_LABELS[interval.bracket]} (${tou!.timezone})` : label;
  };

  const windows: WindowItem[] = data ? [...data.windows] : [];
  const displayData = toDisplayData(windows);

  const xTicks = computeXTicks(range, start, displayEnd);

  // Scale from displayData, not windows: grid flow is netted for display, so
  // gross import/export would size the axis for stacks that are never drawn.
  const rawMax = mirroredMaxWh(displayData);

  // Round up to a nice step so ticks are evenly spaced and human-readable.
  const HALF_STEPS = 2;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax / HALF_STEPS)));
  const niceStep = Math.ceil((rawMax / HALF_STEPS) / magnitude) * magnitude;
  const maxWh = niceStep * HALF_STEPS;
  const yTicks = Array.from({ length: HALF_STEPS * 2 + 1 }, (_, i) => (i - HALF_STEPS) * niceStep);
  const yTickFormatter = (v: number) => String(Math.abs(v));

  const isEmpty = data !== null && windows.length === 0;
  const isInspectable = onWindowSelect !== undefined;

  const handleClick: CategoricalChartFunc = (chartData) => {
    if (!onWindowSelect) return;
    const idx = chartData?.activeIndex;
    if (idx === undefined || idx === null) return;
    const index = typeof idx === "number" ? idx : parseInt(idx, 10);
    const point = windows[index];
    if (point !== undefined) onWindowSelect(point.window_start);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>ENERGY FLOW</h2>
        <div className={styles.styleToggle} aria-label="Energy chart style">
          <button
            type="button"
            className={
              chartStyle === 'area'
                ? `${styles.styleBtn} ${styles.styleBtnActive}`
                : styles.styleBtn
            }
            onClick={() => {
              setChartStyle('area');
              localStorage.setItem('energyChart.style', 'area');
            }}
          >
            ∿ Area
          </button>
          <button
            type="button"
            className={
              chartStyle === 'bar'
                ? `${styles.styleBtn} ${styles.styleBtnActive}`
                : styles.styleBtn
            }
            onClick={() => {
              setChartStyle('bar');
              localStorage.setItem('energyChart.style', 'bar');
            }}
          >
            ▐ Bars
          </button>
        </div>
      </div>
      <p className={styles.dateLabel}>{formatDateLabel(range, start, end)}</p>

      {isEmpty ? (
        <div className={styles.empty}>No energy data for this range</div>
      ) : chartStyle === "area" ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              stackOffset="none"
              data={displayData}
              onClick={isInspectable ? handleClick : undefined}
              style={{ cursor: isInspectable ? "pointer" : "default" }}
            >
              <XAxis
                type="number"
                dataKey="window_start"
                tickFormatter={(v: number) => formatChartTick(range, v)}
                ticks={xTicks}
                domain={[start, displayEnd]}
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: CHART_FONT }}
              />
              <YAxis
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: CHART_FONT }}
                label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: CHART_FONT }}
                domain={[-maxWh, maxWh]}
                ticks={yTicks}
                tickFormatter={yTickFormatter}
              />
              {touBands}
              {touLines}
              <ReferenceLine y={0} stroke="var(--fg-muted)" strokeDasharray="5 4" />
              <Tooltip
                contentStyle={{
                  background: "#131217",
                  border: "1px solid rgba(248,248,242,0.12)",
                  borderRadius: "6px",
                  fontFamily: CHART_FONT,
                  fontSize: "12px",
                }}
                labelFormatter={tooltipLabel}
                formatter={formatTooltip}
              />
              {SERIES.map((s, i) => (
                <Area
                  key={s.key}
                  type="linear"
                  stackId={s.stack}
                  dataKey={s.key}
                  stroke="none"
                  fill={s.color}
                  fillOpacity={1}
                  strokeWidth={0}
                  name={s.label}
                  dot={(props: unknown) => {
                    const p = props as { cx: number; cy: number; index: number };
                    const isLast = p.index === windows.length - 1;
                    const isIncomplete = isLast && windows[windows.length - 1]?.is_complete === false;
                    return (
                      <circle
                        key={`dot-${i}-${p.index}`}
                        cx={p.cx}
                        cy={p.cy}
                        r={3}
                        fill={s.color}
                        opacity={isIncomplete && displayData[p.index]?.[s.key] !== 0 ? 0.4 : 0}
                      />
                    );
                  }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={displayData}
              onClick={isInspectable ? handleClick : undefined}
              style={{ cursor: isInspectable ? "pointer" : "default" }}
              stackOffset="sign"
            >
              <XAxis
                type="number"
                dataKey="window_start"
                tickFormatter={(v: number) => formatChartTick(range, v)}
                ticks={xTicks}
                domain={[start, displayEnd]}
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: CHART_FONT }}
              />
              <YAxis
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: CHART_FONT }}
                label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: CHART_FONT }}
                domain={[-maxWh, maxWh]}
                ticks={yTicks}
                tickFormatter={yTickFormatter}
              />
              {touBands}
              {touLines}
              <ReferenceLine y={0} stroke="var(--fg-muted)" strokeDasharray="5 4" />
              <Tooltip
                cursor={<HoverCursor />}
                contentStyle={{
                  background: "#131217",
                  border: "1px solid rgba(248,248,242,0.12)",
                  borderRadius: "6px",
                  fontFamily: CHART_FONT,
                  fontSize: "12px",
                }}
                labelFormatter={tooltipLabel}
                formatter={formatTooltip}
              />
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} stackId="energy" fill={s.color} fillOpacity={s.opacity} name={s.label} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

      {intervals.length > 0 && (
        <div className={styles.touLegend} aria-label="TOU background bands">
          {Object.entries(TOU_BANDS).map(([bracket, band]) => (
            <span key={bracket}>
              <i aria-hidden="true" style={{ background: band.color, opacity: band.opacity * 3 }} />
              {TOU_LABELS[bracket as keyof typeof TOU_LABELS]}
            </span>
          ))}
        </div>
      )}
      {showTou && (
        <p className={styles.hint}>
          {tou && !touError && touMatchesRange ? `Dashed lines: TOU changes · ${tou.timezone}` : 'TOU unavailable'}
        </p>
      )}
      {isInspectable && (
        <p className={styles.hint}>Click a point to inspect inverters at that moment</p>
      )}
    </div>
  );
}
