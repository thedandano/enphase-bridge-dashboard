## ADDED Requirements

### Requirement: Today time-range selector
The EnergyChart SHALL expose a "today" range option that spans from midnight of the current local calendar day to the current moment.

#### Scenario: Today button appears in range controls
- **WHEN** the EnergyChart renders
- **THEN** a "today" button appears alongside the existing 24h / 7d / 30d buttons

#### Scenario: Selecting today fetches midnight-to-now data
- **WHEN** the user clicks the "today" button
- **THEN** the chart fetches windows with `start = local midnight (Unix epoch)` and `end = current time`

### Requirement: Today range uses appropriate data limit
The EnergyChart "today" range SHALL use `RANGE_LIMITS['today']` as its fetch limit. This constant SHALL be the single authoritative value shared with `TodaySummary`'s fetch for today's windows, ensuring both components request the same maximum number of data points.

#### Scenario: Today range fetch limit matches shared constant
- **WHEN** the "today" range is active
- **THEN** the fetch limit equals `RANGE_LIMITS['today']` (96), matching 15-min resolution for up to 24 hours

#### Scenario: TodaySummary and EnergyChart use identical limit
- **WHEN** both `TodaySummary` and `EnergyChart` are rendering with the "today" range active
- **THEN** both components request windows with the same limit value derived from `RANGE_LIMITS['today']`

### Requirement: Date label in chart header
The EnergyChart SHALL display a human-readable date or date range beneath the "energy flow" title reflecting the currently selected range.

#### Scenario: Today range shows today's date
- **WHEN** the "today" range is selected
- **THEN** the subtitle reads "Today · <Month> <Day>" (e.g. "Today · Apr 29")

#### Scenario: 24h range shows end date
- **WHEN** the "24h" range is selected
- **THEN** the subtitle reads "Last 24h · <Month> <Day>" using the current date

#### Scenario: 7d range shows date span
- **WHEN** the "7d" range is selected
- **THEN** the subtitle reads "<Start Month> <Day> – <End Month> <Day>"

#### Scenario: 30d range shows date span
- **WHEN** the "30d" range is selected
- **THEN** the subtitle reads "<Start Month> <Day> – <End Month> <Day>"
