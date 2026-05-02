import { useRef, useEffect } from 'react';
import { useDisplayPrefs, type VisibleKey } from '@/context/DisplayPrefsContext';
import styles from './SettingsPanel.module.css';

interface Props {
  onClose: () => void;
}

const TOGGLES: { key: VisibleKey; label: string }[] = [
  { key: 'flowStrip', label: 'Flow Strip' },
  { key: 'energyChart', label: 'Energy Chart' },
  { key: 'inverterTotals', label: 'Inverter Performance' },
  { key: 'arrayHealth', label: 'Array Health' },
  { key: 'trueup', label: 'True-up' },
  { key: 'inverterHeatmap', label: 'Inverter Heatmap' },
];

export function SettingsPanel({ onClose }: Props) {
  const { visibleComponents, toggleComponent } = useDisplayPrefs();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  return (
    <div ref={panelRef} className={styles.panel}>
      {TOGGLES.map(({ key, label }) => (
        <label key={key} className={styles.toggle}>
          <input
            type="checkbox"
            checked={visibleComponents[key]}
            onChange={() => toggleComponent(key)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
