## REMOVED Requirements

### Requirement: Manual TOU schedule refresh
**Reason**: TOU schedule refresh is now the responsibility of the bridge server, which runs it on an automatic schedule. The UI no longer needs a trigger for this.
**Migration**: The `POST /api/tou/refresh` endpoint remains available on the bridge for direct server-side invocation.

#### Scenario: Refresh TOU button is absent
- **WHEN** the TrueupPanel renders
- **THEN** no "Refresh TOU" button SHALL be present in the DOM

#### Scenario: No cooldown or toast state
- **WHEN** the TrueupPanel mounts
- **THEN** no cooldown timer, toast notification, or refreshing indicator SHALL be rendered or tracked
