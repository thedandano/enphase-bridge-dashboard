import { describe, it, expect } from 'vitest';
import { solarToHomeWh } from '@/utils/energyFlow';

describe('solarToHomeWh', () => {
  // Real window from the bridge, 09:15 local: production 549.95, consumption
  // 389.15, import 66.55, export 227.36. A 15-min window can contain both
  // import and export, and Math.min(produced, consumed) overstates the
  // solar-to-home segment by exactly the imported amount.
  it('excludes grid import when a window both imports and exports', () => {
    expect(solarToHomeWh(389.15, 66.55)).toBeCloseTo(322.6, 2);
    // the old Math.min(produced, consumed) would have given 389.15
    expect(solarToHomeWh(389.15, 66.55)).not.toBeCloseTo(389.15, 2);
  });

  it('equals consumption when nothing is imported', () => {
    expect(solarToHomeWh(180.45, 0)).toBe(180.45);
  });

  it('is zero when the house runs entirely on imported power', () => {
    expect(solarToHomeWh(120, 120)).toBe(0);
  });

  it('never goes negative if import exceeds consumption', () => {
    expect(solarToHomeWh(50, 80)).toBe(0);
  });
});
