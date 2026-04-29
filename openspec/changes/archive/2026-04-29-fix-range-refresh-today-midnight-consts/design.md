## Context

The dashboard has three interrelated bugs:

1. **Stale range data** — `useAutoRefresh` fires once on mount then on a 30 s timer. It stores the latest `fetchFn` in a ref but never re-fetches when that function's closure changes (e.g. when the user picks a new time range). Switching ranges shows the previous range's data for up to 30 s.

2. **Midnight mismatch** — `fetchTodayWindows` in `energy.ts` computes "today's start" as UTC midnight (`setUTCHours(0,0,0,0)`), while `useTimeRange.localMidnightUnix()` (used by `EnergyChart`'s "today" range) uses local midnight (`setHours(0,0,0,0)`). Outside UTC the two functions return different timestamps, so `TodaySummary` and `EnergyChart` silently fetch different windows.

3. **Magic limit** — `fetchTodayWindows` hard-codes `limit: 1000`, disconnected from `RANGE_LIMITS['today'] = 96` in `useTimeRange.ts`. The true maximum for a 24 h day at 15-min resolution is 96 windows.

## Goals / Non-Goals

**Goals:**
- Changing the time range in `EnergyChart` triggers an immediate fetch so the chart updates without waiting for the next timer tick.
- `TodaySummary` and `EnergyChart`'s "today" range use the same local-midnight start.
- A single constant (`RANGE_LIMITS['today']`) drives the fetch limit for today across both components.

**Non-Goals:**
- Unifying the two components into a single fetch (they remain independent `useAutoRefresh` calls).
- Changing the 30 s base refresh interval or backoff logic.
- Adding per-component loading spinners or skeleton states.

## Decisions

### D1 — Add `deps` to `useAutoRefresh`

**Decision**: `useAutoRefresh` accepts an optional second argument `deps: readonly unknown[]` (default `[]`). These deps are spread into the main `useEffect`'s dependency array alongside the stable `doFetch`. When a dep changes the effect tears down and restarts, triggering an immediate fetch and resetting the countdown.

**Why over alternatives**:
- *Expose a `refetch()` handle*: callers must plumb the handle back out and call it in a separate `useEffect`; more boilerplate.
- *`useCallback` at callsite*: still doesn't trigger re-fetch because the ref pattern absorbs identity changes.
- *External reset counter in state*: adds state the hook doesn't own and complicates the call sites.

The `deps` array mirrors the familiar `useEffect` contract, keeps the hook self-contained, and requires a one-line change at each callsite.

**Callsite** (`EnergyChart.tsx`):
```ts
const { data } = useAutoRefresh(
  () => fetchWindows(start, end, limit),
  [range], // re-fetch immediately when range changes
);
```

### D2 — Fix `fetchTodayWindows` to use `localMidnightUnix` and `RANGE_LIMITS`

**Decision**: Import `localMidnightUnix` and `RANGE_LIMITS` from `useTimeRange.ts` and use them in `fetchTodayWindows`. No new constants file is needed; the values are already co-located in `useTimeRange.ts` and the import is a natural dependency.

**Why not a shared `constants.ts`**: `RANGE_LIMITS` is inherently range-logic and belongs next to `useTimeRange`. Moving it would split related concerns. A `constants.ts` becomes a grab-bag; prefer co-location.

### D3 — Scope of the `deps` lint disable

The `react-hooks/exhaustive-deps` rule flags spread in a deps array (`[doFetch, ...deps]`). A single targeted `// eslint-disable-next-line` comment on that line is acceptable because `deps` is explicitly forwarded by the caller — the contract mirrors `useEffect`.

## Risks / Trade-offs

- **Extra renders on mount**: The new effect fires once on mount (because `deps` initialises), then again if deps change. On mount this is a no-op (the main `useEffect` already fires the initial fetch). Adding a mount-guard (`isMounted` ref) would avoid the double-trigger but adds complexity; in practice the double-trigger causes only one extra HTTP call at the moment the range changes, which is the desired behaviour.
- **`RANGE_LIMITS` imported into `api/energy.ts`**: `energy.ts` (API layer) now imports from `hooks/useTimeRange.ts` (hook layer). This crosses the conventional layer boundary. Acceptable here because `RANGE_LIMITS` is pure data (no React), but if the boundary becomes a lint rule later the constant should be extracted to a `src/constants/ranges.ts`.
