# Mirrored Energy Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `EnergyChart` to show production/import above zero and consumption/export mirrored below zero, with an Area/Bar toggle, a "energy flow" title, and fix the missing Google Fonts link that makes the whole dashboard fall back to Impact/Arial Narrow.

**Architecture:** Pure display-layer change — a derived dataset negates `wh_consumed` and `wh_grid_export` before passing to Recharts; the raw API data and all hooks are untouched. `chartStyle` state (local to `EnergyChart`, persisted to `localStorage`) conditionally renders an `AreaChart` or a `BarChart`. The font fix is a single `<link>` tag in `index.html`.

**Tech Stack:** React 19, TypeScript, Recharts 2.x, CSS Modules, Vitest + Testing Library

---

## File Map

| File | Action | What changes |
|---|---|---|
| `index.html` | Modify | Add Google Fonts `<link>` preconnect + stylesheet |
| `src/components/EnergyChart.tsx` | Modify | Export `toDisplayData`, add `chartStyle` state, title, conditional chart, axis props, tooltip formatter |
| `src/components/EnergyChart.module.css` | Modify | `.controls` layout update, add `.title`, `.styleToggle`, `.styleBtn`, `.styleBtnActive` |
| `src/components/InverterChart.tsx` | Modify | Axis tick color `#7970A9` → `#9281BB`, size 10 → 11, add `fontFamily` prop (two chart instances) |
| `src/test/energyChartTransform.test.ts` | Create | Unit tests for `toDisplayData` |
| `src/test/smoke.test.tsx` | Modify | Add `EnergyChart` smoke render |

---

## Task 1: Fix Google Fonts — restores all dashboard fonts

**Files:**
- Modify: `index.html:6`

- [ ] **Step 1: Add the font link**

Replace `index.html` head content — add three lines after the existing favicon link:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>enphase-bridge-dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173`. The header stats and range buttons should now render in a condensed sans-serif (Barlow Condensed) instead of Arial Narrow. If Chrome DevTools → Network → filter "fonts.gstatic" shows 200 responses, fonts are loading.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: load Google Fonts — restores Barlow Condensed, JetBrains Mono, Bebas Neue"
```

---

## Task 2: Export `toDisplayData` + write unit tests

**Files:**
- Modify: `src/components/EnergyChart.tsx` (add one exported function above the `SERIES` const)
- Create: `src/test/energyChartTransform.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/energyChartTransform.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { WindowItem } from '@/api/types';
import { toDisplayData } from '@/components/EnergyChart';

const base: WindowItem = {
  window_start: 1_000_000,
  wh_produced: 500,
  wh_consumed: 300,
  wh_grid_import: 50,
  wh_grid_export: 200,
  is_complete: true,
};

describe('toDisplayData', () => {
  it('negates wh_consumed', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_consumed).toBe(-300);
  });

  it('negates wh_grid_export', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_grid_export).toBe(-200);
  });

  it('leaves wh_produced unchanged', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_produced).toBe(500);
  });

  it('leaves wh_grid_import unchanged', () => {
    const [result] = toDisplayData([base]);
    expect(result.wh_grid_import).toBe(50);
  });

  it('preserves window_start and is_complete', () => {
    const [result] = toDisplayData([base]);
    expect(result.window_start).toBe(1_000_000);
    expect(result.is_complete).toBe(true);
  });

  it('handles an empty array', () => {
    expect(toDisplayData([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/test/energyChartTransform.test.ts
```

Expected: FAIL — `toDisplayData` is not exported from `EnergyChart`.

- [ ] **Step 3: Add `toDisplayData` to `EnergyChart.tsx`**

Add this exported function directly above the `SERIES` const (after the imports):

```ts
export function toDisplayData(windows: readonly WindowItem[]): WindowItem[] {
  return windows.map((w) => ({
    ...w,
    wh_consumed:    -w.wh_consumed,
    wh_grid_export: -w.wh_grid_export,
  }));
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/test/energyChartTransform.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/EnergyChart.tsx src/test/energyChartTransform.test.ts
git commit -m "feat: export toDisplayData — negates consumption and export for mirrored chart"
```

---

## Task 3: Apply mirrored data to the existing AreaChart

**Files:**
- Modify: `src/components/EnergyChart.tsx:31-118`

This task wires `toDisplayData` into the render path, sets a symmetric Y-axis domain, updates axis colors/fonts, and fixes the tooltip to show absolute values for negated series.

- [ ] **Step 1: Update imports — add `WindowItem` type and `useState`**

Replace the import block at the top of `EnergyChart.tsx`:

