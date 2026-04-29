## 1. Hook: Add "today" time range

- [x] 1.1 Add `'today'` to the `TimeRange` union in `src/hooks/useTimeRange.ts`
- [x] 1.2 Implement `computeBounds('today')` — returns `{ start: local midnight Unix, end: now }`
- [x] 1.3 Add `RANGE_LIMITS['today'] = 96` in `useTimeRange.ts`

## 2. EnergyChart: Today selector and date label

- [x] 2.1 Add `'today'` to the `RANGES` array in `EnergyChart.tsx`
- [x] 2.2 Implement `formatDateLabel(range, start, end)` helper that returns the subtitle string per design D5
- [x] 2.3 Render the date subtitle below the "energy flow" `<h2>` in the chart JSX

## 3. EnergyChart: Sparse X-axis ticks

- [x] 3.1 Define `MAX_TICKS` per range (`{ '24h': 6, 'today': 6, '7d': 7, '30d': 8 }`) in `EnergyChart.tsx`
- [x] 3.2 Compute `xInterval = Math.max(0, Math.ceil(displayData.length / MAX_TICKS[range]) - 1)` 
- [x] 3.3 Pass `interval={xInterval}` to both Area chart and Bar chart `<XAxis>`

## 4. EnergyChart: Y-axis absolute-value integer formatter

- [x] 4.1 Define `yTickFormatter = (v: number) => String(Math.abs(Math.round(v)))` in `EnergyChart.tsx`
- [x] 4.2 Pass `tickFormatter={yTickFormatter}` to both Area and Bar chart `<YAxis>`

## 5. EnergyChart: Tooltip Wh to 2 decimal places

- [x] 5.1 Update tooltip `formatter` in both AreaChart and BarChart to use `display.toFixed(2)` instead of raw `display`

## 6. Formatter utility: Update toWh

- [x] 6.1 Update `toWh` in `src/utils/formatters.ts` to return `~${wh.toFixed(2)} Wh` instead of `~${Math.round(wh)} Wh`
- [x] 6.2 Update the `toWh` unit test in `src/test/` to expect the new `.2f` format

## 7. Verification

- [x] 7.1 Run `npm run typecheck` — zero errors
- [x] 7.2 Run `npm test` — all tests pass
- [x] 7.3 Run `npm run lint` — zero warnings
- [x] 7.4 Start dev server and visually verify: today button, date label, sparse x-ticks, non-negative y-ticks, 2-decimal tooltip values
