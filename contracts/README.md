# Smart Contracts — SorobanLoyalty

Three Soroban contracts implement the on-chain loyalty logic. They are deployed to the Stellar network and interact with each other via cross-contract calls.

---

## Contracts Overview

| Contract | Crate | Purpose |
|---|---|---|
| `token` | `soroban-loyalty-token` | Fungible LYT token — mint, burn, transfer |
| `campaign` | `soroban-loyalty-campaign` | Merchants create and manage reward campaigns |
| `rewards` | `soroban-loyalty-rewards` | Users claim rewards (mints LYT) and redeem them (burns LYT) |

---

## Token Contract (`contracts/token/src/lib.rs`)

### Purpose

Implements a custom fungible token (LYT) with admin-controlled minting. It does **not** implement the full SEP-41 interface — it is purpose-built for the loyalty platform.

### Functions

| Function | Auth required | Description |
|---|---|---|
| `initialize(admin, name, symbol, decimals)` | — | One-time setup. Panics if called again. |
| `mint(to, amount)` | Admin | Mint `amount` LYT to `to`. Amount must be > 0. |
| `burn(from, amount)` | `from` | Burn `amount` from `from`. Balance must be sufficient. |
| `transfer(from, to, amount)` | `from` | Transfer `amount` from `from` to `to`. |
| `balance(addr)` | — | Read balance of `addr`. |
| `total_supply_view()` | — | Read total token supply. |
| `admin_address()` | — | Read current admin address. |
| `name()` / `symbol()` / `decimals()` | — | Read token metadata. |
| `set_admin(new_admin)` | Admin | Transfer admin role to `new_admin`. |

### Storage Layout

| Key | Storage type | Value type | Description |
|---|---|---|---|
| `DataKey::Admin` | Instance | `Address` | Contract admin (minter) |
| `DataKey::Name` | Instance | `String` | Token name |
| `DataKey::Symbol` | Instance | `String` | Token symbol |
| `DataKey::Decimals` | Instance | `u32` | Decimal places |
| `DataKey::TotalSupply` | Instance | `i128` | Running total supply |
| `DataKey::Balance(Address)` | Persistent | `i128` | Per-address balance |

### Events

| Topic | Data | Emitted on |
|---|---|---|
| `(MINT, "to", to)` | `amount: i128` | Successful mint |
| `(BURN, "from", from)` | `amount: i128` | Successful burn |
| `(TRANSFER, "from", from)` | `(to: Address, amount: i128)` | Successful transfer |

---

## Campaign Contract (`contracts/campaign/src/lib.rs`)

### Purpose

Merchants create campaigns that define a reward amount and an expiration timestamp. The rewards contract reads campaign data and increments the claim counter via `record_claim`.

### Functions

| Function | Auth required | Description |
|---|---|---|
| `initialize(admin)` | — | One-time setup. Sets admin and seeds `NextId = 1`. |
| `create_campaign(merchant, reward_amount, expiration)` | `merchant` | Creates a new campaign. Returns the new campaign ID. |
| `set_active(campaign_id, active)` | Campaign merchant | Activate or deactivate a campaign. |
| `record_claim(campaign_id)` | — | Increments `total_claimed`. Called by the rewards contract. |
| `get_campaign(campaign_id)` | — | Returns the full `Campaign` struct. |
| `is_active(campaign_id)` | — | Returns `true` if `active == true` and not yet expired. |

### Storage Layout

| Key | Storage type | Value type | Description |
|---|---|---|---|
| `DataKey::Admin` | Instance | `Address` | Contract admin |
| `DataKey::NextId` | Instance | `u64` | Auto-increment campaign ID counter |
| `DataKey::Campaign(u64)` | Persistent | `Campaign` | Campaign data by ID |

#### `Campaign` struct

```rust
pub struct Campaign {
    pub id: u64,
    pub merchant: Address,
    pub reward_amount: i128,   // LYT amount per claim
    pub expiration: u64,       // Unix timestamp (seconds)
    pub active: bool,
    pub total_claimed: u64,
}
```

### Events

| Topic | Data | Emitted on |
|---|---|---|
| `(CAM_CRT, "id", id)` | `merchant: Address` | Campaign created |
| `(CAM_UPD, "id", id)` | `active: bool` | Campaign activated / deactivated |

---

## Rewards Contract (`contracts/rewards/src/lib.rs`)

### Purpose

Entry point for user interactions. `claim_reward` verifies the campaign is active, prevents double-claims, mints LYT to the user, and increments the campaign counter. `redeem_reward` burns LYT from the user.

