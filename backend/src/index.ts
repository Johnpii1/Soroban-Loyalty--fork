import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { campaignRouter } from "./routes/campaign.routes";
import { rewardRouter } from "./routes/reward.routes";
import { startIndexer } from "./indexer/indexer";
import { logger, requestLogger, errorAlertMiddleware } from "./logger";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/campaigns", campaignRouter);
app.use("/", rewardRouter);

// Global error handler — logs + alerts on unhandled errors
app.use(errorAlertMiddleware);

// Catch unhandled promise rejections and exceptions
process.on("unhandledRejection", (reason) => {
  logger.critical("Unhandled promise rejection", reason instanceof Error ? reason : new Error(String(reason)));
});
process.on("uncaughtException", (err) => {
  logger.critical("Uncaught exception", err);
  process.exit(1);
});

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, async () => {
  logger.info(`Server listening on port ${PORT}`);
  if (process.env.ENABLE_INDEXER !== "false") {
    await startIndexer();
  }
});

export default app;
