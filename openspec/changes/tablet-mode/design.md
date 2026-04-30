## Context

The dashboard is a React 19 / TypeScript SPA with CSS Modules. All layout is CSS — no existing JS-driven layout modes. Components already have responsive breakpoints at 768px and 480px. The `energyChart.style` key in `localStorage` is the only existing persisted UI preference, establishing the pattern to follow.

Target device: **iPad mini 6** — CSS viewport 744×1133 (portrait) and 1133×744 (landscape). Landscape is the binding constraint: 744px tall after header (~696px for content). The full current layout requires ~1285px in landscape; the design must bring this under ~696px when tablet mode is active.

iOS Safari does not support the Fullscreen API (`document.requestFullscreen` is undefined or throws). This is a known platform constraint — see Decision 3.

## Goals / Non-Goals

**Goals:**
- Explicit user-toggled tablet mode that compacts the layout and best-effort enters fullscreen
- Side-by-side EnergyChart + InverterChart when in tablet mode + landscape orientation
- Per-component visibility toggles (settings panel) persisted to `localStorage`
- Shared prefs across tablet and desktop — one preference set, no separate profiles
- Zero regressions on existing desktop layout

**Non-Goals:**
- Auto-detecting tablet and switching mode without user action
- Separate "tablet profile" vs "desktop profile" for visibility prefs
- PWA / Add-to-Home-Screen setup (out of scope; fullscreen fallback handles iOS)
- Changing any API, data-fetching, or chart rendering logic

## Decisions

### 1. DisplayPrefsContext for shared state

Visibility flags and tablet mode must reach two independent subtrees: `App` (controls FlowStrip, ArrayHealthPanel, TrueupPanel) and `ChartPanel` (controls EnergyChart, InverterChart, InverterDailyTotals). Prop-drilling through `Layout` would couple unrelated components.

**Decision**: A `DisplayPrefsContext` at the `App` root exposes `{ tabletMode, toggleTabletMode, visibleComponents, toggleComponent }`. All components read from context; `Header` and `SettingsPanel` write to it.

**Alternative considered**: Lift state to `App` and pass as props. Rejected — requires threading through `Layout` which has no concern for display prefs.

### 2. CSS data-attribute on root for layout mode

Tablet mode layout changes (compact padding, side-by-side charts) need to cascade to multiple components. Passing a `compact` prop to every component is verbose and couples them to the mode concept.

**Decision**: When tablet mode is active, set `data-tablet="true"` on the `Layout` root `<div>`. CSS selectors `[data-tablet="true"] .panel` etc. handle all visual changes within each component's own `.module.css`. No component needs to import or know about tablet mode — they just respond to the attribute via CSS.

**Alternative considered**: A global CSS class on `<body>` or `<html>`. Rejected — CSS Modules generate scoped class names; a global class on body can't target scoped selectors reliably without `:global()` hacks.

### 3. Fullscreen: best-effort with graceful degradation

iOS Safari does not implement the Fullscreen API. Requiring fullscreen would break the feature on the primary target device.

**Decision**: `toggleTabletMode` calls `document.documentElement.requestFullscreen()` only when `document.fullscreenEnabled` is true (Chrome/Firefox on desktop/Android). On iOS Safari it skips the API call silently — tablet mode still activates the compact layout and side-by-side charts. The toggle button icon reflects the actual `document.fullscreenElement` state rather than the JS mode flag, so it never shows "exit fullscreen" when fullscreen wasn't entered.

### 4. Side-by-side chart trigger: explicit mode + orientation media query

Auto-switching to side-by-side on any landscape viewport (even on desktop) would be surprising and potentially unwanted. But always showing side-by-side in tablet mode regardless of orientation is wrong in portrait (charts would be too narrow).

**Decision**: Side-by-side layout activates when `tabletMode === true` AND `window.matchMedia('(orientation: landscape)').matches`. Implemented as a CSS rule: `[data-tablet="true"] @media (orientation: landscape) { .chartRow { grid-template-columns: 1fr 1fr; } }`. A `useMediaQuery` hook or inline `window.matchMedia` check in `ChartPanel` can also drive a class, but the pure-CSS approach is preferred to avoid re-renders on orientation change.

**Alternative considered**: Always side-by-side in tablet mode. Rejected — in portrait at 744px wide, two 350px-wide charts are uncomfortably narrow.

### 5. Settings panel: positioned overlay, not drawer

The visibility toggle list is short (6 items). A full sidebar drawer adds unnecessary animation complexity and covers content. A small overlay anchored below the gear button (like a dropdown) is sufficient and matches patterns users recognize.

**Decision**: `SettingsPanel` is an absolutely-positioned `<div>` rendered inside `Header`'s stacking context, toggled by the gear button. It closes on outside click via a `useEffect` event listener. No animation library needed.

### 6. localStorage schema

```json
{
  "displayPrefs.tabletMode": false,
  "displayPrefs.visible.flowStrip": true,
  "displayPrefs.visible.energyChart": true,
  "displayPrefs.visible.inverterChart": true,
  "displayPrefs.visible.inverterTotals": true,
  "displayPrefs.visible.arrayHealth": true,
  "displayPrefs.visible.trueup": true
}
```

Individual keys (not a single JSON blob) so that adding a new toggle in the future doesn't require schema migration. Follows the existing `energyChart.style` pattern of flat string keys.

## Risks / Trade-offs

- **iOS Safari fullscreen gap** → Mitigated by Decision 3 (graceful degradation). The layout improvement still works; only the browser chrome persists.
- **Orientation change jank** → Side-by-side activates via CSS media query, so the transition is instant with no JS re-render. Recharts `ResponsiveContainer` reflows naturally.
- **Chart heights in side-by-side** → At 1133px landscape, each chart gets ~530px wide. Heights remain at 300/280px — sufficient. In portrait with tablet mode, charts stack normally so no height issue.
- **Settings overlay z-index conflicts** → Header has `z-index: 10`. The settings overlay needs `z-index: 11` or higher. No other stacking contexts in the current layout.
- **Hidden component + drilldown state** → If InverterChart is hidden and user has a window selected in EnergyChart, `selectedWindowTs` remains set in `ChartPanel` state. When InverterChart is re-shown it will render the drilldown view. This is acceptable — the selection persists as expected.

## Migration Plan

No data migration. No API changes. Feature is additive — all defaults match current behavior (all components visible, tablet mode off). Deploy is a standard frontend release.

Rollback: revert the JS bundle. localStorage keys are harmless if left behind.

## Open Questions

None — all decisions resolved during explore phase.
