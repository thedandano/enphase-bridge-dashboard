import { useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useTimeRange } from "@/hooks/useTimeRange";
import type { TimeRange } from "@/api/types";
import { fetchWindows } from "@/api/energy";
import type { WindowsResponse, WindowItem } from "@/api/types";
import { toDisplayData, formatDateLabel } from "@/utils/formatters";
import styles from "./EnergyChart.module.css";

interface Props {
  onWindowSelect: (windowStart: number) => void;
}

const SERIES = [
  { key: "wh_produced", label: "Production", color: "#8AFF80" },
  { key: "wh_consumed", label: "Consumption", color: "#FFCA80" },
  { key: "wh_grid_export", label: "Grid export", color: "#888888" },
  { key: "wh_grid_import", label: "Grid import", color: "#888888" },
] as const;

const NEGATED_LABELS = new Set<string>(
  SERIES.filter((s) => s.key === "wh_consumed" || s.key === "wh_grid_export").map((s) => s.label)
);

const RANGES: TimeRange[] = ["today", "24h", "7d", "30d"];

const X_TICK_STEP: Record<TimeRange, number> = {
  today: 2 * 3600,
  "24h": 2 * 3600,
  "7d": 24 * 3600,
  "30d": 4 * 24 * 3600,
};

function computeXTicks(range: TimeRange, start: number, end: number): number[] {
  const step = X_TICK_STEP[range];
  const first = Math.ceil(start / step) * step;
  const ticks: number[] = [];
  for (let t = first; t <= end; t += step) ticks.push(t);
  return ticks;
}

function formatTick(range: TimeRange, epochSeconds: number): string {
  const opts: Intl.DateTimeFormatOptions =
    range === "today" || range === "24h"
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : { month: "short", day: "numeric" };
  return new Intl.DateTimeFormat(undefined, opts).format(new Date(epochSeconds * 1000));
}

export function EnergyChart({ onWindowSelect }: Props) {
  const { range, setRange, start, end, limit } = useTimeRange();
  const { data } = useAutoRefresh<WindowsResponse>(() => fetchWindows(start, end, limit));

  const [chartStyle, setChartStyle] = useState<"area" | "bar">(() => {
    const v = localStorage.getItem("energyChart.style");
    return v === "area" || v === "bar" ? v : "bar";
  });
  const windows: WindowItem[] = data ? [...data.windows] : [];
  const displayData = toDisplayData(windows);

  const xTicks = computeXTicks(range, start, end);

  const rawMax =
    windows.length > 0
      ? Math.max(
          ...windows.map((w) =>
            Math.max(
              w.wh_produced + w.wh_grid_import,
              w.wh_consumed + w.wh_grid_export,
            )
          )
        )
      : 1000;

  // Round up to a nice step so ticks are evenly spaced and human-readable.
  const HALF_STEPS = 2;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax / HALF_STEPS)));
  const niceStep = Math.ceil((rawMax / HALF_STEPS) / magnitude) * magnitude;
  const maxWh = niceStep * HALF_STEPS;
  const yTicks = Array.from({ length: HALF_STEPS * 2 + 1 }, (_, i) => (i - HALF_STEPS) * niceStep);
  const yTickFormatter = (v: number) => String(Math.abs(v));

  const isEmpty = data !== null && windows.length === 0;

  const handleClick: CategoricalChartFunc = (chartData) => {
    const idx = chartData?.activeIndex;
    if (idx === undefined || idx === null) return;
    const index = typeof idx === "number" ? idx : parseInt(idx, 10);
    const point = windows[index];
    if (point !== undefined) onWindowSelect(point.window_start);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>energy flow</h2>
      <p className={styles.dateLabel}>{formatDateLabel(range, start, end)}</p>
      <div className={styles.controls}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {RANGES.map((r) => (
            <button
              key={r}
              className={r === range ? styles.activeBtn : styles.btn}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className={styles.styleToggle}>
          <button
            className={
              chartStyle === "area"
                ? `${styles.styleBtn} ${styles.styleBtnActive}`
                : styles.styleBtn
            }
            onClick={() => {
              setChartStyle("area");
              localStorage.setItem("energyChart.style", "area");
            }}
          >
            ∿ Area
          </button>
          <button
            className={
              chartStyle === "bar"
                ? `${styles.styleBtn} ${styles.styleBtnActive}`
                : styles.styleBtn
            }
            onClick={() => {
              setChartStyle("bar");
              localStorage.setItem("energyChart.style", "bar");
            }}
          >
            ▐ Bars
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className={styles.empty}>No energy data for this range</div>
      ) : chartStyle === "area" ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={displayData} onClick={handleClick} style={{ cursor: "pointer" }}>
              <XAxis
                dataKey="window_start"
                tickFormatter={(v: number) => formatTick(range, v)}
                ticks={xTicks}
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              />
              <YAxis
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                domain={[-maxWh, maxWh]}
                ticks={yTicks}
                tickFormatter={yTickFormatter}
              />
              <Tooltip
                contentStyle={{
                  background: "#131217",
                  border: "1px solid rgba(248,248,242,0.12)",
                  borderRadius: "6px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                }}
                labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(range, v) : String(v))}
                formatter={(value: unknown, name: unknown) => {
                  const v = typeof value === "number" ? value : 0;
                  const n = String(name ?? "");
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
            <BarChart data={displayData} onClick={handleClick} style={{ cursor: "pointer" }} stackOffset="sign">
              <XAxis
                dataKey="window_start"
                tickFormatter={(v: number) => formatTick(range, v)}
                ticks={xTicks}
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              />
              <YAxis
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                domain={[-maxWh, maxWh]}
                ticks={yTicks}
                tickFormatter={yTickFormatter}
              />
              <ReferenceLine y={0} stroke="#6272a4" strokeDasharray="5 4" />
              <Tooltip
                contentStyle={{
                  background: "#131217",
                  border: "1px solid rgba(248,248,242,0.12)",
                  borderRadius: "6px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                }}
                labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(range, v) : String(v))}
                formatter={(value: unknown, name: unknown) => {
                  const v = typeof value === "number" ? value : 0;
                  const n = String(name ?? "");
                  const display = NEGATED_LABELS.has(n) ? Math.abs(v) : v;
                  return [`${display.toFixed(2)} Wh`, n];
                }}
              />
              <Bar dataKey="wh_produced"    stackId="energy" fill="#8AFF80" fillOpacity={1.0}  name="Production" />
              <Bar dataKey="wh_grid_import" stackId="energy" fill="#888888" fillOpacity={0.75} name="Grid import" />
              <Bar dataKey="wh_consumed"    stackId="energy" fill="#FFCA80" fillOpacity={1.0}  name="Consumption" />
              <Bar dataKey="wh_grid_export" stackId="energy" fill="#888888" fillOpacity={0.68} name="Grid export" />
            </BarChart>
          </ResponsiveContainer>
        )}

      <p className={styles.hint}>Click a point to inspect inverters at that moment</p>
    </div>
  );
}
