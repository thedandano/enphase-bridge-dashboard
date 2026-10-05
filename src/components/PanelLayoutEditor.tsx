import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { InverterItem } from '@/api/types';
import { maxPanelWatts, placePanel, removeArray, resizeArray, sharedPanelGrid, type PanelLayout, type PanelOrientation, type PanelTarget } from '@/utils/panelLayout';
import { PanelLayoutGrid, PanelTile } from './PanelLayoutGrid';
import type { DailyTotalRow } from '@/utils/inverterDailyTotals';
import styles from './PanelLayoutEditor.module.css';

interface Props {
  draft: PanelLayout;
  serials: readonly string[];
  suggestedOrder: readonly string[];
  readings: readonly InverterItem[];
  energyTotals?: readonly DailyTotalRow[];
  error: string | null;
  onChange(layout: PanelLayout): void;
  onSave(): void;
  onCancel(): void;
}
interface Drag { serial: string; pointerId: number; x: number; y: number; offsetX: number; offsetY: number; width: number; height: number; moved: boolean }

export function PanelLayoutEditor({ draft, serials, suggestedOrder, readings, energyTotals, error, onChange, onSave, onCancel }: Props) {
  const [activeArray, setActiveArray] = useState(draft.arrays[0]?.id ?? '');
  const groupId = draft.arrays.some((a) => a.id === activeArray) ? activeArray : draft.arrays[0]?.id ?? '';
  const canvas = sharedPanelGrid(draft, groupId);
  const maxWatts = maxPanelWatts(readings);
  const maxEnergyWh = Math.max(0, ...(energyTotals?.map((r) => r.whTotal) ?? []));
  const [ghost, setGhost] = useState<{ serial: string; x: number; y: number; width: number; height: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [trayOrientation, setTrayOrientation] = useState<PanelOrientation>('portrait');
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [order, setOrder] = useState(() => [...new Set([...suggestedOrder, ...serials])]);
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<PanelTarget>(null);
  const [previewValid, setPreviewValid] = useState(false);
  useEffect(() => {
    const cancel = () => { drag.current = null; setPreview(null); setGhost(null); };
    const release = (event: globalThis.PointerEvent) => {
      if (drag.current?.pointerId === event.pointerId) cancel();
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', cancel);
    };
  }, []);
  // Preserve this editing session's initial order as live inventory changes.
  const additions = serials.filter((s) => !order.includes(s));
  if (additions.length) setOrder([...order, ...additions]);
  const assigned = new Set(draft.arrays.flatMap((a) => a.panels.map((p) => p.serial)));
  const available = order.filter((s) => !assigned.has(s));
  const placed = draft.arrays.flatMap((a) => a.panels).find((p) => p.serial === selected);

  function attempt(action: () => PanelLayout, success: string) {
    try {
      onChange(action());
      setFailure('');
      setMessage(success);
    } catch (error) {
      console.warn('Panel layout edit rejected; draft retained', error);
      setFailure(String(error));
    }
  }
  function orientation(serial: string) {
    return draft.arrays.flatMap((a) => a.panels).find((p) => p.serial === serial)?.orientation ?? trayOrientation;
  }
  function place(serial: string, target: PanelTarget) {
    const message = target
      ? `Panel ${serial} placed in row ${target.row + 1}, column ${target.column + 1}.`
      : `Panel ${serial} returned to unassigned.`;
    const existingGroup = draft.arrays.find((a) => a.panels.some((p) => p.serial === serial));
    attempt(() => placePanel(draft, serial, target && { ...target, arrayId: existingGroup?.id ?? target.arrayId }, orientation(serial)), message);
  }
  function select(serial: string) {
    setSelected(serial);
    setFailure('');
  }
  function rotate() {
    setTrayOrientation((current) => current === 'portrait' ? 'landscape' : 'portrait');
    setMessage('Orientation locked for upcoming panels. Placed panels keep their orientation.');
  }
  function addArray() {
    const id = [...crypto.getRandomValues(new Uint32Array(4))].map((part) => part.toString(16).padStart(8, '0')).join('');
    setActiveArray(id);
    onChange({ ...draft, grid: { columns: canvas.columns, rows: canvas.rows }, arrays: [...draft.arrays, {
      id, name: `Array ${draft.arrays.length + 1}`,
      columns: canvas.columns, rows: canvas.rows, panels: [],
    }] });
  }
  function targetAt(event: PointerEvent): { target: PanelTarget; tray: boolean } {
    const element = document.elementFromPoint?.(event.clientX, event.clientY);
    const grid = event.currentTarget.querySelector<HTMLElement>('[role=grid]');
    const rect = grid?.getBoundingClientRect();
    const cell = grid?.querySelector<HTMLElement>('[role=gridcell]');
    const across = grid?.querySelector<HTMLElement>('[data-column="1"][data-row="0"]');
    const down = grid?.querySelector<HTMLElement>('[data-column="0"][data-row="1"]');
    const origin = cell?.getBoundingClientRect();
    if (element && grid?.contains(element) && rect && origin && across && down && drag.current
      && event.clientX >= rect.left && event.clientX < rect.right
      && event.clientY >= rect.top && event.clientY < rect.bottom) {
      const column = Math.round((event.clientX - drag.current.offsetX - rect.left) / (across.getBoundingClientRect().left - origin.left));
      const row = Math.round((event.clientY - drag.current.offsetY - rect.top) / (down.getBoundingClientRect().top - origin.top));
      return { target: { arrayId: groupId, column, row }, tray: false };
    }
    return { target: null, tray: !!element?.closest('[data-tray]') };
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    const handle = (event.target as HTMLElement).closest<HTMLElement>('[data-panel]');
    if (!handle || event.button > 0 || drag.current) return;
    const serial = handle.dataset.panel!;
    select(serial);
    const rect = handle.getBoundingClientRect();
    drag.current = { serial, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
      width: rect.width, height: rect.height, moved: false };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) < 6 && !drag.current.moved) return;
    if (!drag.current.moved) event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current.moved = true;
    const { target } = targetAt(event);
    setGhost({ serial: drag.current.serial, x: event.clientX - drag.current.offsetX,
      y: event.clientY - drag.current.offsetY, width: drag.current.width, height: drag.current.height });
    setPreview(target);
    try {
      if (target) placePanel(draft, drag.current.serial, target, orientation(drag.current.serial));
      setPreviewValid(!!target);
    } catch {
      // Expected hover validation is shown by the invalid preview; dropping announces the error.
      setPreviewValid(false);
    }
  }
  function endDrag() { drag.current = null; setPreview(null); setGhost(null); }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (drag.current.moved) {
      const { target, tray } = targetAt(event);
      if (target || tray) place(drag.current.serial, target);
    }
    endDrag();
  }
  return (
    <div className={styles.editor} data-dragging={!!ghost} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={endDrag} onLostPointerCapture={(e) => { if (e.target === e.currentTarget && drag.current?.pointerId === e.pointerId) endDrag(); }} onKeyDown={(e) => { if (e.key === 'Escape') { endDrag(); setSelected(null); } }}>
      <div className={styles.toolbar}>
        <div>
          <h3>Edit panel layout</h3>
          <p>Drag panels onto the shared roof grid. Arrays group panels; they do not create separate grids. Saved in this browser only.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className={styles.primary} onClick={onSave}>Save layout</button>
        </div>
      </div>
      {(error || failure) && <p role="alert" className={styles.error}>{error || failure}</p>}
      <p role="status" className={styles.status}>
        {message || (selected ? `Selected panel ${selected}. Drag to move or change its array. Keyboard: grid arrows and Enter.` : 'Drag a panel to arrange it. Keyboard: select a panel, then use grid arrows and Enter.')}
      </p>
      <div className={styles.arrayBar}>
        <label>Array for new panels
          <select value={groupId} onChange={(e) => setActiveArray(e.target.value)}>
            {!draft.arrays.length && <option value="">Add an array first</option>}
            {draft.arrays.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={addArray}>+ Add array</button>
      </div>
      <div className={styles.actions}>
        <button type="button" aria-label="Rotate next panels" aria-pressed={trayOrientation === 'landscape'} onClick={rotate}>
          Next panels: {trayOrientation === 'portrait' ? 'Portrait' : 'Landscape'} ↻
        </button>
        <span>Orientation locked until you change it.</span>
      </div>
      {selected && (
        <div className={styles.actions}>
          <span>{selected.slice(-6)}</span>
          {placed && <label>Panel array <select value={draft.arrays.find((a) => a.panels.some((p) => p.serial === selected))!.id}
            onChange={(e) => attempt(() => placePanel(draft, selected, { arrayId: e.target.value, column: placed.column, row: placed.row }, placed.orientation), 'Panel group changed. Position retained.')}>
            {draft.arrays.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>}
          <button type="button" onClick={() => place(selected, null)}>Return to unassigned</button>
          <button type="button" onClick={() => setSelected(null)}>Clear selection</button>
        </div>
      )}
      <section aria-label="Unassigned panels" data-tray className={styles.tray}>
        <h3>Unassigned panels <span>{available.length}</span></h3>
        <div className={styles.panels}>
          {available.map((serial) => <PanelTile
            key={serial} serial={serial} cumulative={energyTotals !== undefined} energyWh={energyTotals?.find((r) => r.serial === serial)?.whTotal} maxEnergyWh={maxEnergyWh} maxWatts={maxWatts} orientation={trayOrientation}
            reading={readings.find((r) => r.serial_number === serial)}
            editable selected={serial === selected} onSelect={select} hiddenDuringDrag={ghost?.serial === serial}
          />)}
        </div>
        {!available.length && <p>All known panels are assigned. Drag a panel here to unassign it.</p>}
      </section>
      {draft.arrays.map((array, index) => (
        <section key={array.id} className={styles.array}>
          <div className={styles.arrayBar}>
            <label>Array name {index + 1}
              <input value={array.name} maxLength={80} onChange={(e) => onChange({
                ...draft, arrays: draft.arrays.map((a) => a.id === array.id ? { ...a, name: e.target.value } : a),
              })} />
            </label>
            <span>{array.panels.length} panels</span>
            <button type="button" aria-label={`Remove array ${array.name}`}
              onClick={() => attempt(() => removeArray(draft, array.id), 'Array removed. Its panels are unassigned.')}>Remove array</button>
          </div>
        </section>
      ))}
      {!!draft.arrays.length && <>
        <div className={styles.arrayBar}>
          <label>Columns<input type="number" min={2} max={40} value={canvas.columns}
            onChange={(e) => attempt(() => resizeArray(draft, groupId, Number(e.target.value), canvas.rows), 'Grid resized.')} /></label>
          <label>Rows<input type="number" min={2} max={40} value={canvas.rows}
            onChange={(e) => attempt(() => resizeArray(draft, groupId, canvas.columns, Number(e.target.value)), 'Grid resized.')} /></label>
        </div>
        <PanelLayoutGrid array={canvas} groups={draft.arrays} energyTotals={energyTotals} readings={readings} editable selectedSerial={selected}
          onSelect={select} onPlace={place} onClear={() => setSelected(null)}
          draggedSerial={ghost?.serial} preview={preview} previewValid={previewValid} previewOrientation={selected ? orientation(selected) : undefined} />
      </>}
      {ghost && <div data-drag-ghost className={styles.ghost} aria-hidden="true" style={{ left: ghost.x, top: ghost.y, width: ghost.width, height: ghost.height }}>
        <PanelTile serial={ghost.serial} cumulative={energyTotals !== undefined} energyWh={energyTotals?.find((r) => r.serial === ghost.serial)?.whTotal} maxEnergyWh={maxEnergyWh} maxWatts={maxWatts} orientation={orientation(ghost.serial)} reading={readings.find((r) => r.serial_number === ghost.serial)} editable={false} selected={false} onSelect={() => {}} />
      </div>}
    </div>
  );
}