### Functions

| Function | Auth required | Description |
|---|---|---|
| `initialize(admin, token_contract, campaign_contract)` | — | One-time setup. Stores contract addresses. |
| `claim_reward(user, campaign_id)` | `user` | Claim reward for a campaign. Mints LYT. |
| `redeem_reward(user, amount)` | `user` | Redeem (burn) `amount` LYT. |
| `has_claimed_view(user, campaign_id)` | — | Check if `user` has already claimed for `campaign_id`. |

### Storage Layout

| Key | Storage type | Value type | Description |
|---|---|---|---|
| `DataKey::Admin` | Instance | `Address` | Contract admin |
| `DataKey::TokenContract` | Instance | `Address` | Token contract address |
| `DataKey::CampaignContract` | Instance | `Address` | Campaign contract address |
| `DataKey::Claimed(Address, u64)` | Persistent | `bool` | Double-claim guard per (user, campaign) |

### Events

| Topic | Data | Emitted on |
|---|---|---|
| `(RWD_CLM, "user", user)` | `(campaign_id: u64, amount: i128)` | Reward claimed |
| `(RWD_RDM, "user", user)` | `amount: i128` | Reward redeemed |

---

## Cross-Contract Interaction Diagram

```
User
 │
 │  claim_reward(user, campaign_id)
 ▼
RewardsContract
 │
 ├─► CampaignContract.is_active(campaign_id)        [read]
 ├─► CampaignContract.get_campaign(campaign_id)     [read]
 ├─► CampaignContract.record_claim(campaign_id)     [write]
 └─► TokenContract.mint(user, reward_amount)        [write — admin call]

 │  redeem_reward(user, amount)
 ▼
RewardsContract
 └─► TokenContract.burn(user, amount)               [write]

Merchant
 │
 │  create_campaign(merchant, reward_amount, expiration)
 ▼
CampaignContract                                    [standalone, no cross-calls]
```

The rewards contract is the **only** caller of `TokenContract.mint`. This is enforced by setting the rewards contract address as the token admin during deployment.

---

## Authorization Model

| Action | Who can call |
|---|---|
| Mint LYT | Token admin only (= rewards contract address) |
| Burn LYT | The token holder (`from.require_auth()`) |
| Transfer LYT | The sender (`from.require_auth()`) |
| Create campaign | Any address (becomes the campaign merchant) |
| Deactivate campaign | The campaign's `merchant` address only |
| Claim reward | The claiming user (`user.require_auth()`) |
| Redeem reward | The redeeming user (`user.require_auth()`) |
| `record_claim` | No auth check — callable by anyone; only increments a counter |
| `set_admin` (token) | Current token admin |

> `record_claim` has no auth guard by design: it only increments a counter and the rewards contract is the only caller in normal operation. A future improvement would restrict it to the rewards contract address.

---

## Security Assumptions and Invariants

1. **Double-claim prevention** — `DataKey::Claimed(user, campaign_id)` is written to persistent storage *before* the external `mint` call. This prevents reentrancy from allowing a second claim in the same invocation.

2. **Overflow-safe arithmetic** — All additions use `checked_add` / Rust's `overflow-checks = true` in release builds. Subtraction is guarded by explicit balance assertions.

3. **Mint authority** — `TokenContract.mint` requires the caller to be the stored admin. The deploy script sets the rewards contract as admin, so no external party can mint LYT.

4. **Expiration is ledger-time** — `is_active` compares against `env.ledger().timestamp()`, which is the Stellar network ledger close time. It cannot be manipulated by the caller.

5. **One-time initialization** — All three contracts check for the presence of `DataKey::Admin` in instance storage and panic if `initialize` is called a second time.

---

## Known Limitations and Edge Cases

- **`record_claim` is unauthenticated** — any account can call it and inflate `total_claimed`. This is a cosmetic issue (the counter is informational) but should be restricted in a production upgrade.
- **No campaign update function** — once created, `reward_amount` and `expiration` are immutable. A merchant can only deactivate a campaign, not edit it.
- **`set_admin` is single-step** — transferring the token admin is immediate with no confirmation step. A two-step transfer (propose + accept) would be safer in production.
- **No pagination on campaigns** — the contract has no built-in way to enumerate all campaign IDs. The backend indexer tracks them via on-chain events.
- **LYT is not SEP-41 compliant** — the token does not implement the full Stellar Asset Contract interface, so it cannot be used directly with DEXes or other SEP-41-aware tooling without modification.
