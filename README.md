[![CI](https://github.com/thedandano/enphase-bridge-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/thedandano/enphase-bridge-dashboard/actions/workflows/ci.yml)
[![Docker](https://ghcr-badge.egpl.dev/thedandano/enphase-bridge-dashboard/latest_tag?color=%2344cc11&label=docker)](https://github.com/thedandano/enphase-bridge-dashboard/pkgs/container/enphase-bridge-dashboard)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

# enphase-bridge-dashboard

React dashboard for the [enphase-bridge](https://github.com/thedandano/enphase-bridge) solar monitoring daemon. Displays real-time energy production, consumption, grid import/export, inverter health, and true-up cost estimates.

<!-- Screenshots: add after first successful build -->

## Prerequisites

- **Docker ≥ 20.10** with Compose V2 (`docker compose`, not `docker-compose`)
- **[enphase-bridge](https://github.com/thedandano/enphase-bridge) running** and reachable. Set `api.host = "0.0.0.0"` in the bridge `config.toml` so the container can reach it.

## Quick Start

```bash
# 1. Copy env template
cp .env.example .env

# 2. Edit BRIDGE_API_URL to point to your bridge (default works on Mac/Windows with Docker)
#    On Linux, set BRIDGE_API_URL=http://172.17.0.1:8080 (or your bridge host IP)
nano .env

# 3. Start the dashboard
docker compose up -d

# 4. Open http://localhost:3000
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
npm run test:watch # vitest in watch mode
```

## License

[AGPL v3](LICENSE)
