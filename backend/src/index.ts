import dotenv from "dotenv";
import { loadSecrets } from "./secrets";
import { startIndexer } from "./indexer/indexer";
import { createApp } from "./app";
import { logger } from "./logger";

// Load .env first (no-op in production where env vars are injected),
// then fetch secrets from AWS Secrets Manager before any other init.
dotenv.config();
await loadSecrets();
const app = createApp();

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
