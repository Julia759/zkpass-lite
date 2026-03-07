// ─── zkPass Lite: CLI Interaction ───────────────────────────────────────────────
// Interactive command-line interface to interact with the deployed zkPass contract.
// Call the checkAccess circuit and read public state from the blockchain.
//
// Usage: npm run cli

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as fs from 'node:fs';
import * as Rx from 'rxjs';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

import {
  createWallet,
  createProviders,
  compiledContract,
  ZkPass,
} from './utils.js';

// ─── Private Allowlist ─────────────────────────────────────────────────────────
// In production, this would be a Merkle tree, a credential check, or an
// on-chain commitment. For MVP, we use a simple local allowlist to demonstrate
// the concept of private eligibility checking.
const ELIGIBLE_TOKENS = new Set([
  'midnight-pioneer',
  'zkpass-member-001',
  'fellowship-2024',
  'demo-eligible',
]);

function isEligible(token: string): boolean {
  return ELIGIBLE_TOKENS.has(token);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         zkPass Lite — Private Access Checker CLI            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync('deployment.json')) {
    console.error('  No deployment.json found! Run `npm run deploy` first.\n');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'));
  console.log(`  Contract: ${deployment.contractAddress}\n`);

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const seed = await rl.question('  Enter your wallet seed: ');

    console.log('\n  Connecting to Midnight Preprod...');
    const walletCtx = await createWallet(seed.trim());

    console.log('  Syncing wallet...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
      ),
    );

    console.log('  Setting up providers...');
    const providers = await createProviders(walletCtx);

    console.log('  Joining contract...');
    const contract = await findDeployedContract(providers, {
      contractAddress: deployment.contractAddress,
      compiledContract,
      privateStateId: 'zkpassState',
      initialPrivateState: {},
    });

    console.log('  Connected!\n');

    // ─── Interactive Menu ──────────────────────────────────────────────────
    let running = true;
    while (running) {
      const dust = (
        await Rx.firstValueFrom(
          walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
        )
      ).dust.walletBalance(new Date());

      console.log('─────────────────────────────────────────────────────────────');
      console.log(`  DUST: ${dust.toLocaleString()}`);
      console.log('─────────────────────────────────────────────────────────────');

      const choice = await rl.question(
        '  [1] Check private access\n  [2] Read access count\n  [3] Exit\n  > ',
      );

      switch (choice.trim()) {
        case '1':
          try {
            const token = await rl.question('\n  Enter your eligibility token: ');

            // Step 1: Check eligibility locally (private — never sent to chain)
            if (!isEligible(token.trim())) {
              console.log('\n  ❌ Access denied');
              console.log('  This token could not prove eligibility.\n');
              break;
            }

            // Step 2: Submit ZK proof to blockchain
            console.log('  Checking eligibility (generating ZK proof, ~20-30 seconds)...\n');
            const tx = await contract.callTx.checkAccess(token.trim());

            console.log('  ✅ Access granted!');
            console.log('  You proved eligibility without exposing extra details.');
            console.log(`  Transaction: ${tx.public.txId}`);
            console.log(`  Block: ${tx.public.blockHeight}\n`);
          } catch (e) {
            console.error(`  ❌ Error: ${e instanceof Error ? e.message : e}\n`);
          }
          break;

        case '2':
          try {
            console.log('\n  Reading access count from blockchain...');
            const contractState = await providers.publicDataProvider.queryContractState(
              deployment.contractAddress,
            );

            if (contractState) {
              const ledgerState = ZkPass.ledger(contractState.data);
              console.log(`  Total verified accesses: ${ledgerState.accessCount ?? 0}`);
              console.log(`  Last status: "${ledgerState.lastStatus || '(none)'}"\n`);
            } else {
              console.log('  No state found.\n');
            }
          } catch (e) {
            console.error(`  ❌ Error: ${e instanceof Error ? e.message : e}\n`);
          }
          break;

        case '3':
          running = false;
          break;
      }
    }

    await walletCtx.wallet.stop();
    console.log('\n  Goodbye!\n');
  } finally {
    rl.close();
  }
}

main().catch(console.error);
