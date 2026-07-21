import { describe, it, expect } from 'vitest';
import { solarToHomeWh, mirroredMaxWh } from '@/utils/energyFlow';

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

describe('mirroredMaxWh', () => {
  // Must be fed display data (netted, negated). Sizing from gross import/export
  // scales the axis for stacks the chart never draws.
  const netExportWindow = {
    wh_produced: 549.95,
    wh_consumed: -389.15,
    wh_grid_import: 0,       // netted away
    wh_grid_export: -160.81, // negated for below-axis
  };

  it('measures both halves of the mirrored stack', () => {
    expect(mirroredMaxWh([netExportWindow])).toBeCloseTo(549.96, 1);
  });

  it('does not size the axis from gross flows that were netted away', () => {
    // The same window before netting would have summed produced + gross import
    // (549.95 + 66.55 = 616.50) and oversized the axis.
    expect(mirroredMaxWh([netExportWindow])).toBeLessThan(616.5);
  });

  it('uses the taller side when consumption leads', () => {
    expect(
      mirroredMaxWh([
        { wh_produced: 100, wh_consumed: -250, wh_grid_import: 150, wh_grid_export: 0 },
      ]),
    ).toBe(250);
  });

  it('falls back when there are no windows', () => {
    expect(mirroredMaxWh([])).toBe(1000);
  });
});
