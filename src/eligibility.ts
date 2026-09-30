import { createHash, createHmac } from 'node:crypto';
import { CompactTypeBytes, persistentHash, type WitnessContext } from '@midnight-ntwrk/compact-runtime';

const tokenType = new CompactTypeBytes(32);

// Compact's witness expects exactly 32 bytes. Hash the user's text first so
// short, long, and multibyte tokens all have the same unambiguous encoding.
export function tokenToBytes(token: string): Uint8Array {
  const normalized = token.trim();
  if (!normalized) throw new Error('Eligibility token cannot be empty');
  return createHash('sha256').update(normalized, 'utf8').digest();
}

// Use the same persistent_hash operation as checkAccess() in zkpass.compact.
export function hashTokenToCommitment(token: string): Uint8Array {
  return persistentHash(tokenType, tokenToBytes(token));
}

export function adminSecretFromSeed(seed: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(seed)) throw new Error('Wallet seed must be 64 hex characters');
  return createHmac('sha256', Buffer.from(seed, 'hex'))
    .update('zkpass-admin-secret-v1')
    .digest();
}

export function adminCommitmentFromSeed(seed: string): Uint8Array {
  return persistentHash(tokenType, adminSecretFromSeed(seed));
}

export function createWitnesses<PrivateState>(readToken: () => Uint8Array, readAdminSecret: () => Uint8Array) {
  const witness = (read: () => Uint8Array, privateState: PrivateState): [PrivateState, Uint8Array] => {
    const value = read();
    if (value.length !== 32) throw new Error('Witness must return 32 bytes');
    return [privateState, value];
  };
  return {
    local_eligibility_token: (
      { privateState }: WitnessContext<unknown, PrivateState>,
    ): [PrivateState, Uint8Array] => witness(readToken, privateState),
    local_admin_secret: (
      { privateState }: WitnessContext<unknown, PrivateState>,
    ): [PrivateState, Uint8Array] => witness(readAdminSecret, privateState),
  };
}
