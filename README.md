[![CI](https://github.com/thedandano/enphase-bridge-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/thedandano/enphase-bridge-dashboard/actions/workflows/ci.yml)
[![Docker](https://ghcr-badge.egpl.dev/thedandano/enphase-bridge-dashboard/latest_tag?color=%2344cc11&label=docker)](https://github.com/thedandano/enphase-bridge-dashboard/pkgs/container/enphase-bridge-dashboard)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

# enphase-bridge-dashboard

React dashboard for the [enphase-bridge](https://github.com/thedandano/enphase-bridge) solar monitoring daemon. Displays real-time energy production, consumption, grid import/export, inverter health, and true-up cost estimates.

## Current Dashboard

- **Header health** shows bridge online/stale/offline state, token lifetime, data freshness, tablet/fullscreen mode, and display settings.
- **Flow strip** gives a compact live view of production, consumption, grid import/export, and battery-style flow status.
- **Energy Flow** shows production, consumption, grid import, and grid export over the selected time range. The Area/Bars selector lives inside this chart and persists in the browser. The `today` view keeps a full midnight-to-midnight x-axis even while the day is still in progress.
- **Inverter Heatmap** sits beside Energy Flow. It follows the selected time range and supports:
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
