#!/usr/bin/env bash
# Provisions Uptime Kuma monitors via its REST API after first-run setup.
# Run AFTER creating your admin account in the Uptime Kuma UI.
#
# Usage:
#   KUMA_URL=http://localhost:3002 KUMA_USER=admin KUMA_PASS=yourpassword ./provision-monitors.sh

set -euo pipefail

KUMA_URL="${KUMA_URL:-http://localhost:3002}"
KUMA_USER="${KUMA_USER:-admin}"
KUMA_PASS="${KUMA_PASS:-}"

if [[ -z "$KUMA_PASS" ]]; then
  echo "Error: KUMA_PASS is required" >&2
  exit 1
fi

# Login and get token
TOKEN=$(curl -sf -X POST "$KUMA_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$KUMA_USER\",\"password\":\"$KUMA_PASS\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$TOKEN" ]]; then
  echo "Error: Login failed" >&2
  exit 1
fi

echo "Logged in. Provisioning monitors..."

create_monitor() {
  local name="$1" url="$2" keyword="$3"
  local body="{\"type\":\"http\",\"name\":\"$name\",\"url\":\"$url\",\"interval\":60,\"maxretries\":1,\"upsideDown\":false"
  if [[ -n "$keyword" ]]; then
    body="$body,\"keyword\":\"$keyword\",\"type\":\"keyword\""
  fi
  body="$body}"
  curl -sf -X POST "$KUMA_URL/api/monitors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$body" > /dev/null
  echo "  Created: $name"
}

create_monitor "Frontend" "${FRONTEND_URL:-https://sorobanloyalty.com}" "SorobanLoyalty"
create_monitor "Backend API" "${BACKEND_URL:-https://api.sorobanloyalty.com}/health" "ok"
create_monitor "Soroban RPC" "${RPC_URL:-https://rpc.sorobanloyalty.com/soroban/rpc}" ""

echo "Done. Visit $KUMA_URL/status/soroban-loyalty for the public status page."
