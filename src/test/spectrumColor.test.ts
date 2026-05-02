import { describe, it, expect } from 'vitest';
import { spectrumColor } from '@/utils/spectrumColor';

// Parses "rgba(r,g,b,a)" into numeric channels.
function parse(s: string): { r: number; g: number; b: number; a: number } {
  const m = s.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  if (!m) throw new Error(`Not a valid rgba string: ${s}`);
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: Number(m[4]) };
}

describe('spectrumColor', () => {
  it('returns a valid rgba(...) string for any input', () => {
    for (const pct of [0, 0.25, 0.5, 0.75, 1]) {
      expect(spectrumColor(pct)).toMatch(/^rgba\(\d+,\d+,\d+,[\d.]+\)$/);
    }
  });

  it('pct=0 returns near-transparent purple', () => {
    const { r, g, b, a } = parse(spectrumColor(0));
    // First stop: [149, 128, 255] alpha 0.10
    expect(r).toBe(149);
    expect(g).toBe(128);
    expect(b).toBe(255);
    expect(a).toBeCloseTo(0.1, 2);
  });

  it('pct=1 returns full-opacity bright yellow rgba(255,255,128,1.00)', () => {
    const result = spectrumColor(1);
    expect(result).toBe('rgba(255,255,128,1.00)');
  });

  it('pct=0.5 is in the cyan range: g channel high, r moderate', () => {
    // pct=0.5 falls between stop 0.25 (purple) and 0.55 (cyan).
    // As we approach 0.55, g rises toward 255, r falls toward 128, b rises toward 234.
    const { r, g } = parse(spectrumColor(0.5));
    expect(g).toBeGreaterThan(200);
    expect(r).toBeLessThan(200);
  });

  it('values interpolate correctly at an inner stop boundary (pct=0.55)', () => {
    // At exactly the cyan stop [128, 255, 234] alpha 0.70
    const { r, g, b, a } = parse(spectrumColor(0.55));
    expect(r).toBe(128);
    expect(g).toBe(255);
    expect(b).toBe(234);
    expect(a).toBeCloseTo(0.70, 2);
  });

  it('pct=0.25 matches the second stop exactly', () => {
    // Second stop: [149, 128, 255] alpha 0.40 — same rgb as stop 0, different alpha
    const { r, g, b, a } = parse(spectrumColor(0.25));
    expect(r).toBe(149);
    expect(g).toBe(128);
    expect(b).toBe(255);
    expect(a).toBeCloseTo(0.40, 2);
  });
});
