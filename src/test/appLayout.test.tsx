import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '@/App';
import { DisplayPrefsProvider } from '@/context/DisplayPrefsProvider';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', () => new Promise(() => {}));
});

describe('App dashboard panel visibility', () => {
  it('shows ArrayHealthPanel when both arrayHealth and trueup are visible (default)', () => {
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    // Array layout entry remains visible while readings load.
    expect(screen.getByRole('region', { name: 'Array layout' })).toBeInTheDocument();
    // TrueupPanel now renders inside ChartPanel.
    expect(screen.getByRole('heading', { name: 'TOU / True-up Estimate' })).toBeInTheDocument();
  });

  it('shows TrueupPanel and hides ArrayHealthPanel when only arrayHealth is false', () => {
    localStorage.setItem('displayPrefs.visible.arrayHealth', 'false');
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    expect(screen.queryByRole('region', { name: 'Array layout' })).toBeNull();
    // TrueupPanel still visible inside ChartPanel.
    expect(screen.getByRole('heading', { name: 'TOU / True-up Estimate' })).toBeInTheDocument();
  });

  it('shows ArrayHealthPanel and hides TrueupPanel when only trueup is false', () => {
    localStorage.setItem('displayPrefs.visible.trueup', 'false');
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    expect(screen.getByRole('region', { name: 'Array layout' })).toBeInTheDocument();
    // TrueupPanel heading absent, ArrayHealthPanel still renders below charts.
    expect(screen.queryByRole('heading', { name: 'TOU / True-up Estimate' })).toBeNull();
  });

  it('hides both panels when arrayHealth and trueup are both false', () => {
    localStorage.setItem('displayPrefs.visible.arrayHealth', 'false');
    localStorage.setItem('displayPrefs.visible.trueup', 'false');
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    expect(screen.queryByRole('region', { name: 'Array layout' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'TOU / True-up Estimate' })).toBeNull();
  });
});

it('keeps the array layout on the dashboard selected period', () => {
  render(<DisplayPrefsProvider><App /></DisplayPrefsProvider>);
  const array = screen.getByRole('region', { name: 'Array layout' });
  expect(within(array).getByText(/TODAY · Estimated energy/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '24h' }));
  expect(within(array).getByText(/LAST 24H · Estimated energy/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '←' }));
  expect(within(array).getByText(/YESTERDAY · Estimated energy/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '7d' }));
  expect(within(array).getByText(/LAST 7 DAYS · Estimated energy/)).toBeInTheDocument();
});
