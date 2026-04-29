## Context

`TrueupPanel` currently has two distinct responsibilities: (1) fetching and displaying the true-up cost estimate, and (2) triggering an external TOU schedule refresh via OpenEI. The second responsibility belongs on the server, not in the UI. This design removes the client-side trigger and all associated state.

## Goals / Non-Goals

**Goals:**
- Remove the Refresh TOU button and all state that exists solely to support it
- Leave `TrueupPanel` as a read-only estimate viewer (date pickers + Fetch)
- Leave no dead code: remove the `refreshTou` import, cooldown state, toast state, and their effects

**Non-Goals:**
- Implementing the server-side scheduled refresh (separate bridge change)
- Changing the estimate fetch logic, date pickers, or layout beyond the header simplification
- Removing the `refreshTou` function from `src/api/tou.ts` (it remains for future server tooling use)

## Decisions

**Remove the entire cooldown + toast subsystem** rather than just hiding the button.
Rationale: `isRefreshing`, `cooldownUntil`, `tickNow`, `isCoolingDown`, `cooldownSecsLeft`, and two `useEffect`s exist solely for the button. Leaving them as dead state would silently accumulate technical debt.

**Keep `refreshTou` in `src/api/tou.ts`** but remove its import from `TrueupPanel`.
Rationale: The function is a thin API wrapper. Deleting it now would require re-adding it when the server-side scheduler is wired up with tooling. The module is small and the export has no runtime cost.

**Simplify `panelHeader` layout** — if the header div exists only to position the title alongside the button, collapse it to just the `<h2>` title.
Rationale: Removes a layout wrapper that has no purpose without the button.

## Risks / Trade-offs

- [Users lose manual rate refresh] → Acceptable; bridge will schedule this automatically. The `POST /api/tou/refresh` endpoint remains on the server for direct use.
- [Rate schedule may be stale until bridge scheduled refresh is built] → Known; out of scope for this change.

## Open Questions

- None. The bridge-side scheduler is a separate, follow-up change to `enphase-bridge`.
