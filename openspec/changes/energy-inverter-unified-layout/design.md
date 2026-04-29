## Context

EnergyChart owns `useTimeRange` internally and renders its own control bar (`[today|24h|7d|30d]` + `[area|bar]`). InverterChart owns `daysBack` state and renders prev/next day navigation. Both charts display energy data over a time window but are positioned at opposite ends of the page, making the visual relationship between them opaque. The user clicks an energy window → InverterChart drills into that moment; the inverse flow (returning to overview) is navigated via InverterChart's own controls.

The project uses Dracula Pro dark theming (CSS custom properties), Barlow Condensed / Bebas Neue fonts, and CSS Modules per component.

## Goals / Non-Goals

**Goals:**
- Single `ChartPanel` component owns all shared state: `useTimeRange`, `chartStyle`, `selectedWindowTs`
- EnergyChart and InverterChart rendered stacked inside ChartPanel; one unified control bar above them
- App layout order: TodaySummary → RightNowSection → ChartPanel → [ArrayHealthPanel | TrueupPanel]
- InverterChart overview mode driven by ChartPanel's `range/start/end`; its internal `daysBack` state removed
- `chartStyle` (`area | bar`) applies to both charts; persists to `localStorage` as before

**Non-Goals:**
- Changing the API, data model, or fetch logic
- Redesigning individual chart internals (axes, tooltips, colors)
- Mobile/responsive layout changes
- Adding new time ranges

## Decisions

### D1: ChartPanel owns shared state; children receive props

ChartPanel calls `useTimeRange()` and holds `chartStyle` + `selectedWindowTs`. EnergyChart and InverterChart become controlled: they receive `range`, `start`, `end`, `limit`, `chartStyle`, and callbacks as props. This is the minimal change — no context or global store needed for two co-located children.

*Alternative considered*: React context for shared chart state. Rejected — adds indirection for a pair of sibling components that will always co-exist in ChartPanel.

### D2: InverterChart `daysBack` navigation removed; `range/start/end` props replace it

InverterChart overview mode currently uses `getDayBounds(daysBack)` for its own fetch. Under the unified layout, ChartPanel's `start/end` (from `useTimeRange`) serve the same purpose. Removing `daysBack` eliminates the duplicate state and the confusing prev/next navigation that clashes with the shared range selector.

The "today" range maps to `daysBack = 0` behavior exactly — it was the default. Users gain the ability to view 24h, 7d, 30d inverter data they couldn't access before.

*Breakage*: The `getDayBounds` function and `dayLabel` helper inside `InverterChart.tsx` become dead code and are removed.

### D3: Control bar visual design

The shared control bar sits flush at the top of ChartPanel, spanning its full width:

```
┌──────────────────────────────────────────────────────────────┐
│ [today] [24h] [7d] [30d]              [≋ area] [▬ bar]      │
├──────────────────────────────────────────────────────────────┤
│                    EnergyChart                               │
├──────────────────────────────────────────────────────────────┤
│                    InverterChart                             │
└──────────────────────────────────────────────────────────────┘
```

Range buttons: left-aligned pill group using `var(--bg-elevated)` background, `var(--purple)` accent for active state, `var(--font-ui)` typeface. Style toggle: right-aligned, same pill treatment. A subtle `var(--border)` separator sits between the control bar and EnergyChart.

Existing `styles.btn` / `styles.activeBtn` / `styles.controls` class names from `EnergyChart.module.css` are migrated verbatim to `ChartPanel.module.css` to preserve the visual identity without duplication.

### D4: EnergyChart prop interface extension

```ts
interface Props {
  range: TimeRange;
  start: number;
  end: number;
  limit: number;
  chartStyle: 'area' | 'bar';
  onWindowSelect: (windowStart: number) => void;
}
```

The `useTimeRange` call, `chartStyle` state, and the control bar JSX are deleted from `EnergyChart`. The `useAutoRefresh` dependency array uses `range` (the prop) instead of the hook-derived value — behavior is identical.

### D5: InverterChart prop interface extension

```ts
interface Props {
  range: TimeRange;
  start: number;
  end: number;
  selectedWindowTs: number | null;
  onClearWindow: () => void;
  onWindowSelect?: (windowTs: number) => void;
}
```

`daysBack` state and `getDayBounds` / `dayLabel` helpers removed. The toolbar with prev/next buttons removed. `useAutoRefresh` dependency array becomes `[start, end]` (stable references from ChartPanel).

## Risks / Trade-offs

- [Risk] Removing `daysBack` navigation eliminates "yesterday" / "2 days ago" quick access → Mitigation: `useTimeRange` already provides `today/24h` which covers the 95% case; if yesterday access is needed later it can be re-added as a calendar picker, separate from this change
- [Risk] `chartStyle` toggle now affects InverterChart's bar rendering — InverterChart is always a bar chart by design → Mitigation: InverterChart ignores `chartStyle`; the toggle only controls EnergyChart rendering. Label it clearly ("energy style") in the control bar

## Migration Plan

1. Create `ChartPanel.tsx` + `ChartPanel.module.css`
2. Modify `EnergyChart.tsx` — add props, remove internal state/controls
3. Modify `InverterChart.tsx` — replace `daysBack` with `range/start/end` props
4. Modify `App.tsx` — swap `<EnergyChart>` + `<InverterChart>` for `<ChartPanel>`
5. Update all affected tests (smoke test, `useTimeRange` tests unaffected)
6. No rollback complexity — all changes are within the SPA; no API or persistent data changes

## Open Questions

- None — requirements are clear.
