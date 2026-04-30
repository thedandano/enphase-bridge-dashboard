## Why

The dashboard is designed for desktop browsers and has no fit-on-screen layout for tablets. Users who want to mount an iPad mini as a live energy display, or browse the dashboard on a tablet from the couch, must scroll through a page that exceeds the viewport — particularly in landscape orientation where vertical space is tightest.

## What Changes

- Add a **Tablet Mode toggle** button to the Header that enters browser fullscreen and activates a compact layout
- In landscape fullscreen, the EnergyChart and InverterChart render **side-by-side** instead of stacked, fitting the entire chart panel above the fold on iPad mini (1133×744)
- A compact CSS class reduces padding and gaps when fullscreen + landscape is detected
- Add a **Settings panel** (gear icon in Header) that lets users toggle individual components on/off
- Visibility preferences persist to `localStorage` and are shared between tablet and desktop sessions
- A `DisplayPrefsContext` provides mode state and visibility flags to all components

## Capabilities

### New Capabilities

- `tablet-mode`: Fullscreen toggle button in Header; compact layout class applied to root in fullscreen+landscape; side-by-side chart layout for EnergyChart and InverterChart when active
- `display-prefs`: Gear icon in Header opens a settings overlay with per-component visibility toggles (FlowStrip, EnergyChart, InverterChart, InverterDailyTotals, ArrayHealthPanel, TrueupPanel); state persisted to `localStorage`; exposed via `DisplayPrefsContext`

### Modified Capabilities

<!-- None — existing component behavior and data-fetching are unchanged -->

## Impact

- **Header** (`Header.tsx`, `Header.module.css`): gains two new icon buttons (tablet toggle, gear)
- **Layout** (`Layout.tsx`, `Layout.module.css`): receives a `compact` class when fullscreen+landscape
- **App** (`App.tsx`, `App.module.css`): reads visibility prefs from context; conditionally renders FlowStrip, ArrayHealthPanel, TrueupPanel
- **ChartPanel** (`ChartPanel.tsx`, `ChartPanel.module.css`): reads visibility prefs; side-by-side layout when tablet mode active
- **New files**: `src/context/DisplayPrefsContext.tsx`, `src/components/SettingsPanel.tsx` + `.module.css`
- **No API or data changes**
- **No breaking changes** — all toggles default to the current visible state; tablet mode is opt-in
