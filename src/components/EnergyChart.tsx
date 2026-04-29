import { useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useTimeRange } from "@/hooks/useTimeRange";
import type { TimeRange } from "@/hooks/useTimeRange";
import { fetchWindows } from "@/api/energy";
import type { WindowsResponse, WindowItem } from "@/api/types";
import { toDisplayData } from "@/utils/formatters";
import styles from "./EnergyChart.module.css";

interface Props {
  onWindowSelect: (windowStart: number) => void;
}

const SERIES = [
  { key: "wh_produced", label: "Production", color: "#8AFF80" },
  { key: "wh_consumed", label: "Consumption", color: "#FFCA80" },
  { key: "wh_grid_export", label: "Grid export", color: "#80FFEA" },
  { key: "wh_grid_import", label: "Grid import", color: "#FF9580" },
] as const;

const RANGES: TimeRange[] = ["24h", "7d", "30d"];

function formatTick(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(epochSeconds * 1000));
}

export function EnergyChart({ onWindowSelect }: Props) {
  const { range, setRange, start, end, limit } = useTimeRange();
  const { data } = useAutoRefresh<WindowsResponse>(() => fetchWindows(start, end, limit));

  const [chartStyle, setChartStyle] = useState<"area" | "bar">(
    () => (localStorage.getItem("energyChart.style") as "area" | "bar") ?? "bar"
  );
  const windows: WindowItem[] = data ? [...data.windows] : [];
  const displayData = toDisplayData(windows);

  const maxWh =
    windows.length > 0
      ? Math.max(
          ...windows.map((w) =>
            Math.max(
              w.wh_produced + w.wh_grid_import,
              w.wh_consumed + w.wh_grid_export,
            )
          )
        ) * 1.1
      : 1000;

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
                tickFormatter={(v: number) => formatTick(v)}
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              />
              <YAxis
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                domain={[-maxWh, maxWh]}
              />
              <Tooltip
                contentStyle={{
                  background: "#131217",
                  border: "1px solid rgba(248,248,242,0.12)",
                  borderRadius: "6px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                }}
                labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(v) : String(v))}
                formatter={(value: unknown, name: unknown) => {
                  const v = typeof value === "number" ? value : 0;
                  const n = String(name ?? "");
                  const display = ["Consumption", "Grid export"].includes(n) ? Math.abs(v) : v;
                  return [`${display} Wh`, n];
                }}
              />
              {SERIES.map((s, i) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.15}
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
            <BarChart data={displayData} onClick={handleClick} style={{ cursor: "pointer" }}>
              <XAxis
                dataKey="window_start"
                tickFormatter={(v: number) => formatTick(v)}
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              />
              <YAxis
                stroke="#9281BB"
                tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                domain={[-maxWh, maxWh]}
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
                labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(v) : String(v))}
                formatter={(value: unknown, name: unknown) => {
                  const v = typeof value === "number" ? value : 0;
                  const n = String(name ?? "");
                  const display = ["Consumption", "Grid export"].includes(n) ? Math.abs(v) : v;
                  return [`${display} Wh`, n];
                }}
              />
              <Bar dataKey="wh_produced"    stackId="pos" fill="#8AFF80" fillOpacity={0.82} name="Production" />
              <Bar dataKey="wh_grid_import" stackId="pos" fill="#FF9580" fillOpacity={0.75} name="Import" />
              <Bar dataKey="wh_consumed"    stackId="neg" fill="#FFCA80" fillOpacity={0.75} name="Consumption" />
              <Bar dataKey="wh_grid_export" stackId="neg" fill="#80FFEA" fillOpacity={0.68} name="Grid export" />
            </BarChart>
          </ResponsiveContainer>
        )}

      <p className={styles.hint}>Click a point to inspect inverters at that moment</p>
    </div>
  );
}
