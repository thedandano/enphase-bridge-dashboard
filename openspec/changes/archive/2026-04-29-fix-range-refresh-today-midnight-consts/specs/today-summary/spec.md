## MODIFIED Requirements

### Requirement: Today summary section displays daily energy totals
The dashboard SHALL display a "Today" section above the EnergyChart showing four daily-aggregate values: kWh produced, kWh consumed, kWh exported to grid, and kWh imported from grid. Values SHALL be computed by fetching all complete and in-progress windows from **local** midnight to the current time and summing their `wh_*` fields, then formatting with `toEnergy` from `src/utils/dailySummary.ts`. The fetch limit SHALL be `RANGE_LIMITS['today']` (96 windows), matching the 15-min resolution ceiling for a single calendar day.

#### Scenario: Data loads successfully
- **WHEN** the component mounts and `fetchWindows(localMidnight, now, RANGE_LIMITS['today'])` resolves with one or more windows
- **THEN** the section displays four metric cards labeled "Produced", "Consumed", "Exported", "Imported" with formatted energy values using the Dracula signal colors (green, orange, cyan, red respectively)

#### Scenario: No windows exist yet
- **WHEN** `fetchWindows` returns an empty `windows` array
- **THEN** all four values display "—" (em dash) and no error state is shown

#### Scenario: Fetch error
- **WHEN** `fetchWindows` throws an `ApiError`
- **THEN** all four values display "—" and the component does not crash

#### Scenario: Auto-refresh
- **WHEN** 30 seconds have elapsed since the last successful fetch
- **THEN** the component re-fetches daily windows and updates displayed values

#### Scenario: Local midnight is used, not UTC midnight
- **WHEN** the component fetches today's windows in a timezone offset from UTC
- **THEN** the `start` parameter equals the Unix epoch of local midnight (00:00:00 in the browser's local timezone), not UTC midnight
