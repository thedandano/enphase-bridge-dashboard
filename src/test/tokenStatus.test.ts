import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenStatus } from '@/utils/formatters';

describe('tokenStatus', () => {
  const NOW_MS = 1_700_000_000_000; // fixed "now" in ms
  const NOW_S = NOW_MS / 1000;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "ok" when token expires more than 7 days from now', () => {
    const eightDaysFromNow = NOW_S + 8 * 86400;
    expect(tokenStatus(eightDaysFromNow)).toBe('ok');
  });

  it('returns "warning" when token expires in exactly 7 days', () => {
    const sevenDaysFromNow = NOW_S + 7 * 86400;
    expect(tokenStatus(sevenDaysFromNow)).toBe('warning');
  });

  it('returns "warning" when token expires in less than 7 days but still in future', () => {
    const threeDaysFromNow = NOW_S + 3 * 86400;
    expect(tokenStatus(threeDaysFromNow)).toBe('warning');
  });

  it('returns "expired" when token expiry is in the past', () => {
    const yesterday = NOW_S - 86400;
    expect(tokenStatus(yesterday)).toBe('expired');
  });

  it('returns "expired" when token expiry equals now', () => {
    expect(tokenStatus(NOW_S)).toBe('expired');
  });
});
