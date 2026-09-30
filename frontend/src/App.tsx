import { useCallback, useState } from 'react';
import type { AccessStatus, WalletState } from './types';
import '@midnight-ntwrk/dapp-connector-api';

const DEMO_TOKENS = new Set([
  'midnight-pioneer',
  'zkpass-member-001',
  'fellowship-2024',
  'demo-eligible',
]);

function App() {
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false, address: null });
  const [status, setStatus] = useState<AccessStatus>('idle');
  const [token, setToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    setStatus('connecting');
    setErrorMessage(null);

    try {
      if (!window.midnight?.mnLace) {
        setWallet({ isConnected: true, address: null });
        setStatus('idle');
        return;
      }

      const api = await window.midnight.mnLace.connect('preprod');
      const addresses = await api.getShieldedAddresses();
      setWallet({ isConnected: true, address: addresses.shieldedAddress });
      setStatus('idle');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
      setStatus('error');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({ isConnected: false, address: null });
    setStatus('idle');
    setToken('');
    setErrorMessage(null);
  }, []);

  const checkAccess = useCallback(() => {
    if (!token.trim()) {
      setErrorMessage('Enter a sample access code to try the local check.');
      setStatus('error');
      return;
    }

    setErrorMessage(null);
    setStatus(DEMO_TOKENS.has(token.trim()) ? 'granted' : 'denied');
  }, [token]);

  const resetStatus = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">🔐</span>
            <h1 className="title">zkPass Lite</h1>
          </div>
          <p className="subtitle">Private Access Checker</p>
          <span className="demo-badge">Web demo only</span>
        </header>

        <div className="explainer">
          <p>
            A service needs to know if you qualify, not keep your secret access code. Sharing less
            data means there is less to expose if that service is breached.
          </p>
          <p>
            This page checks a sample code in your browser. It does not generate a proof, submit a
            transaction, or protect content. The contract and CLI contain the real proof flow.
          </p>
        </div>

        <div className="wallet-section">
          {!wallet.isConnected ? (
            <button
              className="btn btn-secondary"
              onClick={connectWallet}
              disabled={status === 'connecting'}
            >
              {status === 'connecting'
                ? 'Connecting…'
                : window.midnight?.mnLace
                  ? 'Connect Lace for demo'
                  : 'Try demo'}
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
                    : 'Demo session'}
                </span>
              </div>
              <button className="btn btn-text" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          )}
        </div>

        {wallet.isConnected && status !== 'granted' && status !== 'denied' && (
          <div className="check-form">
            <label htmlFor="demo-token">Sample access code</label>
            <input
              id="demo-token"
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Type demo-eligible"
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={checkAccess}>
              Check demo access
            </button>
          </div>
        )}

        {status === 'granted' && (
          <div className="result result-granted">
            <div className="result-icon">✓</div>
            <h2 className="result-title">Demo access granted</h2>
            <p className="result-text">
              This sample code matches the page's local demo list. No zero knowledge proof was generated.
            </p>
            <button className="btn btn-secondary" onClick={resetStatus}>Check again</button>
          </div>
        )}

        {status === 'denied' && (
          <div className="result result-denied">
            <div className="result-icon">✗</div>
            <h2 className="result-title">Demo access denied</h2>
            <p className="result-text">This sample code is not in the page's local demo list.</p>
            <button className="btn btn-secondary" onClick={resetStatus}>Try again</button>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="result result-error">
            <p className="result-text">{errorMessage}</p>
            <button className="btn btn-secondary" onClick={resetStatus}>Dismiss</button>
          </div>
        )}

        {wallet.isConnected && status === 'idle' && (
          <div className="how-it-works">
            <h3>Run a real check</h3>
            <p>
              Follow the <a href="https://github.com/Julia759/zkpass-lite#run-the-contract-and-cli"
              target="_blank" rel="noopener noreferrer">CLI setup</a> to deploy the contract, add
              an eligible token commitment, and submit a proof on Midnight Preprod.
            </p>
          </div>
        )}

        <footer className="footer">
          <p>
            Built on{' '}
            <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">
              Midnight Network
            </a>
            {' '}• privacy-preserving smart contracts powered by zero-knowledge proofs.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
