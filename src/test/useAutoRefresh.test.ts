import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

describe('useAutoRefresh', () => {
  it('fetches on mount with no deps', async () => {
    const fetchFn = vi.fn().mockResolvedValue('test-data');
    const { result } = renderHook(() => useAutoRefresh(fetchFn));

    // Initial fetch happens on mount
    await waitFor(() => {
      expect(result.current.data).toBe('test-data');
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('maintains initial behaviour when called without deps', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data1');
    const { result, rerender } = renderHook(
      ({ fn }: { fn: () => Promise<string> }) => useAutoRefresh(fn),
      { initialProps: { fn: fetchFn } },
    );

    // Initial fetch
    await waitFor(() => {
      expect(result.current.data).toBe('data1');
    });

    // Re-render with same fetchFn (no deps passed) should not trigger new fetch immediately
    rerender({ fn: fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('triggers immediate re-fetch when deps change', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce('data1')
      .mockResolvedValueOnce('data2');

    let dep = 'dep1';
    const { result, rerender } = renderHook(
      ({ deps }: { deps: readonly unknown[] }) => useAutoRefresh(fetchFn, deps),
      { initialProps: { deps: [dep] } },
    );

    // Initial fetch
    await waitFor(() => {
      expect(result.current.data).toBe('data1');
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Change deps — should trigger immediate re-fetch
    dep = 'dep2';
    rerender({ deps: [dep] });

    await waitFor(() => {
      expect(result.current.data).toBe('data2');
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('resets countdown to 30 (BASE_INTERVAL) after deps-change fetch', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce('data1')
      .mockResolvedValueOnce('data2');

    let dep = 'dep1';
    const { result, rerender } = renderHook(
      ({ deps }: { deps: readonly unknown[] }) => useAutoRefresh(fetchFn, deps),
      { initialProps: { deps: [dep] } },
    );

    // Initial fetch, countdown starts at 30
    await waitFor(() => {
      expect(result.current.secondsUntilRefresh).toBe(30);
    });

    // Change deps — countdown should reset to 30 after the new fetch
    dep = 'dep2';
    rerender({ deps: [dep] });

    await waitFor(() => {
      expect(result.current.data).toBe('data2');
    });

    // After deps change and new fetch completes, countdown resets
    expect(result.current.secondsUntilRefresh).toBe(30);
  });

  it('does not re-fetch if deps remain the same', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data');
    const dep = 'dep1';

    const { result, rerender } = renderHook(
      ({ deps }: { deps: readonly unknown[] }) => useAutoRefresh(fetchFn, deps),
      { initialProps: { deps: [dep] } },
    );

    // Initial fetch
    await waitFor(() => {
      expect(result.current.data).toBe('data');
    });

    // Re-render with same deps value — should not trigger new fetch
    rerender({ deps: [dep] });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('clears error and resets error count on successful fetch after deps change', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('data2');

    let dep = 'dep1';
    const { result, rerender } = renderHook(
      ({ deps }: { deps: readonly unknown[] }) => useAutoRefresh(fetchFn, deps),
      { initialProps: { deps: [dep] } },
    );

    // Initial fetch fails
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Change deps — should fetch again and succeed
    dep = 'dep2';
    rerender({ deps: [dep] });

    await waitFor(() => {
      expect(result.current.data).toBe('data2');
      expect(result.current.error).toBeNull();
    });
  });

  it('handles multiple deps changing together', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce('data1')
      .mockResolvedValueOnce('data2')
      .mockResolvedValueOnce('data3');

    let dep1 = 'a';
    let dep2 = 'x';

    const { result, rerender } = renderHook(
      ({ deps }: { deps: readonly unknown[] }) => useAutoRefresh(fetchFn, deps),
      { initialProps: { deps: [dep1, dep2] } },
    );

    // Initial fetch
    await waitFor(() => {
      expect(result.current.data).toBe('data1');
    });

    // Change both deps
    dep1 = 'b';
    dep2 = 'y';
    rerender({ deps: [dep1, dep2] });

    await waitFor(() => {
      expect(result.current.data).toBe('data2');
    });

    // Change only one dep
    dep1 = 'c';
    rerender({ deps: [dep1, dep2] });

    await waitFor(() => {
      expect(result.current.data).toBe('data3');
    });
  });
});
