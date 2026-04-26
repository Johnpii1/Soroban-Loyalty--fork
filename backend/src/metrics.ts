import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from "prom-client";

export const registry = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register: registry });

/** Total HTTP requests by method, route, and status code */
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

/** HTTP request duration histogram */
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

/** DB pool active connections */
export const dbPoolActive = new Gauge({
  name: "db_pool_active_connections",
  help: "Number of active DB pool connections",
  registers: [registry],
});

/** DB pool idle connections */
export const dbPoolIdle = new Gauge({
  name: "db_pool_idle_connections",
  help: "Number of idle DB pool connections",
  registers: [registry],
});

/** DB pool waiting requests */
export const dbPoolWaiting = new Gauge({
  name: "db_pool_waiting_requests",
  help: "Number of requests waiting for a DB connection",
  registers: [registry],
});

/** Indexer lag in blocks */
export const indexerLagBlocks = new Gauge({
  name: "indexer_lag_blocks",
  help: "Number of blocks the indexer is behind the chain tip",
  registers: [registry],
});

/** Total events processed by the indexer */
export const indexerEventsTotal = new Counter({
  name: "indexer_events_processed_total",
  help: "Total number of on-chain events processed by the indexer",
  registers: [registry],
});

/** Total RPC poll failures (before backoff retry) */
export const indexerPollErrors = new Counter({
  name: "indexer_poll_errors_total",
  help: "Total number of RPC poll errors encountered by the indexer",
  registers: [registry],
});

/** Total events sent to the dead-letter store after exhausting retries */
export const indexerDeadLetters = new Counter({
  name: "indexer_dead_letters_total",
  help: "Total number of events that failed processing after all retries",
  registers: [registry],
});

/** Current exponential backoff delay in milliseconds */
export const indexerBackoffMs = new Gauge({
  name: "indexer_backoff_ms",
  help: "Current exponential backoff delay applied to the indexer poll loop",
  registers: [registry],
});
