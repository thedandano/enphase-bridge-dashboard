import { describe, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Header } from '@/components/Header';
import { LiveStats } from '@/components/LiveStats';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
import { TrueupPanel } from '@/components/TrueupPanel';
import { InverterTable } from '@/components/InverterTable';

// Stub fetch globally — return a never-resolving promise so no real network calls are made
beforeEach(() => {
  vi.stubGlobal('fetch', () => new Promise(() => {}));
});

describe('Smoke renders', () => {
  it('Header renders without throwing', () => {
    render(<Header />);
  });

  it('LiveStats renders without throwing', () => {
    render(<LiveStats />);
  });

  it('ArrayHealthPanel renders without throwing', () => {
    render(<ArrayHealthPanel />);
  });

  it('TrueupPanel renders without throwing', () => {
    render(<TrueupPanel />);
  });

  it('InverterTable renders without throwing', () => {
    render(<InverterTable selectedWindowTs={null} onClearWindow={() => {}} />);
  });
});
