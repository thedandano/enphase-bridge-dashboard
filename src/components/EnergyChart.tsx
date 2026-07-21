import {
  AreaChart, Area,
  BarChart, Bar, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import type { TimeRange } from "@/api/types";
import { fetchWindows } from "@/api/energy";
import type { WindowsResponse, WindowItem } from "@/api/types";
import { toDisplayData, formatDateLabel, computeXTicks, formatChartTick, CHART_FONT } from "@/utils/formatters";
import { mirroredMaxWh } from "@/utils/energyFlow";
import styles from "./EnergyChart.module.css";

interface Props {
  range: TimeRange;
  start: number;
  end: number;
  displayEnd?: number;
  limit: number;
  onWindowSelect?: (windowStart: number) => void;
}

const SERIES = [
  { key: "wh_produced", label: "Production", color: "var(--signal-production)" },
  { key: "wh_consumed", label: "Consumption", color: "var(--signal-consumption)" },
  { key: "wh_grid_export", label: "Grid export", color: "#888888" },
  { key: "wh_grid_import", label: "Grid import", color: "#888888" },
] as const;

// Recharts' default bar cursor fills the whole category band, which reads as
// another bar. Draw a thin centred line instead.
const HOVER_CURSOR_WIDTH = 2;

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


export function EnergyChart({ range, start, end, displayEnd = end, limit, onWindowSelect }: Props) {
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>(() => {
    const v = localStorage.getItem('energyChart.style');
    return v === 'area' || v === 'bar' ? v : 'bar';
  });
  const { data } = useAutoRefresh<WindowsResponse>(() => fetchWindows(start, end, limit), [start]);

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
              <Tooltip
                contentStyle={{
                  background: "#131217",
                  border: "1px solid rgba(248,248,242,0.12)",
                  borderRadius: "6px",
                  fontFamily: CHART_FONT,
                  fontSize: "12px",
                }}
                labelFormatter={(v: unknown) => (typeof v === "number" ? formatChartTick(range, v) : String(v))}
                formatter={(value: unknown, name: unknown) => {
                  const v = typeof value === "number" ? value : 0;
                  const n = String(name ?? "");
                  // Grid flows are netted, so the unused direction is always 0.
                  // Listing it reads as a contradiction ("exported and imported
                  // in the same window"), so omit the empty side.
                  if (v === 0) return null;
                  const display = NEGATED_LABELS.has(n) ? Math.abs(v) : v;
                  return [`${display.toFixed(2)} Wh`, n];
                }}
              />
              {SERIES.map((s, i) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.25}
                  strokeWidth={2}
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
                        opacity={isIncomplete ? 0.4 : 0}
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
              <ReferenceLine y={0} stroke="#6272a4" strokeDasharray="5 4" />
              <Tooltip
                cursor={<HoverCursor />}
                contentStyle={{
                  background: "#131217",
                  border: "1px solid rgba(248,248,242,0.12)",
                  borderRadius: "6px",
                  fontFamily: CHART_FONT,
                  fontSize: "12px",
                }}
                labelFormatter={(v: unknown) => (typeof v === "number" ? formatChartTick(range, v) : String(v))}
                formatter={(value: unknown, name: unknown) => {
                  const v = typeof value === "number" ? value : 0;
                  const n = String(name ?? "");
                  // Grid flows are netted, so the unused direction is always 0.
                  // Listing it reads as a contradiction ("exported and imported
                  // in the same window"), so omit the empty side.
                  if (v === 0) return null;
                  const display = NEGATED_LABELS.has(n) ? Math.abs(v) : v;
                  return [`${display.toFixed(2)} Wh`, n];
                }}
              />
              <Bar dataKey="wh_produced"    stackId="energy" fill="var(--signal-production)" fillOpacity={1.0}  name="Production" />
              <Bar dataKey="wh_grid_import" stackId="energy" fill="#888888" fillOpacity={0.75} name="Grid import" />
              <Bar dataKey="wh_consumed"    stackId="energy" fill="var(--signal-consumption)" fillOpacity={1.0}  name="Consumption" />
              <Bar dataKey="wh_grid_export" stackId="energy" fill="#888888" fillOpacity={0.68} name="Grid export" />
            </BarChart>
          </ResponsiveContainer>
        )}

      {isInspectable && (
        <p className={styles.hint}>Click a point to inspect inverters at that moment</p>
      )}
    </div>
  );
}
