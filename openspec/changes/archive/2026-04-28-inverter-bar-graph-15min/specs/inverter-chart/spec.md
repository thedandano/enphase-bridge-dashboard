## ADDED Requirements

### Requirement: Display grouped bar chart of inverter output by 15-minute window
The system SHALL render a Recharts `BarChart` where each group on the x-axis represents a 15-minute `window_start` timestamp and each bar within the group represents one inverter's `watts_output` for that window.

#### Scenario: Chart renders with data
- **WHEN** snapshot data is available for the selected time range
- **THEN** the chart displays one bar group per `window_start` value, with one colored bar per unique `serial_number`

#### Scenario: Empty state
- **WHEN** no snapshot data is returned for the selected time range
- **THEN** the chart area shows the message "No inverter data for this range"

#### Scenario: Loading state
- **WHEN** the fetch has not yet resolved
- **THEN** the chart area shows the message "Loading inverter data…"

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

### Requirement: Time-range selection
The system SHALL include the standard 24h / 7d / 30d time-range toggle (from `useTimeRange`) to control the window of snapshot data fetched.

#### Scenario: Range change triggers re-fetch
- **WHEN** the user selects a different time range
- **THEN** `fetchSnapshots` is called with updated `start` and `end` bounds and the chart updates

### Requirement: Drill-down on bar click
The system SHALL call the `onWindowSelect(windowStart)` callback when the user clicks a bar group, passing the `window_start` epoch seconds for that group.

#### Scenario: Bar group click
- **WHEN** the user clicks any bar within a window group
- **THEN** `onWindowSelect` is called with the corresponding `window_start` value

### Requirement: Tooltip with per-inverter detail
The system SHALL show a Recharts tooltip on hover over a bar group that lists each inverter's serial number and watt output for that window.

#### Scenario: Tooltip visible on hover
- **WHEN** the user hovers over a bar group
- **THEN** a tooltip appears showing the formatted timestamp and each inverter's watts output for that window

### Requirement: Auto-refresh
The system SHALL use `useAutoRefresh` to re-fetch snapshot data on a 30-second base interval with exponential back-off on errors, consistent with all other dashboard components.

#### Scenario: Data refreshes automatically
- **WHEN** 30 seconds have elapsed since the last successful fetch
- **THEN** `fetchSnapshots` is called again and the chart updates with new data
