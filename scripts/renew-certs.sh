#!/usr/bin/env bash
# Certbot-based SSL renewal for non-Kubernetes (Docker Compose) deployments.
# Runs via cron: 0 0 * * * /path/to/renew-certs.sh >> /var/log/cert-renewal.log 2>&1
#
# Prerequisites:
#   - certbot installed (apt install certbot / brew install certbot)
#   - DOMAIN and ACME_EMAIL set in environment or .env
#   - Port 80 accessible for HTTP-01 challenge (or configure DNS plugin)

set -euo pipefail

DOMAIN="${DOMAIN:?DOMAIN env var required}"
ACME_EMAIL="${ACME_EMAIL:?ACME_EMAIL env var required}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
RENEW_DAYS=30

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

alert_slack() {
  local msg="$1"
  if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"🔐 SSL Renewal: ${msg}\"}" || true
  fi
}

# Check days until expiry
days_until_expiry() {
  local expiry
  expiry=$(openssl x509 -enddate -noout -in "${CERT_DIR}/cert.pem" 2>/dev/null \
    | sed 's/notAfter=//')
  local expiry_epoch
  expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry" +%s)
  echo $(( (expiry_epoch - $(date +%s)) / 86400 ))
}

if [[ -f "${CERT_DIR}/cert.pem" ]]; then
  days=$(days_until_expiry)
  log "Certificate expires in ${days} days."
  if (( days > RENEW_DAYS )); then
    log "No renewal needed (> ${RENEW_DAYS} days remaining)."
    exit 0
  fi
  log "Renewing certificate (${days} days remaining)..."
fi

# Attempt renewal
if certbot certonly \
    --non-interactive \
    --agree-tos \
    --email "$ACME_EMAIL" \
    --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    -d "*.${DOMAIN}" \
    --expand; then
  log "Certificate renewed successfully."
  alert_slack "✅ Certificate for ${DOMAIN} renewed successfully."
  # Reload nginx / docker services if running
  docker compose -f "$(dirname "$0")/../docker-compose.yml" exec -T nginx nginx -s reload 2>/dev/null || true
else
  log "ERROR: Certificate renewal failed!"
  alert_slack "🚨 Certificate renewal FAILED for ${DOMAIN}. Runbook: https://github.com/Dev-Odun-oss/Soroban-Loyalty/wiki/Runbooks#ssl-renewal"
  exit 1
fi
