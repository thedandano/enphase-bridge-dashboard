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

### Requirement: Sparse x-axis ticks matching EnergyChart step intervals
The InverterChart x-axis SHALL display the same step-aligned sparse ticks as EnergyChart — every 2 hours for today/24h, daily for 7d, every 4 days for 30d — rather than showing every data point.

#### Scenario: today/24h range x-ticks
- **WHEN** the today or 24h range is active
- **THEN** the x-axis shows tick labels every 2 hours, aligned to clock-hour boundaries

#### Scenario: 7d range x-ticks
- **WHEN** the 7d range is active
- **THEN** the x-axis shows one tick label per day

#### Scenario: 30d range x-ticks
- **WHEN** the 30d range is active
- **THEN** the x-axis shows one tick label every 4 days

### Requirement: Range-aware x-axis tick format
The InverterChart x-axis tick formatter SHALL display HH:MM for today/24h ranges and "MMM DD" (e.g., "Apr 27") for 7d/30d ranges.

#### Scenario: today/24h tick format
- **WHEN** the today or 24h range is active
- **THEN** x-axis ticks are formatted as 24-hour HH:MM

#### Scenario: 7d/30d tick format
- **WHEN** the 7d or 30d range is active
- **THEN** x-axis ticks are formatted as abbreviated month + day (e.g., "Apr 27")

### Requirement: Serial number filter
The system SHALL provide a text input that filters the visible bars to only those serials matching the filter string (case-insensitive substring match on `serial_number`).

#### Scenario: Filter applied
- **WHEN** the user types a partial serial number into the filter input
- **THEN** only bars whose `serial_number` contains that substring are rendered

#### Scenario: Filter cleared
- **WHEN** the filter input is emptied
- **THEN** all inverter serials are displayed
