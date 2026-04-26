import { Pool } from "pg";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

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

export let pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  logger.critical("DB connection error", err);
});

function isAuthError(err: any): boolean {
  return ["28P01", "28000"].includes(err?.code);
}

async function rotatePool(): Promise<void> {
  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) return; // fall back to DATABASE_URL

  try {
    const { SecretString } = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );
    const secret: DbSecret = JSON.parse(SecretString!);
    const newPool = new Pool({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl: { rejectUnauthorized: false },
    });
    const old = pool;
    pool = newPool;
    await old.end().catch(() => {});
  } catch (err) {
    if (isAuthError(err)) logger.error("DB auth error during pool rotation", err);
    else throw err;
  }
}

export async function initDb(): Promise<void> {
  await rotatePool();
}