```tsx
import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useTimeRange } from "@/hooks/useTimeRange";
import type { TimeRange } from "@/hooks/useTimeRange";
import { fetchWindows } from "@/api/energy";
import type { WindowsResponse, WindowItem } from "@/api/types";
import styles from "./EnergyChart.module.css";
```

- [ ] **Step 2: Derive `displayData` and `maxWh` inside the component**

Add these two lines immediately after `const windows: WindowItem[] = data ? [...data.windows] : [];`:

```tsx
const displayData = toDisplayData(windows);

const maxWh =
  windows.length > 0
    ? Math.max(
        ...windows.map((w) =>
          Math.max(
            w.wh_produced + w.wh_grid_import,
            w.wh_consumed + w.wh_grid_export,
          )
        )
      ) * 1.1
    : 1000;
```

- [ ] **Step 3: Replace the `<AreaChart>` block with the updated version**

Replace the entire `<ResponsiveContainer>` block (currently lines 63–113):

```tsx
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={displayData} onClick={handleClick} style={{ cursor: "pointer" }}>
    <XAxis
      dataKey="window_start"
      tickFormatter={(v: number) => formatTick(v)}
      stroke="#9281BB"
      tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
    />
    <YAxis
      stroke="#9281BB"
      tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
      label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
      domain={[-maxWh, maxWh]}
    />
    <Tooltip
      contentStyle={{
        background: "#131217",
        border: "1px solid rgba(248,248,242,0.12)",
        borderRadius: "6px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "12px",
      }}
      labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(v) : String(v))}
      formatter={(value: number, name: string) => {
        const display = ["Consumption", "Grid export"].includes(name)
          ? Math.abs(value)
          : value;
        return [`${display} Wh`, name];
      }}
    />
    {SERIES.map((s, i) => (
      <Area
        key={s.key}
        type="monotone"
        dataKey={s.key}
        stroke={s.color}
        fill={s.color}
        fillOpacity={0.15}
        strokeWidth={2}
        name={s.label}
        dot={(props: unknown) => {
          const p = props as { cx: number; cy: number; index: number };
          const isLast = p.index === windows.length - 1;
          const isIncomplete = isLast && windows[windows.length - 1]?.is_complete === false;
          return (
            <circle
              key={`dot-${i}-${p.index}`}
              cx={p.cx}
              cy={p.cy}
              r={3}
              fill={s.color}
              opacity={isIncomplete ? 0.4 : 0}
            />
          );
        }}
      />
    ))}
  </AreaChart>
</ResponsiveContainer>
```

- [ ] **Step 4: Run smoke tests**

```bash
npm test
```

