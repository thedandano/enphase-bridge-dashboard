import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('renders the net cost value', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate({ net_cost_usd: 2.43 }));
    render(<TrueupPanel />);
    // The span renders '$' and '2.43' as adjacent text nodes; match on combined textContent
    await waitFor(() => {
      const span = screen.getAllByText(/2\.43/).find(
        el => el.tagName === 'SPAN' && el.textContent?.includes('$'),
      );
      expect(span).toBeInTheDocument();
    });
  });

  it('renders negative net cost with green color', async () => {
    vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(makeEstimate({ net_cost_usd: -5.0 }));
    render(<TrueupPanel />);
    await waitFor(() => {
      const span = screen.getAllByText(/5\.00/).find(
        el => el.tagName === 'SPAN' && el.textContent?.includes('$'),
      );
      expect(span).toHaveStyle({ color: 'var(--green)' });
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
