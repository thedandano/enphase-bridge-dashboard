## 1. DisplayPrefsContext

- [x] 1.1 Create `src/context/DisplayPrefsContext.tsx` with `DisplayPrefsContext`, `DisplayPrefsProvider`, and `useDisplayPrefs` hook
- [x] 1.2 Implement localStorage read/write for `displayPrefs.tabletMode` and all six `displayPrefs.visible.*` keys, defaulting all to `true`
- [x] 1.3 Expose `{ tabletMode, toggleTabletMode, visibleComponents, toggleComponent }` from context
- [x] 1.4 Wrap `<App>` tree with `<DisplayPrefsProvider>` in `main.tsx` or `App.tsx`
- [x] 1.5 Write unit tests for context: default values, localStorage persistence, toggle functions

## 2. Settings Panel

- [x] 2.1 Create `src/components/SettingsPanel.tsx` with six visibility toggles (FlowStrip, EnergyChart, InverterChart, InverterDailyTotals, ArrayHealthPanel, TrueupPanel)
- [x] 2.2 Create `src/components/SettingsPanel.module.css`: positioned overlay below gear button, `z-index: 11`, styled with existing CSS tokens
- [x] 2.3 Add outside-click handler (`useEffect` + `document.addEventListener('mousedown', ...)`) to close panel when clicking outside
- [x] 2.4 Write smoke test for SettingsPanel: renders all six toggles, clicking a toggle calls `toggleComponent`

## 3. Header Buttons

- [x] 3.1 Add gear button (⚙) to `Header.tsx` that toggles `settingsOpen` local state, renders `<SettingsPanel>` when open
- [x] 3.2 Add tablet mode toggle button to `Header.tsx` that calls `toggleTabletMode()` from context; icon reflects tablet mode state (e.g. `⊞` active / `⊡` inactive)
- [x] 3.3 Update `Header.module.css`: flex layout accommodates two new right-aligned buttons; buttons use existing `var(--font-ui)` and `var(--border)` tokens
- [x] 3.4 Update `Header.tsx` tests to cover both new buttons render and click behaviour

## 4. Layout — Compact Mode + data-tablet Attribute

- [x] 4.1 Update `Layout.tsx` to accept an optional `tabletMode: boolean` prop and set `data-tablet="true"` on the root `<div>` when active
- [x] 4.2 Add compact CSS rules to `Layout.module.css` under `[data-tablet="true"]`: main padding ≤ 0.75rem, gap ≤ 0.5rem
- [x] 4.3 Pass `tabletMode` from `DisplayPrefsContext` into `<Layout>` in `App.tsx`

## 5. Fullscreen Integration

- [x] 5.1 Implement `requestFullscreen` / `exitFullscreen` calls in `toggleTabletMode` inside `DisplayPrefsContext`: guard with `document.fullscreenEnabled` check; handle promise rejection silently
- [x] 5.2 Add `fullscreenchange` event listener in `DisplayPrefsContext` to detect external fullscreen exit (Escape key); do NOT deactivate tablet mode, only update a separate `isFullscreen` flag if needed for the button icon
- [x] 5.3 Update the tablet toggle button in `Header.tsx` to show distinct icon when fullscreen is active vs when tablet mode is on but fullscreen unavailable/exited

## 6. App — Conditional Component Rendering

- [x] 6.1 In `App.tsx`, consume `visibleComponents` from `useDisplayPrefs`; conditionally render `<FlowStrip>`, `<ArrayHealthPanel>`, `<TrueupPanel>` based on flags
- [x] 6.2 Ensure the `twoCol` grid in `App.tsx` renders correctly when one or both of ArrayHealthPanel / TrueupPanel are hidden (single item should not leave an empty column)

## 7. ChartPanel — Conditional Charts + Side-by-Side Layout

- [x] 7.1 In `ChartPanel.tsx`, consume `visibleComponents` from `useDisplayPrefs`; conditionally render `<EnergyChart>`, `<InverterChart>`, `<InverterDailyTotals>`
- [x] 7.2 Add `[data-tablet="true"] @media (orientation: landscape)` rule to `ChartPanel.module.css`: chart row switches to `grid-template-columns: 1fr 1fr`
- [x] 7.3 Wrap EnergyChart and InverterChart in a shared `.chartRow` div in `ChartPanel.tsx` so the grid rule applies to both simultaneously
- [x] 7.4 Verify Recharts `ResponsiveContainer` reflows correctly in side-by-side columns (no explicit width override needed; `width="100%"` should work)

## 8. Tests & Verification

- [x] 8.1 Add/update smoke tests in `smoke.test.tsx` to cover: SettingsPanel renders, tablet toggle button present in Header, hidden component not in DOM
- [x] 8.2 Run `npm test` — all tests pass
- [x] 8.3 Run `npm run typecheck` — no errors
- [x] 8.4 Run `npm run lint` — no warnings
- [ ] 8.5 Manual verify on iPad mini (or browser devtools at 744×1133 portrait and 1133×744 landscape): tablet mode activates compact layout, landscape shows side-by-side charts, visibility toggles remove/restore components
