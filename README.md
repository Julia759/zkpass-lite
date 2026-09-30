# zkPass Lite

Can a service confirm someone is allowed in without collecting their secret? Sharing only the answer leaves less sensitive data to expose if the service is breached. This small Midnight app explores that idea. [Try the web demo](https://zkpass-lite.vercel.app/).

The Compact contract keeps token commitments in a public set. A local witness supplies a token, and the circuit checks its commitment. The CLI can deploy the contract, add commitments, and submit access checks on Midnight Preprod.

## Current status

- **Contract and CLI:** Updated for the current Preprod SDK and Compact compiler. The compiled circuit passes local checks for valid tokens, invalid tokens, and admin-only enrollment. A full Preprod proof still needs a funded wallet, a deployed contract, and a running proof server.
- **Web demo:** Simulates a token check in the browser. Connecting Lace does not generate a proof or call the contract. The result does not unlock protected content.

The token stays in the local witness. Its commitment, the access result, and the count are public. Because a public commitment can be matched against guessed tokens, use high-entropy tokens for any serious use.

The [product note](PRODUCT_NOTE.md) explains the demo's scope, the tradeoffs, and the next user test.

## Run the contract and CLI

You need Node.js 22+, Docker, and [Compact compiler 0.31.1](https://docs.midnight.network/getting-started/installation).

```bash
npm ci
npm run proof-server:start
npm run build
npm test
npm run deploy
npm run cli
```

During deployment, create or restore a wallet. Fund its unshielded address with the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/), then save the seed somewhere private. `deployment.json` stores the contract address, not the seed. You need the same seed to administer the contract.

In the CLI, choose **[3]** to add demo tokens, then **[1]** to check one. Try `demo-eligible` for a valid token and `not-eligible` for an invalid one. Enrollment requires the deployer's seed.

## Run the web demo

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Enter `demo-eligible` to see the simulated success state. The demo runs without Lace too.

## Files

| Path | Purpose |
| --- | --- |
| `contracts/zkpass.compact` | Eligible set, admin check, and access circuit |
| `src/eligibility.ts` | Token and admin commitments, local witnesses |
| `src/deploy.ts` | Preprod deployment |
| `src/cli.ts` | Enrollment, access checks, and public state |
| `src/utils.ts` | Wallet and provider setup |
| `tests/proof-flow.test.ts` | Local circuit checks |
| `frontend/` | Web demo |
| `docker-compose.yml` | Local proof server |

## License

MIT
