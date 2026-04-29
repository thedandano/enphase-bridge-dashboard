## 1. Create InverterChart component

- [x] 1.1 Create `src/components/InverterChart.tsx` — scaffold with `Props` interface (`selectedWindowTs`, `onClearWindow`, `onWindowSelect`) and empty export
- [x] 1.2 Add color palette constant (array of hex strings, same style as `EnergyChart` series colors)
- [x] 1.3 Implement `reshapeSnapshots` pure function: flat `SnapshotItem[]` → `{ windowStart: number, [serial: string]: number }[]` grouped by `window_start`
- [x] 1.4 Implement `computeDailyWh` pure function: `SnapshotItem[]` → `Record<serial, totalWh>` using `watts × (15/60)` per window
- [x] 1.5 Wire `useAutoRefresh(fetchSnapshots)` + `useTimeRange` to drive the chart data
- [x] 1.6 Render Recharts `BarChart` / `ResponsiveContainer` with `XAxis` (formatted timestamps), `YAxis` (W label), `Tooltip`, and one `Bar` per unique serial
- [x] 1.7 Apply offline inverter muted opacity via `Cell` component on bars where `is_online: false`
- [x] 1.8 Implement bar click handler calling `onWindowSelect(windowStart)`
- [x] 1.9 Add serial filter `<input>` that filters both chart bars and legend entries (case-insensitive substring)
- [x] 1.10 Add legend section beneath chart showing `serial: totalWh Wh` per inverter
- [x] 1.11 Handle loading state (`data === null`) and empty state (`snapshots.length === 0`) with appropriate messages

## 2. Create InverterChart CSS module

- [x] 2.1 Create `src/components/InverterChart.module.css` with styles for: container, toolbar, heading, filter input, legend grid, legend item, empty/loading states
- [x] 2.2 Use existing `var(--...)` CSS custom properties from `src/styles/theme.css` — no hard-coded colours

## 3. Wire into App

- [x] 3.1 In `src/App.tsx`, replace `import { InverterTable }` with `import { InverterChart }`
- [x] 3.2 Replace `<InverterTable ...>` JSX with `<InverterChart ...>` passing the same props

## 4. Update tests

- [x] 4.1 In `src/test/smoke.test.tsx`, replace the `InverterTable` smoke render with `InverterChart` (stub `fetch` to a never-resolving promise, assert no throw)

## 5. Remove old component

- [x] 5.1 Delete `src/components/InverterTable.tsx`
- [x] 5.2 Delete `src/components/InverterTable.module.css`

## 6. Verify

- [x] 6.1 Run `npm run typecheck` — no type errors
- [x] 6.2 Run `npm run lint` — zero warnings
- [x] 6.3 Run `npm test` — all tests pass
- [x] 6.4 Run `npm run dev` and visually confirm chart renders with real data, filter works, tooltip shows, and bar click triggers drill-down
