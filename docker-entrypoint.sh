#!/bin/sh
set -e

# 1. Validate BRIDGE_API_URL
if ! printf '%s' "$BRIDGE_API_URL" | grep -qE '^https?://[A-Za-z0-9._-]+(:[0-9]+)?(/.*)?$'; then
  echo "ERROR: BRIDGE_API_URL is invalid or not set: '$BRIDGE_API_URL'" >&2
  exit 1
fi

# 2. Substitute BRIDGE_API_URL; conditionally inject the Authorization header
if [ -n "$BRIDGE_API_KEY" ]; then
  AUTH_LINE="proxy_set_header Authorization \"Bearer ${BRIDGE_API_KEY}\";"
else
  AUTH_LINE=""
fi
export AUTH_LINE

# envsubst: only substitute ${BRIDGE_API_URL} and ${AUTH_LINE}; leave nginx $vars intact
envsubst '$BRIDGE_API_URL $AUTH_LINE' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

# 3. Run nginx in foreground
exec nginx -g 'daemon off;'
