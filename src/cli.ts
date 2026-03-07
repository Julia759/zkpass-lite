// ─── zkPass Lite: CLI Interaction ───────────────────────────────────────────────
// Interactive CLI to interact with the deployed zkPass contract on Preprod.
//
// This CLI demonstrates the Kachina dual-state model:
//   PUBLIC STATE  → contract ledger (accessCount, lastStatus, eligibleCommitments)
//   PRIVATE STATE → local witnesses (local_eligibility_token)
//
// The witness function provides the user's token locally during proof generation.
// The token never leaves this machine — only its hash is checked on-chain.
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
  ELIGIBLE_TOKENS,
  hashTokenToCommitment,
  createWitnesses,
} from './utils.js';

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
        '  [1] Check private access (prove eligibility)\n' +
        '  [2] Add eligible commitment (admin)\n' +
        '  [3] Seed eligible set with demo tokens (admin)\n' +
        '  [4] Read public state\n' +
        '  [5] Exit\n  > ',
      );

      switch (choice.trim()) {
        // ─── Option 1: Check Access ────────────────────────────────────────
        // Uses the witness function to provide the private token.
        // The token stays local; only its hash is checked on-chain.
        case '1':
          try {
            const token = await rl.question('\n  Enter your eligibility token (private): ');

            // Show the user what will happen
            const commitment = hashTokenToCommitment(token.trim());
            console.log(`  Commitment (hash): ${Buffer.from(commitment).toString('hex').slice(0, 16)}…`);
            console.log('  Your raw token stays private — only the hash is checked on-chain.\n');

            console.log('  Generating ZK proof (~20-30 seconds)...\n');

            // The witness provides the private token during proof generation.
            // The proof server runs the circuit locally, the token never
            // leaves this machine or appears in the transaction.
            const tx = await contract.callTx.checkAccess(token.trim());

            console.log('  ✅ Access granted!');
            console.log('  You proved eligibility without exposing your token.');
            console.log(`  Transaction: ${tx.public.txId}`);
            console.log(`  Block: ${tx.public.blockHeight}\n`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('Not eligible') || msg.includes('assert')) {
              console.log('\n  ❌ Access denied');
              console.log('  This token is not in the eligible set.\n');
            } else {
              console.error(`  ❌ Error: ${msg}\n`);
            }
          }
          break;

        // ─── Option 2: Add Single Commitment ──────────────────────────────
        // Admin adds hash(token) to the on-chain eligible set.
        case '2':
          try {
            const rawToken = await rl.question('\n  Enter raw token to add: ');
            const commitmentBytes = hashTokenToCommitment(rawToken.trim());
            console.log(`  Adding commitment: ${Buffer.from(commitmentBytes).toString('hex').slice(0, 16)}…`);
            console.log('  Submitting transaction...\n');

            const tx = await contract.callTx.addEligible(commitmentBytes);
            console.log(`  ✅ Commitment added! Tx: ${tx.public.txId}\n`);
          } catch (e) {
            console.error(`  ❌ Error: ${e instanceof Error ? e.message : e}\n`);
          }
          break;

        // ─── Option 3: Seed Demo Eligible Set ─────────────────────────────
        // Adds all demo tokens' commitments to the contract.
        case '3':
          try {
            console.log('\n  Seeding eligible set with demo tokens...');
            for (const token of ELIGIBLE_TOKENS) {
              const commitmentBytes = hashTokenToCommitment(token);
              console.log(`    Adding "${token}" → ${Buffer.from(commitmentBytes).toString('hex').slice(0, 16)}…`);
              await contract.callTx.addEligible(commitmentBytes);
            }
            console.log('  ✅ All demo commitments added!\n');
          } catch (e) {
            console.error(`  ❌ Error: ${e instanceof Error ? e.message : e}\n`);
          }
          break;

        // ─── Option 4: Read Public State ──────────────────────────────────
        case '4':
          try {
            console.log('\n  Reading public state from blockchain...');
            const contractState = await providers.publicDataProvider.queryContractState(
              deployment.contractAddress,
            );

            if (contractState) {
              const ledgerState = ZkPass.ledger(contractState.data);
              console.log(`  Access count: ${ledgerState.accessCount ?? 0}`);
              console.log(`  Last status:  "${ledgerState.lastStatus || '(none)'}"\n`);
            } else {
              console.log('  No state found.\n');
            }
          } catch (e) {
            console.error(`  ❌ Error: ${e instanceof Error ? e.message : e}\n`);
          }
          break;

        case '5':
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
