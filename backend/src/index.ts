import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { campaignRouter } from "./routes/campaign.routes";
import { rewardRouter } from "./routes/reward.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { startIndexer } from "./indexer/indexer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/campaigns", campaignRouter);
app.use("/", rewardRouter);
app.use("/analytics", analyticsRouter);

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, async () => {
  console.log(`[server] listening on port ${PORT}`);
  if (process.env.ENABLE_INDEXER !== "false") {
    await startIndexer();
  }
});

export default app;
