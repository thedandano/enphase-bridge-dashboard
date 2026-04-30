import { useState } from 'react';
import { useTimeRange } from '@/hooks/useTimeRange';
import type { TimeRange } from '@/api/types';
import { EnergyChart } from './EnergyChart';
import { InverterChart } from './InverterChart';
import { InverterDailyTotals } from './InverterDailyTotals';
import styles from './ChartPanel.module.css';

const OTHER_RANGES: TimeRange[] = ['24h', '7d', '30d'];

function getDayBounds(daysBack: number): { start: number; end: number } {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  const start = Math.floor(d.getTime() / 1000);
  if (daysBack === 0) return { start, end: Math.floor(Date.now() / 1000) };
  return { start, end: start + 86400 };
}

function todayLabel(daysBack: number): string {
  if (daysBack === 0) return 'today';
  if (daysBack === 1) return 'yesterday';
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
}

function periodLabel(range: TimeRange, daysBack: number): string {
  if (range === '24h') return 'LAST 24H';
  if (range === '7d') return 'LAST 7 DAYS';
  if (range === '30d') return 'LAST 30 DAYS';
  return todayLabel(daysBack).toUpperCase();
}

export function ChartPanel() {
  const { range, setRange, start: trStart, end: trEnd, limit } = useTimeRange();
  const [daysBack, setDaysBack] = useState(0);

  const { start, end } = range === 'today'
    ? getDayBounds(daysBack)
    : { start: trStart, end: trEnd };

  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>(() => {
    const v = localStorage.getItem('energyChart.style');
    return v === 'area' || v === 'bar' ? v : 'bar';
  });

  const [selectedWindowTs, setSelectedWindowTs] = useState<number | null>(null);

  const handleSetRange = (r: TimeRange) => {
    setRange(r);
    setDaysBack(0);
  };

  const handlePrev = () => {
    if (range !== 'today') setRange('today');
    setDaysBack((d) => d + 1);
  };

  const handleNext = () => {
    setDaysBack((d) => Math.max(0, d - 1));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.controls}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className={styles.todayGroup}>
            <button className={styles.navBtn} onClick={handlePrev}>←</button>
            <button
              className={range === 'today' ? styles.activeBtn : styles.btn}
              onClick={() => handleSetRange('today')}
            >
              {range === 'today' ? todayLabel(daysBack) : 'today'}
            </button>
            <button
              className={styles.navBtn}
              onClick={handleNext}
              disabled={range !== 'today' || daysBack === 0}
            >→</button>
          </div>
          {OTHER_RANGES.map((r) => (
            <button
              key={r}
              className={r === range ? styles.activeBtn : styles.btn}
              onClick={() => handleSetRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className={styles.styleToggle}>
          <button
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
      <EnergyChart
        range={range}
        start={start}
        end={end}
        limit={limit}
        chartStyle={chartStyle}
        onWindowSelect={setSelectedWindowTs}
      />
      <InverterChart
        range={range}
        start={start}
        end={end}
        selectedWindowTs={selectedWindowTs}
        onClearWindow={() => setSelectedWindowTs(null)}
        onWindowSelect={setSelectedWindowTs}
      />
      <InverterDailyTotals
        start={start}
        end={end}
        periodLabel={periodLabel(range, daysBack)}
      />
    </div>
  );
}
