#!/usr/bin/env bash
# blue-green-switch.sh — zero-downtime traffic switch between blue and green slots.
#
# Usage:
#   ./scripts/blue-green-switch.sh <blue|green> [--rollback]
#
# The script:
#   1. Verifies the target slot is fully ready (all pods passing readiness probes).
#   2. Patches the backend and frontend Services to point at the target slot.
#   3. Runs smoke tests against the live endpoint.
#   4. On failure, automatically reverts the Service selector (rollback).
#
# Requirements: kubectl, curl, jq

set -euo pipefail

NAMESPACE="soroban-loyalty"
TARGET_SLOT="${1:-}"
ROLLBACK="${2:-}"

usage() {
  echo "Usage: $0 <blue|green> [--rollback]"
  exit 1
}

[[ "$TARGET_SLOT" == "blue" || "$TARGET_SLOT" == "green" ]] || usage

CURRENT_SLOT=$(kubectl get svc backend -n "$NAMESPACE" \
  -o jsonpath='{.spec.selector.slot}')

if [[ "$TARGET_SLOT" == "$CURRENT_SLOT" && "$ROLLBACK" != "--rollback" ]]; then
  echo "Traffic is already pointing at '$TARGET_SLOT'. Nothing to do."
  exit 0
fi

echo "==> Verifying '$TARGET_SLOT' slot is ready..."
for deploy in backend-"$TARGET_SLOT" frontend-"$TARGET_SLOT"; do
  kubectl rollout status deployment/"$deploy" -n "$NAMESPACE" --timeout=120s
done

echo "==> Switching traffic: $CURRENT_SLOT → $TARGET_SLOT"
for svc in backend frontend; do
  kubectl patch svc "$svc" -n "$NAMESPACE" \
    --type=json \
    -p "[{\"op\":\"replace\",\"path\":\"/spec/selector/slot\",\"value\":\"$TARGET_SLOT\"}]"
done

echo "==> Running smoke tests..."
BACKEND_URL="${BACKEND_URL:-https://api.soroban-loyalty.example.com}"
FRONTEND_URL="${FRONTEND_URL:-https://soroban-loyalty.example.com}"

smoke_test() {
  local url="$1"
  local expected_status="${2:-200}"
  local status
  status=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [[ "$status" != "$expected_status" ]]; then
    echo "FAIL: $url returned $status (expected $expected_status)"
    return 1
  fi
  echo "OK:   $url → $status"
}

if ! smoke_test "$BACKEND_URL/health" 200 || ! smoke_test "$FRONTEND_URL" 200; then
  echo "==> Smoke tests FAILED. Rolling back to '$CURRENT_SLOT'..."
  for svc in backend frontend; do
    kubectl patch svc "$svc" -n "$NAMESPACE" \
      --type=json \
      -p "[{\"op\":\"replace\",\"path\":\"/spec/selector/slot\",\"value\":\"$CURRENT_SLOT\"}]"
  done
  echo "==> Rollback complete. Traffic restored to '$CURRENT_SLOT'."
  exit 1
fi

echo "==> Switch complete. Live slot: $TARGET_SLOT"
echo "    Previous slot '$CURRENT_SLOT' is idle — scale down when ready:"
echo "    kubectl scale deployment/backend-$CURRENT_SLOT frontend-$CURRENT_SLOT \\"
echo "      -n $NAMESPACE --replicas=0"
