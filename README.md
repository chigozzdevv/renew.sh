# Renew

**Stablecoin-native billing and settlement infrastructure for Africa.**

Renew lets businesses accept recurring payments in local currencies across African markets and settle in USDC on Avalanche. Plans, subscriptions, and charges are recorded on-chain through a purpose-built protocol contract, while a fiat payment rail handles local collection and FX conversion automatically.

---

## How It Works

```
Customer pays in local currency (NGN, KES, GHS, ZAR, …)
        ↓
Yellow Card payment rail collects fiat and converts to USDC
        ↓
USDC is deposited into the RenewVault on Avalanche
        ↓
RenewProtocol records the charge, credits the merchant balance
        ↓
Merchant withdraws USDC to their payout wallet via CCTP bridge
```

**Key flow:**

1. Merchant creates a billing plan on-chain through a Safe multisig wallet.
2. A checkout session is opened via the SDK or API.
3. The customer enters their details through the embeddable checkout modal.
4. Renew creates the subscription on-chain and issues a charge when billing is due.
5. The customer pays via local bank transfer; Yellow Card settles in USDC.
6. The protocol credits the merchant's vault balance (minus protocol fee).
7. The merchant withdraws USDC to any EVM wallet via Circle CCTP.

---

## Project Structure

```
renew.sh/
├── client/             # Next.js 16 dashboard and marketing site
├── server/             # Express API, billing engine, and worker jobs
├── contracts/          # Solidity contracts (Avalanche C-Chain)
│   └── src/
│       ├── RenewProtocol.sol   # Core protocol (plans, subscriptions, charges)
│       └── RenewVault.sol      # USDC custody and merchant balance accounting
├── packages/
│   └── renew-sdk/      # Published SDK (@renew.sh/sdk)
└── test/               # Integration tests
```

### Client — `client/`

The merchant dashboard and public marketing site built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **Framer Motion**.

| Surface | Description |
|---------|-------------|
| Overview | Customers, plans, subscriptions, market mix, upcoming renewals |
| Plans | Create, update, and archive billing plans (on-chain via Safe) |
| Customers | View customer billing state and payment history |
| Treasury | Vault balance, settlements, CCTP withdrawals |
| Playground | Live checkout flow testing with sandbox payments |
| Settings | Team management, API keys, webhook endpoints |
| Docs | Inline SDK and API reference |

### Server — `server/`

The billing engine built with **Express**, **MongoDB**, **BullMQ**, and **TypeScript**.

| Module | Responsibility |
|--------|---------------|
| `auth` | Merchant authentication and session management |
| `plans` | Plan CRUD synced to the on-chain protocol |
| `subscriptions` | Subscription lifecycle and billing schedule |
| `charges` | Charge creation, retry logic, and settlement tracking |
| `checkout` | Hosted checkout sessions with client secret auth |
| `customers` | Customer records and billing state |
| `payment-rails` | Yellow Card integration, webhooks, FX quotes |
| `settlements` | Settlement batching and CCTP bridge orchestration |
| `treasury` | Vault balance reads, withdrawal execution, protocol sync |
| `developers` | API key management and webhook delivery |
| `protocol` | On-chain contract interaction and state reads |
| `teams` | Multi-member workspace access control |
| `kyc` | KYC verification flow |
| `dashboard` | Aggregated overview metrics |

### Contracts — `contracts/`

Solidity smart contracts deployed on **Avalanche C-Chain**.

- **`RenewProtocol.sol`** — Core protocol managing merchants, plans, subscriptions, and charges. Handles charge execution, fee collection, and on-chain settlement crediting. Secured by charge operator and subscription operator roles.
- **`RenewVault.sol`** — USDC custody contract that holds merchant balances and protocol fees. Only the protocol contract can credit balances; merchants withdraw directly.

### SDK — `packages/renew-sdk/`

Published as [`@renew.sh/sdk`](https://www.npmjs.com/package/@renew.sh/sdk). Provides:

- `@renew.sh/sdk` — Checkout client, contract clients, types
- `@renew.sh/sdk/server` — Server-side checkout helpers, webhook verification
- `@renew.sh/sdk/react` — Embeddable checkout modal and session hook

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Backend | Node.js, Express, MongoDB, Mongoose, BullMQ, Zod |
| Blockchain | Avalanche C-Chain, Solidity ^0.8.24 |
| Payments | Yellow Card (fiat collection + FX), Circle CCTP (cross-chain USDC) |
| Wallet | Safe (multisig plan management) |
| SDK | TypeScript, published to npm |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.9.0
- MongoDB instance (local or Atlas)
- Redis instance (for BullMQ workers)

### Client

```bash
cd client
npm install
cp .env.example .env.local   # configure API origin, auth, etc.
npm run dev                   # http://localhost:3000
```

### Server

```bash
cd server
npm install
cp .env.example .env          # configure MongoDB, Redis, Yellow Card, Safe, etc.
npm run dev                   # http://localhost:4000
```

### SDK (local development)

```bash
cd packages/renew-sdk
npm install
npm run build                 # outputs to dist/
npm test                      # runs 8 unit tests
```

The client references the SDK via `"@renew.sh/sdk": "file:../packages/renew-sdk"` during development.

---

## Environment Variables

The server requires the following key environment variables (see `server/.env.example` for the full list):

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis URL for BullMQ job queues |
| `YC_API_KEY` / `YC_SECRET_KEY` | Yellow Card API credentials |
| `SAFE_SIGNER_PRIVATE_KEY` | Private key for Safe transaction signing |
| `CIRCLE_API_KEY` | Circle CCTP bridge credentials |
| `RENEW_PROTOCOL_ADDRESS` | Deployed RenewProtocol contract address |
| `RENEW_VAULT_ADDRESS` | Deployed RenewVault contract address |

---

## Supported Markets

Renew supports local currency collection across the following African markets:

> BWP · CDF · GHS · KES · MWK · NGN · RWF · TZS · UGX · XAF · XOF · ZAR · ZMW

Each market is served through Yellow Card's local payment rails with real-time FX conversion to USDC.

---

## License

MIT
