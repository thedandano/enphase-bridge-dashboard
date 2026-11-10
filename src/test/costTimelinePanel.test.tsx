import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as touModule from '@/api/tou';
import { ApiError } from '@/api/client';
import { CostTimelinePanel } from '@/components/CostTimelinePanel';
import type { EstimateResponse } from '@/api/types';

const zero = { import_kwh: 0, export_kwh: 0, import_cost_usd: 0, export_credit_usd: 0 };
const START = Math.floor(new Date('2026-11-10T00:00:00').getTime() / 1000);

function estimate(net: number): EstimateResponse {
  return {
    period_start: START,
    period_end: START + 86400,
    net_cost_usd: net,
    breakdown: { peak: { ...zero, import_kwh: 2, import_cost_usd: Math.max(net, 0) }, off_peak: zero,
      super_off_peak: { ...zero, export_kwh: 4, export_credit_usd: Math.max(-net, 0) } },
    tou_schedule: { id: 1, rate_label: 'TOU-DR-1', effective_date: null },
    tou_schedules: [],
    computed_at: START,
    excluded_window_count: 3,
  };
}

function renderPanel(live = false) {
  return render(
    <CostTimelinePanel range="today" start={START} end={START + 3600} displayEnd={START + 86400}
      live={live} periodLabel="TODAY" />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CostTimelinePanel', () => {
  it('states the verdict from the summed slice estimates and notes excluded windows', async () => {
    vi.spyOn(touModule, 'fetchCostTimeline').mockResolvedValue({
      points: [],
      estimates: [estimate(1.5), estimate(-0.5)],
    });
    renderPanel();
    expect(await screen.findByTestId('trueup-verdict')).toHaveTextContent('OWED');
    expect(screen.getByTestId('trueup-verdict-amount')).toHaveTextContent('$1.00');
    expect(screen.getByText(/6 windows were left out/)).toBeInTheDocument();
  });

  it('asks the API for hourly buckets on today', async () => {
    const spy = vi.spyOn(touModule, 'fetchCostTimeline').mockResolvedValue({ points: [], estimates: [estimate(0)] });
    renderPanel();
    await screen.findByTestId('trueup-verdict');
    expect(spy).toHaveBeenCalledWith(START, START + 3600, 'hour', expect.any(Number));
  });

  it('reads the clock on each fetch while live instead of the stale end prop', async () => {
    const nowMs = (START + 9 * 3600) * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    const spy = vi.spyOn(touModule, 'fetchCostTimeline').mockResolvedValue({ points: [], estimates: [estimate(0)] });
    renderPanel(true);
    await screen.findByTestId('trueup-verdict');
    expect(spy).toHaveBeenCalledWith(START, nowMs / 1000, 'hour', nowMs / 1000);
  });

  it('shows an explicit message when the range has no data', async () => {
    vi.spyOn(touModule, 'fetchCostTimeline').mockRejectedValue(
      new ApiError(422, 'insufficient_data', 'no data'),
    );
    renderPanel();
    expect(await screen.findByText('No energy data for the selected period')).toBeInTheDocument();
  });

  it('shows other errors as they are', async () => {
    vi.spyOn(touModule, 'fetchCostTimeline').mockRejectedValue(new Error('pick a shorter range'));
    renderPanel();
    expect(await screen.findByText('pick a shorter range')).toBeInTheDocument();
  });
});
