## MODIFIED Requirements

### Requirement: Today range uses appropriate data limit
The EnergyChart "today" range SHALL use `RANGE_LIMITS['today']` as its fetch limit. This constant SHALL be the single authoritative value shared with `TodaySummary`'s fetch for today's windows, ensuring both components request the same maximum number of data points.

#### Scenario: Today range fetch limit matches shared constant
- **WHEN** the "today" range is active
- **THEN** the fetch limit equals `RANGE_LIMITS['today']` (96), matching 15-min resolution for up to 24 hours

#### Scenario: TodaySummary and EnergyChart use identical limit
- **WHEN** both `TodaySummary` and `EnergyChart` are rendering with the "today" range active
- **THEN** both components request windows with the same limit value derived from `RANGE_LIMITS['today']`
