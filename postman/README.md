# SorobanLoyalty — Postman Collection

Manual API testing resources for the SorobanLoyalty backend.

## Files

```
postman/
├── SorobanLoyalty.postman_collection.json   # Main collection
└── environments/
    ├── local.postman_environment.json        # http://localhost:3001
    ├── testnet.postman_environment.json      # Stellar testnet
    └── mainnet.postman_environment.json      # Stellar mainnet
```

## Import into Postman

1. Open Postman → **Import**
2. Import `SorobanLoyalty.postman_collection.json`
3. Import the environment file for your target network
4. Select the environment from the top-right dropdown
5. Set `stellar_address` to your Stellar public key

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health (Stellar RPC + DB) |
| `GET` | `/campaigns` | List campaigns (`?limit=20&offset=0`) |
| `GET` | `/campaigns/:id` | Get campaign by ID |
| `GET` | `/user/:address/rewards` | Get rewards for a Stellar address |

## Authentication

The REST API has no token-based auth on read endpoints.

**Claim / Redeem** operations are submitted directly to the Soroban RPC from the frontend after being signed by the [Freighter](https://www.freighter.app/) wallet. They are not REST endpoints. Reference requests are included in the collection under **Soroban RPC (reference)** for documentation purposes.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `base_url` | Backend API base URL |
| `stellar_address` | Your Stellar public key (56 chars, starts with `G`) |
| `soroban_rpc_url` | Soroban JSON-RPC endpoint |
| `token_contract_id` | Deployed LYT token contract ID |
| `campaign_contract_id` | Deployed campaign contract ID |
| `rewards_contract_id` | Deployed rewards contract ID |

Contract IDs are populated automatically by `scripts/deploy-contracts.sh` into `.env`. Copy them into the relevant Postman environment after deployment.
