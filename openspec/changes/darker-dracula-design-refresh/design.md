## Context

The dashboard is a pure-frontend React 19 / TypeScript SPA. All data comes from the `enphase-bridge` Go daemon via `/api/*`. The current component tree is: `App` → `Layout` → `Header | LiveStats | EnergyChart | ArrayHealthPanel | TrueupPanel | InverterChart`.

`LiveStats` fetches from `fetchLatestWindow()` (`GET /api/energy/windows/latest`) and shows the most-recent 15-min window as kW or Wh depending on completeness. There is no daily-summary section. A reference HTML dashboard provided by the user separates *today's totals* from *right-now data* and uses a pulsing dot for the live section.

Styling uses CSS Modules + a global `theme.css` with Dracula Pro tokens. Darkening the palette is a pure CSS change with no JS impact.

## Goals / Non-Goals

**Goals:**
- Introduce a `TodaySummary` component showing daily kWh totals at the top of the main content area
- Refactor `LiveStats` into `RightNowSection` with a pulsing dot, window time range, and "Right now" eyebrow label
- Darken the four `--bg*` token values in `theme.css` while leaving all signal colors unchanged
- Add a CSS `@keyframes` pulse animation for the live dot

**Non-Goals:**
- Changing the EnergyChart, TrueupPanel, InverterChart, or ArrayHealthPanel components
- Adding new API endpoints to the bridge (all data comes from existing endpoints)
- Changing the auto-refresh interval or backoff logic
- Modifying the nginx / Docker layer

## Decisions

### D1 — Compute today's totals on the frontend from `fetchWindows`, not a new endpoint

The reference HTML calls `/api/energy/summary/today`, which does not exist on the bridge. Options:
- **A) Aggregate on the frontend** using `fetchWindows(todayStart, now, 1000)` and summing `wh_*` fields — no backend change required.
- **B) Add a summary endpoint to the bridge** — out of scope for a frontend-only dashboard repo.

**Decision: Option A.** The window count for a single day is at most 96 (24h × 4 per hour), well within a single fetch. We add a `fetchTodayWindows()` helper in `energy.ts` and a `computeDailySummary()` pure function in `utils/`. No new API types needed.

### D2 — `LiveStats` → rename to `RightNowSection`, don't break existing logic

Rather than deleting `LiveStats`, we rename the file/component to `RightNowSection` and extend the JSX with the pulsing dot header. The underlying data-fetch and display logic (`useAutoRefresh`, `fetchLatestWindow`, `toKw`/`toWh`) is unchanged.

`StatCard` continues to be used inside `RightNowSection`. A new `now-badge` div with a `pulse-dot` span is added above the existing grid.

### D3 — Pulse animation via CSS keyframes in the component module, not in `theme.css`

The pulse is scoped to `RightNowSection.module.css` to avoid polluting the global token file. A simple `scale`+`opacity` keyframe at 2 s interval is sufficient.

### D4 — Darker background token values

| Token | Current | New |
|---|---|---|
| `--bg` | `#22212C` | `#16151E` |
| `--bg-card` | `#3A3949` | `#1F1E2B` |
| `--bg-elevated` | `#44435A` | `#2A2939` |
| `--selection` | `#454158` | `#302F42` |

All derived semantic aliases (`--border`, `--border-subtle`) reference `--fg` with alpha, so they auto-darken relative to the new background without changes.

### D5 — Layout order in `App.tsx`

New order: `TodaySummary` → `RightNowSection` → `EnergyChart` → `ArrayHealthPanel + TrueupPanel` → `InverterChart`. This mirrors the reference design (daily totals first, live data second).

## Risks / Trade-offs

- [Aggregation lag] `fetchTodayWindows` sums all windows since midnight local time; if the bridge uses UTC midnight it may include or exclude windows at day boundaries. → Mitigation: use the same UTC-based boundary the bridge uses; document in code.
- [Window completeness] Incomplete windows at day boundaries inflate or deflate totals by up to one window's worth (~15 min). → Acceptable; the existing LiveStats has the same caveat, and this mirrors how the reference HTML works.
- [Dark theme regression] Darkening cards may reduce contrast for muted text (`--fg-muted: #7970A9`) against `--bg-card: #1F1E2B`. → Check WCAG AA at implementation time and lighten `--fg-muted` if needed.
- [Rename churn] Renaming `LiveStats` → `RightNowSection` changes the import in `App.tsx` but nothing else; no public API is affected.

## Open Questions

- Does the bridge expose `GET /api/energy/summary/today`? If yes at implementation time, prefer it over aggregation (simpler, authoritative). Check the bridge OpenAPI spec or source before implementing `fetchTodayWindows`.
- Should `TodaySummary` use the same `useAutoRefresh` base interval (30 s) or a longer interval (60 s) since daily totals change slowly? Recommendation: 60 s, but defer to implementer.
