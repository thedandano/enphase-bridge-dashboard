import { describe, it, expect } from 'vitest';
import { formatDateLabel } from '@/utils/formatters';

// Fixed epoch values used across tests:
//   startEpoch = 1745625600  → 'Apr 25' (en-US)
//   endEpoch   = 1745712000  → 'Apr 26' (en-US)
const startEpoch = 1745625600;
const endEpoch = 1745712000;
const startDateStr = 'Apr 25';
const endDateStr = 'Apr 26';

describe('formatDateLabel', () => {
  it('today branch returns Today · <end date>', () => {
    expect(formatDateLabel('today', startEpoch, endEpoch, 'en-US')).toBe(`Today · ${endDateStr}`);
  });

  it('today branch uses end epoch, not start', () => {
    // Swap start/end — the label should show the new end value (startEpoch)
    const withStart = formatDateLabel('today', endEpoch, startEpoch, 'en-US');
    expect(withStart).toBe(`Today · ${startDateStr}`);
  });

  it('24h branch returns Last 24h · <end date>', () => {
    expect(formatDateLabel('24h', startEpoch, endEpoch, 'en-US')).toBe(`Last 24h · ${endDateStr}`);
  });

  it('7d branch returns start – end range', () => {
    expect(formatDateLabel('7d', startEpoch, endEpoch, 'en-US')).toBe(`${startDateStr} – ${endDateStr}`);
  });

  it('30d branch returns start – end range', () => {
    expect(formatDateLabel('30d', startEpoch, endEpoch, 'en-US')).toBe(`${startDateStr} – ${endDateStr}`);
  });
});
