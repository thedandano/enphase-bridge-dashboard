import { describe, it, expect } from 'vitest';
import { toKw, toWh } from '@/utils/formatters';

describe('toKw', () => {
  it('converts Wh to kW using a 15-min window factor (×4)', () => {
    expect(toKw(250)).toBe('1.00 kW');
  });

  it('rounds to 2 decimal places', () => {
    expect(toKw(1000)).toBe('4.00 kW');
  });

  it('handles zero', () => {
    expect(toKw(0)).toBe('0.00 kW');
  });
});

describe('toWh', () => {
  it('returns raw Wh for incomplete windows with 2 decimal places', () => {
    expect(toWh(250)).toBe('~250.00 Wh');
  });

  it('formats fractional Wh to 2 decimal places', () => {
    expect(toWh(250.7)).toBe('~250.70 Wh');
  });

  it('handles zero', () => {
    expect(toWh(0)).toBe('~0.00 Wh');
  });

  it('produces ~NaN Wh for NaN input', () => {
    expect(toWh(NaN)).toBe('~NaN Wh');
  });
});
