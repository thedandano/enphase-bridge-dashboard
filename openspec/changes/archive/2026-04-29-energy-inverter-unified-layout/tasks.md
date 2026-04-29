## 1. Create ChartPanel Component

- [x] 1.1 Create `src/components/ChartPanel.tsx` with `useTimeRange`, `chartStyle` state, and `selectedWindowTs` state
- [x] 1.2 Create `src/components/ChartPanel.module.css` with control bar layout (range buttons left, style toggle right), panel container, and separator styles using existing CSS custom properties
- [x] 1.3 Render the unified control bar: `[today | 24h | 7d | 30d]` range buttons + `[area | bar]` style toggle
- [x] 1.4 Render `<EnergyChart>` and `<InverterChart>` stacked inside ChartPanel, passing shared props down

## 2. Modify EnergyChart

- [x] 2.1 Add props: `range: TimeRange`, `start: number`, `end: number`, `limit: number`, `chartStyle: 'area' | 'bar'` to `EnergyChart` Props interface
- [x] 2.2 Remove internal `useTimeRange()` call, `chartStyle` state, `localStorage` read, and the control bar JSX block from `EnergyChart`
- [x] 2.3 Update `useAutoRefresh` dependency array to use `range` prop instead of hook-derived value
- [x] 2.4 Update `computeXTicks` and `formatTick` calls to use `range` prop

## 3. Modify InverterChart

- [x] 3.1 Add props: `range: TimeRange`, `start: number`, `end: number` to `InverterChart` Props interface
- [x] 3.2 Remove `daysBack` state, `getDayBounds` function, `dayLabel` helper, and prev/next toolbar JSX
- [x] 3.3 Replace `getDayBounds(daysBack)` with the `start`/`end` props in the `useAutoRefresh` call
- [x] 3.4 Update `useAutoRefresh` dependency array to `[range]` (using `range` instead of `[start, end]` to avoid spurious refetches when `end` changes on 'today' range)

## 4. Update App

- [x] 4.1 Remove `<EnergyChart>` and `<InverterChart>` imports and JSX from `App.tsx`
- [x] 4.2 Remove `selectedWindowTs` / `setSelectedWindowTs` state from App (moved into ChartPanel)
- [x] 4.3 Add `<ChartPanel>` import and render it in place of the two removed components

## 5. Migrate CSS

- [x] 5.1 Move control bar styles (`.controls`, `.btn`, `.activeBtn`, `.styleToggle`, `.styleBtn`, `.styleBtnActive`) from `EnergyChart.module.css` to `ChartPanel.module.css`
- [x] 5.2 Remove now-unused class definitions from `EnergyChart.module.css`
- [x] 5.3 Remove now-unused class definitions from `InverterChart.module.css` (toolbar, dayLabel, controls, prev/next btn styles)

## 6. Update App Layout Order

- [x] 6.1 Verify `App.tsx` renders: `<TodaySummary>` → `<RightNowSection>` → `<ChartPanel>` → `<div className={styles.twoCol}>` (ArrayHealthPanel + TrueupPanel)

## 7. Fix Tests

- [x] 7.1 Update `src/test/smoke.test.tsx` — replace any `EnergyChart` / `InverterChart` direct render with `ChartPanel`, or stub `ChartPanel`'s fetch the same way
- [x] 7.2 Run `npm test` and confirm all tests pass
- [x] 7.3 Run `npm run typecheck` and confirm zero errors
- [x] 7.4 Run `npm run lint` and confirm zero warnings
