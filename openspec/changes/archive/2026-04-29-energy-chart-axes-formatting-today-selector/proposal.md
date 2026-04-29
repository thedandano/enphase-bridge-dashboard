## Why

The EnergyChart's axes and value displays are hard to read: x-axis ticks are too dense, y-axis labels show confusing negative raw integers (artifact of the sign-negation rendering trick), and Wh values lack decimal precision. Additionally, there is no way to view just today's energy data with a clear date reference on the chart.

## What Changes

- **Wh values formatted to 2 decimal places** everywhere they appear (chart tooltip, summary sections).
- **X-axis ticks thinned** — show only a manageable number of labeled ticks regardless of data density (24h ~6, 7d/30d fewer).
- **Y-axis tick formatter** — display absolute Wh values as rounded integers (`.0f`) with proper labels; no negative numbers shown to the user.
- **"Today" time-range selector** added to EnergyChart alongside `24h / 7d / 30d`, spanning from midnight local time to now.
- **Date shown in chart** — when any range is active, the chart displays the relevant date or date range in the title/subtitle area.

## Capabilities

### New Capabilities
- `energy-chart-today-selector`: New time range option "today" (midnight → now) with date displayed in chart header.

### Modified Capabilities
- `energy-chart-axes`: X-axis tick density reduced; Y-axis uses absolute-value integer formatter; Wh tooltip values formatted to 2 decimal places.

## Impact

- `src/components/EnergyChart.tsx` — range selector, XAxis/YAxis formatters, tooltip formatter, title area.
- `src/hooks/useTimeRange.ts` — add `today` as a supported `TimeRange` with appropriate bounds computation.
- `src/utils/formatters.ts` — update `toWh` to return `.2f` values; add/update Wh display helpers if needed.
- Existing unit tests for formatters may need updating to match new decimal format.
