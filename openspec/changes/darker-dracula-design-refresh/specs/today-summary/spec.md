## ADDED Requirements

### Requirement: Today summary section displays daily energy totals
The dashboard SHALL display a "Today" section above the EnergyChart showing four daily-aggregate values: kWh produced, kWh consumed, kWh exported to grid, and kWh imported from grid. Values SHALL be computed by fetching all complete and in-progress windows from UTC midnight to the current time and summing their `wh_*` fields, then formatting with `toKw`/`toWh` from `src/utils/formatters.ts`.

#### Scenario: Data loads successfully
- **WHEN** the component mounts and `fetchWindows(todayStart, now, 1000)` resolves with one or more windows
- **THEN** the section displays four metric cards labeled "Produced", "Consumed", "Exported", "Imported" with formatted kWh values using the Dracula signal colors (green, orange, cyan, red respectively)

#### Scenario: No windows exist yet
- **WHEN** `fetchWindows` returns an empty `windows` array
- **THEN** all four values display "—" (em dash) and no error state is shown

#### Scenario: Fetch error
- **WHEN** `fetchWindows` throws an `ApiError`
- **THEN** all four values display "—" and the component does not crash

#### Scenario: Auto-refresh
- **WHEN** 60 seconds have elapsed since the last successful fetch
- **THEN** the component re-fetches daily windows and updates displayed values

### Requirement: Today section uses a section eyebrow label
The section SHALL render an eyebrow label "Today" above the metric card grid, consistent with the visual hierarchy used by the `RightNowSection`.

#### Scenario: Eyebrow label is visible
- **WHEN** the `TodaySummary` component renders
- **THEN** the text "Today" appears as a small uppercase label above the metric grid

### Requirement: Today section is positioned above the EnergyChart
The `TodaySummary` SHALL appear as the first content element in `<main>`, before `RightNowSection` and `EnergyChart`.

#### Scenario: Layout order in DOM
- **WHEN** the App renders
- **THEN** the DOM order is: TodaySummary → RightNowSection → EnergyChart → lower panels
