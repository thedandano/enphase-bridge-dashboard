import { describe, it, expect } from 'vitest';
import { computeDailySummary, toEnergy } from '@/utils/dailySummary';
import type { WindowItem } from '@/api/types';

const makeWindow = (overrides: Partial<WindowItem> = {}): WindowItem => ({
  window_start: 1714262400,
  wh_produced: 0,
  wh_consumed: 0,
  wh_grid_import: 0,
  wh_grid_export: 0,
  is_complete: true,
  ...overrides,
});

describe('computeDailySummary', () => {
  it('returns zeros for empty array', () => {
    expect(computeDailySummary([])).toEqual({
      wh_produced: 0,
      wh_consumed: 0,
      wh_grid_import: 0,
      wh_grid_export: 0,
    });
  });

  it('returns the single window values unchanged', () => {
    const w = makeWindow({ wh_produced: 100, wh_consumed: 50, wh_grid_import: 10, wh_grid_export: 60 });
    expect(computeDailySummary([w])).toEqual({
      wh_produced: 100,
      wh_consumed: 50,
      wh_grid_import: 10,
      wh_grid_export: 60,
    });
  });

  it('sums multiple windows correctly', () => {
    const windows = [
      makeWindow({ wh_produced: 200, wh_consumed: 80,  wh_grid_import: 0,  wh_grid_export: 120 }),
      makeWindow({ wh_produced: 300, wh_consumed: 100, wh_grid_import: 20, wh_grid_export: 200 }),
      makeWindow({ wh_produced:  50, wh_consumed: 30,  wh_grid_import: 5,  wh_grid_export:  15 }),
    ];
    expect(computeDailySummary(windows)).toEqual({
      wh_produced: 550,
      wh_consumed: 210,
      wh_grid_import: 25,
      wh_grid_export: 335,
    });
  });
});

describe('toEnergy', () => {
  it('formats sub-1000 Wh as whole Wh', () => {
    expect(toEnergy(306)).toBe('306 Wh');
    expect(toEnergy(0)).toBe('0 Wh');
    expect(toEnergy(999)).toBe('999 Wh');
  });

  it('formats ≥ 1000 Wh as kWh with 2 decimal places', () => {
    expect(toEnergy(1000)).toBe('1.00 kWh');
    expect(toEnergy(5330)).toBe('5.33 kWh');
    expect(toEnergy(12500)).toBe('12.50 kWh');
  });
});
