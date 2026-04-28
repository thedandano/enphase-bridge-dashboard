import { describe, it, expect } from 'vitest';
import { badgeColor } from '@/utils/formatters';

describe('badgeColor', () => {
  it('returns green when all inverters are online', () => {
    expect(badgeColor(5, 5)).toBe('var(--green)');
  });

  it('returns orange when some inverters are offline', () => {
    expect(badgeColor(3, 5)).toBe('var(--orange)');
  });

  it('returns red when all inverters are offline', () => {
    expect(badgeColor(0, 5)).toBe('var(--red)');
  });

  it('returns muted color when total is 0', () => {
    expect(badgeColor(0, 0)).toBe('var(--fg-muted)');
  });

  it('returns orange for 1 out of 2', () => {
    expect(badgeColor(1, 2)).toBe('var(--orange)');
  });
});
