import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { loadSecrets } from "./secrets";
import { campaignRouter } from "./routes/campaign.routes";
import { rewardRouter } from "./routes/reward.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { startIndexer } from "./indexer/indexer";
import { rpcServer } from "./soroban";
import { pool } from "./db";
import { registry, httpRequestsTotal, httpRequestDuration, dbPoolActive, dbPoolIdle, dbPoolWaiting } from "./metrics";
import { logger, requestLogger, errorAlertMiddleware } from "./logger";

// ── Startup sequence ──────────────────────────────────────────────────────────
// 1. Load .env (no-op in production where vars are injected)
// 2. Pull secrets from AWS Secrets Manager (populates process.env)
// 3. Validate ALL env vars via Zod — exits with a clear error if anything is
//    missing or malformed. Must happen before any service is initialised.
dotenv.config();
await loadSecrets();

// Dynamic import so env validation runs after secrets are loaded into process.env
const { env } = await import("./env");

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// ── Prometheus HTTP instrumentation ──────────────────────────────────────────
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path ?? req.path;
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
});

// ── /metrics endpoint for Prometheus scraping ─────────────────────────────────
app.get("/metrics", async (_req, res) => {
  dbPoolActive.set(pool.totalCount - pool.idleCount);
  dbPoolIdle.set(pool.idleCount);
  dbPoolWaiting.set(pool.waitingCount);

  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

app.get("/health", async (_req, res) => {
  const checks: any = {
    stellar: { reachable: false, latency: 0 },
    database: { connected: false, responseTime: 0 },
    indexer: { running: true },
  };

  try {
    const stellarStart = Date.now();
    await rpcServer.getHealth();
    checks.stellar.reachable = true;
    checks.stellar.latency = Date.now() - stellarStart;
  } catch {
    checks.stellar.reachable = false;
  }

  try {
    const dbStart = Date.now();
    await pool.query("SELECT 1");
    checks.database.connected = true;
    checks.database.responseTime = Date.now() - dbStart;
  } catch {
    checks.database.connected = false;
  }

  const allHealthy = checks.stellar.reachable && checks.database.connected;
  const status = allHealthy
    ? "healthy"
    : checks.stellar.reachable || checks.database.connected
    ? "degraded"
    : "unhealthy";

  res.json({ status, checks, timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.use("/campaigns", campaignRouter);
app.use("/", rewardRouter);
app.use("/analytics", analyticsRouter);

app.use(errorAlertMiddleware);

process.on("unhandledRejection", (reason) => {
  logger.critical(
    "Unhandled promise rejection",
    reason instanceof Error ? reason : new Error(String(reason))
  );
});
process.on("uncaughtException", (err) => {
  logger.critical("Uncaught exception", err);
  process.exit(1);
});

app.listen(env.PORT, async () => {
  logger.info(`Server listening on port ${env.PORT}`);
  if (env.ENABLE_INDEXER) {
    await startIndexer();
  }
});

export default app;
