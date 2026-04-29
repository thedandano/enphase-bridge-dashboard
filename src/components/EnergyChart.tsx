import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useTimeRange } from "@/hooks/useTimeRange";
import type { TimeRange } from "@/hooks/useTimeRange";
import { fetchWindows } from "@/api/energy";
import type { WindowsResponse, WindowItem } from "@/api/types";
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

  const windows: WindowItem[] = data ? [...data.windows] : [];
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
      <div className={styles.controls}>
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

      {isEmpty ? (
        <div className={styles.empty}>No energy data for this range</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={windows} onClick={handleClick} style={{ cursor: "pointer" }}>
            <XAxis
              dataKey="window_start"
              tickFormatter={(v: number) => formatTick(v)}
              stroke="#7970A9"
              tick={{ fill: "#7970A9", fontSize: 11 }}
            />
            <YAxis
              stroke="#7970A9"
              tick={{ fill: "#7970A9", fontSize: 11 }}
              label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#7970A9" }}
            />
            <Tooltip
              contentStyle={{
                background: "#3A3949",
                border: "1px solid rgba(248,248,242,0.12)",
                borderRadius: "6px",
              }}
              labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(v) : String(v))}
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
      )}

      <p className={styles.hint}>Click a point to inspect inverters at that moment</p>
    </div>
  );
}
