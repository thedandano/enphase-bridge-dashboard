## Why

Three related bugs degrade the energy chart UX: changing the time range doesn't immediately fetch new data (users wait up to 30 s for stale data to update), `TodaySummary` computes "today" from UTC midnight while `EnergyChart` uses local midnight (silently diverging totals), and shared fetch limits are scattered as magic numbers instead of one authoritative constant.

## What Changes

- `useAutoRefresh` (or callers) triggers an immediate re-fetch when the fetch function changes, so range switches show data instantly.
- `fetchTodayWindows` is updated to use local midnight (matching `localMidnightUnix()`) and the shared `RANGE_LIMITS['today']` constant instead of the hardcoded `1000`.
- `RANGE_LIMITS` (already in `useTimeRange.ts`) becomes the single source of truth for all per-range fetch limits; magic numbers are removed from `fetchTodayWindows` and any other callsite.

## Capabilities

### New Capabilities

- `range-change-refetch`: `useAutoRefresh` immediately re-fetches when the bound fetch function changes identity (i.e., when the user selects a new time range).

### Modified Capabilities

- `energy-chart-today-selector`: The "today" range now shares a single midnight computation and limit constant across both `EnergyChart` and `TodaySummary`; the two components no longer silently diverge.
- `today-summary`: `fetchTodayWindows` switches from UTC midnight + hardcoded limit to local midnight + `RANGE_LIMITS['today']`.

## Impact

- `src/hooks/useAutoRefresh.ts` — new re-fetch trigger on `fetchFn` identity change
- `src/hooks/useTimeRange.ts` — `RANGE_LIMITS` and `localMidnightUnix` exported (already exported; no change needed if callers import them)
- `src/api/energy.ts` — `fetchTodayWindows` fixed to use `localMidnightUnix()` and `RANGE_LIMITS['today']`
- `src/components/EnergyChart.tsx` — no logic change; benefits automatically from `useAutoRefresh` fix
- `src/test/` — new or updated tests for re-fetch behaviour and midnight alignment
