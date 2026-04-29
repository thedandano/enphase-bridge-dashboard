## Why

The current `InverterTable` displays raw snapshot rows in a table, making it hard to spot which inverters are underperforming across the day. Replacing it with a stacked/grouped bar chart gives an at-a-glance view of each inverter's watt output per 15-minute window and their daily energy total in one screen.

## What Changes

- **BREAKING** — Remove `InverterTable` component (and its CSS module) from the UI; replace with `InverterChart`.
- Add a new `InverterChart` component that renders a Recharts `BarChart` with one bar group per 15-minute window and one bar (color-coded) per inverter serial.
- Show cumulative daily Wh per inverter as a summary row / legend beneath the chart.
- Preserve the existing serial-filter input and the drill-down / back-to-snapshots flow (clicking a bar group shows per-inverter detail at that window).
- Reuse `fetchSnapshots` from `src/api/inverters.ts` — no new API endpoints needed.
- Keep `useAutoRefresh` and `useTimeRange` hooks unchanged.

## Capabilities

### New Capabilities

- `inverter-chart`: Grouped bar chart of inverter watt output in 15-minute windows for the selected time range, with per-inverter daily Wh totals shown in the legend/summary.

### Modified Capabilities

<!-- No existing spec-level behavior changes — this replaces a UI component only -->

## Impact

- **Removed**: `src/components/InverterTable.tsx`, `src/components/InverterTable.module.css`
- **Added**: `src/components/InverterChart.tsx`, `src/components/InverterChart.module.css`
- **Modified**: `src/App.tsx` — swap `InverterTable` import/usage for `InverterChart`
- **Dependencies**: Recharts (`^3.8.1`) already installed — no new packages required
- **Tests**: `src/test/smoke.test.tsx` — update smoke render test to cover `InverterChart`
