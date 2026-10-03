import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import * as clientModule from '@/api/client';
import { ApiError } from '@/api/client';
import { TrueupPanel } from '@/components/TrueupPanel';
import type { EstimateResponse, PeriodDetail } from '@/api/types';

const makePeriod = (overrides: Partial<PeriodDetail> = {}): PeriodDetail => ({
  import_kwh: 0,
  export_kwh: 0,
  import_cost_usd: 0,
  export_credit_usd: 0,
  ...overrides,
});

const makeEstimate = (overrides: Partial<EstimateResponse> = {}): EstimateResponse => ({
  period_start: 1_700_000_000,
  period_end: 1_702_592_000,
  net_cost_usd: 2.43,
  computed_at: 1_702_592_000,
  breakdown: {
    peak: makePeriod({ import_kwh: 0.16, export_kwh: 0.27, import_cost_usd: 0.09, export_credit_usd: 0.03 }),
    off_peak: makePeriod({ import_kwh: 4.35, export_kwh: 3.36, import_cost_usd: 2.14, export_credit_usd: 1.68 }),
    super_off_peak: makePeriod(),
  },
  tou_schedule: { id: 1, rate_label: 'TOU-DR-2 Inland Baseline Region', effective_date: null },
  ...overrides,
});

describe('TrueupPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders without throwing in the loading state', () => {
    vi.spyOn(clientModule, 'apiFetch').mockReturnValue(new Promise(() => {}));
    render(<TrueupPanel />);
  });

  it('renders all three period cards after a successful fetch', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);
    await waitFor(() => {
      expect(screen.getByText('Peak')).toBeInTheDocument();
      expect(screen.getByText('Off-Peak')).toBeInTheDocument();
      expect(screen.getByText('Super Off-Peak')).toBeInTheDocument();
    });
  });

  it('keeps the headline owed amount plain without parentheses', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate({ net_cost_usd: 2.43 }));
    render(<TrueupPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('trueup-verdict')).toHaveTextContent('OWED');
    });
    // The amount is never signed — the verdict word carries the direction.
    expect(screen.getByTestId('trueup-verdict-amount')).toHaveTextContent(/^\$2\.43$/);
  });

  it('reads CREDIT in green when net cost is negative', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate({ net_cost_usd: -5.0 }));
    render(<TrueupPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('trueup-verdict')).toHaveTextContent('CREDIT');
    });
    expect(screen.getByTestId('trueup-verdict')).toHaveStyle({ color: 'var(--green)' });
    // Negative net must not leak a minus sign into the displayed amount.
    expect(screen.getByTestId('trueup-verdict-amount')).toHaveTextContent('$5.00');
  });

  it('shows per-period net amounts without verdict labels', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(
      makeEstimate({
        breakdown: {
          // costs more than it earns -> OWED 10.00
          peak: { import_kwh: 1, export_kwh: 1, import_cost_usd: 12, export_credit_usd: 2 },
          // earns more than it costs -> CREDIT 5.00
          off_peak: { import_kwh: 1, export_kwh: 1, import_cost_usd: 3, export_credit_usd: 8 },
          super_off_peak: {
            import_kwh: 1, export_kwh: 1, import_cost_usd: 4, export_credit_usd: 4,
          },
        },
      }),
    );
    render(<TrueupPanel />);
    await waitFor(() => {
      expect(screen.getByText('Super Off-Peak')).toBeInTheDocument();
    });
    // Parentheses distinguish owed amounts without extra verdict labels.
    expect(screen.getByText('($10.00)')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    for (const label of ['Peak', 'Off-Peak', 'Super Off-Peak']) {
      const card = within(screen.getByText(label).parentElement!);
      expect(card.queryByText(/^(OWED|CREDIT|EVEN)$/)).not.toBeInTheDocument();
    }
  });

  it.each([
    [5, 2, '3.00'],
    [2, 5, '-3.00'],
    [2, 2, '0.00'],
  ])('shows net energy for import %s and export %s', async (importKwh, exportKwh, amount) => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate({
      breakdown: {
        peak: makePeriod({ import_kwh: importKwh, export_kwh: exportKwh }),
        off_peak: makePeriod(),
        super_off_peak: makePeriod(),
      },
    }));
    render(<TrueupPanel />);
    const title = await screen.findByText('Peak');
    const card = within(title.parentElement!);
    expect(card.getByText(amount)).toBeInTheDocument();
    expect(card.queryByText(/NET IMPORT|NET EXPORT|BALANCED/)).not.toBeInTheDocument();
  });

  it('reads BREAK EVEN when net cost is exactly zero', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate({ net_cost_usd: 0 }));
    render(<TrueupPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('trueup-verdict')).toHaveTextContent('BREAK EVEN');
    });
  });

  it('renders period breakdown values', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);
    await waitFor(() => {
      expect(screen.getByText('0.16')).toBeInTheDocument();
      expect(screen.getByText('$0.09')).toBeInTheDocument();
    });
  });

  it('renders the TOU schedule label', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);
    await waitFor(() =>
      expect(screen.getByText('TOU-DR-2 Inland Baseline Region')).toBeInTheDocument(),
    );
  });

  // The End date is inclusive, and the API layer shifts the actual request end
  // back a day for the bridge's inclusive-end semantics — so only an end
  // strictly before the start is an invalid range.
  it('rejects an end date before the start date', async () => {
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);

    const start = screen.getByLabelText(/^start$/i) as HTMLInputElement;
    const end = screen.getByLabelText(/end/i) as HTMLInputElement;
    fireEvent.change(start, { target: { value: '2026-07-21' } });
    fireEvent.change(end, { target: { value: '2026-07-20' } });

    await waitFor(() => {
      expect(screen.getByText(/End date must not be before start date/)).toBeInTheDocument();
    });
    // No request should go out for an invalid range.
    spy.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
    await waitFor(() => {
      expect(screen.getByText(/End date must not be before start date/)).toBeInTheDocument();
    });
    expect(spy).not.toHaveBeenCalled();
  });

  // A same-day range is now valid — it's one full day, not an empty range.
  it('accepts a same-day start and end date', async () => {
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);

    const start = screen.getByLabelText(/^start$/i) as HTMLInputElement;
    const end = screen.getByLabelText(/end/i) as HTMLInputElement;
    fireEvent.change(start, { target: { value: '2026-07-21' } });
    fireEvent.change(end, { target: { value: '2026-07-21' } });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
    expect(screen.queryByText(/must not be before/)).not.toBeInTheDocument();
  });

  // Picking today as the End date must request through today, not through
  // yesterday (the request end is shifted back a day, so it should land on
  // tomorrow's midnight to cover all of today).
  it('requests through today when the End date is today', async () => {
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const estimateCall = spy.mock.calls.find((c) =>
      String(c[0]).startsWith('trueup/estimate'),
    );
    const params = new URLSearchParams(String(estimateCall![0]).split('?')[1]);
    const requestedEnd = new Date(params.get('end')!);
    const today = new Date();
    expect(requestedEnd.getUTCFullYear()).toBe(today.getFullYear());
    expect(requestedEnd.getUTCMonth()).toBe(today.getMonth());
    expect(requestedEnd.getUTCDate()).toBe(today.getDate());
  });

  it('keeps showing the last estimate while a background refresh is loading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);
    await waitFor(() => expect(screen.getByText('Peak')).toBeInTheDocument());

    // Next refresh call hangs — the previously rendered estimate must stay put.
    spy.mockReturnValue(new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(screen.getByText('Peak')).toBeInTheDocument();
    expect(screen.queryByText('Loading estimate…')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('auto-refreshes every 15 minutes while the range includes today', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);
    await waitFor(() => expect(screen.getByText('Peak')).toBeInTheDocument());

    const callsAfterMount = spy.mock.calls.length;
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(spy.mock.calls.length).toBeGreaterThan(callsAfterMount);
    vi.useRealTimers();
  });

  it('does not auto-refresh once the End date is in the past', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);
    await waitFor(() => expect(screen.getByText('Peak')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/^start$/i), { target: { value: '2019-12-01' } });
    fireEvent.change(screen.getByLabelText(/end/i), { target: { value: '2020-01-01' } });
    // "Peak" only renders once fetch_success dispatches, which only happens after
    // every apiFetch call this doFetch triggered (estimate + all series batches)
    // has settled — so this wait guarantees the new fetch is fully done.
    await waitFor(() => expect(screen.getByText('Peak')).toBeInTheDocument());

    const callsAfterDateChange = spy.mock.calls.length;
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(spy.mock.calls.length).toBe(callsAfterDateChange);
    vi.useRealTimers();
  });

  it('does not auto-refresh while the tab is hidden', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);
    await waitFor(() => expect(screen.getByText('Peak')).toBeInTheDocument());

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    const callsBeforeTick = spy.mock.calls.length;
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(spy.mock.calls.length).toBe(callsBeforeTick);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useRealTimers();
  });

  it('renders no_tou_schedule error with warning style', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockRejectedValue(
      new ApiError(422, 'no_tou_schedule', 'TOU not configured'),
    );
    render(<TrueupPanel />);
    await waitFor(() =>
      expect(screen.getByText(/TOU not configured/)).toBeInTheDocument(),
    );
  });

  it('renders insufficient_data error message', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockRejectedValue(
      new ApiError(400, 'insufficient_data', 'ignored'),
    );
    render(<TrueupPanel />);
    await waitFor(() =>
      expect(screen.getByText(/No energy data for the selected period/)).toBeInTheDocument(),
    );
  });

  it('renders a generic error message', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockRejectedValue(new Error('network failure'));
    render(<TrueupPanel />);
    await waitFor(() =>
      expect(screen.getByText(/network failure/)).toBeInTheDocument(),
    );
  });

  it('renders "Unknown error" for non-Error throws', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockRejectedValue('raw string error');
    render(<TrueupPanel />);
    await waitFor(() =>
      expect(screen.getByText(/Unknown error/)).toBeInTheDocument(),
    );
  });

  describe('pinned start date', () => {
    const thirtyDaysAgo = () => {
      const d = new Date(Date.now() - 30 * 86400 * 1000);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    };

    it('loads the pinned start date on mount', () => {
      localStorage.setItem('trueup.pinnedStart', '2026-01-15');
      vi.spyOn(clientModule, 'apiFetch').mockReturnValue(new Promise(() => {}));
      render(<TrueupPanel />);
      expect((screen.getByLabelText(/^start$/i) as HTMLInputElement).value).toBe('2026-01-15');
    });

    it('defaults to 30 days ago when nothing is pinned', () => {
      vi.spyOn(clientModule, 'apiFetch').mockReturnValue(new Promise(() => {}));
      render(<TrueupPanel />);
      expect((screen.getByLabelText(/^start$/i) as HTMLInputElement).value).toBe(thirtyDaysAgo());
    });

    it('falls back to the default when the stored value is corrupt', () => {
      localStorage.setItem('trueup.pinnedStart', 'garbage');
      vi.spyOn(clientModule, 'apiFetch').mockReturnValue(new Promise(() => {}));
      render(<TrueupPanel />);
      expect((screen.getByLabelText(/^start$/i) as HTMLInputElement).value).toBe(thirtyDaysAgo());
    });

    it('pin button stores the current start date, and unpins on second click', () => {
      vi.spyOn(clientModule, 'apiFetch').mockReturnValue(new Promise(() => {}));
      render(<TrueupPanel />);

      fireEvent.change(screen.getByLabelText(/^start$/i), { target: { value: '2026-01-15' } });
      const pin = screen.getByRole('button', { name: /pin start date/i });
      expect(pin).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(pin);
      expect(localStorage.getItem('trueup.pinnedStart')).toBe('2026-01-15');
      expect(pin).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(pin);
      expect(localStorage.getItem('trueup.pinnedStart')).toBeNull();
      expect(pin).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows the pin as inactive once the start date moves off the pinned value', () => {
      localStorage.setItem('trueup.pinnedStart', '2026-01-15');
      vi.spyOn(clientModule, 'apiFetch').mockReturnValue(new Promise(() => {}));
      render(<TrueupPanel />);

      const pin = screen.getByRole('button', { name: /pin start date/i });
      expect(pin).toHaveAttribute('aria-pressed', 'true');

      fireEvent.change(screen.getByLabelText(/^start$/i), { target: { value: '2026-03-01' } });
      expect(pin).toHaveAttribute('aria-pressed', 'false');
      // Browsing must not move the pin.
      expect(localStorage.getItem('trueup.pinnedStart')).toBe('2026-01-15');
    });
  });
});
