## ADDED Requirements

### Requirement: Settings panel gear button in Header
The Header SHALL display a gear icon button (⚙) that toggles a settings overlay panel open and closed. The button SHALL be always visible regardless of tablet mode state.

#### Scenario: Opening settings panel
- **WHEN** the user clicks the gear button while the settings panel is closed
- **THEN** the settings panel opens, positioned below the gear button as an overlay

#### Scenario: Closing settings panel via button
- **WHEN** the user clicks the gear button while the settings panel is open
- **THEN** the settings panel closes

#### Scenario: Closing settings panel via outside click
- **WHEN** the settings panel is open and the user clicks anywhere outside the panel and gear button
- **THEN** the settings panel closes

### Requirement: Per-component visibility toggles
The settings panel SHALL display a toggle (checkbox or switch) for each of the following components: FlowStrip, EnergyChart, InverterChart, InverterDailyTotals, ArrayHealthPanel, TrueupPanel.

#### Scenario: Hiding a component
- **WHEN** the user unchecks a component in the settings panel
- **THEN** that component is immediately removed from the rendered layout (not just hidden with CSS visibility)

#### Scenario: Showing a component
- **WHEN** the user checks a component in the settings panel
- **THEN** that component immediately appears in its normal position in the layout

#### Scenario: All components visible by default
- **WHEN** no `displayPrefs.visible.*` keys exist in localStorage (first load)
- **THEN** all six components are visible

### Requirement: Visibility preferences persist to localStorage
Each component's visibility SHALL be saved to `localStorage` under a dedicated key so preferences survive page reload and are shared between tablet and desktop sessions.

#### Scenario: Visibility saved on toggle
- **WHEN** the user toggles a component's visibility
- **THEN** `localStorage.setItem('displayPrefs.visible.<componentKey>', ...)` is called with the new boolean

#### Scenario: Keys used
- **WHEN** any visibility is saved or read
- **THEN** the following keys SHALL be used exactly: `displayPrefs.visible.flowStrip`, `displayPrefs.visible.energyChart`, `displayPrefs.visible.inverterChart`, `displayPrefs.visible.inverterTotals`, `displayPrefs.visible.arrayHealth`, `displayPrefs.visible.trueup`

#### Scenario: Preferences restored on load
- **WHEN** the page loads and `localStorage` contains visibility keys
- **THEN** the corresponding components are shown or hidden immediately, before first render is visible to the user

### Requirement: DisplayPrefsContext provides state to all components
A React context (`DisplayPrefsContext`) SHALL be the single source of truth for both tablet mode state and component visibility flags. All components that need this state SHALL consume the context rather than receiving props.

#### Scenario: Context available at App root
- **WHEN** the app renders
- **THEN** `DisplayPrefsContext.Provider` wraps the entire component tree so any component can access prefs without prop drilling

#### Scenario: Context value shape
- **WHEN** a component consumes `DisplayPrefsContext`
- **THEN** it receives `{ tabletMode: boolean, toggleTabletMode: () => void, visibleComponents: Record<string, boolean>, toggleComponent: (key: string) => void }`
