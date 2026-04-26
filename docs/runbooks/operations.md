# Operations Runbook

This runbook contains step-by-step procedures for handling common production scenarios for the SorobanLoyalty platform.

## 1. Service Restart

**When to use it:**
- A service is stuck, deadlocked, or exhibiting unrecoverable memory leaks.
- To apply configuration changes stored in ConfigMaps or Secrets.
- Guided by alerts like `HighErrorRate` or `HighP99Latency`.

**Prerequisites:**
- `kubectl` configured with access to the `soroban-loyalty` namespace.

**Step-by-step commands:**
```bash
# Restart the backend service
kubectl rollout restart deployment/backend -n soroban-loyalty

# Restart the frontend service
kubectl rollout restart deployment/frontend -n soroban-loyalty
```

**Verification steps:**
- Run `kubectl get pods -n soroban-loyalty -w` and verify that new pods enter the `Running` state.
- Ensure the `HighErrorRate` or `HighP99Latency` alerts resolve in Prometheus/Alertmanager.

---

## 2. Indexer Replay

**When to use it:**
- The `IndexerLag` alert triggers and the indexer is hopelessly stuck.
- Data corruption was detected in indexed tables (`campaigns`, `rewards`, `transactions`), requiring a fresh sync from the blockchain tip.

**Prerequisites:**
- `kubectl` configured with access to the `soroban-loyalty` namespace.
- Access to the PostgreSQL database.

**Step-by-step commands:**
```bash
# 1. Connect to the PostgreSQL pod
kubectl exec -it statefulset/postgres -n soroban-loyalty -- psql -U loyalty -d soroban_loyalty

# 2. In the psql prompt, wipe the indexer cursor to force replay from ledger 1
DELETE FROM indexer_state WHERE key = 'cursor';

# 3. Exit psql
\q

# 4. Restart the backend (which runs the indexer) to start the replay
kubectl rollout restart deployment/backend -n soroban-loyalty
```

**Verification steps:**
- Check backend logs: `kubectl logs -l app=backend -n soroban-loyalty -f`. You should see `[indexer] started` and logs indicating events being processed.
- Check Grafana or Prometheus to see `IndexerLag` decreasing.

---

## 3. Secret Rotation

**When to use it:**
- A secret (e.g., Database Password, Contract ID) is compromised.
- Routine security compliance (e.g., 90-day DB password rotation).

**Prerequisites:**
- AWS CLI configured with permissions to Secrets Manager (`soroban-loyalty/db-credentials`).
- `kubectl` access for restarting workloads.

**Step-by-step commands:**
```bash
# 1. Trigger rotation in AWS Secrets Manager
aws secretsmanager rotate-secret --secret-id "soroban-loyalty/db-credentials"

# 2. Wait for rotation to complete (check AWS Console or SNS alert)
# 3. Restart the backend to clear any cached database connections
kubectl rollout restart deployment/backend -n soroban-loyalty
```

**Verification steps:**
- Verify backend logs to ensure it reconnects to the database successfully.
- Verify `HighErrorRate` does not spike.

---

## 4. Database Backup Restore

**When to use it:**
- Accidental data deletion or catastrophic database failure.
- Disaster recovery to a previous known good state.

**Prerequisites:**
- `kubectl` access.
- Access to existing backups (e.g., AWS RDS snapshots or pg_dump files).

**Step-by-step commands:**
*(Assuming restoring from a standard Kubernetes environment with volume snapshots or pg_dump)*

**Option A: Using pg_restore**
```bash
# 1. Scale down backend to prevent new writes during restore
kubectl scale deployment backend --replicas=0 -n soroban-loyalty

# 2. Copy backup file to postgres pod
kubectl cp backup.dump soroban-loyalty/postgres-0:/tmp/backup.dump

# 3. Execute restore
kubectl exec -it postgres-0 -n soroban-loyalty -- pg_restore -U loyalty -d soroban_loyalty -c /tmp/backup.dump

# 4. Scale backend back up
kubectl scale deployment backend --replicas=2 -n soroban-loyalty
```

**Option B: AWS RDS Point-in-Time Restore**
```bash
# 1. Restore from snapshot via AWS CLI
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier soroban-loyalty-db \
    --target-db-instance-identifier soroban-loyalty-db-restored \
    --restore-time "2024-01-01T00:00:00Z"
    
# 2. Update the AWS Secret `soroban-loyalty/db-credentials` with the new host
# 3. Restart backend pods to use the new connection string
kubectl rollout restart deployment/backend -n soroban-loyalty
```

**Verification steps:**
- Verify the backend is functional.
- Validate data consistency via the frontend dashboard or API.

---

## Runbook Update Process

1. **Review:** All runbook updates must be submitted via a Pull Request and reviewed by at least one member of the Operations team.
2. **Testing:** Commands must be tested in a staging or local environment (`docker-compose.yml`) before being merged to ensure they function as expected.
3. **Approval:** Upon approval, merge to the `main` branch. Monitoring alerts should be updated if new procedures are added.
