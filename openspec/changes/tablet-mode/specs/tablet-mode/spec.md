## ADDED Requirements

### Requirement: Tablet mode toggle button in Header
The Header SHALL display a tablet-mode toggle button that activates compact fullscreen layout. The button SHALL be visually distinct from the settings gear button and placed in the Header alongside it.

#### Scenario: Activating tablet mode
- **WHEN** the user clicks the tablet mode toggle button while tablet mode is off
- **THEN** tablet mode activates, `data-tablet="true"` is set on the Layout root, and the browser attempts to enter fullscreen via the Fullscreen API

#### Scenario: Deactivating tablet mode
- **WHEN** the user clicks the tablet mode toggle button while tablet mode is on
- **THEN** tablet mode deactivates, `data-tablet="true"` is removed, and `document.exitFullscreen()` is called if the document is currently fullscreen

#### Scenario: Fullscreen API unavailable (iOS Safari)
- **WHEN** `document.fullscreenEnabled` is false or undefined
- **THEN** tablet mode still activates (compact layout applies) and no fullscreen API call is made, with no error thrown

#### Scenario: Fullscreen exited externally (Escape key)
- **WHEN** the browser exits fullscreen via Escape or any external means while tablet mode is active
- **THEN** tablet mode remains active (compact layout stays) and the toggle button reflects that fullscreen is no longer active

### Requirement: Compact layout in tablet mode
When tablet mode is active, the Layout SHALL reduce padding and gaps to maximise usable space for chart content.

#### Scenario: Compact padding applied
- **WHEN** `data-tablet="true"` is present on the Layout root
- **THEN** the main content area padding is reduced to ≤ 0.75rem and inter-component gaps are reduced to ≤ 0.5rem

#### Scenario: Desktop layout unaffected
- **WHEN** tablet mode is not active
- **THEN** all existing padding and gap values remain unchanged

### Requirement: Side-by-side chart layout in landscape tablet mode
When tablet mode is active AND the device is in landscape orientation, the EnergyChart and InverterChart SHALL render side-by-side (two equal columns) instead of stacked vertically.

#### Scenario: Landscape side-by-side
- **WHEN** `data-tablet="true"` is set AND the viewport matches `(orientation: landscape)`
- **THEN** EnergyChart occupies the left column (~50% width) and InverterChart occupies the right column (~50% width)

#### Scenario: Portrait stacked
- **WHEN** `data-tablet="true"` is set AND the viewport matches `(orientation: portrait)`
- **THEN** EnergyChart and InverterChart stack vertically (single column), same as default layout

#### Scenario: Landscape without tablet mode
- **WHEN** tablet mode is off AND the viewport is landscape (e.g. resized desktop browser)
- **THEN** charts remain stacked vertically — side-by-side does NOT activate without explicit tablet mode

### Requirement: Tablet mode state persists to localStorage
The tablet mode on/off state SHALL be saved to `localStorage` under the key `displayPrefs.tabletMode` so that it survives page reload.

#### Scenario: State saved on toggle
- **WHEN** the user toggles tablet mode on or off
- **THEN** `localStorage.setItem('displayPrefs.tabletMode', ...)` is called with the new boolean value

#### Scenario: State restored on load
- **WHEN** the page loads and `localStorage` contains `displayPrefs.tabletMode: true`
- **THEN** tablet mode activates immediately on mount (compact layout applies; fullscreen is NOT re-entered automatically on load)
