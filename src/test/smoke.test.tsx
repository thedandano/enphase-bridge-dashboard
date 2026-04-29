import { describe, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Header } from '@/components/Header';
import { RightNowSection } from '@/components/RightNowSection';
import { TodaySummary } from '@/components/TodaySummary';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
import { TrueupPanel } from '@/components/TrueupPanel';
import { InverterChart } from '@/components/InverterChart';
import { EnergyChart } from '@/components/EnergyChart';

// Stub fetch globally — return a never-resolving promise so no real network calls are made
beforeEach(() => {
  vi.stubGlobal('fetch', () => new Promise(() => {}));
});

describe('Smoke renders', () => {
  it('Header renders without throwing', () => {
    render(<Header />);
  });

  it('RightNowSection renders without throwing', () => {
    render(<RightNowSection />);
  });

  it('TodaySummary renders without throwing', () => {
    render(<TodaySummary />);
  });

  it('ArrayHealthPanel renders without throwing', () => {
    render(<ArrayHealthPanel />);
  });

  it('TrueupPanel renders without throwing', () => {
    render(<TrueupPanel />);
  });

  it('InverterChart renders without throwing', () => {
    render(<InverterChart selectedWindowTs={null} onClearWindow={() => {}} />);
  });

  it('EnergyChart renders without throwing', () => {
    render(<EnergyChart onWindowSelect={() => {}} />);
  });
});
