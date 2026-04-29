## Context

The dashboard already uses Recharts (`^3.8.1`) for the `EnergyChart` area chart. `InverterTable` fetches data via `fetchSnapshots` (returns `SnapshotItem[]` — each has `window_start`, `serial_number`, `watts_output`, `is_online`) and supports a time-range selector and serial filter. The new component needs to reshape the same flat snapshot list into a grouped structure keyed by `window_start`, with one sub-entry per inverter serial.

## Goals / Non-Goals

**Goals:**
- Replace `InverterTable` with `InverterChart` — a grouped/stacked bar chart showing watts per inverter per 15-minute window.
- Show a per-inverter daily Wh total summary beneath the chart.
- Preserve the serial filter, time-range picker, and the existing drill-down flow (click bar → `onWindowSelect`).
- Keep existing `useAutoRefresh` + `useTimeRange` hooks unchanged.
- Cover `InverterChart` with a smoke render test.

**Non-Goals:**
- No new API endpoints — reuse `fetchSnapshots` as-is.
- No changes to `useAutoRefresh`, `useTimeRange`, or any shared hooks.
- No SSR, virtualization, or canvas rendering.

## Decisions

### D1 — Grouped BarChart (not stacked)
Stacked bars make it impossible to read individual inverter contributions at a glance. Grouped bars let the user compare inverters within the same window side-by-side.
- **Alternative considered**: Stacked — rejected because overlapping serials obscure individual output.
- **Alternative considered**: One chart per inverter — rejected because it breaks cross-inverter comparison.

### D2 — Color palette derived from serial index
Assign a fixed color per inverter by index into a palette array (same approach `EnergyChart` uses for its series). This is deterministic and requires no user configuration.

### D3 — Data reshape happens inside the component (no new hook)
`fetchSnapshots` returns a flat `SnapshotItem[]`. The component maps it to `{ windowStart, [serial]: watts }[]` inline. The transform is pure and fast enough for ≤ 200 items (the existing limit). A custom hook would be premature abstraction.

### D4 — Daily Wh summary in the legend
Each legend entry shows `{serial}: {totalWh} Wh today`. `totalWh` is the sum of `watts_output × (15/60)` across all windows for that serial. This piggybacks on the already-fetched data — no second fetch.

### D5 — Recharts `BarChart` with `Bar` per serial
Recharts renders one `<Bar dataKey={serial}>` per unique serial. The number of serials is small (≤ ~20 in a typical install) so this is fine.

## Risks / Trade-offs

- **Many inverters → crowded chart** → Mitigation: apply the existing serial filter to reduce visible serials; tooltip still shows exact values on hover.
- **Window count > 96 (> 24 h range)** → Mitigation: the `useTimeRange` limit cap already restricts data; x-axis tick density is controlled by Recharts interval auto-selection.
- **`is_online: false` inverters** → Show at 0 W with a visual indicator (muted color or strikethrough in legend) so offline state is visible without hiding the bar.

## Migration Plan

1. Add `InverterChart.tsx` + `InverterChart.module.css` alongside existing files.
2. Update `App.tsx` to import `InverterChart` in place of `InverterTable`.
3. Update `smoke.test.tsx` to render `InverterChart`.
4. Delete `InverterTable.tsx` and `InverterTable.module.css`.

Rollback: revert the four file changes above — no database migrations or API changes involved.
