## 1. Theme Tokens (darker-dracula-tokens)

- [x] 1.1 Update `--bg` from `#22212C` to `#16151E` in `src/styles/theme.css`
- [x] 1.2 Update `--bg-card` from `#3A3949` to `#1F1E2B` in `src/styles/theme.css`
- [x] 1.3 Update `--bg-elevated` from `#44435A` to `#2A2939` in `src/styles/theme.css`
- [x] 1.4 Update `--selection` from `#454158` to `#302F42` in `src/styles/theme.css`
- [x] 1.5 Check contrast of `--fg-muted` (`#7970A9`) against new `--bg-card` (`#1F1E2B`); lighten if contrast < 4.5:1

## 2. Right Now Section (right-now-section)

- [x] 2.1 Rename `src/components/LiveStats.tsx` → `src/components/RightNowSection.tsx` and update the export name
- [x] 2.2 Rename `src/components/LiveStats.module.css` → `src/components/RightNowSection.module.css`
- [x] 2.3 Add "Right now" badge markup above the stat card grid: a container with a `pulse-dot` span and the "Right now" label
- [x] 2.4 Add window time range display: format `window_start` and `window_start + 900` as "HH:MM AM/PM – HH:MM AM/PM" using `toLocaleTimeString`; hide when no data
- [x] 2.5 Add `@keyframes pulse` and `pulse-dot` styles in `RightNowSection.module.css` (scale + opacity, 2 s loop, green color)
- [x] 2.6 Update `src/App.tsx` import from `LiveStats` → `RightNowSection`
- [x] 2.7 Update smoke test in `src/test/smoke.test.tsx`: rename `LiveStats` render to `RightNowSection`

## 3. Today Summary (today-summary)

- [x] 3.1 Add `fetchTodayWindows()` to `src/api/energy.ts`: fetches all windows from UTC midnight today to now with `limit: 1000`
- [x] 3.2 Add `computeDailySummary(windows)` pure function to `src/utils/` that sums `wh_produced`, `wh_consumed`, `wh_grid_import`, `wh_grid_export` across all windows
- [x] 3.3 Create `src/components/TodaySummary.tsx`: uses `useAutoRefresh` with `fetchTodayWindows`, calls `computeDailySummary`, renders four `StatCard`s with the section eyebrow "Today"
- [x] 3.4 Create `src/components/TodaySummary.module.css`: section eyebrow styles, card grid matching `RightNowSection` layout
- [x] 3.5 Add `TodaySummary` to `src/App.tsx` as the first child of `<main>` (before `RightNowSection`)
- [x] 3.6 Add smoke render test for `TodaySummary` in `src/test/smoke.test.tsx`
- [x] 3.7 Add unit tests for `computeDailySummary` in `src/test/` (empty array, single window, multiple windows)

## 4. Verification

- [x] 4.1 Run `npm run lint` — zero warnings/errors
- [x] 4.2 Run `npm run typecheck` — no type errors
- [x] 4.3 Run `npm test` — all tests pass
- [x] 4.4 Start dev server (`npm run dev`), verify visual rendering: darker background, "Today" section at top, "Right now" pulse dot, window time range
- [ ] 4.5 Check CI passes (lint → typecheck → build → test → docker build ≤ 100 MB)
