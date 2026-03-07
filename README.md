# zkPass Lite — Private Access Checker

> A minimal Midnight app that demonstrates privacy-preserving access control. Users prove eligibility for protected access without revealing unnecessary personal information.

Built on [Midnight Network](https://midnight.network) using Compact smart contracts and zero-knowledge proofs.

---

## What It Does

zkPass Lite is a private eligibility checker. A user connects a wallet, submits a proof for one binary claim (eligible / not eligible), and receives an access decision. The eligibility token **never touches the blockchain** — only the result is recorded.

### Privacy Model

| What                    | Where             | Visible to Others? |
| ----------------------- | ----------------- | ------------------ |
| Eligibility token       | User's device     | ❌ Never            |
| ZK proof of computation | Midnight network  | ✅ (opaque proof)   |
| Access result           | Blockchain ledger | ✅ ("access-granted") |
| Access count            | Blockchain ledger | ✅ (number)          |

---

## Prerequisites

Before you start, make sure you have:

| Requirement         | Version | How to Get It                                                            |
| ------------------- | ------- | ------------------------------------------------------------------------ |
| **Node.js**         | 22+     | [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org) |
| **Docker**          | Latest  | [docker.com](https://www.docker.com/products/docker-desktop/)            |
| **Compact Compiler** | 0.23+  | [Midnight installation guide](https://docs.midnight.network/getting-started/installation) |

Optional for the web frontend:
- [Midnight Lace wallet](https://docs.midnight.network/guides/lace-wallet) browser extension

---

## Quick Start

### 1. Clone and install

```bash
cd zkpass-lite
npm install
```

### 2. Start the proof server

The proof server runs in Docker and generates zero-knowledge proofs for transactions.

```bash
npm run proof-server:start
```

> This starts a Docker container on port 6300. Keep it running.

### 3. Compile the contract

```bash
npm run compile
```

You should see:
```
Compiling 1 circuits:
  circuit "checkAccess" (k=..., rows=...)
```

### 4. Deploy to Preprod

```bash
npm run deploy
```

The script will:
1. Create a new wallet (or restore from seed)
2. Show your wallet address — fund it at [faucet.preprod.midnight.network](https://faucet.preprod.midnight.network/)
3. Wait for DUST tokens (gas) to generate
4. Deploy the contract to Midnight Preprod
5. Save the contract address to `deployment.json`

> **Save your wallet seed!** You'll need it to interact with the contract later.

### 5. Interact via CLI

```bash
npm run cli
```

Enter your wallet seed and choose from the menu:
- **[1] Check private access** — provide an eligibility token and submit a ZK proof
- **[2] Read access count** — view public state from the blockchain
- **[3] Exit**

Valid demo tokens: `midnight-pioneer`, `zkpass-member-001`, `fellowship-2024`, `demo-eligible`

### 6. Run the frontend (optional)

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:3000`. If the Midnight Lace wallet is not installed, the app automatically enters **Demo Mode**.

---

## Project Structure

```
zkpass-lite/
├── contracts/
│   └── zkpass.compact              # Compact smart contract
├── src/
│   ├── deploy.ts                   # Deploy to Preprod
│   ├── cli.ts                      # CLI interaction
│   ├── utils.ts                    # Wallet + provider utilities
│   └── check-balance.ts            # Balance checker
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx                 # React UI
│   │   ├── App.css                 # Styles
│   │   ├── main.tsx                # Entry point
│   │   └── types.ts                # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml              # Proof server
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## Contract Explained

The Compact contract (`contracts/zkpass.compact`) has:

**Public ledger state** (visible on blockchain):
- `accessCount: Counter` — how many successful checks have occurred
- `lastStatus: Opaque<"string">` — the result string of the most recent check

**Circuits** (callable functions):
- `checkAccess(eligibilityToken)` — takes a **private** eligibility token, records "access-granted" on-chain, increments the counter. The token is never published.

---

## Commands Reference

| Command                      | Description                          |
| ---------------------------- | ------------------------------------ |
| `npm run compile`            | Compile the Compact contract         |
| `npm run deploy`             | Deploy contract to Preprod           |
| `npm run cli`                | Interactive CLI for contract         |
| `npm run check-balance`      | Check wallet tNight & DUST balance   |
| `npm run proof-server:start` | Start the proof server (Docker)      |
| `npm run proof-server:stop`  | Stop the proof server                |
| `npm run setup`              | All-in-one: proof server + compile + deploy |
| `npm run clean`              | Remove compiled artifacts            |

---

## Troubleshooting

### Proof server connection error
```
Wallet.Proving: Failed to prove transaction
```
→ Ensure Docker is running: `docker ps`
→ Ensure proof server is started: `npm run proof-server:start`
→ Verify port 6300 is available

### Not enough DUST
```
Not enough Dust generated to pay the fee
```
→ DUST is generated from tNight tokens over time
→ Wait a few minutes, then re-run `npm run deploy` with "Restore from seed"
→ Get more tNight: [faucet.preprod.midnight.network](https://faucet.preprod.midnight.network/)

### Contract not compiled
```
Contract not compiled! Run: npm run compile
```
→ Verify the Compact compiler is installed: `compact --version`
→ Run: `npm run compile`

### Lace wallet not detected (frontend)
→ Install the [Midnight Lace wallet extension](https://docs.midnight.network/guides/lace-wallet)
→ Or use Demo Mode (automatically activated when Lace is not present)

---

## Environment Variables

This project uses Midnight Preprod network endpoints (hardcoded in `src/utils.ts`):

| Variable       | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Indexer HTTP    | `https://indexer.preprod.midnight.network/api/v3/graphql`     |
| Indexer WS      | `wss://indexer.preprod.midnight.network/api/v3/graphql/ws`    |
| Node RPC        | `https://rpc.preprod.midnight.network`                        |
| Proof Server    | `http://127.0.0.1:6300`                                      |

---

## 60-Second Demo Script (for Loom)

1. **(0s)** "This is zkPass Lite — a privacy-preserving access checker built on Midnight."
2. **(5s)** Show the frontend. "The idea is simple: prove you belong to an approved set without revealing personal data."
3. **(10s)** Click Connect Wallet. "I connect my wallet. My identity stays shielded."
4. **(15s)** Click Check Private Access. "Now I submit a private eligibility check."
5. **(20s)** Show the loading state. "Under the hood, Midnight generates a zero-knowledge proof. My eligibility token never touches the blockchain."
6. **(30s)** Show Access Granted. "Access granted. The only thing recorded on-chain is the result — not my token, not my identity."
7. **(40s)** Show the unlocked content panel. "This could gate access to any protected resource — a community, a service, a document."
8. **(45s)** "The privacy guarantee is built into the protocol. There's no trusted server, no database of identities."
9. **(55s)** "zkPass Lite. Private access, proven on Midnight."

---

## Next 3 Improvements

1. **Merkle commitment tree**: Replace the client-side allowlist with an on-chain Merkle root. Users prove membership against the root without revealing their position in the tree. This is the standard pattern for privacy-preserving set membership.

2. **Lace wallet full integration**: Wire the frontend to interact with the deployed contract through the DApp Connector API, so the entire flow runs on Preprod from the browser — connect wallet → generate proof → submit transaction → read result.

3. **Multi-claim support**: Extend the contract to support multiple binary claims (e.g., "is eligible for tier A", "is eligible for tier B") using separate ledger fields or a map structure, enabling richer access control policies.

---

## Pitch for Fellowship Application

zkPass Lite demonstrates Midnight's core value proposition: **privacy-preserving computation on a public blockchain.** It shows that sensitive eligibility data can remain private while access decisions are publicly verifiable. The project is intentionally minimal — one contract, one circuit, one claim — to focus on the fundamental pattern that all privacy-preserving applications build upon. It proves that zero-knowledge proofs are not just a theoretical concept but a practical building block for real-world access control, achievable by a solo builder using Midnight's toolchain.

---

## License

MIT
