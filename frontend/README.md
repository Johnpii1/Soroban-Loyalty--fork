# Frontend — SorobanLoyalty

Next.js 14 (App Router) frontend for the SorobanLoyalty platform. Users claim and redeem LYT rewards; merchants create campaigns — all signed on-chain via the Freighter browser extension.

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- [Freighter browser extension](https://www.freighter.app/) installed
- Backend API running (see root README)

### Install & run

```bash
cd frontend
npm install
npm run dev
```

App is available at `http://localhost:3000`.

---

## Environment Variables

Copy `.env.example` from the project root and set the following `NEXT_PUBLIC_*` variables:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend REST API base URL | `http://localhost:3001` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC endpoint | `http://localhost:8000/soroban/rpc` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Stellar network passphrase | `Test SDF Network ; September 2015` |
| `NEXT_PUBLIC_REWARDS_CONTRACT_ID` | Deployed rewards contract address | _(set after deploy)_ |
| `NEXT_PUBLIC_CAMPAIGN_CONTRACT_ID` | Deployed campaign contract address | _(set after deploy)_ |

> All variables are prefixed `NEXT_PUBLIC_` so they are inlined at build time and available in the browser.

---

## Component Architecture

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout — WalletProvider, I18nProvider, nav
│   ├── page.tsx                # Home / redirect
│   ├── dashboard/page.tsx      # Claim rewards, view balance, infinite-scroll campaigns
│   ├── merchant/page.tsx       # Create & manage campaigns
│   ├── analytics/page.tsx      # Campaign performance stats
│   └── transactions/           # Transaction history
├── components/
│   ├── WalletConnector.tsx     # Connect / disconnect Freighter button
│   ├── CampaignCard.tsx        # Campaign display + claim action
│   ├── RewardList.tsx          # User reward list + redeem action
│   ├── NetworkBanner.tsx       # Degraded / unreachable network warning
│   └── NetworkStatusIndicator.tsx  # Status dot in nav
├── context/
│   ├── WalletContext.tsx       # Freighter public key state, connect/disconnect
│   └── I18nContext.tsx         # i18n locale state (en / es)
├── hooks/
│   └── useNetworkStatus.ts     # Polls /health, exposes { health }
└── lib/
    ├── freighter.ts            # Freighter API wrappers
    ├── soroban.ts              # Contract invocation helpers
    ├── api.ts                  # Backend REST client
    └── export.ts               # CSV / JSON data export helpers
```

### Key data flows

- **Claim reward**: `DashboardPage` → `claimReward()` (lib/soroban.ts) → Freighter signs → Soroban RPC submits → backend indexes event → UI refreshes via `api.getUserRewards()`.
- **Create campaign**: `MerchantPage` → `createCampaign()` (lib/soroban.ts) → Freighter signs → Soroban RPC submits.
- **Read data**: All read operations go through the backend REST API (`lib/api.ts`), not directly to the RPC.

---

## Freighter Integration

Freighter is a Stellar browser extension wallet. The integration lives in `src/lib/freighter.ts` and `src/context/WalletContext.tsx`.

### How wallet connection works

1. On mount, `WalletContext` calls `getPublicKey()` — if Freighter already has an active session the key is restored silently.
2. When the user clicks **Connect Wallet**, `connectWallet()` calls `freighter.getPublicKey()`, which prompts the extension if not already authorised.
3. The returned 56-character Stellar public key is stored in React state and used for all subsequent contract calls and API queries.
4. `disconnect()` clears the key from state (Freighter session itself is not revoked).

### Signing transactions

`lib/soroban.ts` builds a Soroban transaction, simulates it via the RPC, then calls `signTransaction(xdr, networkPassphrase)` which delegates to `freighter.signTransaction()`. The signed XDR is submitted back to the RPC.

```ts
// Example: claim a reward
import { claimReward } from "@/lib/soroban";
await claimReward(publicKey, campaignId);
```

> Freighter must be on the same network as `NEXT_PUBLIC_NETWORK_PASSPHRASE`. Switch networks inside the extension if needed.

---

## Testing

### Unit / integration tests

The project uses the Next.js built-in Jest setup. Run:

```bash
npm test
```

### E2E tests (Playwright)

E2E tests live in `../e2e/` and cover wallet connection, campaign listing, and campaign detail flows.

```bash
# From the e2e directory
cd ../e2e
npm install
npx playwright install
npx playwright test
```

Tests run against a live local stack (frontend + backend + local Soroban node). Start the full stack first:

```bash
# From project root
docker-compose up --build
```

---

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Add all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard.
4. Deploy — Vercel detects Next.js automatically.

### Docker

A production image is included:

```bash
# Build
docker build -t soroban-loyalty-frontend ./frontend

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.example.com \
  -e NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org \
  -e NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015" \
  -e NEXT_PUBLIC_REWARDS_CONTRACT_ID=<contract_id> \
  -e NEXT_PUBLIC_CAMPAIGN_CONTRACT_ID=<contract_id> \
  soroban-loyalty-frontend
```

Or use the root `docker-compose.yml` which wires all services together:

```bash
docker-compose up --build
```

### Build output

The Next.js config uses `output: "standalone"` — the build artefact in `.next/standalone` is self-contained and can be deployed to any Node.js host.
