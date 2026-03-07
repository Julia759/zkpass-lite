// ─── zkPass Lite: React Frontend ────────────────────────────────────────────────
// Minimal demo UI for privacy-preserving access checking on Midnight.
//
// Architecture (Kachina Protocol dual-state model):
//   PUBLIC STATE  → on-chain ledger (accessCount, lastStatus, eligibleCommitments)
//   PRIVATE STATE → local witness (user's eligibility token, never sent anywhere)
//
// Two modes:
//   1. Lace Wallet mode: connects to real Midnight Lace browser wallet
//   2. Demo mode: simulates the flow locally (for presentations without Lace)
//
// In production, the witness function provides the private token to the
// Compact circuit, which hashes it and checks the hash against the on-chain
// Set of eligible commitments. The raw token never leaves the user's device.

import { useState, useCallback } from 'react';
import type { AccessStatus, WalletState } from './types';
import '@midnight-ntwrk/dapp-connector-api';

// ─── Eligible Tokens (for demo simulation) ─────────────────────────────────────
// In the real flow, these live as hashed commitments in the contract's
// Set<Bytes<32>> on-chain. The raw tokens below are only used client-side
// to simulate the witness function behavior in demo mode.
const ELIGIBLE_TOKENS = new Set([
  'midnight-pioneer',
  'zkpass-member-001',
  'fellowship-2024',
  'demo-eligible',
]);

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
  });
  const [status, setStatus] = useState<AccessStatus>('idle');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Wallet Connection ───────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setStatus('connecting');
    setErrorMessage(null);

    try {
      if (!window.midnight?.mnLace) {
        // Lace wallet not detected — offer demo mode
        setIsDemoMode(true);
        setWallet({
          isConnected: true,
          address: '0x' + Array.from({ length: 16 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('') + '…',
        });
        setStatus('idle');
        return;
      }

      // Real Lace wallet connection
      const lace = window.midnight.mnLace;
      const connectedApi = await lace.connect('preprod');
      const addresses = await connectedApi.getShieldedAddresses();

      setWallet({
        isConnected: true,
        address: addresses.shieldedAddress,
      });
      setIsDemoMode(false);
      setStatus('idle');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
      setStatus('error');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({ isConnected: false, address: null });
    setStatus('idle');
    setIsDemoMode(false);
    setErrorMessage(null);
  }, []);

  // ─── Access Check ────────────────────────────────────────────────────────
  // In the real Midnight flow:
  //   1. Witness function provides the private token locally
  //   2. Compact circuit hashes it with persistent_hash()
  //   3. Circuit checks hash against on-chain Set<Bytes<32>>
  //   4. ZK proof is generated and submitted
  //   5. Only the result appears on-chain; token stays private
  //
  // In demo mode, we simulate this with a local check and a delay
  // representing proof generation time (~20-30s on real Preprod).
  const checkAccess = useCallback(async () => {
    setStatus('checking');
    setErrorMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, isDemoMode ? 2000 : 3000));

      const demoToken = 'demo-eligible';
      const eligible = ELIGIBLE_TOKENS.has(demoToken);

      setStatus(eligible ? 'granted' : 'denied');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Check failed');
      setStatus('error');
    }
  }, [isDemoMode]);

  const resetStatus = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <span className="logo-icon">🔐</span>
            <h1 className="title">zkPass Lite</h1>
          </div>
          <p className="subtitle">Private Access Checker</p>
          {isDemoMode && <span className="demo-badge">Demo Mode</span>}
        </header>

        {/* Explainer */}
        <div className="explainer">
          <p>
            Prove that you belong to an approved set without revealing unnecessary personal information.
          </p>
        </div>

        {/* Wallet Section */}
        <div className="wallet-section">
          {!wallet.isConnected ? (
            <button
              className="btn btn-secondary"
              onClick={connectWallet}
              disabled={status === 'connecting'}
            >
              {status === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="wallet-info">
              <div className="wallet-address">
                <span className="wallet-dot" />
                <span className="address-text" title={wallet.address ?? ''}>
                  {wallet.address
                    ? wallet.address.length > 24
                      ? wallet.address.slice(0, 12) + '…' + wallet.address.slice(-8)
                      : wallet.address
                    : 'Connected'}
                </span>
              </div>
              <button className="btn btn-text" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Main Action */}
        {wallet.isConnected && status !== 'granted' && status !== 'denied' && (
          <button
            className="btn btn-primary"
            onClick={checkAccess}
            disabled={status === 'checking'}
          >
            {status === 'checking' ? (
              <>
                <span className="spinner" />
                Checking eligibility…
              </>
            ) : (
              'Check private access'
            )}
          </button>
        )}

        {/* Result: Access Granted */}
        {status === 'granted' && (
          <div className="result result-granted">
            <div className="result-icon">✓</div>
            <h2 className="result-title">Access granted</h2>
            <p className="result-text">
              You proved the claim required for access without exposing extra details.
            </p>
            <div className="unlocked-content">
              <div className="unlocked-header">
                <span className="unlocked-icon">🔓</span>
                <span>Protected Content Unlocked</span>
              </div>
              <p className="unlocked-text">
                Welcome to the private zone. This content is only visible to verified members
                who proved their eligibility through a zero-knowledge proof.
              </p>
            </div>
            <button className="btn btn-secondary" onClick={resetStatus}>
              Check again
            </button>
          </div>
        )}

        {/* Result: Access Denied */}
        {status === 'denied' && (
          <div className="result result-denied">
            <div className="result-icon">✗</div>
            <h2 className="result-title">Access denied</h2>
            <p className="result-text">
              This wallet could not prove eligibility for the protected resource.
            </p>
            <button className="btn btn-secondary" onClick={resetStatus}>
              Try again
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && errorMessage && (
          <div className="result result-error">
            <p className="result-text">{errorMessage}</p>
            <button className="btn btn-secondary" onClick={resetStatus}>
              Dismiss
            </button>
          </div>
        )}

        {/* How It Works — explains the Kachina dual-state model to users */}
        {wallet.isConnected && status === 'idle' && (
          <div className="how-it-works">
            <h3>How it works</h3>
            <ol>
              <li>A <strong>witness function</strong> reads your eligibility token locally — it never leaves your device.</li>
              <li>The Compact circuit <strong>hashes</strong> the token and checks it against the on-chain eligible set.</li>
              <li>A <strong>zero-knowledge proof</strong> verifies the computation without revealing your token.</li>
              <li>Only the result (<em>"access granted"</em>) is recorded on the Midnight ledger.</li>
            </ol>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <p>
            Built on{' '}
            <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">
              Midnight Network
            </a>
            {' '}— privacy-preserving smart contracts powered by zero-knowledge proofs.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
