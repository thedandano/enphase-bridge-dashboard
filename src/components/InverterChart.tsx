import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useTimeRange } from '@/hooks/useTimeRange';
import type { TimeRange } from '@/api/types';
import { fetchSnapshots, fetchSnapshotsByWindow } from '@/api/inverters';
import type {
  SnapshotsResponse,
  SnapshotItem,
  WindowInvertersResponse,
  InverterItem,
} from '@/api/types';
import styles from './InverterChart.module.css';

interface Props {
  selectedWindowTs: number | null;
  onClearWindow: () => void;
  onWindowSelect?: (windowTs: number) => void;
}

const RANGES: TimeRange[] = ['24h', '7d', '30d'];

const PALETTE = [
  '#8AFF80',
  '#FFCA80',
  '#80FFEA',
  '#FF9580',
  '#9580FF',
  '#FF80BF',
  '#FFFF80',
  '#80D4FF',
  '#D4FF80',
  '#FF80D4',
];

function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length];
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

function computeDailyWh(snapshots: readonly SnapshotItem[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const snap of snapshots) {
    result[snap.serial_number] = (result[snap.serial_number] ?? 0) + snap.watts_output * (15 / 60);
  }
  return result;
}

function formatTick(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(epochSeconds * 1000));
}

function formatFull(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(epochSeconds * 1000));
}

function formatWh(wh: number): string {
  return `${Math.round(wh).toLocaleString()} Wh`;
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
            tick={{ fill: '#9281BB', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#9281BB"
            tick={{ fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            label={{ value: 'W', angle: -90, position: 'insideLeft', fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          />
          <Tooltip
            contentStyle={{
              background: '#3A3949',
              border: '1px solid rgba(248,248,242,0.12)',
              borderRadius: '6px',
              fontFamily: 'Barlow Condensed, Arial Narrow, sans-serif',
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

export function InverterChart({ selectedWindowTs, onClearWindow, onWindowSelect }: Props) {
  const [serialFilter, setSerialFilter] = useState('');
  const { range, setRange, start, end } = useTimeRange();

  const { data } = useAutoRefresh<SnapshotsResponse>(
    () => fetchSnapshots({ start, end, limit: 200 }),
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

  const dailyWh = useMemo(() => computeDailyWh(snapshots), [snapshots]);

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
  const isEmpty = !isLoading && reshapedData.length === 0;

  const handleClick: CategoricalChartFunc = (chartData) => {
    const idx = chartData?.activeIndex;
    if (idx === undefined || idx === null) return;
    const index = typeof idx === 'number' ? idx : parseInt(String(idx), 10);
    const point = reshapedData[index];
    if (point !== undefined && onWindowSelect) {
      onWindowSelect(point.windowStart);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>INVERTER OUTPUT</h2>
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
                data={reshapedData}
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                barCategoryGap="18%"
                barGap={1}
              >
                <XAxis
                  dataKey="windowStart"
                  tickFormatter={formatTick}
                  stroke="#9281BB"
                  tick={{ fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#9281BB"
                  tick={{ fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  label={{
                    value: 'W',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9281BB',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#3A3949',
                    border: '1px solid rgba(248,248,242,0.12)',
                    borderRadius: '6px',
                    fontFamily: 'Barlow Condensed, Arial Narrow, sans-serif',
                    fontSize: '0.85rem',
                  }}
                  labelFormatter={(v: unknown) =>
                    typeof v === 'number' ? formatFull(v) : String(v)
                  }
                  formatter={(v: unknown, name: unknown) => [
                    `${Number(v).toFixed(1)} W`,
                    String(name ?? ''),
                  ]}
                />
                {filteredSerials.map((serial) => (
                  <Bar
                    key={serial}
                    dataKey={serial}
                    fill={colorMap.get(serial)}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={18}
                  >
                    {reshapedData.map((entry, idx) => {
                      const isOnline =
                        onlineMap.get(entry.windowStart)?.get(serial) ?? true;
                      return (
                        <Cell
                          key={idx}
                          fill={colorMap.get(serial)}
                          opacity={isOnline ? 1 : 0.35}
                        />
                      );
                    })}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legend}>
            {filteredSerials.map((serial) => {
              const color = colorMap.get(serial) ?? '#fff';
              const wh = dailyWh[serial] ?? 0;
              return (
                <div key={serial} className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ background: color }} />
                  <span className={styles.legendSerial}>{serial}</span>
                  <span className={styles.legendWh}>{formatWh(wh)}</span>
                </div>
              );
            })}
          </div>

          <p className={styles.hint}>Click a bar to inspect inverters at that moment</p>
        </>
      )}
    </section>
  );
}
