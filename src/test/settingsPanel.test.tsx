import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '@/components/SettingsPanel';

const toggleComponent = vi.fn();

vi.mock('@/context/DisplayPrefsContext', () => ({
  useDisplayPrefs: () => ({
    visibleComponents: {
      flowStrip: true,
      energyChart: true,
      inverterChart: true,
      inverterTotals: true,
      arrayHealth: true,
      trueup: true,
    },
    toggleComponent,
  }),
}));

describe('SettingsPanel', () => {
  beforeEach(() => {
    toggleComponent.mockClear();
  });

  it('renders all six toggles', () => {
    render(<SettingsPanel onClose={vi.fn()} />);
    expect(screen.getByLabelText('Flow Strip')).toBeInTheDocument();
    expect(screen.getByLabelText('Energy Chart')).toBeInTheDocument();
    expect(screen.getByLabelText('Inverter Chart')).toBeInTheDocument();
    expect(screen.getByLabelText('Inverter Totals')).toBeInTheDocument();
    expect(screen.getByLabelText('Array Health')).toBeInTheDocument();
    expect(screen.getByLabelText('True-up')).toBeInTheDocument();
  });

  it.each([
    ['Flow Strip', 'flowStrip'],
    ['Energy Chart', 'energyChart'],
    ['Inverter Chart', 'inverterChart'],
    ['Inverter Totals', 'inverterTotals'],
    ['Array Health', 'arrayHealth'],
    ['True-up', 'trueup'],
  ] as const)('clicking "%s" calls toggleComponent with "%s"', (label, key) => {
    render(<SettingsPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(label));
    expect(toggleComponent).toHaveBeenCalledOnce();
    expect(toggleComponent).toHaveBeenCalledWith(key);
  });

  it('calls onClose when clicking outside the panel', () => {
    const onClose = vi.fn();
    render(
      <div>
        <SettingsPanel onClose={onClose} />
        <button>outside</button>
      </div>,
    );
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
