### Requirement: Render EnergyChart and InverterChart in a shared container
The system SHALL provide a `ChartPanel` component that renders `EnergyChart` directly above `InverterChart` within a single visual container, sharing time-range and chart-style state.

#### Scenario: ChartPanel renders both charts
- **WHEN** the `ChartPanel` component mounts
- **THEN** both the energy flow chart and the inverter output chart are visible in the same panel, stacked vertically

### Requirement: Unified time-range selector controls both charts
The system SHALL display a single time-range control bar with buttons `[today | 24h | 7d | 30d]` that drives the fetch bounds for both `EnergyChart` and `InverterChart`.

#### Scenario: User selects 7d range
- **WHEN** the user clicks the "7d" range button in the ChartPanel control bar
- **THEN** both EnergyChart and InverterChart refetch data using 7-day start/end bounds

#### Scenario: Active range button is visually distinguished
- **WHEN** a time range is selected
- **THEN** the corresponding button is rendered with the active accent style (`var(--purple)` background)

#### Scenario: Default range on mount
- **WHEN** ChartPanel first mounts
- **THEN** the "today" range is selected by default

### Requirement: Chart-style toggle (area / bar) is shared at the panel level
The system SHALL display a single `[area | bar]` toggle in the ChartPanel control bar that controls the `EnergyChart` rendering style.

#### Scenario: Toggle persists to localStorage
- **WHEN** the user changes the chart style
- **THEN** the selection is written to `localStorage` under key `energyChart.style` and restored on subsequent page loads

#### Scenario: Toggle does not affect InverterChart rendering
- **WHEN** the user switches between area and bar style
- **THEN** InverterChart's grouped bar chart is unaffected

### Requirement: InverterChart drill-down is initiated from EnergyChart click
The system SHALL pass `selectedWindowTs` and `onWindowSelect` through `ChartPanel` so that clicking an energy window in `EnergyChart` triggers the per-window inverter drill-down in `InverterChart`.

#### Scenario: Clicking an energy window opens drill-down
- **WHEN** the user clicks a bar or point on EnergyChart
- **THEN** InverterChart switches to drill-down mode showing inverter data for that specific `window_start`

#### Scenario: Clearing drill-down returns to overview
- **WHEN** the user clicks the back button in InverterChart drill-down view
- **THEN** `selectedWindowTs` is cleared and InverterChart returns to overview mode driven by the shared range
