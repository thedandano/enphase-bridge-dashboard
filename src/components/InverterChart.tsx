import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchSnapshots, fetchSnapshotsByWindow } from '@/api/inverters';
import type {
  SnapshotsResponse,
  SnapshotItem,
  WindowInvertersResponse,
  InverterItem,
  TimeRange,
} from '@/api/types';
import { computeXTicks, formatChartTick, CHART_FONT, CHART_FONT_UI } from '@/utils/formatters';
import { PALETTE, colorFor } from '@/utils/inverterColors';
import styles from './InverterChart.module.css';

interface Props {
  range: TimeRange;
  start: number;
  end: number;
  selectedWindowTs: number | null;
  onClearWindow: () => void;
  onWindowSelect?: (windowTs: number) => void;
}

interface ChartRow {
  windowStart: number;
  [serial: string]: number;
}

function reshapeSnapshots(
  snapshots: readonly SnapshotItem[],
  serials: string[],
): ChartRow[] {
  const map = new Map<number, ChartRow>();
  for (const snap of snapshots) {
    let row = map.get(snap.window_start);
    if (!row) {
      row = { windowStart: snap.window_start };
      map.set(snap.window_start, row);
    }
    row[snap.serial_number] = snap.watts_output;
  }
  for (const row of map.values()) {
    for (const serial of serials) {
      if (!(serial in row)) row[serial] = 0;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.windowStart - b.windowStart);
}

function buildOnlineMap(
  snapshots: readonly SnapshotItem[],
): Map<number, Map<string, boolean>> {
  const result = new Map<number, Map<string, boolean>>();
  for (const snap of snapshots) {
    let inner = result.get(snap.window_start);
    if (!inner) {
      inner = new Map();
      result.set(snap.window_start, inner);
    }
    inner.set(snap.serial_number, snap.is_online);
  }
  return result;
}

function formatFull(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(epochSeconds * 1000));
}

// ── Drill-down: single-window bar chart ──────────────────────────────────────

interface DrillDownProps {
  windowTs: number;
  colorMap: Map<string, string>;
  onBack: () => void;
}

