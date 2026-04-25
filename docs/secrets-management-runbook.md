# Secrets Management Runbook

## Overview

All application secrets are stored in **AWS Secrets Manager** under the path `soroban-loyalty/production`. The backend fetches secrets at startup via the AWS SDK (`backend/src/secrets.ts`). No secrets are stored in `.env` files, environment variables, or source control in production.

## Architecture

```
AWS Secrets Manager
  └── soroban-loyalty/production  (JSON, 90-day rotation)
        ├── DATABASE_URL
        ├── POSTGRES_PASSWORD
        ├── REWARDS_CONTRACT_ID
        ├── CAMPAIGN_CONTRACT_ID
        └── TOKEN_CONTRACT_ID

Kubernetes (via External Secrets Operator)
  └── ExternalSecret → Secret/soroban-loyalty-secrets (refreshed every 1h)

Backend (Node.js)
  └── loadSecrets() at startup → populates process.env
```

## Initial Setup

### 1. Provision the secret (Terraform)

```bash
cd infra/secrets
terraform init
terraform apply -var="rotation_lambda_arn=arn:aws:lambda:us-east-1:123456789:function:SecretsManagerRotator"
```

### 2. Populate real values

```bash
aws secretsmanager put-secret-value \
  --secret-id soroban-loyalty/production \
  --secret-string '{
    "DATABASE_URL": "postgres://loyalty:<password>@<host>:5432/soroban_loyalty",
    "POSTGRES_PASSWORD": "<password>",
    "REWARDS_CONTRACT_ID": "<contract-id>",
    "CAMPAIGN_CONTRACT_ID": "<contract-id>",
    "TOKEN_CONTRACT_ID": "<contract-id>"
  }'
```

### 3. Grant application access

Attach the `soroban-loyalty-read-secret` IAM policy (output by Terraform) to:
- **ECS**: the ECS task execution role
- **Kubernetes**: the IRSA role bound to the `soroban-loyalty-sa` service account

### 4. Set the SECRETS_ARN env var

Set `SECRETS_ARN` to the secret ARN (Terraform output) in:
- ECS task definition environment
- Kubernetes ConfigMap (`infra/k8s/base/configmap.yaml`)

This is the **only** non-secret env var needed. All secrets are fetched at runtime.

## Secret Rotation

Database credentials rotate automatically every **90 days** via the AWS-managed Lambda rotator. The rotation Lambda:
1. Creates a new password in the database.
2. Updates the secret value in Secrets Manager.
3. Tests the new credentials.
4. Marks the rotation complete.

The backend fetches the secret fresh on each startup, so a pod restart after rotation picks up the new credentials automatically. The External Secrets Operator syncs the K8s Secret every hour.

## Emergency Rotation Procedure

If a secret is compromised, rotate immediately:

```bash
# 1. Force immediate rotation
aws secretsmanager rotate-secret \
  --secret-id soroban-loyalty/production \
  --rotate-immediately

# 2. Restart all backend pods to pick up the new secret
kubectl rollout restart deployment/backend -n soroban-loyalty
# (or for blue-green: restart both slots)
kubectl rollout restart deployment/backend-blue deployment/backend-green -n soroban-loyalty

# 3. Verify health
kubectl rollout status deployment/backend -n soroban-loyalty
curl https://api.soroban-loyalty.example.com/health
```

For Stellar secret keys (contract admin keys), rotation requires:
1. Deploy a new admin key via the contract's `set_admin` function.
2. Update the secret in Secrets Manager.
3. Restart backend pods.

## Audit Logging

All `GetSecretValue` calls are logged to **AWS CloudTrail**. To query recent access:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=soroban-loyalty/production \
  --query 'Events[*].{Time:EventTime,User:Username,Event:EventName}'
```

## Local Development

For local development, secrets continue to be loaded from `.env` (dotenv). The `loadSecrets()` function is a no-op when `SECRETS_ARN` is not set.

```bash
cp .env.example .env
# Fill in values in .env — never commit this file
```

`.env` is in `.gitignore` and must never be committed.
