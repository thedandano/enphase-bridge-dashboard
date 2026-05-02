import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';
import { FlowStrip } from '@/components/FlowStrip';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
import { TrueupPanel } from '@/components/TrueupPanel';
import { ChartPanel } from '@/components/ChartPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Layout } from '@/components/Layout';
import { DisplayPrefsProvider } from '@/context/DisplayPrefsProvider';
import App from '@/App';

// Stub fetch globally — return a never-resolving promise so no real network calls are made
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', () => new Promise(() => {}));
});

describe('Smoke renders', () => {
  it('Header renders without throwing', () => {
    render(<Header />);
  });

  it('FlowStrip renders without throwing', () => {
    render(<FlowStrip />);
  });

  it('ArrayHealthPanel renders without throwing', () => {
    render(<ArrayHealthPanel />);
  });

  it('TrueupPanel renders without throwing', () => {
    render(<TrueupPanel />);
  });

  it('ChartPanel renders without throwing', () => {
    render(<ChartPanel />);
  });
});

describe('Smoke renders — tablet-mode additions', () => {
  it('SettingsPanel renders without throwing', () => {
    render(
      <DisplayPrefsProvider>
        <SettingsPanel onClose={() => {}} />
      </DisplayPrefsProvider>,
    );
  });

  it('Header tablet toggle button is present', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /toggle tablet mode/i })).toBeInTheDocument();
  });

  it('FlowStrip is absent when visibility flag is false', () => {
    localStorage.setItem('displayPrefs.visible.flowStrip', 'false');
    render(
      <DisplayPrefsProvider>
        <App />
      </DisplayPrefsProvider>,
    );
    expect(screen.queryByRole('region', { name: /energy flow summary/i })).toBeNull();
  });
});

describe('Smoke renders — ChartPanel visibility', () => {
  it.each([
    ['energyChart', 'ENERGY FLOW'],
    ['inverterTotals', 'INVERTER PERFORMANCE'],
  ] as const)(
    'hides %s chart when visibility flag is false',
    (key, headingText) => {
      localStorage.setItem(`displayPrefs.visible.${key}`, 'false');
      render(
        <DisplayPrefsProvider>
          <ChartPanel />
        </DisplayPrefsProvider>,
      );
      expect(
        screen.queryByRole('heading', { name: headingText }),
      ).toBeNull();
    },
  );

  it.each([
    ['energyChart', 'ENERGY FLOW'],
    ['inverterTotals', 'INVERTER PERFORMANCE'],
  ] as const)(
    'shows %s chart when visibility flag is true (default)',
    (key, headingText) => {
      // All flags default to true — key being tested is explicitly set to true
      localStorage.setItem(`displayPrefs.visible.${key}`, 'true');
      render(
        <DisplayPrefsProvider>
          <ChartPanel />
        </DisplayPrefsProvider>,
      );
      expect(
        screen.getByRole('heading', { name: headingText }),
      ).toBeInTheDocument();
    },
  );
});

describe('Layout compact mode', () => {
  it('adds data-tablet="true" when tabletMode prop is true', () => {
    const { container } = render(
      <Layout tabletMode={true} header={<span>H</span>}>
        <span>body</span>
      </Layout>,
    );
    expect(container.firstChild).toHaveAttribute('data-tablet', 'true');
  });

  it('omits data-tablet attribute when tabletMode is false', () => {
    const { container } = render(
      <Layout tabletMode={false} header={<span>H</span>}>
        <span>body</span>
      </Layout>,
    );
    expect(container.firstChild).not.toHaveAttribute('data-tablet');
  });
});
