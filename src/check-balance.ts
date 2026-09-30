// ─── zkPass Lite: Check Wallet Balance ─────────────────────────────────────────
// Quick utility to check tNight and DUST balances for your wallet.
// Usage: npm run check-balance

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as Rx from 'rxjs';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';

import { createWallet } from './utils.js';

async function main() {
  console.log('\n  zkPass Lite: Balance Checker\n');

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const seed = await rl.question('  Enter your wallet seed: ');

    console.log('\n  Connecting...');
    const walletCtx = await createWallet(seed.trim());

    console.log('  Syncing...');
    const state = await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
      ),
    );

    const address = walletCtx.unshieldedKeystore.getBech32Address();
    const tNight = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    const dust = state.dust.balance(new Date());

    console.log(`\n  Address: ${address}`);
    console.log(`  tNight:  ${tNight.toLocaleString()}`);
    console.log(`  DUST:    ${dust.toLocaleString()}\n`);

    await walletCtx.wallet.stop();
  } finally {
    rl.close();
  }
}

main().catch(console.error);
