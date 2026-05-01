import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';
import { DisplayPrefsProvider } from '@/context/DisplayPrefsProvider';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', () => new Promise(() => {}));
});

describe('App twoCol grid visibility', () => {
  it('shows ArrayHealthPanel placeholder when both arrayHealth and trueup are visible (default)', () => {
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    // ArrayHealthPanel renders "Loading arrays…" since fetch never resolves
    expect(screen.getByText('Loading arrays…')).toBeInTheDocument();
    // TrueupPanel renders its heading unconditionally
    expect(screen.getByRole('heading', { name: 'TOU / True-up Estimate' })).toBeInTheDocument();
  });

  it('shows TrueupPanel and hides ArrayHealthPanel when only arrayHealth is false', () => {
    localStorage.setItem('displayPrefs.visible.arrayHealth', 'false');
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    expect(screen.queryByText('Loading arrays…')).toBeNull();
    // TrueupPanel still visible — twoCol wrapper still rendered
    expect(screen.getByRole('heading', { name: 'TOU / True-up Estimate' })).toBeInTheDocument();
  });

  it('shows ArrayHealthPanel and hides TrueupPanel when only trueup is false', () => {
    localStorage.setItem('displayPrefs.visible.trueup', 'false');
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    expect(screen.getByText('Loading arrays…')).toBeInTheDocument();
    // TrueupPanel heading absent — twoCol still rendered for arrayHealth
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
    expect(screen.queryByText('Loading arrays…')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'TOU / True-up Estimate' })).toBeNull();
  });
});
