import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as clientModule from '@/api/client';
import * as autoRefreshModule from '@/hooks/useAutoRefresh';
import { Header } from '@/components/Header';
import type { HealthResponse } from '@/api/types';

const NOW_S = 1_700_000_000;

const makeHealth = (overrides: Partial<HealthResponse> = {}): HealthResponse => ({
  status: 'ok',
  last_window_start: NOW_S - 900,
  token_expires_at: NOW_S + 50 * 86400,
  uptime_seconds: 3 * 86400 + 2 * 3600 + 14 * 60,
  ...overrides,
});

describe('Header', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW_S * 1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows OFFLINE before any fetch resolves', () => {
    vi.spyOn(clientModule, 'apiFetch').mockReturnValue(new Promise(() => {}));
    render(<Header />);
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  it('shows ONLINE after a successful health fetch', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeHealth());
    render(<Header />);
    await waitFor(() => expect(screen.getByText('ONLINE')).toBeInTheDocument());
  });

  it('shows STALE when useAutoRefresh returns error with existing data', () => {
    // Mock the hook directly — the timer/retry logic that produces stale state
    // is covered by useAutoRefresh.test.ts; here we just verify Header renders it.
    vi.spyOn(autoRefreshModule, 'useAutoRefresh').mockReturnValue({
      data: makeHealth(),
      error: new Error('network error'),
      secondsUntilRefresh: 25,
    });
    render(<Header />);
    expect(screen.getByText('STALE')).toBeInTheDocument();
  });

  it('tooltip shows "Uptime:" when online', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeHealth());
    render(<Header />);
    await waitFor(() => expect(screen.getByText(/Uptime:/)).toBeInTheDocument());
  });

  it('tooltip shows "Token life: 50d" for a healthy token', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(
      makeHealth({ token_expires_at: NOW_S + 50 * 86400 }),
    );
    render(<Header />);
    await waitFor(() => expect(screen.getByText('Token life: 50d')).toBeInTheDocument());
  });

  it('tooltip shows "Token expired" for an expired token', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(
      makeHealth({ token_expires_at: NOW_S - 1 }),
    );
    render(<Header />);
    await waitFor(() => expect(screen.getByText('Token expired')).toBeInTheDocument());
  });

  it('tooltip shows "Token life:" with warning color when expiring within 7 days', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(
      makeHealth({ token_expires_at: NOW_S + 3 * 86400 }),
    );
    render(<Header />);
    await waitFor(() => {
      const el = screen.getByText(/Token life: 3d/);
      expect(el).toHaveStyle({ color: 'var(--orange)' });
    });
  });

  it('tooltip shows "Data at:" with a formatted time', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeHealth());
    render(<Header />);
    await waitFor(() => expect(screen.getByText(/Data at:/)).toBeInTheDocument());
  });

  it('tooltip shows "No data yet" when last_window_start is null', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(
      makeHealth({ last_window_start: null }),
    );
    render(<Header />);
    await waitFor(() => expect(screen.getByText(/No data yet/)).toBeInTheDocument());
  });

  it('calls onFirstRun(true) when last_window_start is null', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(
      makeHealth({ last_window_start: null }),
    );
    const onFirstRun = vi.fn();
    render(<Header onFirstRun={onFirstRun} />);
    await waitFor(() => expect(onFirstRun).toHaveBeenCalledWith(true));
  });

  it('calls onFirstRun(false) when last_window_start is set', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeHealth());
    const onFirstRun = vi.fn();
    render(<Header onFirstRun={onFirstRun} />);
    await waitFor(() => expect(onFirstRun).toHaveBeenCalledWith(false));
  });
});
