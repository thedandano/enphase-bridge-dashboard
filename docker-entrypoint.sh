#!/bin/sh
set -e

# 1. Validate BRIDGE_API_URL
if ! echo "$BRIDGE_API_URL" | grep -qE '^https?://[A-Za-z0-9._-]+(:[0-9]+)?(/.*)?$'; then
  echo "ERROR: BRIDGE_API_URL is invalid or not set: '$BRIDGE_API_URL'" >&2
  exit 1
fi

# 2. envsubst only $BRIDGE_API_URL and $BRIDGE_API_KEY (not nginx $variables)
envsubst '$BRIDGE_API_URL $BRIDGE_API_KEY' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# 3. Run nginx in foreground
exec nginx -g 'daemon off;'
