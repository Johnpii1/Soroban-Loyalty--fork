import { Pool, PoolClient } from "pg";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

// ── Secret shape stored in AWS Secrets Manager ────────────────────────────────
interface DbSecret {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

pool.on("error", (err) => {
  logger.critical("DB connection error", err);
});

function isAuthError(err: any): boolean {
  // PostgreSQL error codes for authentication / password failures
  return ["28P01", "28000"].includes(err?.code);
}

// ── Initialise pool from Secrets Manager on startup ──────────────────────────
export async function initDb(): Promise<void> {
  await rotatePool();
}
