import { describe, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Header } from '@/components/Header';
import { FlowStrip } from '@/components/FlowStrip';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
import { TrueupPanel } from '@/components/TrueupPanel';
import { ChartPanel } from '@/components/ChartPanel';

// Stub fetch globally — return a never-resolving promise so no real network calls are made
beforeEach(() => {
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
