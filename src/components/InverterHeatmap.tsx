import { useMemo, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchSnapshots } from '@/api/inverters';
import type { SnapshotsResponse, TimeRange } from '@/api/types';
import { buildHeatmapRows, buildSeasonalHeatmapRows } from '@/utils/heatmapTransform';
import { spectrumColor } from '@/utils/spectrumColor';
import styles from './InverterHeatmap.module.css';

interface TooltipState {
  serial: string;
  time: string;
  watts: number;
  unit: 'W avg' | 'kWh';
  x: number;
  y: number;
}

interface Props {
  range: TimeRange;
  start: number;
  end: number;
}

const SNAPSHOT_PAGE_LIMIT = 2000;
const SNAPSHOT_CAP = 30000;
const AXIS_SLOTS = new Set([0, 24, 48, 72]);
type HeatmapMode = 'dayShape' | 'seasonal';

function slotLabel(slotIdx: number): string {
  const d = new Date();
  d.setHours(0, slotIdx * 15, 0, 0);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dateLabel(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(epochSeconds * 1000));
}

function seasonalAxisSlots(days: readonly number[]): Set<number> {
  if (days.length <= 7) return new Set(days.map((_, idx) => idx));
  const step = Math.ceil(days.length / 4);
  return new Set(days.map((_, idx) => idx).filter((idx) =>
    idx === 0 || idx === days.length - 1 || idx % step === 0
  ));
}

async function fetchHeatmapSnapshots(start: number, end: number): Promise<SnapshotsResponse> {
  const snapshots: SnapshotsResponse['snapshots'][number][] = [];
  let offset = 0;
  let total: number | undefined;

  while (offset < SNAPSHOT_CAP) {
    const page = await fetchSnapshots({
      start,
      end,
      limit: SNAPSHOT_PAGE_LIMIT,
      offset,
    });
    snapshots.push(...page.snapshots);
    total = page.total;
    offset += page.snapshots.length;
    if (page.snapshots.length === 0 || offset >= total) break;
  }

  return {
    snapshots,
    total: total ?? snapshots.length,
    limit: snapshots.length,
    offset: 0,
  };
}

interface HeatmapContentProps extends Props {
  mode: HeatmapMode;
}

function HeatmapContent({ start, end, mode }: HeatmapContentProps) {
  const { data } = useAutoRefresh<SnapshotsResponse>(
    () => fetchHeatmapSnapshots(start, end),
    [start],
  );

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  }, [tooltip]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const heatmap = useMemo(() => {
    if (!data) return null;
    if (mode === 'seasonal') {
      const seasonal = buildSeasonalHeatmapRows(data.snapshots, start, end);
      return {
        rows: seasonal.rows,
        labels: seasonal.days.map(dateLabel),
        axisSlots: seasonalAxisSlots(seasonal.days),
        unit: 'kWh' as const,
      };
    }
    return {
      rows: buildHeatmapRows(data.snapshots, start, end),
      labels: Array.from({ length: 96 }, (_, idx) => slotLabel(idx)),
      axisSlots: AXIS_SLOTS,
      unit: 'W avg' as const,
    };
  }, [data, start, end, mode]);

  const rows = useMemo(() => {
    if (!heatmap) return null;
    return heatmap.rows;
  }, [heatmap]);

  const gridStyle = useMemo(() => {
    const columns = heatmap?.labels.length ?? 96;
    return { '--heatmap-columns': String(columns) } as React.CSSProperties;
  }, [heatmap]);

  if (data === null) {
    return (
      <div className={styles.stateBox}>
        <span className={styles.pulse} />
        Loading inverter heatmap…
      </div>
    );
  }

  if (rows === null || rows.length === 0) {
    return (
      <div className={styles.stateBox}>No inverter data for this range</div>
    );
  }

  return (
    <div className={styles.content} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {rows.map(({ serial, series, peak }) => {
        const label = serial.slice(-6);
        return (
          <div key={serial} className={styles.hmRow}>
            <span className={styles.hmLabel} title={serial}>{label}</span>
            <div className={styles.hmCells} style={gridStyle}>
              {series.map((watts, slotIdx) => {
                const pct = watts / peak;
                const bg = pct < 0.01
                  ? 'rgba(255,255,255,0.04)'
                  : spectrumColor(pct);
                return (
                  <div
                    key={slotIdx}
                    className={styles.hmCell}
                    style={{ background: bg }}
                    onMouseEnter={(e) => setTooltip({
                      serial,
                      time: heatmap?.labels[slotIdx] ?? '',
                      watts,
                      unit: heatmap?.unit ?? 'W avg',
                      x: e.clientX,
                      y: e.clientY,
                    })}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className={styles.axisRow}>
        <div />
        <div className={styles.axisLabels} style={gridStyle}>
          {(heatmap?.labels ?? []).map((label, i) => (
            <span key={i} className={styles.axisLabel}>
              {heatmap?.axisSlots.has(i) ? label : ''}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.legendRow}>
        <div />
        <div className={styles.legend} aria-label="Heatmap color legend">
          <span className={styles.legendLabel}>Low</span>
          <span className={styles.legendRamp} aria-hidden="true" />
          <span className={styles.legendLabel}>Peak</span>
        </div>
      </div>

      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <span className={styles.tooltipSerial}>{tooltip.serial.slice(-6)}</span>
          <span className={styles.tooltipTime}>{tooltip.time}</span>
          <span className={styles.tooltipWatts}>
            {tooltip.unit === 'kWh'
              ? `${(tooltip.watts / 1000).toFixed(2)} kWh`
              : `${tooltip.watts.toFixed(1)} W avg`}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────

export function InverterHeatmap({ range, start, end }: Props) {
  const [mode, setMode] = useState<HeatmapMode>('dayShape');

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading}>INVERTER HEATMAP</h2>
        <div className={styles.modeToggle} aria-label="Heatmap mode">
          <button
            type="button"
            className={mode === 'dayShape' ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode('dayShape')}
          >
            Day shape
          </button>
          <button
            type="button"
            className={mode === 'seasonal' ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode('seasonal')}
          >
            Seasonal
          </button>
        </div>
      </div>
      <HeatmapContent range={range} start={start} end={end} mode={mode} />
    </section>
  );
}
