import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { InverterItem } from '@/api/types';
import { maxPanelWatts, panelSize, type PanelArray, type PanelOrientation, type PanelTarget } from '@/utils/panelLayout';
import { toEnergy } from '@/utils/dailySummary';
import type { DailyTotalRow } from '@/utils/inverterDailyTotals';
import styles from './PanelLayoutGrid.module.css';

interface TileProps {
  serial: string;
  orientation: PanelOrientation;
  reading?: InverterItem;
  editable: boolean;
  selected: boolean;
  onSelect(serial: string): void;
  style?: CSSProperties;
  target?: PanelTarget;
  tabIndex?: number;
  groupName?: string;
  hiddenDuringDrag?: boolean;
  maxWatts?: number;
  energyWh?: number;
  cumulative?: boolean;
  maxEnergyWh?: number;
}

export function PanelTile({ serial, orientation, reading, editable, selected, onSelect, style, target, tabIndex, groupName, hiddenDuringDrag, maxWatts = 0, energyWh, cumulative = false, maxEnergyWh = 0 }: TileProps) {
  const value = cumulative ? energyWh : reading?.watts_output;
  const maximum = cumulative ? maxEnergyWh : maxWatts;
  const hasOutput = value !== undefined && Number.isFinite(value) && (cumulative || !!reading?.is_online);
  const output = hasOutput && maximum > 0 ? Math.min(1, Math.max(0, value! / maximum)) : 0;
  const amount = cumulative ? (energyWh === undefined ? 'Unavailable' : toEnergy(energyWh)) : reading ? `${reading.watts_output.toFixed(0)} W` : 'Unavailable';
  const tileStyle = { ...style, '--panel-output': `${output * 100}%` } as CSSProperties;
  const content = <>
    <span data-solar-cells className={styles.solarCells} aria-hidden="true" />
    <span className={styles.caption}>
    <span className={styles.serial}>{serial.slice(-6)}</span>
    <strong>{amount}</strong>
    {groupName && <span className={styles.group}>{groupName}</span>}
    {reading && !reading.is_online && <span>Offline</span>}
    </span>
  </>;
  const className = `${styles.tile} ${orientation === 'landscape' ? styles.landscape : ''} ${selected ? styles.selected : ''}`;
  if (!editable) {
    const details = cumulative
      ? `${energyWh === undefined ? 'energy unavailable' : `${toEnergy(energyWh)} produced`}, ${reading ? reading.is_online ? 'online' : 'offline' : 'status unavailable'}`
      : reading
      ? `${reading.watts_output.toFixed(0)} watts, ${reading.is_online ? 'online' : 'offline'}`
      : 'reading unavailable';
    return <div className={className} style={tileStyle} data-output={hasOutput || undefined} title={serial} aria-label={`Panel ${serial}, ${details}`}>{content}</div>;
  }
  return (
    <button
      type="button" className={className} style={tileStyle} data-output={hasOutput || undefined} tabIndex={tabIndex}
      data-orientation={orientation} data-panel={serial} data-drag={serial} data-drag-source={hiddenDuringDrag || undefined}
      data-array={target?.arrayId} data-column={target?.column} data-row={target?.row}
      aria-label={`Select panel ${serial}`} aria-pressed={selected}
      onClick={() => onSelect(serial)} title={serial}
    >
      {content}
      <span data-drag={serial} className={styles.handle} aria-hidden="true">⠿</span>
    </button>
  );
}

interface Props {
  array: PanelArray;
  groups?: readonly PanelArray[];
  draggedSerial?: string;
  energyTotals?: readonly DailyTotalRow[];
  readings: readonly InverterItem[];
  editable: boolean;
  selectedSerial: string | null;
  onSelect(serial: string): void;
  onPlace(serial: string, target: PanelTarget): void;
  onClear?(): void;
  preview?: PanelTarget;
  previewValid?: boolean;
  previewOrientation?: PanelOrientation;
}

