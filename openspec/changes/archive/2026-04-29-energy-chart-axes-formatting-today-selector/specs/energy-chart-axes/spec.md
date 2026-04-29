## ADDED Requirements

### Requirement: Sparse X-axis ticks
The EnergyChart X-axis SHALL display at most a fixed number of tick labels regardless of data point count, to avoid overlapping or unreadable labels.

#### Scenario: 24h and today ranges show at most 6 x-axis labels
- **WHEN** the "24h" or "today" range is active
- **THEN** the X-axis renders at most 6 evenly-spaced tick labels

#### Scenario: 7d range shows at most 7 x-axis labels
- **WHEN** the "7d" range is active
- **THEN** the X-axis renders at most 7 evenly-spaced tick labels

#### Scenario: 30d range shows at most 8 x-axis labels
- **WHEN** the "30d" range is active
- **THEN** the X-axis renders at most 8 evenly-spaced tick labels

### Requirement: Absolute-value Y-axis ticks formatted as integers
The EnergyChart Y-axis SHALL display tick labels as non-negative integers, hiding the internal sign-negation used for rendering stacked charts below zero.

#### Scenario: Y-axis shows no negative tick labels
- **WHEN** the chart renders with any data
- **THEN** all Y-axis tick labels are non-negative integers (e.g. "0", "500", "1000")

#### Scenario: Y-axis ticks have no decimal places
- **WHEN** the chart renders
- **THEN** Y-axis tick labels contain no decimal point

### Requirement: Tooltip Wh values with 2 decimal places
The EnergyChart tooltip SHALL format all Wh values to exactly 2 decimal places.

#### Scenario: Tooltip shows 2-decimal Wh values
- **WHEN** the user hovers a data point
- **THEN** the tooltip displays values like "123.45 Wh" rather than "123 Wh"
