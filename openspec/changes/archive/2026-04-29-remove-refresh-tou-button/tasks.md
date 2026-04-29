## 1. Remove TrueupPanel button and state

- [x] 1.1 Remove `isRefreshing` state and `setIsRefreshing` calls
- [x] 1.2 Remove `cooldownUntil` state and `setCooldownUntil` calls
- [x] 1.3 Remove `tickNow` state and `setTickNow` calls
- [x] 1.4 Remove `toast` state and `setToast` calls
- [x] 1.5 Remove `handleRefreshTou` async handler function
- [x] 1.6 Remove cooldown countdown `useEffect` (the one keyed on `cooldownUntil`)
- [x] 1.7 Remove toast auto-clear `useEffect` (the one keyed on `toast`)
- [x] 1.8 Remove `isCoolingDown` and `cooldownSecsLeft` derived values
- [x] 1.9 Remove the `refreshTou` import from `@/api/tou`
- [x] 1.10 Remove the toast render block (`{toast && ...}`)
- [x] 1.11 Remove the `Refresh TOU` button element from JSX
- [x] 1.12 Simplify `panelHeader` — if it only wraps the `<h2>` title now, remove the wrapper div and keep just the `<h2>`

## 2. Verify no dead code remains

- [x] 2.1 Confirm `ApiError` import is still used (it is, for `getErrorMessage`) — no change needed
- [x] 2.2 Run `npm run typecheck` — zero errors
- [x] 2.3 Run `npm run lint` — zero warnings
- [x] 2.4 Run `npm test` — all tests pass
