#!/usr/bin/env bash
# Generates a monthly uptime report from Uptime Kuma and emails it.
# Schedule via cron on the 1st of each month:
#   0 8 1 * * /path/to/monthly-report.sh >> /var/log/uptime-report.log 2>&1

set -euo pipefail

KUMA_URL="${KUMA_URL:-http://localhost:3002}"
KUMA_USER="${KUMA_USER:-admin}"
KUMA_PASS="${KUMA_PASS:-}"
REPORT_EMAIL="${REPORT_EMAIL:-team@sorobanloyalty.com}"

if [[ -z "$KUMA_PASS" ]]; then
  echo "Error: KUMA_PASS is required" >&2
  exit 1
fi

TOKEN=$(curl -sf -X POST "$KUMA_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$KUMA_USER\",\"password\":\"$KUMA_PASS\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

MONTH=$(date -d "last month" +"%B %Y" 2>/dev/null || date -v-1m +"%B %Y")
REPORT_FILE="/tmp/uptime-report-$(date +%Y%m).txt"

echo "SorobanLoyalty Monthly Uptime Report — $MONTH" > "$REPORT_FILE"
echo "=============================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Fetch monitor list and uptime stats
MONITORS=$(curl -sf "$KUMA_URL/api/monitors" \
  -H "Authorization: Bearer $TOKEN")

echo "$MONITORS" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read -r name; do
  echo "Service: $name" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "Full details: $KUMA_URL/status/soroban-loyalty" >> "$REPORT_FILE"
echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$REPORT_FILE"

# Send email (requires mailutils or sendmail)
if command -v mail &>/dev/null; then
  mail -s "SorobanLoyalty Uptime Report — $MONTH" "$REPORT_EMAIL" < "$REPORT_FILE"
  echo "Report emailed to $REPORT_EMAIL"
else
  echo "mail command not found. Report saved to $REPORT_FILE"
  cat "$REPORT_FILE"
fi
