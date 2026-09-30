# zkPass Lite

A small Midnight app for checking access without sharing an eligibility token.

The question behind it is simple: can someone prove they belong to an approved set while keeping their token on their own device? The Compact contract stores hashed commitments, checks membership in a circuit, and records successful access on the ledger.

## What works today

- **Contract and CLI:** Deploy to Midnight Preprod, add eligible commitments, and run a real proof-based access check.
- **Web UI:** A React demo of the flow. It can attempt a Lace wallet connection, but **Check private access** currently uses a local simulation. It does not call the contract or generate a proof. The unlocked text is in the browser, so it is not protected content.

## What stays private

| Data | Where it lives |
| --- | --- |
| Raw eligibility token | Local witness on the user's device |
| Token commitment | Public on-chain eligible set |
| Access result and count | Public ledger state |

`checkAccess()` reads the token through a witness, hashes it with `persistent_hash()`, and checks that commitment against the on-chain set. If the assertion fails, no proof or transaction is submitted.

## Run the contract and CLI

You need Node.js 22+, Docker, and the [Compact compiler](https://docs.midnight.network/getting-started/installation) 0.19+.

```bash
npm install
npm run proof-server:start
npm run compile
npm run deploy
```

The deploy script creates or restores a wallet, shows an address to fund with the [Preprod faucet](https://faucet.preprod.midnight.network/), and saves the contract address in `deployment.json`. Save your wallet seed. You will need it again.

Then run:

```bash
npm run cli
```

Choose **[3]** to add the demo tokens to the eligible set, then **[1]** to check access. `demo-eligible` is one valid token. Try a made-up string like `not-eligible` to see a failed check.

## Run the web demo

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Without Lace, the page enters Demo Mode automatically. The web check is simulated even when a Lace wallet connects.

## Project map

| Path | Purpose |
| --- | --- |
| `contracts/zkpass.compact` | Witness, eligible set, and access circuit |
| `src/deploy.ts` | Deploy the contract to Preprod |
| `src/cli.ts` | Add tokens, check access, and read state |
| `src/utils.ts` | Wallet and provider setup |
| `frontend/` | Vite and React demo |
| `docker-compose.yml` | Local proof server |

The next step is connecting the web UI to the deployed contract so a browser check can create and submit a proof. For larger eligible sets, the current `Set<Bytes<32>>` could be replaced with a Merkle tree.

## License

MIT
