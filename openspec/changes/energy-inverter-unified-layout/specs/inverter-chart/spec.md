## REMOVED Requirements

### Requirement: Navigate between days with prev/next controls
**Reason**: Day navigation replaced by the unified time-range selector in ChartPanel. InverterChart now receives `start/end` bounds as props rather than computing them from internal `daysBack` state.
**Migration**: Use the shared `[today | 24h | 7d | 30d]` range selector in ChartPanel to change the inverter chart's time window.

## MODIFIED Requirements

### Requirement: Display grouped bar chart of inverter output by 15-minute window
The system SHALL render a Recharts `BarChart` where each group on the x-axis represents a 15-minute `window_start` timestamp and each bar within the group represents one inverter's `watts_output` for that window. The fetch bounds (`start`, `end`) SHALL be supplied as props from `ChartPanel` rather than computed from internal `daysBack` state.

#### Scenario: Chart renders with data
- **WHEN** snapshot data is available for the `start`/`end` range provided by ChartPanel
- **THEN** the chart displays one bar group per `window_start` value, with one colored bar per unique `serial_number`

#### Scenario: Empty state
- **WHEN** no snapshot data is returned for the provided `start`/`end` range
- **THEN** the chart area shows the message "No inverter data for this range"

#### Scenario: Loading state
- **WHEN** the fetch has not yet resolved
- **THEN** the chart area shows the message "Loading inverter data…"

#### Scenario: Range change triggers refetch
- **WHEN** ChartPanel's selected time range changes and new `start`/`end` props are passed
- **THEN** InverterChart refetches data for the new bounds

### Requirement: Show daily Wh total per inverter in the legend
The system SHALL display a legend beneath the chart showing each inverter's serial number and its cumulative energy production for the displayed period, computed as `sum(watts_output × 15/60)` across all visible windows.

#### Scenario: Legend entries present
- **WHEN** chart data is loaded with N unique inverter serials
- **THEN** the legend shows N entries, each with the serial number and computed Wh total

#### Scenario: Wh total formatted
- **WHEN** an inverter's daily total is computed
- **THEN** the value is displayed as a rounded integer followed by " Wh" (e.g., "1 234 Wh")

### Requirement: Color-coded bars per inverter serial
The system SHALL assign a distinct, deterministic color to each inverter serial by its index in the sorted serial list, using the project's established color palette approach.

#### Scenario: Color consistency across re-renders
- **WHEN** the component re-renders due to a data refresh
- **THEN** each serial retains the same color (index-stable assignment)

### Requirement: Offline inverter visual indication
The system SHALL render bars for offline inverters (`is_online: false`) at their reported watt value but with reduced opacity (≤ 0.5) so they are visually distinguished from online inverters.

#### Scenario: Offline inverter in chart
- **WHEN** a snapshot has `is_online: false`
- **THEN** the corresponding bar segment is rendered with muted/reduced-opacity styling

### Requirement: Serial number filter
The system SHALL provide a text input that filters the visible bars to only those serials matching the filter string (case-insensitive substring match on `serial_number`).

#### Scenario: Filter applied
- **WHEN** the user types a partial serial number into the filter input
- **THEN** only bars whose `serial_number` contains that substring are rendered

#### Scenario: Filter cleared
- **WHEN** the filter input is emptied
- **THEN** all inverter serials are displayed
