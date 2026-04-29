## Why

The EnergyChart and InverterChart are logically coupled — the inverter drill-down is triggered by clicking an energy window — yet they live at opposite ends of the page with separate, duplicated range controls. Moving them into a shared container with unified controls (time range + chart style) reduces visual fragmentation and makes the drill-down flow feel cohesive.

## What Changes

- **New**: `ChartPanel` container component renders EnergyChart stacked above InverterChart, sharing a single set of controls
- **New**: Unified control bar: `[today | 24h | 7d | 30d]` time-range selector + `[area | bar]` style toggle — lifted out of EnergyChart into ChartPanel
- **Modified**: EnergyChart strips its own control bar; receives `range`, `start`, `end`, `limit`, and `chartStyle` as props
- **Modified**: InverterChart's internal day-navigation (prev/next arrows) is replaced; receives `range`, `start`, `end` from ChartPanel to drive overview mode
- **Layout change**: App order becomes `TodaySummary → RightNowSection → ChartPanel → [ArrayHealthPanel | TrueupPanel]`

## Capabilities

### New Capabilities

- `unified-chart-panel`: Shared container rendering EnergyChart + InverterChart with a single time-range selector and chart-style toggle

### Modified Capabilities

- `inverter-chart`: Day navigation removed; overview mode driven by shared `range/start/end` props from ChartPanel instead of internal `daysBack` state

## Impact

- `src/components/EnergyChart.tsx` — props added (`range`, `start`, `end`, `limit`, `chartStyle`, `onChartStyleChange`); internal `useTimeRange`, style toggle, and control bar removed
- `src/components/InverterChart.tsx` — `daysBack` / prev-next navigation removed; `range`, `start`, `end` props added for overview mode
- `src/App.tsx` — `<EnergyChart>` and `<InverterChart>` replaced with `<ChartPanel>`; `selectedWindowTs` / `onWindowSelect` remain on App
- `src/hooks/useTimeRange.ts` — no changes; ChartPanel uses it internally
- New file: `src/components/ChartPanel.tsx` + `ChartPanel.module.css`
- No API changes; no new dependencies
