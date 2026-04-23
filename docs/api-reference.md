# API Reference — SorobanLoyalty Backend

Base URL: `http://localhost:3001` (local) or your deployed backend URL.

All responses are JSON. All timestamps are Unix seconds (integer) unless noted.

---

## Authentication

The backend API is **read-only** — it exposes indexed on-chain data. No authentication is required for any endpoint.

Write operations (claim, redeem, create campaign) are submitted **directly to the Soroban RPC** from the frontend, signed by the user's Freighter wallet. The backend never handles private keys.

---

## Endpoints

### Health

#### `GET /health`

Returns the operational status of the backend and its dependencies.

**Request parameters:** none

**Response `200 OK`**

```json
{
  "status": "healthy",
  "checks": {
    "stellar": {
      "reachable": true,
      "latency": 42
    },
    "database": {
      "connected": true,
      "responseTime": 3
    },
    "indexer": {
      "running": true
    }
  },
  "timestamp": "2026-04-23T22:00:00.000Z",
  "uptime": 3600.5
}
```

| Field | Type | Description |
|---|---|---|
| `status` | `"healthy" \| "degraded" \| "unhealthy"` | Overall status. `healthy` = all checks pass; `degraded` = at least one passes; `unhealthy` = all fail. |
| `checks.stellar.reachable` | `boolean` | Whether the Soroban RPC responded successfully. |
| `checks.stellar.latency` | `number` | RPC round-trip time in milliseconds. |
| `checks.database.connected` | `boolean` | Whether PostgreSQL responded to a ping. |
| `checks.database.responseTime` | `number` | DB ping round-trip time in milliseconds. |
| `checks.indexer.running` | `boolean` | Whether the event indexer is active. |
| `timestamp` | `string` | ISO 8601 timestamp of the health check. |
| `uptime` | `number` | Process uptime in seconds. |

**Example**

```bash
curl http://localhost:3001/health
```

---

### Campaigns

#### `GET /campaigns`

Returns a paginated list of all campaigns indexed from the blockchain.

**Query parameters**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | `integer` | No | `20` | Number of campaigns to return. Max `100`. |
| `offset` | `integer` | No | `0` | Number of campaigns to skip (for pagination). |

**Response `200 OK`**

```json
{
  "campaigns": [
    {
      "id": 1,
      "merchant": "GABC...XYZ",
      "reward_amount": 100,
      "expiration": 1745000000,
      "active": true,
      "total_claimed": 42,
      "tx_hash": "abc123...",
      "created_at": "2026-04-19T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

| Field | Type | Description |
|---|---|---|
| `campaigns` | `Campaign[]` | Array of campaign objects (see schema below). |
| `total` | `integer` | Total number of campaigns in the database (ignores pagination). |

**Campaign object**

| Field | Type | Description |
|---|---|---|
| `id` | `integer` | Unique campaign ID (auto-incremented on-chain). |
| `merchant` | `string` | Stellar public key of the campaign creator. |
| `reward_amount` | `integer` | LYT tokens awarded per claim. |
| `expiration` | `integer` | Unix timestamp after which the campaign is expired. |
| `active` | `boolean` | Whether the merchant has activated the campaign. |
| `total_claimed` | `integer` | Number of times the reward has been claimed. |
| `tx_hash` | `string \| null` | Transaction hash of the creation event. |
| `created_at` | `string` | ISO 8601 timestamp when the record was indexed. |

**Error responses**

| Status | Body | Condition |
|---|---|---|
| `500` | `{ "error": "Failed to fetch campaigns" }` | Database error. |

**Example**

```bash
# First page
curl "http://localhost:3001/campaigns?limit=20&offset=0"

# Second page
curl "http://localhost:3001/campaigns?limit=20&offset=20"
```

---

#### `GET /campaigns/:id`

Returns a single campaign by its on-chain ID.

**Path parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `integer` | Yes | Campaign ID. |

**Response `200 OK`**

```json
{
  "campaign": {
    "id": 1,
    "merchant": "GABC...XYZ",
    "reward_amount": 100,
    "expiration": 1745000000,
    "active": true,
    "total_claimed": 42,
    "tx_hash": "abc123...",
    "created_at": "2026-04-19T10:00:00.000Z"
  }
}
```

**Error responses**

| Status | Body | Condition |
|---|---|---|
| `400` | `{ "error": "Invalid id" }` | `id` is not a valid integer. |
| `404` | `{ "error": "Not found" }` | No campaign with that ID exists. |
| `500` | `{ "error": "Failed to fetch campaign" }` | Database error. |

**Example**

```bash
curl http://localhost:3001/campaigns/1
```

---

### Rewards

#### `GET /user/:address/rewards`

Returns all rewards claimed by a specific Stellar address.

**Path parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `address` | `string` | Yes | 56-character Stellar public key (G…). |

**Response `200 OK`**

```json
{
  "rewards": [
    {
      "id": "uuid-here",
      "user_address": "GABC...XYZ",
      "campaign_id": 1,
      "amount": 100,
      "redeemed": false,
      "redeemed_amount": 0,
      "claimed_at": "2026-04-20T12:00:00.000Z",
      "redeemed_at": null,
      "campaign_reward": 100
    }
  ]
}
```

**Reward object**

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID primary key. |
| `user_address` | `string` | Stellar public key of the reward holder. |
| `campaign_id` | `integer` | ID of the campaign this reward belongs to. |
| `amount` | `integer` | LYT amount awarded. |
| `redeemed` | `boolean` | Whether any portion has been redeemed (burned). |
| `redeemed_amount` | `integer` | Total LYT burned by the user for this reward. |
| `claimed_at` | `string` | ISO 8601 timestamp of the claim event. |
| `redeemed_at` | `string \| null` | ISO 8601 timestamp of the most recent redeem, or `null`. |
| `campaign_reward` | `integer` | The campaign's `reward_amount` at time of indexing (joined field). |

**Error responses**

| Status | Body | Condition |
|---|---|---|
| `400` | `{ "error": "Invalid Stellar address" }` | Address is missing or not 56 characters. |
| `500` | `{ "error": "Failed to fetch rewards" }` | Database error. |

**Example**

```bash
curl http://localhost:3001/user/GABC...XYZ/rewards
```

---

## Error Format

All error responses follow the same shape:

```json
{ "error": "<human-readable message>" }
```

---

## Notes

- **No write endpoints** — claim and redeem are on-chain operations submitted directly from the frontend to the Soroban RPC. The backend only indexes the resulting events.
- **Eventual consistency** — after a transaction is submitted, the indexer may take a few seconds to process the event and reflect it in the API responses.
- **Pagination** — use `limit` and `offset` on `GET /campaigns` for large datasets. The `total` field in the response lets you calculate the number of pages.
