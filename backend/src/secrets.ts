/**
 * secrets.ts — fetch application secrets from AWS Secrets Manager at startup.
 *
 * All secrets are loaded once into process.env so the rest of the app
 * continues to use process.env without changes. Call loadSecrets() before
 * any other initialisation (db pool, RPC client, etc.).
 *
 * Required env vars (set in ECS task definition / K8s ConfigMap — NOT secrets):
 *   AWS_REGION          — e.g. "us-east-1"
 *   SECRETS_ARN         — ARN of the JSON secret in AWS Secrets Manager
 *
 * The secret value must be a JSON object, e.g.:
 *   {
 *     "DATABASE_URL": "postgres://...",
 *     "POSTGRES_PASSWORD": "...",
 *     "REWARDS_CONTRACT_ID": "...",
 *     "CAMPAIGN_CONTRACT_ID": "...",
 *     "TOKEN_CONTRACT_ID": "..."
 *   }
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const SECRETS_ARN = process.env.SECRETS_ARN;
const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";

export async function loadSecrets(): Promise<void> {
  // In local/dev mode (no SECRETS_ARN), fall back to .env / existing env vars.
  if (!SECRETS_ARN) {
    console.log("[secrets] SECRETS_ARN not set — using local environment variables");
    return;
  }

  const client = new SecretsManagerClient({ region: AWS_REGION });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: SECRETS_ARN })
  );

  if (!response.SecretString) {
    throw new Error(`[secrets] Secret ${SECRETS_ARN} has no SecretString value`);
  }

  const secrets: Record<string, string> = JSON.parse(response.SecretString);

  for (const [key, value] of Object.entries(secrets)) {
    // Only set if not already overridden by the environment (allows local overrides).
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  console.log(`[secrets] Loaded ${Object.keys(secrets).length} secrets from AWS Secrets Manager`);
}
