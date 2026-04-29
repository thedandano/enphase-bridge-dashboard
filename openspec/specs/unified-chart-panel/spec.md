### Requirement: Render EnergyChart and InverterChart in a shared container
The system SHALL provide a `ChartPanel` component that renders `EnergyChart` directly above `InverterChart` within a single visual container, sharing time-range and chart-style state.

#### Scenario: ChartPanel renders both charts
- **WHEN** the `ChartPanel` component mounts
- **THEN** both the energy flow chart and the inverter output chart are visible in the same panel, stacked vertically

### Requirement: Unified time-range selector controls both charts
The system SHALL display a single time-range control bar with a `[← today →]` day-navigation group and range buttons `[24h | 7d | 30d]` that drives the fetch bounds for both `EnergyChart` and `InverterChart`.

#### Scenario: User selects 7d range
- **WHEN** the user clicks the "7d" range button in the ChartPanel control bar
- **THEN** both EnergyChart and InverterChart refetch data using 7-day start/end bounds

#### Scenario: Active range button is visually distinguished
- **WHEN** a time range is selected
- **THEN** the corresponding button is rendered with the active accent style (`var(--purple)` background)

#### Scenario: Default range on mount
- **WHEN** ChartPanel first mounts
- **THEN** the "today" range is selected by default

### Requirement: Today button supports day-back navigation
The system SHALL render the today range as a `[← label →]` group where `←` navigates one day further back and `→` navigates one day forward. The label shows "today", "yesterday", or the date (e.g., "Apr 27") depending on how many days back is selected. Selecting any other range (24h, 7d, 30d) resets navigation to today.

#### Scenario: Navigate to previous day
- **WHEN** the user clicks `←`
- **THEN** the range switches to "today" mode if not already, `daysBack` increments by 1, both charts refetch for that day's midnight–midnight bounds, and the label updates accordingly

#### Scenario: Navigate forward to today
- **WHEN** the user clicks `→` while `daysBack > 0`
- **THEN** `daysBack` decrements by 1 and both charts refetch for the new bounds

#### Scenario: Forward arrow disabled at today
- **WHEN** `daysBack === 0`
- **THEN** the `→` button is disabled

#### Scenario: Switching range resets day offset
- **WHEN** the user clicks 24h, 7d, or 30d while `daysBack > 0`
- **THEN** `daysBack` resets to 0

### Requirement: Chart-style toggle (area / bar) is shared at the panel level
The system SHALL display a single `[area | bar]` toggle in the ChartPanel control bar that controls the `EnergyChart` rendering style.

#### Scenario: Toggle persists to localStorage
- **WHEN** the user changes the chart style
- **THEN** the selection is written to `localStorage` under key `energyChart.style` and restored on subsequent page loads

#### Scenario: Toggle does not affect InverterChart rendering
- **WHEN** the user switches between area and bar style
- **THEN** InverterChart's grouped bar chart is unaffected

### Requirement: Consistent chart heading style
Both EnergyChart and InverterChart headings SHALL use the same display typeface (`var(--font-display)`), size (`1.5rem`), and weight (`400`) so they read as siblings within the unified panel.

#### Scenario: EnergyChart heading matches InverterChart heading
- **WHEN** both charts are rendered inside ChartPanel
- **THEN** "ENERGY FLOW" and "INVERTER OUTPUT" share the same font family, size, and weight

### Requirement: InverterChart drill-down is initiated from EnergyChart click
The system SHALL pass `selectedWindowTs` and `onWindowSelect` through `ChartPanel` so that clicking an energy window in `EnergyChart` triggers the per-window inverter drill-down in `InverterChart`.

#### Scenario: Clicking an energy window opens drill-down
- **WHEN** the user clicks a bar or point on EnergyChart
- **THEN** InverterChart switches to drill-down mode showing inverter data for that specific `window_start`

#### Scenario: Clearing drill-down returns to overview
- **WHEN** the user clicks the back button in InverterChart drill-down view
- **THEN** `selectedWindowTs` is cleared and InverterChart returns to overview mode driven by the shared range
