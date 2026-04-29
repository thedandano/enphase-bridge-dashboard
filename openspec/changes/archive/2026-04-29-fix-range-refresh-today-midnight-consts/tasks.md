## 1. Fix `useAutoRefresh` — add `deps` parameter

- [x] 1.1 Add optional `deps: readonly unknown[]` parameter (default `[]`) to `useAutoRefresh` signature
- [x] 1.2 Spread `deps` into the main `useEffect` dependency array alongside `doFetch`, with `// eslint-disable-next-line react-hooks/exhaustive-deps` comment
- [x] 1.3 Update `useAutoRefresh` tests (or add new ones) to verify: no-deps call unchanged, deps-change triggers immediate re-fetch, countdown resets after deps-change fetch

## 2. Fix `fetchTodayWindows` — local midnight + shared limit

- [x] 2.1 Import `localMidnightUnix` and `RANGE_LIMITS` from `src/hooks/useTimeRange.ts` in `src/api/energy.ts`
- [x] 2.2 Replace `new Date(); midnight.setUTCHours(0,0,0,0)` with `localMidnightUnix()` in `fetchTodayWindows`
- [x] 2.3 Replace hardcoded `1000` limit with `RANGE_LIMITS['today']` in `fetchTodayWindows`

## 3. Wire `deps` into `EnergyChart`

- [x] 3.1 Pass `[range]` as the second argument to `useAutoRefresh` in `EnergyChart.tsx` so a range change immediately triggers a new fetch

## 4. Tests

- [x] 4.1 Add/update test for `fetchTodayWindows`: assert it calls `fetchWindows` with local midnight start and `RANGE_LIMITS['today']` as limit
- [x] 4.2 Add test for `useAutoRefresh` with `deps`: verify that changing a dep value causes an immediate re-fetch (spy on `fetchFn`)
- [x] 4.3 Confirm all existing tests still pass (`npm test`)
