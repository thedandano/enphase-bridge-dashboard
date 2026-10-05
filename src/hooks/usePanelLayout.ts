import { useState } from 'react';
import { EMPTY_LAYOUT, parsePanelLayout, type PanelLayout } from '@/utils/panelLayout';
const KEY = 'panelLayout.v1';
function load() {
  try {
    const bytes = localStorage.getItem(KEY);
    const raw = bytes === null ? EMPTY_LAYOUT : JSON.parse(bytes);
    const saved = parsePanelLayout(raw);
    if (bytes !== null && !raw.grid) console.warn('Older separate panel canvases combined into a shared grid preview; original saved content retained until Save');
    return { saved, error: null, blocked: false, hasSaved: bytes !== null };
  } catch (error) {
    console.warn('Panel layout load failed; saved content was preserved', error);
    return { saved: EMPTY_LAYOUT, error: `Cannot load saved layout: ${String(error)}. Reset it explicitly to start again.`, blocked: true, hasSaved: false };
  }
}
export function usePanelLayout() {
  const [state, setState] = useState(load);
  const [draft, setDraft] = useState<PanelLayout | null>(null);
  function save(): boolean {
    if (!draft || state.blocked) return false;
    try {
      const saved = parsePanelLayout(draft);
      localStorage.setItem(KEY, JSON.stringify(saved));
      setState({ saved, error: null, blocked: false, hasSaved: true });
      setDraft(null);
      return true;
    } catch (error) {
      console.warn('Panel layout save failed; draft and saved layout were retained', error);
      setState((s) => ({ ...s, error: `Cannot save layout: ${String(error)}` }));
      return false;
    }
  }
  function resetSaved(): boolean {
    try {
      localStorage.removeItem(KEY);
      setState({ saved: EMPTY_LAYOUT, error: null, blocked: false, hasSaved: false });
      setDraft(null);
      return true;
    } catch (error) {
      console.warn('Panel layout reset failed; saved content was preserved', error);
      setState((s) => ({ ...s, error: `Cannot reset layout: ${String(error)}` }));
      return false;
    }
  }
  return { ...state, draft, beginEdit: () => setDraft(state.saved), updateDraft: setDraft, save,
    cancel: () => { setDraft(null); if (!state.blocked) setState((s) => ({ ...s, error: null })); }, resetSaved };
}
