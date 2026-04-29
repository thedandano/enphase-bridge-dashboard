## Why

The "Refresh TOU" button in `TrueupPanel` triggers an external OpenEI API call from the browser, but this responsibility belongs on the server. The bridge will handle TOU schedule refreshes automatically on a schedule, making the button unnecessary.

## What Changes

- Remove the `Refresh TOU` button and its `aria-label` from `TrueupPanel`
- Remove `handleRefreshTou` async handler
- Remove cooldown state: `isRefreshing`, `cooldownUntil`, `tickNow`, `isCoolingDown`, `cooldownSecsLeft`
- Remove cooldown countdown `useEffect`
- Remove toast state and toast auto-clear `useEffect`
- Remove toast render block
- Remove `refreshTou` import from `@/api/tou`
- Remove `panelHeader` layout wrapper if it becomes empty (keep only the title)

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `trueup-panel`: The panel no longer has a manual TOU refresh action; it is read-only (date range + fetch only).

## Impact

- `src/components/TrueupPanel.tsx` — significant reduction; remove ~60 lines of state and handler code
- `src/api/tou.ts` — `refreshTou` export may become unused (verify and remove import; the export itself can stay for server-side tooling)
- No API contract changes; `POST /api/tou/refresh` endpoint is unchanged on the bridge
