import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { campaignRouter } from "./routes/campaign.routes";
import { rewardRouter } from "./routes/reward.routes";
import { startIndexer } from "./indexer/indexer";
import { rpcServer } from "./soroban";
import { pool } from "./db";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  const startTime = Date.now();
  const checks: any = {
    stellar: { reachable: false, latency: 0 },
    database: { connected: false, responseTime: 0 },
    indexer: { running: true }
  };

  // Check Stellar network
  try {
    const stellarStart = Date.now();
    await rpcServer.getHealth();
    checks.stellar.reachable = true;
    checks.stellar.latency = Date.now() - stellarStart;
  } catch (err) {
    checks.stellar.reachable = false;
  }

  // Check database
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    checks.database.connected = true;
    checks.database.responseTime = Date.now() - dbStart;
  } catch (err) {
    checks.database.connected = false;
  }

  const allHealthy = checks.stellar.reachable && checks.database.connected;
  const status = allHealthy ? 'healthy' : (checks.stellar.reachable || checks.database.connected) ? 'degraded' : 'unhealthy';

  res.json({
    status,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use("/campaigns", campaignRouter);
app.use("/", rewardRouter);

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, async () => {
  console.log(`[server] listening on port ${PORT}`);
  if (process.env.ENABLE_INDEXER !== "false") {
    await startIndexer();
  }
});

export default app;
