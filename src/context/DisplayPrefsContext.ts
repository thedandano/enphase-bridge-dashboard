import { createContext, useContext } from 'react';

export const VISIBLE_KEYS = [
  'flowStrip',
  'energyChart',
  'inverterTotals',
  'arrayHealth',
  'trueup',
  'inverterHeatmap',
] as const;

export type VisibleKey = typeof VISIBLE_KEYS[number];

const LS_TABLET = 'displayPrefs.tabletMode';
const lsVisible = (k: VisibleKey) => `displayPrefs.visible.${k}`;

export function readBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

export function defaultVisible(): Record<VisibleKey, boolean> {
  return Object.fromEntries(VISIBLE_KEYS.map((k) => [k, readBool(lsVisible(k), true)])) as Record<VisibleKey, boolean>;
}

export { LS_TABLET, lsVisible };

export interface DisplayPrefsValue {
  tabletMode: boolean;
  toggleTabletMode: () => void;
  isFullscreen: boolean;
  visibleComponents: Record<VisibleKey, boolean>;
  toggleComponent: (key: VisibleKey) => void;
}

const defaultValue: DisplayPrefsValue = {
  tabletMode: false,
  toggleTabletMode: () => {},
  isFullscreen: false,
  visibleComponents: Object.freeze(Object.fromEntries(VISIBLE_KEYS.map((k) => [k, true]))) as Record<VisibleKey, boolean>,
  toggleComponent: () => {},
};

export const DisplayPrefsContext = createContext<DisplayPrefsValue>(defaultValue);

export function useDisplayPrefs(): DisplayPrefsValue {
  return useContext(DisplayPrefsContext);
}
