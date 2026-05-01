import { useState, useEffect, type ReactNode } from 'react';
import {
  DisplayPrefsContext,
  defaultVisible,
  LS_TABLET,
  lsVisible,
  readBool,
  type VisibleKey,
} from './DisplayPrefsContext';

interface Props {
  children: ReactNode;
}

export function DisplayPrefsProvider({ children }: Props) {
  const [tabletMode, setTabletMode] = useState(() => readBool(LS_TABLET, false));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleComponents, setVisibleComponents] = useState<Record<VisibleKey, boolean>>(defaultVisible);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  function toggleTabletMode() {
    const next = !tabletMode;
    setTabletMode(next);
    localStorage.setItem(LS_TABLET, String(next));

    if (next) {
      if (document.fullscreenEnabled) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  function toggleComponent(key: VisibleKey) {
    setVisibleComponents((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(lsVisible(key), String(next[key]));
      return next;
    });
  }

  return (
    <DisplayPrefsContext.Provider value={{ tabletMode, toggleTabletMode, isFullscreen, visibleComponents, toggleComponent }}>
      {children}
    </DisplayPrefsContext.Provider>
  );
}
