## Context

`EnergyChart` renders energy flow over configurable time windows. Data values are raw Wh integers from the bridge API. The chart uses a sign-negation trick (`toDisplayData`) to render consumption and grid-export below the zero line as negative stacked bars/areas. This causes the Y-axis to display raw negative integers that confuse users. The X-axis tick density is tied directly to data point count (up to 672 points for 7d), producing an unreadably dense label row. Wh values in tooltips are shown as raw integers. There is no "today" (midnight-to-now) view.

## Goals / Non-Goals

**Goals:**
- Reduce X-axis tick density to a fixed small count per range.
- Format Y-axis ticks as absolute-value integers (no negatives shown).
- Format tooltip Wh values to 2 decimal places.
- Add a "today" range selector (midnight local → now).
- Display the relevant date or date range in the chart header.

**Non-Goals:**
- Changing the underlying sign-negation data model for rendering.
- Adding kWh auto-scaling (always Wh for now).
- Modifying the `toKw` formatter used in RightNowSection.

## Decisions

### D1: X-axis tick interval via `interval` prop
Use Recharts' `XAxis interval` prop set to a computed value (`Math.ceil(data.length / MAX_TICKS) - 1`) to show at most `MAX_TICKS` labels. For 24h/today use 6, for 7d use 7, for 30d use 8. This requires no external library and zero DOM cost.

Alternative considered: explicit `ticks` array — rejected, requires date arithmetic per range and couples formatting to data shape.

### D2: Y-axis absolute-value formatter
Pass `tickFormatter={(v) => String(Math.abs(Math.round(v)))}` to both Area and Bar chart `YAxis`. The sign-negation trick stays; only the display is corrected. The `domain` stays symmetric `[-maxWh, maxWh]`.

Alternative considered: remove sign negation, use separate stacks — rejected, large refactor with no visible user benefit.

### D3: Tooltip Wh format to 2 decimal places
Change the tooltip `formatter` from `` `${display} Wh` `` to `` `${display.toFixed(2)} Wh` ``. This is surgical and consistent.

### D4: "Today" range in `useTimeRange`
Add `'today'` to the `TimeRange` union. `computeBounds('today')` returns `{ start: midnight of today in local time (Unix), end: now }`. The limit for today is 96 (24h × 4 per hour max, same density as 24h). `RANGE_SECONDS` entry for `today` is unused but can be `0` as a sentinel.

Alternative considered: compute today bounds in the component — rejected, keeps bounds logic centralized in the hook.

### D5: Date displayed in chart header
Render a small date subtitle below "energy flow" title. For `today` show `"Today · MMM D"`. For `24h` show `"Last 24h · MMM D"` (end date). For `7d`/`30d` show `"MMM D – MMM D"` range. Computed from `start`/`end` epoch values already available in component scope.

## Risks / Trade-offs

- **Risk**: `interval` skips ticks but the formula is approximate for edge cases (very small datasets). → Mitigation: clamp interval to `Math.max(0, ...)` to avoid negative values.
- **Risk**: Changing `toWh` format from `~XXX Wh` to `~XXX.XX Wh` may break existing unit tests. → Mitigation: update tests in the same PR.
- **Risk**: "today" midnight computation uses local timezone; server data is also local-timezone-aligned (bridge API), so no mismatch expected.
