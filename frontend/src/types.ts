export type AccessStatus = 'idle' | 'connecting' | 'checking' | 'granted' | 'denied' | 'error';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
}
