import { describe, it, expect } from 'vitest';
import { buildHeatmapRows, buildSeasonalHeatmapRows } from '@/utils/heatmapTransform';
import type { SnapshotItem } from '@/api/types';

const DAY_START = Math.floor(new Date(2024, 3, 28, 0, 0, 0, 0).getTime() / 1000);
const SLOT = (i: number) => DAY_START + i * 15 * 60;

function snap(overrides: Partial<SnapshotItem> = {}): SnapshotItem {
  return {
    window_start: DAY_START,
    serial_number: 'S1',
    watts_output: 100,
    is_online: true,
    ...overrides,
  };
}

describe('buildHeatmapRows', () => {
  it('returns empty array for no snapshots', () => {
    expect(buildHeatmapRows([], DAY_START)).toEqual([]);
  });

  it('maps window_start = start + 15*60*i to slot i', () => {
    const rows = buildHeatmapRows([snap({ window_start: SLOT(3), watts_output: 200 })], DAY_START);
    expect(rows).toHaveLength(1);
    expect(rows[0].series[3]).toBe(200);
  });

  it('fills unrepresented slots with 0', () => {
    const rows = buildHeatmapRows([snap({ window_start: SLOT(0), watts_output: 50 })], DAY_START);
    const nonZero = rows[0].series.filter((w) => w !== 0);
    expect(nonZero).toEqual([50]);
  });

  it('ignores slots with index < 0', () => {
    const rows = buildHeatmapRows(
      [snap({ window_start: DAY_START - 15 * 60, watts_output: 999 })],
      DAY_START,
    );
    expect(rows).toHaveLength(0);
  });

  it('ignores slots with index > 95', () => {
    const rows = buildHeatmapRows(
      [snap({ window_start: SLOT(96), watts_output: 999 })],
      DAY_START,
    );
    expect(rows).toHaveLength(0);
  });

  it('sorts multiple inverters alphabetically by serial', () => {
    const rows = buildHeatmapRows(
      [
        snap({ serial_number: 'C', window_start: SLOT(0) }),
        snap({ serial_number: 'A', window_start: SLOT(0) }),
        snap({ serial_number: 'B', window_start: SLOT(0) }),
      ],
      DAY_START,
    );
    expect(rows.map((r) => r.serial)).toEqual(['A', 'B', 'C']);
  });

  it('computes peak per-inverter, not globally', () => {
    const rows = buildHeatmapRows(
      [
        snap({ serial_number: 'A', window_start: SLOT(0), watts_output: 200 }),
        snap({ serial_number: 'B', window_start: SLOT(0), watts_output: 300 }),
      ],
      DAY_START,
    );
    const rowA = rows.find((r) => r.serial === 'A')!;
    const rowB = rows.find((r) => r.serial === 'B')!;
    expect(rowA.peak).toBe(200);
    expect(rowB.peak).toBe(300);
  });

  it('clamps peak to at least 1 for a zero-output inverter', () => {
    const rows = buildHeatmapRows(
      [snap({ watts_output: 0, window_start: SLOT(5) })],
      DAY_START,
    );
    expect(rows[0].peak).toBe(1);
  });

  it('produces series arrays of length 96', () => {
    const rows = buildHeatmapRows([snap({ window_start: SLOT(10) })], DAY_START);
    expect(rows[0].series).toHaveLength(96);
  });

  it('averages snapshots into matching time-of-day buckets across a selected period', () => {
    const rows = buildHeatmapRows(
      [
        snap({ window_start: SLOT(0), watts_output: 100 }),
        snap({ window_start: SLOT(96), watts_output: 300 }),
        snap({ window_start: SLOT(2), watts_output: 500 }),
      ],
      DAY_START,
      DAY_START + 96 * 2 * 15 * 60,
    );

    expect(rows[0].series[0]).toBe(200);
    expect(rows[0].series[2]).toBe(500);
  });

  it('aggregates selected-period buckets separately per inverter', () => {
    const rows = buildHeatmapRows(
      [
        snap({ serial_number: 'A', window_start: SLOT(0), watts_output: 100 }),
        snap({ serial_number: 'A', window_start: SLOT(96), watts_output: 300 }),
        snap({ serial_number: 'B', window_start: SLOT(0), watts_output: 100 }),
        snap({ serial_number: 'B', window_start: SLOT(96), watts_output: 100 }),
      ],
      DAY_START,
      DAY_START + 96 * 2 * 15 * 60,
    );

    expect(rows.map((r) => r.serial)).toEqual(['A', 'B']);
    expect(rows[0].series[0]).toBe(200);
    expect(rows[1].series[0]).toBe(100);
  });
});

describe('buildSeasonalHeatmapRows', () => {
  it('aggregates each inverter into daily Wh cells across the selected period', () => {
    const rows = buildSeasonalHeatmapRows(
      [
        snap({ serial_number: 'A', window_start: SLOT(0), watts_output: 400 }),
        snap({ serial_number: 'A', window_start: SLOT(1), watts_output: 800 }),
        snap({ serial_number: 'A', window_start: SLOT(96), watts_output: 1200 }),
        snap({ serial_number: 'B', window_start: SLOT(0), watts_output: 200 }),
        snap({ serial_number: 'B', window_start: SLOT(96), watts_output: 600 }),
      ],
      DAY_START,
      DAY_START + 2 * 86400,
    );

    expect(rows.days).toHaveLength(2);
    expect(rows.rows.map((r) => r.serial)).toEqual(['A', 'B']);
    expect(rows.rows[0].series).toEqual([300, 300]);
    expect(rows.rows[1].series).toEqual([50, 150]);
    expect(rows.peak).toBe(300);
  });
});