export function PanelLayoutGrid({ array, groups, draggedSerial, energyTotals, readings, editable, selectedSerial, onSelect, onPlace, onClear, preview, previewValid, previewOrientation }: Props) {
  const maxWatts = maxPanelWatts(readings);
  const maxEnergyWh = Math.max(0, ...(energyTotals?.map((r) => r.whTotal) ?? []));
  const id = useId();
  const grid = useRef<HTMLDivElement>(null);
  const [position, setCursor] = useState({ column: 0, row: 0 });
  const columns = editable ? array.columns : Math.max(2, ...array.panels.map((p) => p.column + panelSize(p.orientation).columns));
  const rows = editable ? array.rows : Math.max(2, ...array.panels.map((p) => p.row + panelSize(p.orientation).rows));
  const cursor = { column: Math.min(position.column, columns - 1), row: Math.min(position.row, rows - 1) };
  const activeId = `${id}-${cursor.row}-${cursor.column}`;
  useEffect(() => {
    const cell = document.getElementById(activeId);
    if (editable && cell?.closest('[role=grid]') === document.activeElement) {
      cell.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeId, editable]);

  function panelAt(column: number, row: number) {
    return array.panels.find((panel) => {
      const size = panelSize(panel.orientation);
      return column >= panel.column && column < panel.column + size.columns
        && row >= panel.row && row < panel.row + size.rows;
    });
  }
  function activate(column: number, row: number) {
    setCursor({ column, row });
    grid.current?.focus();
    if (selectedSerial) {
      onPlace(selectedSerial, { arrayId: array.id, column, row });
    } else {
      const panel = panelAt(column, row);
      if (panel) onSelect(panel.serial);
    }
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Escape') { onClear?.(); return; }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(cursor.column, cursor.row);
      return;
    }
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const delta = offsets[event.key];
    if (!delta) return;
    event.preventDefault();
    setCursor({
      column: Math.max(0, Math.min(columns - 1, cursor.column + delta[0])),
      row: Math.max(0, Math.min(rows - 1, cursor.row + delta[1])),
    });
  }
  const selected = array.panels.find((p) => p.serial === selectedSerial);
  const footprint = panelSize(previewOrientation ?? selected?.orientation ?? 'portrait');
  return (
    <div className={`${styles.scroller} ${editable ? '' : styles.fitted}`} role="region" aria-label={`${array.name} layout`}>
      <div
        ref={grid} className={styles.grid} role={editable ? 'grid' : undefined}
        aria-label={editable ? `${array.name} panel grid` : undefined}
        tabIndex={editable ? 0 : undefined} aria-activedescendant={editable ? activeId : undefined}
        onKeyDown={editable ? keyDown : undefined}
        style={{ '--panel-columns': columns, gridTemplateColumns: `repeat(${columns}, var(--panel-cell))`, gridTemplateRows: `repeat(${rows}, var(--panel-cell))` } as CSSProperties}
      >
        {editable && Array.from({ length: rows }, (_, row) => (
          <div role="row" className={styles.gridRow} key={row}>
            {Array.from({ length: columns }, (_, column) => {
              const panel = panelAt(column, row);
              const active = cursor.column === column && cursor.row === row;
              return (
                <button
                  type="button" role="gridcell" key={column} id={`${id}-${row}-${column}`} tabIndex={-1}
                  className={`${styles.cell} ${active ? styles.cursor : ''}`} aria-selected={active}
                  aria-label={`Row ${row + 1}, column ${column + 1}, ${panel ? `panel ${panel.serial}` : 'empty'}`}
                  data-array={array.id} data-column={column} data-row={row}
                  onClick={() => { setCursor({ column, row }); grid.current?.focus(); }} style={{ gridColumn: column + 1, gridRow: row + 1 }}
                />
              );
            })}
          </div>
        ))}
        {array.panels.map((panel) => {
          const size = panelSize(panel.orientation);
          return <PanelTile
            key={panel.serial} serial={panel.serial} orientation={panel.orientation}
            reading={readings.find((r) => r.serial_number === panel.serial)}
            cumulative={energyTotals !== undefined} energyWh={energyTotals?.find((r) => r.serial === panel.serial)?.whTotal} maxEnergyWh={maxEnergyWh}
            maxWatts={maxWatts} hiddenDuringDrag={draggedSerial === panel.serial}
            groupName={groups?.find((a) => a.panels.some((p) => p.serial === panel.serial))?.name}
            target={{ arrayId: array.id, column: panel.column, row: panel.row }}
            tabIndex={editable ? -1 : undefined} editable={editable}
            selected={panel.serial === selectedSerial} onSelect={(serial) => {
              setCursor({ column: panel.column, row: panel.row });
              grid.current?.focus();
              onSelect(serial);
            }}
            style={{ gridColumn: `${panel.column + 1} / span ${size.columns}`, gridRow: `${panel.row + 1} / span ${size.rows}` }}
          />;
        })}
        {preview?.arrayId === array.id && (
          <div
            data-preview className={`${styles.preview} ${previewValid ? styles.valid : styles.invalid}`}
            style={{ gridColumn: `${preview.column + 1} / span ${footprint.columns}`, gridRow: `${preview.row + 1} / span ${footprint.rows}` }}
          />
        )}
      </div>
      <div className={styles.outputLegend} aria-label="Panel output color scale">
        <span>{energyTotals ? 'Estimated energy' : 'Live output'}</span><span>{energyTotals ? '0 Wh' : '0 W'}</span><span className={styles.outputRamp} aria-hidden="true" /><span>{energyTotals ? toEnergy(maxEnergyWh) : `${maxWatts.toFixed(0)} W`}</span>
        <span>{energyTotals ? 'Relative to highest period total · gray = missing energy data' : 'Relative to highest reporting panel · gray = unavailable/offline'}</span>
      </div>
    </div>
  );
}
