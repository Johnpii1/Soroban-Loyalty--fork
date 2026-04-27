# Security Model

This document describes the trust boundaries, authorization checks, and security assumptions of the SorobanLoyalty platform. It is intended for security auditors, new team members, and external integrators.

---

## Trust Model

```
┌──────────────────────────────────────────────────────────────────┐
│                         Actors                                   │
│                                                                  │
│  Admin ──────────────────────────────────────────────────────┐  │
│  (deploy-time keypair)                                        │  │
│                                                               ▼  │
│  Merchant ──────────────────────────────────────────► Campaign Contract │
│  (Freighter wallet)                                           │  │
│                                                               │  │
│  User ──────────────────────────────────────────────► Rewards Contract  │
│  (Freighter wallet)                                           │  │
│                                                               ▼  │
│                                                        Token Contract   │
│                                                        (mint/burn)      │
└──────────────────────────────────────────────────────────────────┘
```

| Actor | Trust Level | Capabilities |
|---|---|---|
| Admin | Highest | Initialize contracts, mint tokens, set new admin |
| Merchant | Medium | Create/deactivate their own campaigns |
| User | Low | Claim rewards for active campaigns, redeem (burn) their own tokens |
| Rewards Contract | Delegated | Mint tokens on behalf of users (set as token admin at deploy) |
| Backend | Read-only | Index on-chain events; no signing authority |

---

## Authorization Checks per Contract Function

### Token Contract (`contracts/token/src/lib.rs`)

| Function | Auth Required | Notes |
|---|---|---|
| `initialize` | None (one-shot) | Panics if called twice |
| `mint` | Admin (`require_auth`) | Only the Rewards contract address (set as admin at deploy) |
| `burn` | `from` address | User burns their own tokens |
| `transfer` | `from` address | Standard transfer |
| `approve` | `owner` address | Sets allowance for a spender |
| `transfer_from` | `spender` address | Spender must have sufficient allowance from `from` |
| `set_admin` | Current admin | Admin rotation |

### Campaign Contract (`contracts/campaign/src/lib.rs`)

| Function | Auth Required | Notes |
|---|---|---|
| `initialize` | None (one-shot) | Panics if called twice |
| `create_campaign` | `merchant` address | Merchant creates their own campaign |
| `set_active` | Campaign's `merchant` | Only the original merchant can deactivate |
| `record_claim` | None | Intended to be called only by Rewards contract; see Known Limitations |
| `get_campaign` | None | Read-only view |
| `get_campaign_metadata` | None | Read-only view |
| `is_active` | None | Read-only view |

### Rewards Contract (`contracts/rewards/src/lib.rs`)

| Function | Auth Required | Notes |
|---|---|---|
| `initialize` | None (one-shot) | Panics if called twice |
| `claim` | `user` address | User claims reward for a campaign |
| `redeem` | `user` address | User redeems (burns) their tokens |

---

## Double-Claim Prevention

The Rewards contract prevents a user from claiming the same campaign twice using a persistent storage flag written **before** the external mint call:

```
1. Check claimed[user][campaign_id] == false  → panic if already claimed
2. Set   claimed[user][campaign_id] = true     ← written first (reentrancy guard)
3. Call  token.mint(user, reward_amount)
4. Call  campaign.record_claim(campaign_id)
```

Writing the claimed flag before the external call ensures that even if a reentrant call were somehow possible in the Soroban execution model, the second invocation would be rejected at step 1.

---

## Allowance Mechanism (ERC-20 Style)

The token contract supports delegated transfers via `approve` / `transfer_from`:

- `approve(owner, spender, amount)` — owner authorizes spender for up to `amount` tokens.
- `transfer_from(spender, from, to, amount)` — spender transfers on behalf of `from`; allowance is decremented atomically.
- Allowance is stored in persistent storage keyed by `(owner, spender)`.
- Setting allowance to `0` effectively revokes it.

**Risk**: Allowance front-running (the ERC-20 approve/transferFrom race) is mitigated by setting allowance to `0` before changing it to a new non-zero value when reducing an existing allowance.

---

## Admin Key Management

### Initial Setup

The admin key is the Rewards contract address, set during the deploy script (`scripts/deploy-contracts.sh`). No human keypair holds the token admin role in production.

### Rotation Procedure

1. Deploy a new Rewards contract (or use a multisig address).
2. Call `token.set_admin(new_admin)` from the current admin.
3. Verify `token.admin_address()` returns the new address.
4. Revoke / archive the old admin key from secrets storage.

All admin keys are stored in AWS Secrets Manager. See [secrets-management-runbook.md](secrets-management-runbook.md) for rotation procedures.

### Principle of Least Privilege

- The backend service has **no signing keys**; it only reads on-chain state via Soroban RPC.
- Freighter wallets sign transactions client-side; private keys never leave the browser.

---

## Known Attack Vectors and Mitigations

| Vector | Mitigation |
|---|---|
| Double-claim | Claimed flag written before external call (see above) |
| Integer overflow in balances | `checked_add` / Rust `overflow-checks = true` in release profile |
| Unauthorized mint | Token admin is the Rewards contract address, not a human key |
| Campaign created with past expiry | `assert!(expiration > env.ledger().timestamp())` |
| Metadata spam (large name/description) | `name ≤ 64 bytes`, `description ≤ 256 bytes` enforced on-chain |
| Allowance front-running | Set allowance to 0 before changing to a new value |
| Secret key exposure | All keys via environment variables / AWS Secrets Manager; never in code |
| Dependency vulnerabilities | `cargo audit` and `npm audit` run in CI; Dependabot for automated PRs |
| `record_claim` called by arbitrary address | Known limitation — see below |

### Known Limitation: `record_claim` Authorization

`record_claim` on the Campaign contract currently has no caller restriction. An attacker could inflate `total_claimed` without a real claim. This is a cosmetic counter and does not affect token balances or claim eligibility. A future improvement is to restrict callers to the Rewards contract address (stored at initialize time).

---

## On-Chain Storage Cost Analysis (Issue #121)

Adding `name` (max 64 bytes) and `description` (max 256 bytes) to each Campaign entry increases persistent storage per campaign by up to **320 bytes**.

On Soroban, persistent storage is charged per ledger entry and per byte. At current testnet fee parameters (~0.0001 XLM per 1 KB per ledger), 320 bytes adds approximately **0.000032 XLM per campaign per ledger** in rent. For a campaign with a 30-day lifetime (~259,200 ledgers at 10s/ledger), the additional cost is approximately **0.008 XLM** per campaign — negligible relative to the base campaign storage cost.

---

## Security Contact and Responsible Disclosure

**Security contact**: security@soroban-loyalty.example.com

If you discover a vulnerability:

1. **Do not** open a public GitHub issue.
2. Email security@soroban-loyalty.example.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive an acknowledgement within **48 hours**.
4. We aim to release a fix within **14 days** for critical issues and **30 days** for high issues.
5. We will credit researchers in the release notes unless anonymity is requested.

We follow a coordinated disclosure policy. Public disclosure is coordinated with the reporter after a fix is deployed.
