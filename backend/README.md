# SorobanLoyalty — Backend Service

Node.js / Express API server for the SorobanLoyalty platform. Indexes on-chain Soroban events into PostgreSQL and exposes a REST API consumed by the frontend.

## Table of Contents

- [Architecture](#architecture)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [npm Scripts](#npm-scripts)
- [API Overview](#api-overview)
- [Database Schema](#database-schema)
- [Indexer](#indexer)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
Soroban RPC
    │  (event polling every 5s)
    ▼
Indexer (src/indexer/indexer.ts)
    │  upserts rows
    ▼
PostgreSQL
    │  SQL queries
    ▼
Services (campaign.service.ts / reward.service.ts)
    │
    ▼
Routes  → Express app (src/index.ts) → REST API :3001
```

The indexer and the HTTP server run in the same Node.js process. The indexer is disabled by setting `ENABLE_INDEXER=false`.

---

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or Docker)

### With Docker (recommended)

Starts PostgreSQL, the Soroban local node, backend, and frontend together:

```bash
# From the repo root
cp .env.example .env          # fill in contract IDs after deploying
docker-compose up --build
```

Backend is available at `http://localhost:3001`.

### Without Docker

**1. Start PostgreSQL**

```bash
# Using Docker just for the DB
docker-compose up postgres -d
```

Or point `DATABASE_URL` at any running PostgreSQL instance and apply the schema:

```bash
psql "$DATABASE_URL" -f ../database/schema.sql
```

**2. Install dependencies**

```bash
cd backend
npm install
```

**3. Configure environment**

```bash
cp ../.env.example ../.env
# Edit .env — at minimum set DATABASE_URL and SOROBAN_RPC_URL
```

**4. Start the dev server**

```bash
npm run dev
```

The server reloads automatically on file changes via `ts-node-dev`.

---

## Environment Variables

All variables are read from `.env` at the repo root (or from the process environment).

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string, e.g. `postgres://user:pass@localhost:5432/soroban_loyalty` |
| `SOROBAN_RPC_URL` | ✅ | `http://localhost:8000/soroban/rpc` | Soroban RPC endpoint |
| `NETWORK_PASSPHRASE` | ✅ | Testnet passphrase | Stellar network passphrase |
| `REWARDS_CONTRACT_ID` | ✅ | — | Deployed rewards contract ID |
| `CAMPAIGN_CONTRACT_ID` | ✅ | — | Deployed campaign contract ID |
| `PORT` | ❌ | `3001` | HTTP port the server listens on |
| `ENABLE_INDEXER` | ❌ | `true` | Set to `false` to run the API without the event indexer |

---

## npm Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `ts-node-dev --respawn src/index.ts` | Start dev server with hot reload |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/index.js` | Run compiled production build |
| `lint` | `eslint src --ext .ts` | Lint TypeScript source files |

There is no dedicated migrate script — the schema is applied via `database/schema.sql`. Re-run it against your database whenever the schema changes:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

---

## API Overview

Base URL: `http://localhost:3001`

### Health

| Method | Path | Response |
|---|---|---|
| `GET` | `/health` | `{ "status": "ok" }` |

### Campaigns

| Method | Path | Description |
|---|---|---|
| `GET` | `/campaigns` | List all campaigns ordered by creation date |
| `GET` | `/campaigns/:id` | Get a single campaign by numeric ID |

**Example response — `GET /campaigns`**

```json
{
  "campaigns": [
    {
      "id": 1,
      "merchant": "GABC...XYZ",
      "reward_amount": 100,
      "expiration": 1800000000,
      "active": true,
      "total_claimed": 42,
      "tx_hash": "abc123...",
      "created_at": "2026-04-01T10:00:00.000Z"
    }
  ]
}
```

### Rewards

| Method | Path | Description |
|---|---|---|
| `GET` | `/user/:address/rewards` | Get all rewards for a Stellar address (56 chars) |

**Example response — `GET /user/GABC.../rewards`**

```json
{
  "rewards": [
    {
      "id": "uuid",
      "user_address": "GABC...XYZ",
      "campaign_id": 1,
      "amount": 100,
      "redeemed": false,
      "redeemed_amount": 0,
      "claimed_at": "2026-04-10T12:00:00.000Z",
      "redeemed_at": null
    }
  ]
}
```

> Claim and redeem transactions are submitted directly from the frontend to the Soroban RPC (signed by Freighter). The backend only reads on-chain events — it never holds private keys.

---

## Database Schema

Defined in `database/schema.sql`. Four tables:

### `users`

Stores unique Stellar addresses that have interacted with the platform.

| Column | Type | Notes |
|---|---|---|
| `address` | `VARCHAR(56)` | Primary key — Stellar public key |
| `created_at` | `TIMESTAMPTZ` | First seen timestamp |

### `campaigns`

One row per on-chain campaign, upserted by the indexer on `CAM_CRT` events.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT` | On-chain campaign ID (primary key) |
| `merchant` | `VARCHAR(56)` | Merchant Stellar address |
| `reward_amount` | `BIGINT` | LYT tokens per claim |
| `expiration` | `BIGINT` | Unix timestamp |
| `active` | `BOOLEAN` | Whether the campaign is active |
| `total_claimed` | `BIGINT` | Running claim count |
| `tx_hash` | `VARCHAR(64)` | Creation transaction hash |

### `rewards`

One row per (user, campaign) pair. Unique constraint prevents double-claim at the DB level.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `user_address` | `VARCHAR(56)` | FK → `users.address` |
| `campaign_id` | `BIGINT` | FK → `campaigns.id` |
| `amount` | `BIGINT` | LYT tokens claimed |
| `redeemed` | `BOOLEAN` | Whether tokens have been redeemed |
| `redeemed_amount` | `BIGINT` | Tokens burned on redeem |
| `claimed_at` | `TIMESTAMPTZ` | Claim timestamp |
| `redeemed_at` | `TIMESTAMPTZ` | Redeem timestamp (nullable) |

### `transactions`

Append-only ledger of all indexed on-chain events. `tx_hash` is unique.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `tx_hash` | `VARCHAR(64)` | Unique transaction hash |
| `type` | `VARCHAR(32)` | `claim`, `redeem`, or `campaign_created` |
| `user_address` | `VARCHAR(56)` | Nullable |
| `campaign_id` | `BIGINT` | Nullable |
| `amount` | `BIGINT` | Nullable |
| `ledger` | `BIGINT` | Ledger sequence number |

### `indexer_state`

Single-row key/value table used by the indexer to persist its cursor across restarts.

| Column | Type | Notes |
|---|---|---|
| `key` | `VARCHAR(64)` | Primary key (currently only `cursor`) |
| `value` | `TEXT` | Paging token from the last processed event |

---

## Indexer

`src/indexer/indexer.ts` polls the Soroban RPC for contract events every **5 seconds**.

### How it works

1. On startup, reads the last paging token from `indexer_state`.
2. Calls `rpcServer.getEvents()` with filters for `CAMPAIGN_CONTRACT_ID` and `REWARDS_CONTRACT_ID`.
3. Processes up to 100 events per poll:
   - `CAM_CRT` → upserts a row in `campaigns` + records a `campaign_created` transaction
   - `RWD_CLM` → upserts a row in `rewards` + records a `claim` transaction
   - `RWD_RDM` → records a `redeem` transaction
4. Saves the paging token of the last processed event so the next poll continues from there.

### Disabling the indexer

Set `ENABLE_INDEXER=false` to run the API without polling (useful for read-only replicas or testing):

```bash
ENABLE_INDEXER=false npm run dev
```

---

## Troubleshooting

**`Error: connect ECONNREFUSED 127.0.0.1:5432`**
PostgreSQL is not running. Start it with `docker-compose up postgres -d` or check your `DATABASE_URL`.

**`Error: connect ECONNREFUSED 127.0.0.1:8000`**
The Soroban local node is not running. Start it with `docker-compose up soroban-local -d` or update `SOROBAN_RPC_URL` to point at testnet (`https://soroban-testnet.stellar.org`).

**Indexer logs `poll error: getEvents failed`**
The contract IDs in `.env` are empty or incorrect. Deploy the contracts first (`scripts/deploy-contracts.sh`) and copy the output IDs into `.env`.

**`relation "indexer_state" does not exist`**
The schema hasn't been applied. Run:
```bash
psql "$DATABASE_URL" -f database/schema.sql
```

**TypeScript compilation errors after pulling changes**
```bash
npm install   # pick up any new dependencies
npm run build
```
