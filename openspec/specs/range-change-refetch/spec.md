## ADDED Requirements

### Requirement: Immediate re-fetch on dependency change
`useAutoRefresh` SHALL accept an optional `deps` array. When any value in `deps` changes between renders, the hook SHALL immediately cancel the current countdown, perform a fresh fetch, and restart the interval — without waiting for the next scheduled tick.

#### Scenario: Range change triggers immediate fetch
- **WHEN** the user selects a new time range in the EnergyChart
- **THEN** the chart fetches data for the new range within one render cycle, not on the next 30 s tick

#### Scenario: No deps provided — behaviour unchanged
- **WHEN** `useAutoRefresh` is called without a `deps` argument
- **THEN** fetch behaviour is identical to the current implementation (fetch on mount, then every 30 s with backoff)

#### Scenario: Countdown resets after range change
- **WHEN** a dep change triggers an immediate fetch
- **THEN** the countdown to the next scheduled refresh restarts from the base interval (30 s)
