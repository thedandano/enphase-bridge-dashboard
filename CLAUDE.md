# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Vite dev server (proxies /api/ to BRIDGE_API_URL)
npm run build        # tsc -b && vite build
npm run typecheck    # type-check without emitting
npm run lint         # eslint (zero warnings policy)
npm test             # vitest run (single pass)
npm run test:watch   # vitest in watch mode

# Run a single test file
npx vitest run src/test/formatUptime.test.ts
```

**Git hooks** (husky):
- Pre-commit: `lint-staged` — runs eslint + tsc on staged `.ts`/`.tsx` files
- Pre-push: `npm run typecheck` + `TZ=UTC npm test`

**CI** (`.github/workflows/ci.yml`): lint → typecheck → build → test → docker build + image size ≤ 100 MB.

## Architecture

This is a pure-frontend React 19 / TypeScript SPA built with Vite. There is no backend in this repo — all data comes from [`enphase-bridge`](https://github.com/thedandano/enphase-bridge), a separate Go daemon that exposes a REST API.

### Path alias

`@` resolves to `./src` (configured in `vite.config.ts` and `tsconfig.app.json`).

### API layer (`src/api/`)

- `client.ts` — `apiFetch<T>(path)`: thin fetch wrapper. Throws `ApiError` (with `.status` and `.code`) on non-2xx or network failure. All requests go to `/api/<path>` (nginx proxies these to `BRIDGE_API_URL` at runtime).
- `types.ts` — all shared TypeScript interfaces. **All timestamp fields are Unix epoch integers (`number`), never `Date` or string.** Keep this invariant.
- Individual modules (`energy.ts`, `health.ts`, `inverters.ts`, `tou.ts`, `time.ts`) each export one or two thin wrappers around `apiFetch`.

### Data-fetching pattern

Each component fetches its own data via `useAutoRefresh<T>(fetchFn)` from `src/hooks/useAutoRefresh.ts`:

- Base interval: 30 s; backs off exponentially up to 120 s on consecutive errors.
- Pauses while the browser tab is hidden; re-fetches and restarts the clock on tab visibility restore.
- Returns `{ data, error, secondsUntilRefresh }`.

`useTimeRange` (`src/hooks/useTimeRange.ts`) manages the `today / 24h / 7d / 30d` window selector and computes `{ start, end, limit }` as Unix epoch bounds. The `'today'` range (midnight→now, limit 96) recomputes `start/end` on every render; the other ranges snapshot bounds at selection time.

`ChartPanel` owns the shared selected range plus day navigation for `today`. When viewing `today` or a previous day through the arrow controls, Energy Flow receives the real fetch `end` plus a separate `displayEnd` so it can render a full midnight-to-midnight x-axis without fetching future windows.

### Dashboard layout and display preferences

`App` renders `Header`, optional first-run banner, optional `FlowStrip`, `ChartPanel`, and optional `ArrayHealthPanel`.

`DisplayPrefsProvider` persists tablet mode and section visibility in `localStorage`. `SettingsPanel` can toggle:

- Flow Strip
- Energy Chart
- Inverter Performance
- Array Health
- True-up
- Inverter Heatmap

`ChartPanel` pairs charts when both sides are visible:

- Energy Flow beside Inverter Heatmap.
- Inverter Performance beside True-up.

### Inverter diagnostics

`InverterDailyTotals` summarizes per-inverter performance for the selected time range, comparing each inverter to the period median and leader. It highlights rows below 90% of the period leader and uses compact deviation dots with off-scale markers.

`InverterHeatmap` fetches all snapshot pages for the selected range up to its cap. It has two modes:

- `dayShape`: aggregates every inverter in place by local 15-minute x/y slot, producing one 96-column daily profile across the selected period.
- `seasonal`: aggregates every inverter by local calendar day, producing a day-by-day view for seasonal or multi-day comparison.

Both modes keep the same visual treatment and include a centered Low-to-Peak legend below the x-axis.

### EnergyChart rendering invariants

`wh_consumed` and `wh_grid_export` are **negated** by `toDisplayData()` before being passed to Recharts, so they render below the zero axis in the mirrored stacked chart. The tooltip formatter un-negates these for display. The Y-axis domain is `[-maxWh, maxWh]` with symmetric nice-step ticks; `tickFormatter` calls `Math.abs` so no negative labels appear.

The Area/Bar chart style toggle is local to Energy Flow and persists to `localStorage` under `energyChart.style`.

Energy Flow uses theme signal colors for production and consumption. Production uses `var(--signal-production)` and consumption uses `var(--signal-consumption)`.

### Utilities (`src/utils/`)

- `formatters.ts` — `toKw`, `toWh`, `formatUptime`, `tokenStatus`, `badgeColor`, `formatDateLabel`, `toDisplayData`
- `dailySummary.ts` — `computeDailySummary(windows)` (sums energy fields across windows), `toEnergy(wh)` (formats as kWh when ≥ 1000, else whole Wh)
- `heatmapTransform.ts` — `buildHeatmapRows` for day-shape aggregation and `buildSeasonalHeatmapRows` for day-level aggregation
- `inverterDailyTotals.ts` — per-inverter Wh totals, median helpers, and display formatting
- `inverterColors.ts` / `spectrumColor.ts` — shared color helpers for inverter visuals

### Styling

CSS Modules (`.module.css` per component) + CSS custom properties defined globally in `src/styles/theme.css`. Use existing `var(--...)` tokens rather than hard-coded colours.

### Tests (`src/test/`)

Unit tests cover pure helpers and hooks. Test files are one-to-one with the thing under test:

| Test file | Covers |
|---|---|
| `kWConversion.test.ts` | `toKw`, `toWh` |
| `formatUptime.test.ts` | `formatUptime` |
| `tokenStatus.test.ts` | `tokenStatus` |
| `onlineBadgeColor.test.ts` | `badgeColor` |
| `formatDateLabel.test.ts` | `formatDateLabel` |
| `energyChartTransform.test.ts` | `toDisplayData` |
| `computeDailySummary.test.ts` | `computeDailySummary`, `toEnergy` |
| `displayPrefsContext.test.tsx` | display preference persistence helpers |
| `useTimeRange.test.ts` | `useTimeRange` hook |
| `useAutoRefresh.test.ts` | auto-refresh timing, retry, and visibility behavior |
| `fetchTodayWindows.test.ts` | today-window fetch behavior |
| `header.test.tsx` | header status and first-run behavior |
| `settingsPanel.test.tsx` | settings toggles |
| `appLayout.test.tsx` | dashboard layout visibility |
| `inverterDailyTotals.test.ts` | inverter total/median helpers |
| `inverterHeatmap.test.ts` | heatmap aggregation helpers |
| `spectrumColor.test.ts` | heatmap color scale |
| `trueupPanel.test.tsx` | true-up panel behavior |
| `smoke.test.tsx` | render smoke tests (fetch stubbed to never-resolve) |

Vitest runs in `jsdom` with `@testing-library/react`; setup file is `src/test/setup.ts`. Tests that depend on date formatting run under `TZ=UTC` (enforced by the pre-push hook and CI).

### Docker / nginx

Multi-stage Dockerfile: `node:20-alpine` builder → `nginx:alpine` runtime. `nginx.conf.template` is rendered at container start by `docker-entrypoint.sh` via `envsubst`, substituting only `${BRIDGE_API_URL}` and `${AUTH_LINE}` (all nginx `$vars` are left intact to avoid conflicts). `BRIDGE_API_KEY`, if set, becomes a `Bearer` authorization header injected into every proxy request. `POST /api/tou/refresh` is rate-limited to 1 req/min per IP.
