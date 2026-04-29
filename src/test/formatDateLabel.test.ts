import { describe, it, expect } from 'vitest';
import { formatDateLabel } from '@/utils/formatters';

// Noon UTC epochs — stable across all timezones when formatted with timeZone:'UTC'
//   startEpoch = 1745582400  → 'Apr 25' in UTC
//   endEpoch   = 1745668800  → 'Apr 26' in UTC
const startEpoch = 1745582400;
const endEpoch = 1745668800;
const startDateStr = 'Apr 25';
const endDateStr = 'Apr 26';

describe('formatDateLabel', () => {
  it('today branch returns Today · <end date>', () => {
    expect(formatDateLabel('today', startEpoch, endEpoch, 'en-US', 'UTC')).toBe(`Today · ${endDateStr}`);
  });

  it('today branch uses end epoch, not start', () => {
    // Swap start/end — the label should show the new end value (startEpoch)
    const withStart = formatDateLabel('today', endEpoch, startEpoch, 'en-US', 'UTC');
    expect(withStart).toBe(`Today · ${startDateStr}`);
  });

  it('24h branch returns Last 24h · <end date>', () => {
    expect(formatDateLabel('24h', startEpoch, endEpoch, 'en-US', 'UTC')).toBe(`Last 24h · ${endDateStr}`);
  });

  it('7d branch returns start – end range', () => {
    expect(formatDateLabel('7d', startEpoch, endEpoch, 'en-US', 'UTC')).toBe(`${startDateStr} – ${endDateStr}`);
  });

  it('30d branch returns start – end range', () => {
    expect(formatDateLabel('30d', startEpoch, endEpoch, 'en-US', 'UTC')).toBe(`${startDateStr} – ${endDateStr}`);
  });
});