function DrillDownChart({ windowTs, colorMap, onBack }: DrillDownProps) {
  const { data } = useAutoRefresh<WindowInvertersResponse>(
    () => fetchSnapshotsByWindow(windowTs),
  );

  if (data === null) {
    return (
      <div className={styles.stateBox}>
        <span className={styles.pulse} />
        Loading inverter data…
      </div>
    );
  }

  if (data.inverters.length === 0) {
    return <div className={styles.stateBox}>No inverter data for this window</div>;
  }

  const barData = [...data.inverters].map((inv: InverterItem) => ({
    serial: inv.serial_number,
    watts: inv.watts_output,
    isOnline: inv.is_online,
  }));

  return (
    <>
      <div className={styles.toolbar}>
        <button className={styles.back} onClick={onBack}>← BACK</button>
        <h2 className={styles.heading}>
          INVERTERS AT <span className={styles.headingAccent}>{formatFull(windowTs)}</span>
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
          <XAxis
            dataKey="serial"
            stroke="#9281BB"
            tick={{ fill: '#9281BB', fontSize: 10, fontFamily: CHART_FONT }}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#9281BB"
            tick={{ fill: '#9281BB', fontSize: 11, fontFamily: CHART_FONT }}
            label={{ value: 'W', angle: -90, position: 'insideLeft', fill: '#9281BB', fontSize: 11, fontFamily: CHART_FONT }}
          />
          <Tooltip
            contentStyle={{
              background: '#3A3949',
              border: '1px solid rgba(248,248,242,0.12)',
              borderRadius: '6px',
              fontFamily: CHART_FONT_UI,
              fontSize: '0.85rem',
            }}
            formatter={(v: unknown) => [`${Number(v).toFixed(1)} W`, 'Output']}
          />
          <Bar dataKey="watts" radius={[3, 3, 0, 0]}>
            {barData.map((entry, idx) => {
              const color = colorMap.get(entry.serial) ?? PALETTE[idx % PALETTE.length];
              return (
                <Cell
                  key={entry.serial}
                  fill={color}
                  opacity={entry.isOnline ? 1 : 0.35}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InverterChart({ range, start, end, selectedWindowTs, onClearWindow, onWindowSelect }: Props) {
  const [serialFilter, setSerialFilter] = useState('');

  const { data } = useAutoRefresh<SnapshotsResponse>(
    () => fetchSnapshots({ start, end, limit: 2000 }),
    [start],
  );

  const snapshots = useMemo(() => data?.snapshots ?? [], [data]);

  const allSerials = useMemo(() => {
    const set = new Set(snapshots.map((s) => s.serial_number));
    return Array.from(set).sort();
  }, [snapshots]);

  const filteredSerials = useMemo(() => {
    if (!serialFilter) return allSerials;
    const q = serialFilter.toLowerCase();
    return allSerials.filter((s) => s.toLowerCase().includes(q));
  }, [allSerials, serialFilter]);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    allSerials.forEach((s, i) => map.set(s, colorFor(i)));
    return map;
  }, [allSerials]);

  const onlineMap = useMemo(() => buildOnlineMap(snapshots), [snapshots]);

  const filteredSnapshots = useMemo(
    () => snapshots.filter((s) => filteredSerials.includes(s.serial_number)),
    [snapshots, filteredSerials],
  );

  const reshapedData = useMemo(
    () => reshapeSnapshots(filteredSnapshots, filteredSerials),
    [filteredSnapshots, filteredSerials],
  );

  // Aggregated view: one bar per slot showing average W across filtered inverters.
  // Click drills into the per-inverter breakdown for that slot.
  const aggregatedData = useMemo(() => {
    return reshapedData.map((row) => {
      let total = 0;
      let onlineCount = 0;
      for (const serial of filteredSerials) {
        total += row[serial] ?? 0;
        const isOnline = onlineMap.get(row.windowStart)?.get(serial) ?? true;
        if (isOnline) onlineCount += 1;
      }
      const count = filteredSerials.length;
      return {
        windowStart: row.windowStart,
        avgWatts: count > 0 ? total / count : 0,
        totalWatts: total,
        onlineCount,
        totalCount: count,
      };
    });
  }, [reshapedData, filteredSerials, onlineMap]);

  const xTicks = computeXTicks(range, start, end);

  if (selectedWindowTs !== null) {
    return (
      <section className={styles.section}>
        <DrillDownChart
          windowTs={selectedWindowTs}
          colorMap={colorMap}
          onBack={onClearWindow}
        />
      </section>
    );
  }

  const isLoading = data === null;
  const isEmpty = !isLoading && aggregatedData.length === 0;

  const handleClick: CategoricalChartFunc = (chartData) => {
    const idx = chartData?.activeIndex;
    if (idx === undefined || idx === null) return;
    const index = typeof idx === 'number' ? idx : parseInt(String(idx), 10);
    const point = aggregatedData[index];
    if (point !== undefined && onWindowSelect) {
      onWindowSelect(point.windowStart);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>INVERTER OUTPUT</h2>
        <input
          className={styles.filter}
          type="text"
          placeholder="Filter serial…"
          value={serialFilter}
          onChange={(e) => setSerialFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className={styles.stateBox}>
          <span className={styles.pulse} />
          Loading inverter data…
        </div>
      ) : isEmpty ? (
        <div className={styles.stateBox}>No inverter data for this range</div>
      ) : (
        <>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={aggregatedData}
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                barCategoryGap="10%"
              >
                <XAxis
                  dataKey="windowStart"
                  tickFormatter={(v: number) => formatChartTick(range, v)}
                  ticks={xTicks}
                  stroke="#9281BB"
                  tick={{ fill: '#9281BB', fontSize: 11, fontFamily: CHART_FONT }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9281BB"
                  tick={{ fill: '#9281BB', fontSize: 11, fontFamily: CHART_FONT }}
                  label={{
                    value: 'W',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9281BB',
                    fontSize: 11,
                    fontFamily: CHART_FONT,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#3A3949',
                    border: '1px solid rgba(248,248,242,0.12)',
                    borderRadius: '6px',
                    fontFamily: CHART_FONT_UI,
                    fontSize: '0.85rem',
                  }}
                  labelFormatter={(v: unknown) =>
                    typeof v === 'number' ? formatFull(v) : String(v)
                  }
                  formatter={(_v, _name, item) => {
                    const p = (item as { payload?: { avgWatts: number; totalWatts: number; onlineCount: number; totalCount: number } }).payload;
                    if (!p) return ['', ''];
                    return [
                      `${p.avgWatts.toFixed(1)} W avg · ${Math.round(p.totalWatts).toLocaleString()} W total · ${p.onlineCount}/${p.totalCount} online`,
                      'Output',
                    ];
                  }}
                />
                <Bar
                  dataKey="avgWatts"
                  fill="#9580FF"
                  radius={[2, 2, 0, 0]}
                >
                  {aggregatedData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill="#9580FF"
                      opacity={entry.onlineCount === entry.totalCount ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className={styles.hint}>Click a bar to inspect inverters at that moment</p>
        </>
      )}
    </section>
  );
}
