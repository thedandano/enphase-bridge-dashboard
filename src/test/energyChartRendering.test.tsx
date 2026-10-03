import { cloneElement, createElement, type ComponentProps, type ReactElement } from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnergyChart } from '@/components/EnergyChart';
import * as energy from '@/api/energy';
import * as refresh from '@/hooks/useAutoRefresh';
import { mirroredMaxWh } from '@/utils/energyFlow';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    Bar: (props: ComponentProps<typeof actual.Bar>) => createElement(actual.Bar, { ...props, isAnimationActive: false }),
    // jsdom has no layout engine; render the real chart at a known size.
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 600, height: 300 } as object),
  };
});

const windows = [
  { window_start: 1000, is_complete: true, wh_produced: 100, wh_consumed: 250, wh_grid_import: 200, wh_grid_export: 50 },
  { window_start: 1900, is_complete: true, wh_produced: 500, wh_consumed: 350, wh_grid_import: 50, wh_grid_export: 200 },
  { window_start: 2800, is_complete: false, wh_produced: 400, wh_consumed: 400, wh_grid_import: 100, wh_grid_export: 100 },
];

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('EnergyChart rendering', () => {
  it('aligns production and consumption bars at the same timestamp', async () => {
    vi.spyOn(energy, 'fetchWindows').mockResolvedValue({ windows, total: 3, limit: 3, offset: 0 });
    const { container } = render(<EnergyChart range="24h" start={1000} end={3700} limit={3} />);
    await vi.waitFor(() => expect(container.querySelectorAll('.recharts-bar')[0]?.querySelectorAll('.recharts-rectangle')).toHaveLength(3));
    const series = container.querySelectorAll('.recharts-bar');
    const production = [...series[0].querySelectorAll('.recharts-rectangle')];
    const consumption = [...series[2].querySelectorAll('.recharts-rectangle')];
    expect(production).toHaveLength(3);
    expect(consumption).toHaveLength(3);
    production.forEach((bar, index) => {
      expect(bar.getAttribute('x')).toBe(consumption[index].getAttribute('x'));
      expect(bar.getAttribute('width')).toBe(consumption[index].getAttribute('width'));
    });
  });

  it('renders area grid flows as bands outside the solar and home bands', async () => {
    vi.spyOn(energy, 'fetchWindows').mockResolvedValue({ windows, total: 3, limit: 3, offset: 0 });
    const { container } = render(<EnergyChart range="24h" start={1000} end={3700} limit={3} />);
    await vi.waitFor(() => expect(container.querySelectorAll('.recharts-bar-rectangle').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /Area/ }));
    await vi.waitFor(() => expect(container.querySelectorAll('.recharts-area-area')).toHaveLength(4));
    const paths = [...container.querySelectorAll('.recharts-area-area')].map((p) => p.getAttribute('d')!);
    // An unstacked grid area closes against the flat zero baseline. A stacked
    // grid band follows the varying production/consumption boundary instead.
    const coordinates = (path: string) => [...path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map((m) => Number(m[2]));
    for (const index of [1, 3]) {
      const ys = coordinates(paths[index]);
      expect(new Set(ys.slice(3)).size).toBeGreaterThan(1);
    }
    expect(paths.every((path) => !path.includes('C'))).toBe(true);
    expect(coordinates(paths[1]).every((y) => y <= 135)).toBe(true);
    expect(coordinates(paths[3]).every((y) => y >= 135)).toBe(true);
  });

  it('renders finite coordinates for zero-only windows in both styles', async () => {
    vi.spyOn(refresh, 'useAutoRefresh').mockReturnValue({ data: { windows: windows.map((w) => ({ ...w, wh_produced: 0, wh_consumed: 0, wh_grid_import: 0, wh_grid_export: 0 })), total: 3, limit: 3, offset: 0 }, error: null, secondsUntilRefresh: 30 });
    const { container } = render(<EnergyChart range="24h" start={1000} end={3700} limit={3} />);
    expect(mirroredMaxWh(windows.map((w) => ({ ...w, wh_produced: 0, wh_consumed: 0, wh_grid_import: 0, wh_grid_export: 0 })))).toBe(1000);
    await vi.waitFor(() => expect(container.querySelector('.recharts-surface')).toBeInTheDocument());
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    fireEvent.click(screen.getByRole('button', { name: /Area/ }));
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});
