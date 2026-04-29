import { describe, it, expect } from 'vitest';
import type { WindowItem } from '@/api/types';
import { toDisplayData } from '@/utils/formatters';

const base: WindowItem = {
  window_start: 1_000_000,
  wh_produced: 500,
  wh_consumed: 300,
  wh_grid_import: 50,
  wh_grid_export: 200,
  is_complete: true,
};

describe('toDisplayData', () => {
  it('negates wh_consumed', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_consumed).toBe(-300);
  });

  it('negates wh_grid_export', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_grid_export).toBe(-200);
  });

  it('leaves wh_produced unchanged', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_produced).toBe(500);
  });

  it('leaves wh_grid_import unchanged', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_grid_import).toBe(50);
  });

  it('preserves window_start and is_complete', () => {
    const [result] = toDisplayData([base]);
    expect(result.window_start).toBe(1_000_000);
    expect(result.is_complete).toBe(true);
  });

  it('handles an empty array', () => {
    expect(toDisplayData([])).toEqual([]);
  });
});
