[![CI](https://github.com/thedandano/enphase-bridge-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/thedandano/enphase-bridge-dashboard/actions/workflows/ci.yml)
[![Docker](https://ghcr-badge.egpl.dev/thedandano/enphase-bridge-dashboard/latest_tag?color=%2344cc11&label=docker)](https://github.com/thedandano/enphase-bridge-dashboard/pkgs/container/enphase-bridge-dashboard)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

# enphase-bridge-dashboard

React dashboard for the [enphase-bridge](https://github.com/thedandano/enphase-bridge) solar monitoring daemon. Displays real-time energy production, consumption, grid import/export, inverter health, and true-up cost estimates.

## Current Dashboard

- **Header health** shows bridge online/stale/offline state, token lifetime, data freshness, tablet/fullscreen mode, and display settings.
- **Flow strip** gives a compact live view of production, consumption, grid import/export, and battery-style flow status.
- **Energy Flow** shows production, consumption, grid import, and grid export over the selected time range. The Area/Bars selector lives inside this chart and persists in the browser. The `today` view keeps a full midnight-to-midnight x-axis even while the day is still in progress.
- **Inverter Heatmap** sits beside Energy Flow. It follows the selected time range. The mode control is hidden; the dashboard always displays Day shape. The internal transforms support:
  - **Day shape**: aggregates snapshots by inverter and 15-minute local-time slot, so repeated days collapse into one 24-hour profile.
  - **Seasonal**: aggregates snapshots by inverter and calendar day, so longer ranges can show panel changes over time.
  - A centered color legend below the x-axis.
- **Inverter Performance** sits beside True-up. It totals per-inverter output for the selected period, compares each inverter to the period median, and flags inverters below 90% of the leader.
- **Array Health** appears when the bridge exposes named inverter arrays.
- **True-up** shows time-of-use import/export estimates after TOU is configured in the bridge.

Settings let you hide or show major dashboard sections. Preferences are stored in browser `localStorage`.

## Prerequisites

- **Docker ≥ 20.10** with Compose V2 (`docker compose`, not `docker-compose`)
- **[enphase-bridge](https://github.com/thedandano/enphase-bridge) running** and reachable. Set `api.host = "0.0.0.0"` in the bridge `config.toml` so the container can reach it.

## Quick Start

```bash
# 1. Optional: create a local env file

#    BRIDGE_API_URL default works on Mac/Windows with Docker.
#    On Linux, set BRIDGE_API_URL=http://172.17.0.1:8080 (or your bridge host IP)
printf 'BRIDGE_API_URL=http://host.docker.internal:8080\n' > .env

# 2. Start the dashboard
docker compose up -d

# 3. Open http://localhost:3000
```

**Env var precedence:** `.env` file > `docker-compose.yml` env section > Dockerfile default

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BRIDGE_API_URL` | Yes | `http://host.docker.internal:8080` | URL of the enphase-bridge API |
| `BRIDGE_API_KEY` | No | *(empty)* | API key if `api.require_key = true` in bridge config |

## docker-compose.yml

```yaml
services:
  dashboard:
    image: ghcr.io/thedandano/enphase-bridge-dashboard:latest
    ports:
      - "3000:80"
    environment:
      BRIDGE_API_URL: ${BRIDGE_API_URL:-http://host.docker.internal:8080}
      # BRIDGE_API_KEY is optional — only set if you enabled api_key auth in the bridge config.toml
      BRIDGE_API_KEY: ${BRIDGE_API_KEY:-}
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## Troubleshooting

**View logs:**
```bash
docker compose logs -f
```

**API calls return 502 — "Bad Gateway":**
- Check `BRIDGE_API_URL` is reachable from inside the container.
- On Linux, `host.docker.internal` may not resolve — use the host machine IP (e.g. `http://172.17.0.1:8080`) or ensure `extra_hosts: host.docker.internal:host-gateway` is in `docker-compose.yml`.

**Container won't start:**
- Verify `BRIDGE_API_URL` is a valid `http://` or `https://` URL (no trailing slash issues).

**On Linux specifically:**
- `host.docker.internal` is not built-in on Linux Docker. Either set `BRIDGE_API_URL=http://172.17.0.1:8080` or add `extra_hosts: - "host.docker.internal:host-gateway"` to the service in `docker-compose.yml`.

## Enabling TOU Estimates

Time-of-use cost estimates require OpenEI configuration in the bridge first:

1. Add `api_key`, `utility_eia_id`, and `rate_label` to the bridge `config.toml` under the `[tou]` section.
2. Restart `enphase-bridge`.
3. Click **Refresh TOU** in the dashboard.

## Named Inverter Arrays

Array Health depends on named arrays from `enphase-bridge`. Configure arrays in the bridge environment or bridge `config.toml`; the dashboard only reads the resulting `/api/inverters/arrays` response.

When using bridge environment variables, the suffix after `ENPHASE__ARRAYS__` becomes the array name:

```yaml
services:
  bridge:
    environment:
      ENPHASE__ARRAYS__EAST_ROOF: >-
        ["202321152253", "202322032109"]
      ENPHASE__ARRAYS__WEST_ROOF: >-
        ["202322040905", "202322041414"]
```

These names are displayed as arrays by the bridge, for example `east_roof` and `west_roof`.

## Kubernetes

- Replace `BRIDGE_API_URL` with the ClusterDNS service URL pointing to the bridge service.
- Note: `enphase-bridge` requires `hostNetwork: true` on its Pod — it must reach the Envoy IQ gateway on the local network.

## Making the Image Public

The container image is hosted on GitHub Container Registry (ghcr.io). To allow `docker pull` without authentication:

GitHub → Packages → `enphase-bridge-dashboard` → Settings → Change visibility → **Public**

## Development

```bash
npm install
npm run dev        # start dev server (proxies /api/ to BRIDGE_API_URL)
npm run typecheck  # type-check without building
npm run lint       # eslint
npm run build      # production build
npm test           # unit tests (vitest)
npm run test:coverage # unit tests with coverage
npm run test:watch # vitest in watch mode
```

## License

[AGPL v3](LICENSE)

### Browser panel layouts

Use **Create layout** in Array layout to arrange panels without configuring bridge arrays. Each inverter represents one panel. Use one shared roof grid. Add named arrays to group panels, then drag panels from anywhere on a tile into grid cells. The array selector controls the group for new panels; changing a placed panel’s group keeps its position. The next-panel orientation control locks portrait or landscape for upcoming placements until you change it; it never rotates panels already placed. Portrait panels occupy 1×2 cells; landscape panels occupy 2×1. Empty spaces are allowed. Shared grid dimensions range from 2 to 40 cells per side; occupied cells and out-of-bounds moves are rejected.

Use **Save layout** to keep the arrangement in this browser, or **Cancel** to discard edits. The `panelLayout.v1` browser storage entry contains the shared grid dimensions, group names, serials, positions and orientations only. Older separate-grid layouts are combined in memory with empty leading rows removed and a blank row between groups; tall groups are packed beside each other when necessary; original browser storage is kept until Save. Layouts that cannot fit safely are preserved and report an error. Panel values and named-array totals show cumulative estimated energy for the dashboard’s selected period, including previous days, 24h, 7d, and 30d. They reuse the Inverter Performance calculation: each stored watt reading contributes 15 minutes of energy. These are estimates, not measured per-panel energy counters. Solar-cell shading and the Wh/kWh legend use the highest panel total in that period. Online status remains current; an offline panel keeps the energy it produced earlier. Panels with missing energy data stay neutral. Named array totals share one compact summary row that wraps on small screens. Missing readings show **Unavailable**, and array totals are marked **partial** when readings are missing. Failed refreshes preserve successful totals for the same range and display a warning. Switching ranges never shows totals from the old range. Today refreshes through the current time and resets at local midnight.

The unassigned tray suggests an order from reported peak times over the previous seven local calendar days. This does not infer physical roof positions. History is paged with a 50,000-row ceiling; incomplete or failed history is announced. Newly discovered panels remain unassigned, and missing panels keep their saved positions.

Keyboard users can select a panel, Tab to the roof grid, use arrow keys to choose a cell, and press Enter or Space to place it. Escape clears selection. The upcoming orientation and returning to the tray have buttons. On touch screens, drag from anywhere on a panel; the space around panels remains scrollable. Clicking an empty cell does not move a panel.

This version makes no server configuration changes. Layouts do not transfer between browsers, origins, or devices; clearing browser storage removes them. Concurrent tabs use the last successful save. Invalid saved layouts are preserved until you explicitly confirm **Reset saved layout**. Server-configured array summaries remain available until you save a browser layout.

### Releases

Release Please maintains a release PR against `main`. It updates the package version and changelog from conventional commits. Merge the checked release PR to create its GitHub release. The Release workflow then publishes `ghcr.io/thedandano/enphase-bridge-dashboard:v<version>` for amd64 and arm64 from the release commit. Existing main builds continue to publish `latest` and `sha-<commit>`.

The workflow uses `GITHUB_TOKEN`. GitHub does not automatically start PR checks for PRs created with that token. Before merging a release PR, run CI on its exact branch with `gh workflow run ci.yml --ref <release-branch>` and wait for success. Repository Actions settings must allow GitHub Actions to create pull requests. A published image does not update a running homelab container; pull the desired version and recreate the container separately.
