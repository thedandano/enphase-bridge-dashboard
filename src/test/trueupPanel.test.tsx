import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('reads OWED with an unsigned amount when net cost is positive', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate({ net_cost_usd: 2.43 }));
    render(<TrueupPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('trueup-verdict')).toHaveTextContent('OWED');
    });
    // The amount is never signed — the verdict word carries the direction.
    expect(screen.getByTestId('trueup-verdict-amount')).toHaveTextContent('$2.43');
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

  it('shows per-period net with a verdict, unsigned', async () => {
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
    // Amounts are unsigned; the adjacent word carries direction.
    expect(screen.getByText('10.00', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('OWED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CREDIT').length).toBeGreaterThan(0);
    expect(screen.getByText('EVEN')).toBeInTheDocument();
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

  // The API layer shifts `end` back a day for the bridge's inclusive-end
  // semantics, so an empty or backwards range would be sent end-before-start.
  it('rejects an end date that is not after the start date', async () => {
    const spy = vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate());
    render(<TrueupPanel />);

    const start = screen.getByLabelText(/start/i) as HTMLInputElement;
    const end = screen.getByLabelText(/end/i) as HTMLInputElement;
    fireEvent.change(start, { target: { value: '2026-07-21' } });
    fireEvent.change(end, { target: { value: '2026-07-21' } });

    await waitFor(() => {
      expect(screen.getByText(/End date must be after start date/)).toBeInTheDocument();
    });
    // No request should go out for an invalid range.
    spy.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
    await waitFor(() => {
      expect(screen.getByText(/End date must be after start date/)).toBeInTheDocument();
    });
    expect(spy).not.toHaveBeenCalled();
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
});
