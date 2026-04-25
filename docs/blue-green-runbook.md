# Blue-Green Deployment Runbook

## Overview

Two identical environments (**blue** and **green**) run in the `soroban-loyalty` namespace. The active-slot Kubernetes Services route traffic to whichever slot is currently live. Switching traffic is instantaneous (a label-selector patch) and fully reversible.

```
Internet → Ingress → Service (selector: slot=blue OR slot=green)
                         ├── backend-blue  / frontend-blue
                         └── backend-green / frontend-green
```

## Normal Deployment Flow

1. **Identify the idle slot** — the slot not currently receiving traffic.
   ```bash
   kubectl get svc backend -n soroban-loyalty -o jsonpath='{.spec.selector.slot}'
   # e.g. "blue" → idle slot is "green"
   ```

2. **Deploy new images to the idle slot** (CI does this automatically on push to `main`):
   ```bash
   kubectl set image deployment/backend-green \
     backend=ghcr.io/dev-odun-oss/soroban-loyalty-backend:<new-tag> \
     -n soroban-loyalty
   kubectl set image deployment/frontend-green \
     frontend=ghcr.io/dev-odun-oss/soroban-loyalty-frontend:<new-tag> \
     -n soroban-loyalty
   ```

3. **Run database migrations** (must be backward-compatible with the live blue version):
   ```bash
   kubectl run migrate --rm -it --restart=Never \
     --image=ghcr.io/dev-odun-oss/soroban-loyalty-backend:<new-tag> \
     -n soroban-loyalty \
     -- npm run migrate
   ```

4. **Switch traffic** — the script verifies readiness, switches, runs smoke tests, and auto-rolls back on failure:
   ```bash
   ./scripts/blue-green-switch.sh green
   ```
   Expected output:
   ```
   ==> Verifying 'green' slot is ready...
   ==> Switching traffic: blue → green
   ==> Running smoke tests...
   OK:   https://api.soroban-loyalty.example.com/health → 200
   OK:   https://soroban-loyalty.example.com → 200
   ==> Switch complete. Live slot: green
   ```

5. **Scale down the idle slot** once confident:
   ```bash
   kubectl scale deployment/backend-blue frontend-blue \
     -n soroban-loyalty --replicas=0
   ```

## Rollback Procedure

### Automatic rollback (smoke test failure)
The switch script automatically reverts the Service selector if smoke tests fail. No manual action needed.

### Manual rollback
```bash
# Immediately restore traffic to the previous slot
./scripts/blue-green-switch.sh blue --rollback

# Or patch directly
kubectl patch svc backend frontend -n soroban-loyalty \
  --type=json \
  -p '[{"op":"replace","path":"/spec/selector/slot","value":"blue"}]'
```

Rollback is instantaneous — the blue pods are still running and warm.

## Database Migration Compatibility

Migrations **must** be backward-compatible during the transition window (both slots running simultaneously):

- **Additive only**: add columns/tables, never drop or rename in the same release.
- **Two-phase migrations**: if a rename is needed, add the new column in release N, migrate data, drop the old column in release N+1.
- **No breaking constraint changes** while both versions are live.

## Deployment Duration Target

| Step | Target time |
|---|---|
| Image build + push | ~2 min |
| Rollout wait | ~1 min |
| Traffic switch + smoke tests | ~30 s |
| **Total** | **< 5 min** |

## Smoke Tests

The switch script tests:
- `GET /health` on the backend API → HTTP 200
- `GET /` on the frontend → HTTP 200

Add additional smoke tests by extending `scripts/blue-green-switch.sh`.

## CI/CD Integration

The `.github/workflows/blue-green-deploy.yml` workflow automates the full flow on every push to `main`. Manual deploys can be triggered via `workflow_dispatch` with a `slot` input.

Required GitHub secrets/vars:
- `KUBECONFIG_B64` — base64-encoded kubeconfig
- `vars.BACKEND_URL` — live backend URL for smoke tests
- `vars.FRONTEND_URL` — live frontend URL for smoke tests