Expected: All tests pass (EnergyChart is not yet in smoke tests — that's Task 8).

- [ ] **Step 5: Verify visually in browser**

With `npm run dev` running, open the dashboard. The energy chart should now show production curves above zero and consumption curving below. Hover a data point — tooltip should show "Consumption: 320 Wh" (positive number), not "-320 Wh".

- [ ] **Step 6: Commit**

```bash
git add src/components/EnergyChart.tsx
git commit -m "feat: mirror EnergyChart — consumption/export below zero, symmetric Y-axis"
```

---

## Task 4: Add "energy flow" title

**Files:**
- Modify: `src/components/EnergyChart.module.css`
- Modify: `src/components/EnergyChart.tsx:46` (above the controls div)

- [ ] **Step 1: Add `.title` CSS class**

Append to `EnergyChart.module.css`:

```css
.title {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}
```

- [ ] **Step 2: Add the `<h2>` above the controls div in `EnergyChart.tsx`**

Inside the `return` block, add this line immediately before `<div className={styles.controls}>`:

```tsx
<h2 className={styles.title}>energy flow</h2>
```

- [ ] **Step 3: Run tests and verify visually**

```bash
npm test
```

Open the dashboard — "energy flow" should appear centered at the top of the chart card in JetBrains Mono bold.

- [ ] **Step 4: Commit**

```bash
git add src/components/EnergyChart.tsx src/components/EnergyChart.module.css
git commit -m "feat: add 'energy flow' title to EnergyChart"
```

---

## Task 5: Add Bar chart mode

**Files:**
- Modify: `src/components/EnergyChart.tsx`

`BarChart`, `Bar`, and `ReferenceLine` were already added to the import in Task 3. This task adds `chartStyle` state and the `BarChart` JSX branch.

- [ ] **Step 1: Add `chartStyle` state inside `EnergyChart`**

Add this line immediately after the `useTimeRange` and `useAutoRefresh` calls (before the `windows` derivation):

```tsx
const [chartStyle, setChartStyle] = useState<"area" | "bar">(
  () => (localStorage.getItem("energyChart.style") as "area" | "bar") ?? "bar"
);
```

- [ ] **Step 2: Replace the single `<ResponsiveContainer>` with a conditional render**

The AreaChart block from Task 3 stays as the `"area"` branch. Wrap it and add the `"bar"` branch:

```tsx
{chartStyle === "area" ? (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={displayData} onClick={handleClick} style={{ cursor: "pointer" }}>
      <XAxis
        dataKey="window_start"
        tickFormatter={(v: number) => formatTick(v)}
        stroke="#9281BB"
        tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
      />
      <YAxis
        stroke="#9281BB"
        tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
        label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
        domain={[-maxWh, maxWh]}
      />
      <Tooltip
        contentStyle={{
          background: "#131217",
          border: "1px solid rgba(248,248,242,0.12)",
          borderRadius: "6px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "12px",
        }}
        labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(v) : String(v))}
        formatter={(value: number, name: string) => {
          const display = ["Consumption", "Grid export"].includes(name)
            ? Math.abs(value)
            : value;
          return [`${display} Wh`, name];
        }}
      />
      {SERIES.map((s, i) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          stroke={s.color}
          fill={s.color}
          fillOpacity={0.15}
          strokeWidth={2}
          name={s.label}
          dot={(props: unknown) => {
            const p = props as { cx: number; cy: number; index: number };
            const isLast = p.index === windows.length - 1;
            const isIncomplete = isLast && windows[windows.length - 1]?.is_complete === false;
            return (
              <circle
                key={`dot-${i}-${p.index}`}
                cx={p.cx}
                cy={p.cy}
                r={3}
                fill={s.color}
                opacity={isIncomplete ? 0.4 : 0}
              />
            );
          }}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
) : (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={displayData} onClick={handleClick} style={{ cursor: "pointer" }}>
      <XAxis
        dataKey="window_start"
        tickFormatter={(v: number) => formatTick(v)}
        stroke="#9281BB"
        tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
      />
      <YAxis
        stroke="#9281BB"
        tick={{ fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
        label={{ value: "Wh", angle: -90, position: "insideLeft", fill: "#9281BB", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
        domain={[-maxWh, maxWh]}
      />
      <ReferenceLine y={0} stroke="#6272a4" strokeDasharray="5 4" />
      <Tooltip
        contentStyle={{
          background: "#131217",
          border: "1px solid rgba(248,248,242,0.12)",
          borderRadius: "6px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "12px",
        }}
        labelFormatter={(v: unknown) => (typeof v === "number" ? formatTick(v) : String(v))}
        formatter={(value: number, name: string) => {
          const display = ["Consumption", "Grid export"].includes(name)
            ? Math.abs(value)
            : value;
          return [`${display} Wh`, name];
        }}
      />
      <Bar dataKey="wh_produced"    stackId="pos" fill="#8AFF80" fillOpacity={0.82} name="Production" />
      <Bar dataKey="wh_grid_import" stackId="pos" fill="#FF9580" fillOpacity={0.75} name="Import" />
      <Bar dataKey="wh_consumed"    stackId="neg" fill="#FFCA80" fillOpacity={0.75} name="Consumption" />
      <Bar dataKey="wh_grid_export" stackId="neg" fill="#80FFEA" fillOpacity={0.68} name="Grid export" />
    </BarChart>
  </ResponsiveContainer>
)}
```

- [ ] **Step 3: Temporarily hard-code `chartStyle` to `"bar"` to test it**

Change the `useState` initializer to `"bar"` directly (remove the localStorage read):

```tsx
const [chartStyle, setChartStyle] = useState<"area" | "bar">("bar");
```

- [ ] **Step 4: Run dev server and verify bar mode renders**

Open the dashboard. You should see the 96-column bar chart, production above the zero line, consumption below. Tooltip should show positive values for all series.

- [ ] **Step 5: Restore localStorage init**

```tsx
const [chartStyle, setChartStyle] = useState<"area" | "bar">(
  () => (localStorage.getItem("energyChart.style") as "area" | "bar") ?? "bar"
);
```

- [ ] **Step 6: Commit**

```bash
git add src/components/EnergyChart.tsx
git commit -m "feat: add BarChart mode to EnergyChart — 15-min stacked columns"
```

---

## Task 6: Add Area / Bar toggle to controls row

**Files:**
- Modify: `src/components/EnergyChart.module.css`
- Modify: `src/components/EnergyChart.tsx` (controls div)

- [ ] **Step 1: Update `.controls` and add toggle CSS**

In `EnergyChart.module.css`, replace the `.controls` rule and append the toggle classes:

```css
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.styleToggle {
  display: flex;
  border: 1px solid rgba(121, 112, 169, 0.35);
  border-radius: var(--radius);
  overflow: hidden;
}

.styleBtn {
  padding: 4px 10px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.styleBtn + .styleBtn {
  border-left: 1px solid rgba(121, 112, 169, 0.35);
}

.styleBtnActive {
  background: rgba(138, 255, 128, 0.1);
  color: var(--signal-production);
}
```

- [ ] **Step 2: Replace the controls div in `EnergyChart.tsx`**

Replace `<div className={styles.controls}>...</div>` (currently a flat list of range buttons):

```tsx
<div className={styles.controls}>
  <div style={{ display: "flex", gap: "0.5rem" }}>
    {RANGES.map((r) => (
      <button
        key={r}
        className={r === range ? styles.activeBtn : styles.btn}
        onClick={() => setRange(r)}
      >
        {r}
      </button>
    ))}
  </div>
  <div className={styles.styleToggle}>
    <button
      className={
        chartStyle === "area"
          ? `${styles.styleBtn} ${styles.styleBtnActive}`
          : styles.styleBtn
      }
      onClick={() => {
        setChartStyle("area");
        localStorage.setItem("energyChart.style", "area");
      }}
    >
      ∿ Area
    </button>
    <button
      className={
        chartStyle === "bar"
          ? `${styles.styleBtn} ${styles.styleBtnActive}`
          : styles.styleBtn
      }
      onClick={() => {
        setChartStyle("bar");
        localStorage.setItem("energyChart.style", "bar");
      }}
    >
      ▐ Bars
    </button>
  </div>
</div>
```

- [ ] **Step 3: Verify in browser**

Open the dashboard. The controls row should show `24h / 7d / 30d` on the left and `∿ Area | ▐ Bars` on the right. Clicking each should switch the chart immediately. Reload — the last-selected style should persist.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/EnergyChart.tsx src/components/EnergyChart.module.css
git commit -m "feat: add Area/Bar toggle with localStorage persistence to EnergyChart"
```

---

## Task 7: Fix InverterChart axis tick color, size, and font

**Files:**
- Modify: `src/components/InverterChart.tsx:154-165` (DrillDownChart)
- Modify: `src/components/InverterChart.tsx:305-323` (main BarChart)

- [ ] **Step 1: Fix DrillDownChart axes (lines 154–165)**

Replace the `<XAxis>` and `<YAxis>` inside `DrillDownChart`:

```tsx
<XAxis
  dataKey="serial"
  stroke="#9281BB"
  tick={{ fill: '#9281BB', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
  tickLine={false}
  angle={-35}
  textAnchor="end"
  interval={0}
/>
<YAxis
  stroke="#9281BB"
  tick={{ fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
  label={{ value: 'W', angle: -90, position: 'insideLeft', fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
/>
```

- [ ] **Step 2: Fix main InverterChart axes (lines 305–323)**

Replace the `<XAxis>` and `<YAxis>` inside the main `BarChart` in `InverterChart`:

```tsx
<XAxis
  dataKey="windowStart"
  tickFormatter={formatTick}
  stroke="#9281BB"
  tick={{ fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
  tickLine={false}
  interval="preserveStartEnd"
/>
<YAxis
  stroke="#9281BB"
  tick={{ fill: '#9281BB', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
  label={{
    value: 'W',
    angle: -90,
    position: 'insideLeft',
    fill: '#9281BB',
    fontSize: 11,
    fontFamily: 'JetBrains Mono, monospace',
  }}
/>
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/InverterChart.tsx
git commit -m "fix: InverterChart axis ticks — #9281BB, 11px, JetBrains Mono for WCAG AA"
```

---

## Task 8: Add EnergyChart smoke test

**Files:**
- Modify: `src/test/smoke.test.tsx`

- [ ] **Step 1: Add EnergyChart import and test case**

In `src/test/smoke.test.tsx`, add the import alongside the existing ones:

```tsx
import { EnergyChart } from '@/components/EnergyChart';
```

Add this test case inside the `describe('Smoke renders', ...)` block:

```tsx
it('EnergyChart renders without throwing', () => {
  render(<EnergyChart onWindowSelect={() => {}} />);
});
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass including the new smoke test.

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: zero errors, zero warnings.

- [ ] **Step 4: Commit**

```bash
git add src/test/smoke.test.tsx
git commit -m "test: add EnergyChart smoke render"
```

---

## Done

All 8 tasks complete. The feature is fully implemented and tested. Run `npm run build` to confirm a clean production build before opening a PR.
