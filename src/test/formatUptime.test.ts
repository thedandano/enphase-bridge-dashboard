import { describe, it, expect } from 'vitest';
import { formatUptime } from '@/utils/formatters';

describe('formatUptime', () => {
  it('returns "0m" for 0 seconds', () => {
    expect(formatUptime(0)).toBe('0m');
  });

  it('returns minutes when under 1 hour', () => {
    expect(formatUptime(3600)).toBe('60m');
  });

  it('returns days+hours when >= 1 day', () => {
    expect(formatUptime(86400)).toBe('1d 0h');
  });

  it('returns correct days and hours for mixed values', () => {
    expect(formatUptime(90061)).toBe('1d 1h');
  });

  it('returns minutes when exactly 59 minutes', () => {
    expect(formatUptime(3540)).toBe('59m');
  });
});
