# Merchant Onboarding Guide

Welcome to **SorobanLoyalty** — the on-chain loyalty platform built on the Stellar network. This guide walks you through everything you need to start rewarding your customers with LYT tokens.

---

## Table of Contents

1. [Account Setup](#1-account-setup)
2. [Creating a Campaign](#2-creating-a-campaign)
3. [Monitoring Campaign Performance](#3-monitoring-campaign-performance)
4. [Deactivating a Campaign](#4-deactivating-a-campaign)
5. [LYT Token Economics](#5-lyt-token-economics)
6. [Best Practices](#6-best-practices)

---

## 1. Account Setup

### Wallet Requirements

SorobanLoyalty uses the **Freighter** browser wallet to sign transactions on the Stellar network. You need Freighter installed before you can create campaigns.

1. Install the [Freighter extension](https://www.freighter.app/) for Chrome or Firefox.
2. Create a new wallet or import an existing Stellar account.
3. Switch to the correct network:
   - **Testnet** for development and testing
   - **Mainnet** for live campaigns

### Funding Your Account

Campaign creation requires a small XLM balance to cover Stellar transaction fees (typically < 0.001 XLM per transaction).

- **Testnet**: Use the [Stellar Friendbot](https://friendbot.stellar.org/) to fund your testnet account for free.
- **Mainnet**: Purchase XLM from any major exchange and send it to your Freighter wallet address.

> Your wallet address is shown in the Freighter extension. It starts with `G` and is 56 characters long.

### Connecting Your Wallet

1. Navigate to the SorobanLoyalty app.
2. Click **Connect Wallet** in the top-right corner.
3. Approve the connection request in the Freighter popup.
4. Your wallet address will appear in the header once connected.

---

## 2. Creating a Campaign

### Navigate to the Merchant Page

Go to **Merchant** in the navigation bar. This page lists all campaigns associated with your wallet address and provides the campaign creation form.

### Campaign Fields

| Field | Description | Example |
|---|---|---|
| **Reward Amount** | LYT tokens awarded per claim | `100` |
| **Expiration** | Unix timestamp when the campaign ends | `1767225600` (2026-01-01) |

**Converting a date to a Unix timestamp:**

```
# macOS / Linux
date -d "2026-01-01" +%s

# Online tool
https://www.unixtimestamp.com/
```

### Submitting the Campaign

1. Fill in the reward amount and expiration date.
2. Click **Create Campaign**.
3. Freighter will open — review the transaction details and click **Approve**.
4. Wait for the transaction to be confirmed on-chain (usually 5–10 seconds).
5. Your new campaign will appear in the campaign list with status **Active**.

> Each campaign is stored on the Stellar blockchain. The transaction is irreversible once confirmed, but you can deactivate a campaign at any time.

---

## 3. Monitoring Campaign Performance

### Analytics Dashboard

Navigate to **Analytics** in the navigation bar to view aggregated performance metrics:

| Metric | Description |
|---|---|
| **Total Claims** | Number of times users have claimed rewards from your campaigns |
| **Total LYT Distributed** | Sum of all LYT tokens minted through claims |
| **Redemption Rate** | Percentage of claimed LYT that has been redeemed (burned) |
| **Claims Over Time** | Daily claim volume chart |
| **Claims per Campaign** | Breakdown of claims by individual campaign |

### Per-Campaign Stats

On the **Merchant** page, each campaign card shows:
- Current status (Active / Inactive / Expired)
- Total claims to date
- Reward amount per claim
- Expiration date

### Interpreting the Data

- A **high redemption rate** (> 60%) indicates users find real value in your rewards.
- A **low claim rate** relative to your user base may indicate the reward amount is too low or the campaign is not visible enough.
- Monitor the **Claims Over Time** chart for spikes that correlate with marketing activity.

---

## 4. Deactivating a Campaign

You can deactivate a campaign before its expiration date. Deactivated campaigns stop accepting new claims immediately.

1. Go to the **Merchant** page.
2. Find the campaign you want to deactivate.
3. Click **Deactivate**.
4. Approve the transaction in Freighter.
5. The campaign status changes to **Inactive**.

> Deactivation is on-chain and permanent — you cannot reactivate a campaign once it is deactivated. Create a new campaign if you want to resume rewarding users.

---

## 5. LYT Token Economics

### What is LYT?

**LYT** is the fungible loyalty token native to SorobanLoyalty. It is a Soroban-based token on the Stellar network with the following properties:

- **Minting**: LYT is minted by the Rewards contract when a user successfully claims a reward. Only the Rewards contract can mint LYT.
- **Burning**: LYT is burned (destroyed) when a user redeems their tokens. Redemption is irreversible.
- **Transfer**: LYT can be transferred between Stellar accounts like any other Stellar asset.

### Token Flow

```
Merchant creates campaign (reward_amount = 100 LYT)
        │
        ▼
User claims reward → Rewards contract mints 100 LYT → User's balance +100 LYT
        │
        ▼
User redeems LYT → Rewards contract burns LYT → User's balance decreases
```

### How Reward Amounts Are Determined

The `reward_amount` you set is the number of LYT tokens minted per claim. There is no fixed exchange rate between LYT and fiat currency — the value of LYT is determined by what you offer in exchange for redemptions (discounts, products, services).

**Example**: If you offer a 10% discount for every 500 LYT redeemed, and your average order value is $50, then 500 LYT ≈ $5 in value. Setting `reward_amount = 100` means users earn $1 worth of rewards per claim.

---

## 6. Best Practices

### Setting Reward Amounts

- **Start conservative**: Begin with a reward amount that represents 1–5% of your average transaction value.
- **Be consistent**: Changing reward amounts between campaigns can confuse users. Use a new campaign for new reward tiers.
- **Round numbers**: Use round numbers (50, 100, 500) — they are easier for users to track.

### Setting Expiration Dates

- **Minimum 30 days**: Short campaigns reduce user motivation to claim.
- **Align with promotions**: Set expiration to match seasonal promotions or product launches.
- **Communicate clearly**: Tell users when a campaign expires so they claim before it ends.

### Campaign Strategy

- Run **one active campaign at a time** to avoid splitting user attention.
- Use the **Analytics** page to review performance before launching a follow-up campaign.
- Consider a **tiered approach**: a base campaign with a modest reward and a limited-time campaign with a higher reward for special events.

### Security

- Never share your Freighter seed phrase with anyone.
- Always verify transaction details in Freighter before approving — check the reward amount and contract address.
- Use a dedicated merchant wallet separate from your personal funds.
