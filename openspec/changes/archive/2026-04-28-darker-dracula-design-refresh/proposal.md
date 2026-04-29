## Why

The current dashboard shows live 15-minute window data well, but lacks a "Today" daily energy summary section and a clear visual separation between *right now* vs *today's totals*. A reference design was provided (plain HTML) that models this separation cleanly, with a pulsing live indicator and section eyebrow labels. We're also darkening the Dracula Pro palette — the current `--bg: #22212C` reads as medium-dark; user wants a deeper, near-black baseline to make the color signals pop harder.

## What Changes

- **New "Today" summary section** — four cards showing daily kWh totals (produced / consumed / exported / imported), computed by aggregating the windows array for the current UTC day via the existing `fetchWindows` API. If a `/api/energy/summary/today` endpoint exists on the bridge, use it instead.
- **"Right now" section refactor** — existing `LiveStats` becomes a dedicated *Right now* section with a pulsing green dot and window time label (e.g. "06:30 PM – 06:45 PM"), making it clear these are 15-min window values, not daily totals.
- **Section eyebrow labels** — "Today" and "Right now" section headers, matching the reference HTML's visual hierarchy.
- **Darker Dracula theme tokens** — shift `--bg` from `#22212C` → `#16151E`, `--bg-card` from `#3A3949` → `#1F1E2B`, `--bg-elevated` from `#44435A` → `#2A2939`, `--selection` from `#454158` → `#302F42`. All other signal colors (green, cyan, orange, red, purple) remain unchanged.
- **Pulse dot animation** — CSS keyframe on the "Right now" badge dot to visually reinforce live data.

## Capabilities

### New Capabilities
- `today-summary`: Daily energy totals section — aggregates today's windows into four kWh cards (produced, consumed, exported, imported). Shown at the top of the dashboard, above the EnergyChart.
- `right-now-section`: Refactored live-data section with pulse dot, window time range label, and "Right now" eyebrow. Replaces the raw `LiveStats` grid with a more intentional layout.
- `darker-dracula-tokens`: Updated CSS custom property values in `theme.css` to deepen the background palette. No component logic changes — pure CSS token update.

### Modified Capabilities
- `inverter-chart`: No requirement changes — implementation unchanged.

## Impact

- `src/styles/theme.css` — token values updated (non-breaking, affects all components)
- `src/components/LiveStats.tsx` + `LiveStats.module.css` — refactored to `RightNowSection`
- New `src/components/TodaySummary.tsx` + `TodaySummary.module.css`
- `src/App.tsx` — layout order updated, new component added
- `src/api/energy.ts` — may add `fetchTodaySummary()` if the endpoint exists, otherwise aggregates from `fetchWindows`
- `src/api/types.ts` — may add `SummaryResponse` type if endpoint is available
- No backend changes required (all computable from existing `/api/energy/windows`)
