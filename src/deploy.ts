// ─── zkPass Lite: Deploy Contract to Midnight Preprod ──────────────────────────
// This script:
//   1. Creates or restores a Midnight wallet
//   2. Waits for funding (tNight tokens from faucet)
//   3. Registers for DUST (gas token) generation
//   4. Deploys the zkPass contract to Preprod
//   5. Saves deployment info to deployment.json
//
// Usage: npm run deploy

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as Rx from 'rxjs';
import { Buffer } from 'buffer';

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v7';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';

import {
  createWallet,
  createProviders,
  compiledContract,
  zkConfigPath,
} from './utils.js';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         zkPass Lite — Deploy to Midnight Preprod            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Verify contract is compiled
  if (!fs.existsSync(path.join(zkConfigPath, 'contract', 'index.js'))) {
    console.error('  Contract not compiled! Run: npm run compile\n');
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    // ─── Step 1: Wallet Setup ────────────────────────────────────────────────
    console.log('─── Step 1: Wallet Setup ───────────────────────────────────────\n');

    const choice = await rl.question(
      '  [1] Create new wallet\n  [2] Restore from seed\n  > ',
    );

    const seed =
      choice.trim() === '2'
        ? await rl.question('\n  Enter your 64-character seed: ')
        : toHex(Buffer.from(generateRandomSeed()));

    if (choice.trim() !== '2') {
      console.log(`\n  ⚠️  SAVE THIS SEED (you need it to interact later):\n  ${seed}\n`);
    }

    console.log('  Creating wallet...');
    const walletCtx = await createWallet(seed.trim());

    console.log('  Syncing with Preprod network...');
    const state = await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
      ),
    );

    const address = walletCtx.unshieldedKeystore.getBech32Address();
    const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    console.log(`\n  Wallet Address: ${address}`);
    console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

    // ─── Step 2: Fund Wallet ─────────────────────────────────────────────────
    if (balance === 0n) {
      console.log('─── Step 2: Fund Your Wallet ───────────────────────────────────\n');
      console.log('  Visit: https://faucet.preprod.midnight.network/');
      console.log(`  Address: ${address}\n`);
      console.log('  Waiting for funds...');

      await Rx.firstValueFrom(
        walletCtx.wallet.state().pipe(
          Rx.throttleTime(10000),
          Rx.filter((s) => s.isSynced),
          Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
          Rx.filter((b) => b > 0n),
        ),
      );
      console.log('  Funds received!\n');
    }

    // ─── Step 3: DUST Registration ──────────────────────────────────────────
    console.log('─── Step 3: DUST Token Setup ───────────────────────────────────\n');

    const dustState = await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
    );

    if (dustState.dust.walletBalance(new Date()) === 0n) {
      const nightUtxos = dustState.unshielded.availableCoins.filter(
        (c: any) => !c.meta?.registeredForDustGeneration,
      );

      if (nightUtxos.length > 0) {
        console.log('  Registering for DUST generation...');
        const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
          nightUtxos,
          walletCtx.unshieldedKeystore.getPublicKey(),
          (payload) => walletCtx.unshieldedKeystore.signData(payload),
        );
        await walletCtx.wallet.submitTransaction(
          await walletCtx.wallet.finalizeRecipe(recipe),
        );
      }

      console.log('  Waiting for DUST tokens (this may take a few minutes)...');
      await Rx.firstValueFrom(
        walletCtx.wallet.state().pipe(
          Rx.throttleTime(5000),
          Rx.filter((s) => s.isSynced),
          Rx.filter((s) => s.dust.walletBalance(new Date()) > 0n),
        ),
      );
    }
    console.log('  DUST tokens ready!\n');

    // ─── Step 4: Deploy Contract ────────────────────────────────────────────
    console.log('─── Step 4: Deploy zkPass Contract ─────────────────────────────\n');
    console.log('  Setting up providers...');
    const providers = await createProviders(walletCtx);

    console.log('  Deploying contract (this may take 30-60 seconds)...\n');
    const deployed = await deployContract(providers, {
      compiledContract,
      privateStateId: 'zkpassState',
      initialPrivateState: {},
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;

    console.log('  ✅ zkPass Lite contract deployed!\n');
    console.log(`  Contract Address: ${contractAddress}\n`);

    // ─── Step 5: Save Deployment Info ───────────────────────────────────────
    const deploymentInfo = {
      contractAddress,
      seed,
      network: 'preprod',
      deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('  Saved to deployment.json\n');

    await walletCtx.wallet.stop();

    console.log('─── Deployment Complete! ───────────────────────────────────────\n');
    console.log('  Next steps:');
    console.log('  1. npm run cli     — interact with the contract');
    console.log('  2. cd frontend && npm run dev — start the web UI\n');
  } finally {
    rl.close();
  }
}

main().catch(console.error);
