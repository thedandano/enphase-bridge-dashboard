## ADDED Requirements

### Requirement: Right now section replaces LiveStats with eyebrow and pulse indicator
The `LiveStats` component SHALL be renamed `RightNowSection`. It SHALL display a "Right now" badge containing a pulsing green dot (CSS animation) and the time range of the current window (e.g. "06:30 PM – 06:45 PM"). The four metric values (producing, consuming, exporting, importing) remain identical in behavior to `LiveStats`.

#### Scenario: Pulse dot is visible and animating
- **WHEN** `RightNowSection` renders (regardless of data state)
- **THEN** the "Right now" badge shows a green dot with a CSS scale/opacity pulse animation on a 2-second loop

#### Scenario: Window time range displays correctly
- **WHEN** `fetchLatestWindow` resolves with a `WindowItem`
- **THEN** the badge shows the window start and end times formatted as "HH:MM AM/PM – HH:MM AM/PM" (e.g. "06:30 PM – 06:45 PM", where end = window_start + 900 seconds)

#### Scenario: Window time range when no data
- **WHEN** `fetchLatestWindow` returns a 404 (`ApiError.status === 404`)
- **THEN** the time range label is hidden or shows "—" and the four metric cards show "—"

### Requirement: Right now eyebrow label "Right now" is always visible
The section SHALL render the string "Right now" as a small badge/eyebrow label above the metric cards, matching the section label style of `TodaySummary`.

#### Scenario: Eyebrow renders during loading
- **WHEN** the component mounts and data is still being fetched
- **THEN** "Right now" badge is visible and the pulse dot is animating

### Requirement: Metric card colors and formatting unchanged
The four metric cards (Producing/Consuming/Exporting/Importing) SHALL continue to use `var(--signal-production)`, `var(--signal-consumption)`, `var(--signal-grid-export)`, `var(--signal-grid-import)` colors. Formatting logic (kW when complete, Wh when in-progress) is unchanged from `LiveStats`.

#### Scenario: Complete window formatting
- **WHEN** `data.is_complete === true`
- **THEN** values are formatted with `toKw()` (e.g. "0.08 KW")

#### Scenario: In-progress window formatting
- **WHEN** `data.is_complete === false`
- **THEN** values are formatted with `toWh()` (e.g. "5 Wh") and the in-progress indicator is shown on cards
