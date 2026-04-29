# Mirrored Energy Chart with Area/Bar Toggle

**Date:** 2026-04-28
**Status:** Approved

## Summary

Redesign `EnergyChart` so production and grid import appear above the x-axis (positive) and consumption and grid export appear below it (negative/mirrored). Add an `∿ Area / ▐ Bars` toggle so the user can switch between smooth area curves and discrete 15-min bar columns. Add a styled chart title. Fix the dashboard-wide font loading issue.

---

## 1. Data Transformation

The API returns all four `wh_*` fields as positive numbers. The component derives a display dataset — no API or hook changes needed.

```ts
const displayData = windows.map(w => ({
  ...w,
  wh_consumed:    -w.wh_consumed,
  wh_grid_export: -w.wh_grid_export,
}));
```

`wh_produced` and `wh_grid_import` remain positive. The Recharts Y-axis `domain` is set to `[-maxWh, maxWh]` where `maxWh` is derived from the actual window data:

```ts
const maxWh = Math.max(...windows.map(w =>
  Math.max(w.wh_produced + w.wh_grid_import, w.wh_consumed + w.wh_grid_export)
)) * 1.1; // 10% headroom
```

---

## 2. Chart Styles

### Area mode

Current `AreaChart` component, fed the derived dataset. Four `<Area>` series render as before but consumption and export curve downward. The zero line is visible at the midpoint of the Y-axis. This mode uses `type="monotone"` and the existing fill/stroke colors.

### Bar mode (default)

`BarChart` with two `stackId` groups:

| Series | stackId | Value | Color |
|---|---|---|---|
| `wh_produced` | `"pos"` | positive | `#8AFF80` |
| `wh_grid_import` | `"pos"` | positive | `#FF9580` |
| `wh_consumed` | `"neg"` | negative (already negated) | `#FFCA80` |
| `wh_grid_export` | `"neg"` | negative (already negated) | `#80FFEA` |

At 24h that's 96 bars (one per 15-min window). At 7d/30d the `limit` parameter from `useTimeRange` naturally reduces density — bars remain readable at all ranges.

---

## 3. Area / Bar Toggle

A segmented control sits **right-aligned** in the existing controls row, alongside `24h / 7d / 30d`.

```
[ 24h ][ 7d ][ 30d ]              [ ∿ Area | ▐ Bars ]
```

State: `chartStyle: 'area' | 'bar'`, local to `EnergyChart`. Default: `'bar'`.

Persisted to `localStorage` key `"energyChart.style"` so the preference survives page reload. Initialized on mount:

```ts
const [chartStyle, setChartStyle] = useState<'area' | 'bar'>(
  () => (localStorage.getItem('energyChart.style') as 'area' | 'bar') ?? 'bar'
);
```

On change, call `localStorage.setItem('energyChart.style', newStyle)`.

---

## 4. Chart Title

A centered `<h2>` rendered above the controls row:

```
energy flow
```

| Property | Value |
|---|---|
| Text | `energy flow` |
| Font | JetBrains Mono, weight 700 |
| Size | 1rem (16px) |
| Letter-spacing | 0.06em |
| Case | lowercase (no `text-transform`) |
| Color | `var(--text-primary)` |
| Alignment | `text-align: center` |

CSS class: `.title` in `EnergyChart.module.css`.

---

## 5. Typography Fixes (dashboard-wide)

### Root cause

`theme.css` references Bebas Neue, Barlow Condensed, and JetBrains Mono but `index.html` has no Google Fonts `<link>`. Every font-family declaration falls back to Impact / Arial Narrow / Courier New. This is the primary cause of readability problems across the dashboard.

### Fix: `index.html`

Add before `</head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

`<link>` is used (not `@import`) to avoid the render-blocking double-request penalty.

### Fix: `EnergyChart.tsx` axis props

| Property | Current | New |
|---|---|---|
| Tick color | `#7970A9` (3.7:1 contrast) | `#9281BB` (matches `--fg-muted`, 4.6:1, WCAG AA — use literal hex; Recharts SVG props don't resolve CSS variables) |
| Tick font size | 10–11px | 11px |
| Tick font family | unset (inherits SVG default) | `JetBrains Mono, monospace` |

Same treatment applied to `InverterChart.tsx` for consistency.

### Fix: `theme.css`

No new variable needed — title uses `JetBrains Mono` which is already declared as `--font-mono`.

---

## 6. Tooltip

The existing `<Tooltip>` continues to work in both modes. Add a `formatter` to un-negate consumption and export values so the tooltip reads `"Consumption: 320 Wh"` not `"-320 Wh"`:

```ts
formatter={(value: number, name: string) => {
  const display = ['Consumption', 'Grid export'].includes(name)
    ? Math.abs(value)
    : value;
  return [`${display} Wh`, name];
}}
```

---

## 7. Files Touched

| File | Change |
|---|---|
| `index.html` | Add Google Fonts `<link>` preconnect + stylesheet |
| `src/components/EnergyChart.tsx` | Derived dataset, `chartStyle` state + localStorage, conditional `AreaChart`/`BarChart`, title `<h2>`, segmented toggle, axis prop updates, tooltip formatter |
| `src/components/EnergyChart.module.css` | Add `.title`, `.styleToggle`, `.styleBtn`, `.styleBtnActive` |
| `src/components/InverterChart.tsx` | Axis tick size → 11px, color → `var(--fg-muted)`, font → `JetBrains Mono` |

**Not touched:** API layer, hooks, types, any other component.

---

## 8. Tests

- Smoke test in `smoke.test.tsx` already renders `EnergyChart` with a never-resolving fetch — it will continue to pass since the loading/empty state is unaffected.
- Add a unit test in `src/test/energyChartTransform.test.ts` verifying the display dataset negation: `wh_consumed` and `wh_grid_export` become negative, `wh_produced` and `wh_grid_import` stay positive.
- No visual regression tests — the chart is canvas/SVG and not snapshot-tested today.
