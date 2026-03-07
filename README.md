# zkPass Lite — Private Access Checker

> A minimal Midnight app that demonstrates privacy-preserving access control. Users prove eligibility for protected access without revealing unnecessary personal information.

Built on [Midnight Network](https://midnight.network) using Compact smart contracts and zero-knowledge proofs. Aligned with the [Midnight Agent Skills](https://github.com/mzf11125/midnight_agent_skills) knowledge base for consistent Midnight-native patterns.

---

## What It Does

zkPass Lite is a private eligibility checker. A user connects a wallet, submits a proof for one binary claim (eligible / not eligible), and receives an access decision — all without exposing their private eligibility token.

### Architecture: Kachina Dual-State Model

Midnight uses the [Kachina protocol](https://docs.midnight.network/) for smart contracts. Every contract operates on two layers of state:

| Layer | Where | Visible? | Example in zkPass |
| --- | --- | --- | --- |
| **Public state** (ledger) | On-chain | Yes | `accessCount`, `lastStatus`, `eligibleCommitments` |
| **Private state** (witness) | User's device | No | User's raw eligibility token |

A **zero-knowledge proof** bridges the two: it proves a computation over private data (the witness) was performed correctly, without revealing that data. This is Midnight's core innovation — **selective disclosure**.

### Privacy Model

| What | Where | On-chain? |
| --- | --- | --- |
| Raw eligibility token | User's device (witness) | Never |
| Token hash (commitment) | Disclosed inside ZK circuit | Yes (for set membership check) |
| Access result | Ledger (`lastStatus`) | Yes |
| Access count | Ledger (`accessCount`) | Yes |

### How the ZK Flow Works

1. **Witness** provides the raw token locally (never leaves the user's machine)
2. **Circuit** hashes the token with `persistent_hash()` to produce a commitment
3. **Circuit** discloses the commitment and checks it against the on-chain `Set<Bytes<32>>`
4. **`assert()`** verifies membership — if it fails, no proof is generated, no transaction submitted
5. **Result** ("access-granted") and counter increment are the only on-chain changes

---

## Prerequisites

| Requirement | Version | How to Get It |
| --- | --- | --- |
| **Node.js** | 22+ | [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org) |
| **Docker** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Compact Compiler** | 0.19+ | [Midnight installation guide](https://docs.midnight.network/getting-started/installation) |

Optional for the web frontend:
- [Midnight Lace wallet](https://docs.midnight.network/guides/lace-wallet) browser extension

---

## Quick Start

### 1. Install dependencies

```bash
cd zkpass-lite
npm install
```

### 2. Start the proof server

```bash
npm run proof-server:start
```

> Runs in Docker on port 6300. Keep it running.

### 3. Compile the contract

```bash
npm run compile
```

Expected output:
```
Compiling circuits:
  circuit "addEligible" (k=..., rows=...)
  circuit "checkAccess" (k=..., rows=...)
```

### 4. Deploy to Preprod

```bash
npm run deploy
```

The script will:
1. Create or restore a wallet
2. Show your address — fund it at [faucet.preprod.midnight.network](https://faucet.preprod.midnight.network/)
3. Register for DUST (Midnight's gas token, generated from tNight over time)
4. Deploy the contract
5. Save the contract address to `deployment.json`

> **Save your wallet seed!** You need it for all future interactions.

### 5. Seed the eligible set (admin)

```bash
npm run cli
```

Choose option **[3] Seed eligible set with demo tokens**. This calls the `addEligible` circuit for each demo token, adding their hashed commitments to the on-chain `Set<Bytes<32>>`.

### 6. Check access (user)

In the same CLI, choose option **[1] Check private access** and enter a token:

- Valid tokens: `midnight-pioneer`, `zkpass-member-001`, `fellowship-2024`, `demo-eligible`
- Invalid token: anything else

The witness provides the token privately. The circuit hashes it and checks the hash against the on-chain set. If valid → "Access granted". If invalid → proof generation fails → "Access denied".

### 7. Run the frontend (optional)

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:3000`. Auto-enters Demo Mode if the Lace wallet is not installed.

---

## Contract Explained

**File**: `contracts/zkpass.compact`
**Language**: Compact (v0.19+) — Midnight's purpose-built language for ZK smart contracts

### Public Ledger State

```compact
export ledger accessCount: Counter;                    // successful check count
export ledger lastStatus: Opaque<"string">;            // latest result message
export ledger eligibleCommitments: Set<Bytes<32>>;     // hashed eligible tokens
```

All three are visible on-chain. The `Set` stores **hashed commitments**, not raw tokens.

### Witness Function (Private)

```compact
witness local_eligibility_token(): Bytes<32>;
```

Executes locally on the user's device during proof generation. Returns the raw eligibility token. **This value never leaves the user's machine or appears in any transaction.**

### Circuits

**`addEligible(commitment: Bytes<32>)`** — Admin adds a hashed commitment to the eligible set.

**`checkAccess()`** — User proves eligibility:
1. Calls `local_eligibility_token()` witness to get private token
2. Computes `persistent_hash(token)` inside the circuit
3. Discloses the hash and asserts it exists in `eligibleCommitments`
4. Records "access-granted" on the ledger

If the assertion fails, **no ZK proof is generated and no transaction is submitted**.

---

## Project Structure

```
zkpass-lite/
├── contracts/
│   └── zkpass.compact              # Compact smart contract (witness + Set + assert)
├── src/
│   ├── deploy.ts                   # Deploy to Preprod
│   ├── cli.ts                      # CLI interaction (seed + check + read)
│   ├── utils.ts                    # Wallet, providers, witness impl, commitment hash
│   └── check-balance.ts            # Balance checker
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # React UI with Kachina model explanation
│   │   ├── App.css                 # Styles
│   │   ├── main.tsx                # Entry point
│   │   └── types.ts                # TypeScript types
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml              # Proof server (v7.0.0)
├── package.json                    # SDK 3.0 dependencies
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## Commands Reference

| Command | Description |
| --- | --- |
| `npm run compile` | Compile the Compact contract to ZK circuits |
| `npm run deploy` | Deploy contract to Preprod |
| `npm run cli` | Interactive CLI (seed eligible set, check access, read state) |
| `npm run check-balance` | Check wallet tNight & DUST balance |
| `npm run proof-server:start` | Start proof server (Docker) |
| `npm run proof-server:stop` | Stop proof server |
| `npm run setup` | All-in-one: proof server + compile + deploy |
| `npm run clean` | Remove compiled artifacts |

---

## Troubleshooting

### Proof server connection error
```
Wallet.Proving: Failed to prove transaction
```
- Ensure Docker is running: `docker ps`
- Start proof server: `npm run proof-server:start`
- Verify port 6300 is free

### Not enough DUST
```
Not enough Dust generated to pay the fee
```
- DUST is generated from tNight tokens over time
- Wait a few minutes, then re-run with "Restore from seed"
- Get more tNight: [faucet.preprod.midnight.network](https://faucet.preprod.midnight.network/)

### Contract not compiled
- Verify Compact compiler: `compact --version` (should be 0.19+)
- Run: `npm run compile`

### "Not eligible" assertion failure
- Seed the eligible set first (CLI option [3])
- Ensure you're using an exact match from the demo token list
- The token is hashed — even one character difference produces a different commitment

### Lace wallet not detected (frontend)
- Install the [Midnight Lace wallet extension](https://docs.midnight.network/guides/lace-wallet)
- Or use Demo Mode (activates automatically)

---

## Midnight Concepts Used

This project demonstrates several core Midnight concepts from the [Midnight Agent Skills](https://github.com/mzf11125/midnight_agent_skills) knowledge base:

| Concept | Skill Reference | How It's Used |
| --- | --- | --- |
| **Kachina dual-state model** | `midnight-concepts` | Public ledger + private witness |
| **Selective disclosure** | `midnight-concepts` | Only hash and result disclosed, not raw token |
| **Compact Set type** | `midnight-compact/ledger-operations` | `Set<Bytes<32>>` for eligible commitments |
| **Witness functions** | `midnight-compact/typescript-interop` | `local_eligibility_token()` provides private data |
| **`assert()` in circuits** | `midnight-compact/quick-start` | Fails proof generation if not eligible |
| **`disclose()` operator** | `midnight-compact/ledger-operations` | Marks private values as safe for public storage |
| **`persistent_hash()`** | `midnight-compact/standard-library` | Commitment scheme for token hashing |
| **Constructor** | `midnight-compact/ledger-operations` | Initializes contract state at deploy |
| **setNetworkId()** | `midnight-api/network-configuration` | Required before any SDK operation |
| **DApp Connector API** | `midnight-api/dapp-connector-api` | Frontend wallet connection via Lace |
| **Proof server** | `midnight-network/docker-deployment` | Docker container for ZK proof generation |

---

## 60-Second Demo Script (for Loom)

1. **(0s)** "This is zkPass Lite — a privacy-preserving access checker built on Midnight."
2. **(5s)** Show the frontend. "The idea: prove you belong to an approved set without revealing personal data."
3. **(10s)** Click Connect Wallet. "I connect my wallet. My identity stays shielded."
4. **(15s)** Click Check Private Access. "Now I submit a private eligibility check."
5. **(20s)** Show loading state. "A witness function reads my token locally. The Compact circuit hashes it and checks the hash against the on-chain set. A ZK proof verifies everything — my token never touches the blockchain."
6. **(35s)** Show Access Granted. "Access granted. Only the result is on-chain."
7. **(40s)** Show unlocked content. "This could gate any protected resource — a community, a service, a document."
8. **(50s)** "The privacy guarantee is built into the protocol via the Kachina dual-state model. No trusted server. No database of identities."
9. **(55s)** "zkPass Lite. Private access, proven on Midnight."

---

## Next 3 Improvements

1. **MerkleTree commitment scheme**: Replace `Set<Bytes<32>>` with `MerkleTree<32, Bytes<32>>` for O(log n) membership proofs. This is the standard pattern for large-scale privacy-preserving set membership, as documented in `midnight-compact/references/ledger-operations.md`.

2. **Full Lace wallet integration**: Wire the frontend to interact with the deployed contract through the DApp Connector API (`midnight-api/references/dapp-connector-api.md`), so the entire flow runs on Preprod from the browser.

3. **Multi-claim access control**: Extend the contract with `Map<Bytes<32>, Set<Bytes<32>>>` to support multiple resource types with separate eligible sets, enabling richer access policies.

---

## Pitch for Fellowship Application

zkPass Lite demonstrates Midnight's core value proposition: **privacy-preserving computation on a public blockchain.** It uses the Kachina protocol's dual-state model — public ledger state for results, private witness state for sensitive data — bridged by zero-knowledge proofs. The project shows that sensitive eligibility data can remain private while access decisions are publicly verifiable. It proves that ZK-based access control is not just theoretical but practically buildable by a solo developer using Midnight's Compact language and SDK toolchain.

---

## License

MIT
