# enphase-bridge-dashboard

A React + TypeScript dashboard for visualizing solar energy data from the [enphase-bridge](../enphase-bridge) daemon.

## Prerequisites

- **[enphase-bridge](../enphase-bridge) must be running** and reachable before starting the dashboard. The dashboard has no data source without it.
- The bridge must bind on `0.0.0.0` (not just `127.0.0.1`) — set `api.host = "0.0.0.0"` in the bridge `config.toml`.
- Docker ≥ 20.10 and Compose V2 (for the Docker path)

## Quick Start (Docker)

```bash
cp .env.example .env          # set BRIDGE_API_URL if bridge isn't on port 8080
docker compose up -d
open http://localhost:3000
```

**`docker-compose.yml`**

```yaml
services:
  dashboard:
    image: ghcr.io/thedandano/enphase-bridge-dashboard:latest
    ports:
      - "3000:80"
    environment:
      BRIDGE_API_URL: ${BRIDGE_API_URL:-http://host.docker.internal:8080}
      # BRIDGE_API_KEY is optional — only set this if you enabled api_key auth in the bridge config.toml
      BRIDGE_API_KEY: ${BRIDGE_API_KEY:-}
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Set `BRIDGE_API_URL` in `.env` (copy from `.env.example`) if your bridge runs on a different host or port. `BRIDGE_API_KEY` is only needed if the bridge has `api.require_key = true` in its `config.toml` — most local installs leave this disabled.

## Quick Start (Dev)

```bash
npm install
npm run dev
```

The dev server proxies `/api/` to `BRIDGE_API_URL` (default: `http://localhost:8080`).

## Development

```bash
npm run dev        # start dev server
npm run typecheck  # type-check without building
npm run lint       # eslint
npm run build      # production build
npm test           # unit tests (vitest, added in M14)
```
