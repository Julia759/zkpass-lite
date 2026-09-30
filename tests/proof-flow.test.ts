import test from 'node:test';
import assert from 'node:assert/strict';
import * as RT from '@midnight-ntwrk/compact-runtime';

import { Contract, ledger } from '../contracts/managed/zkpass/contract/index.js';
import { adminCommitmentFromSeed, adminSecretFromSeed, createWitnesses, hashTokenToCommitment, tokenToBytes } from '../src/eligibility.js';

const coinPublicKey = '0'.repeat(64);
const contractAddress = RT.sampleContractAddress();
const adminSeed = '01'.repeat(32);

function setup(token: string, witnessSeed = adminSeed) {
  const contract = new Contract(createWitnesses<Record<string, never>>(
    () => tokenToBytes(token),
    () => adminSecretFromSeed(witnessSeed),
  ));
  const initial = contract.initialState(
    RT.createConstructorContext({}, coinPublicKey),
    adminCommitmentFromSeed(adminSeed),
  );
  const context = RT.createCircuitContext(contractAddress, coinPublicKey, initial.currentContractState, {});
  return { contract, context };
}

test('a seeded token passes the actual Compact circuit', () => {
  const { contract, context } = setup('demo-eligible');
  const commitment = hashTokenToCommitment('demo-eligible');
  const added = contract.impureCircuits.addEligible(context, commitment);
  const checked = contract.impureCircuits.checkAccess(added.context);
  const state = ledger(checked.context.currentQueryContext.state);

  assert.equal(state.accessCount, 1n);
  assert.equal(Buffer.from(state.lastStatus).toString('utf8'), 'access-granted');
  assert.equal(state.eligibleCommitments.member(commitment), true);
  assert.deepEqual(state.adminCommitment, adminCommitmentFromSeed(adminSeed));
  assert.ok(checked.proofData.publicTranscript.length > 0);
});

test('only the deploying admin can add eligible tokens', () => {
  const { contract, context } = setup('demo-eligible', '02'.repeat(32));
  assert.throws(
    () => contract.impureCircuits.addEligible(context, hashTokenToCommitment('demo-eligible')),
    /Only admin can add eligible tokens/,
  );
});

test('an unseeded token is rejected by the actual Compact circuit', () => {
  const { contract, context } = setup('not-eligible');
  const added = contract.impureCircuits.addEligible(context, hashTokenToCommitment('demo-eligible'));
  assert.throws(() => contract.impureCircuits.checkAccess(added.context), /Not eligible/);
});

test('token encoding is always 32 bytes and rejects blanks', () => {
  assert.equal(tokenToBytes('demo-eligible').length, 32);
  assert.equal(tokenToBytes('🦉'.repeat(30)).length, 32);
  assert.deepEqual(tokenToBytes(' demo-eligible '), tokenToBytes('demo-eligible'));
  assert.notDeepEqual(tokenToBytes('demo-eligible'), tokenToBytes('other-token'));
  assert.throws(() => tokenToBytes('   '), /cannot be empty/);
});
