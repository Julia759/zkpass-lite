// ─── TypeScript Types for zkPass Lite Frontend ─────────────────────────────────

export type AccessStatus = 'idle' | 'connecting' | 'checking' | 'granted' | 'denied' | 'error';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
}

// Augment window for Midnight Lace wallet
declare global {
  interface Window {
    midnight?: {
      mnLace: import('@midnight-ntwrk/dapp-connector-api').InitialAPI;
    };
  }
}
