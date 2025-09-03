// Simple wallet connection using MetaMask or other injected wallets
export class WalletConnect {
  private walletAddress: string | null = null;
  private authCallbacks: ((address: string | null) => void)[] = [];
  
  async connect(): Promise<string | null> {
    try {
      // Check if MetaMask or another wallet is installed
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or another Web3 wallet!');
        window.open('https://metamask.io/download/', '_blank');
        return null;
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        this.walletAddress = accounts[0];
        this.notifyCallbacks(this.walletAddress);
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            this.walletAddress = accounts[0];
            this.notifyCallbacks(this.walletAddress);
          } else {
            this.disconnect();
          }
        });
        
        return this.walletAddress;
      }
      
      return null;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      if (error.code === 4001) {
        // User rejected the connection
        console.log('User rejected the connection');
      }
      return null;
    }
  }
  
  async disconnect() {
    this.walletAddress = null;
    this.notifyCallbacks(null);
  }
  
  getWalletAddress(): string | null {
    return this.walletAddress;
  }
  
  getShortAddress(): string | null {
    if (!this.walletAddress) return null;
    return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
  }
  
  onAuthChange(callback: (address: string | null) => void): () => void {
    this.authCallbacks.push(callback);
    return () => {
      this.authCallbacks = this.authCallbacks.filter(cb => cb !== callback);
    };
  }
  
  private notifyCallbacks(address: string | null) {
    this.authCallbacks.forEach(cb => cb(address));
  }
  
  async checkConnection(): Promise<string | null> {
    try {
      if (typeof window.ethereum === 'undefined') {
        return null;
      }
      
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts && accounts.length > 0) {
        this.walletAddress = accounts[0];
        return this.walletAddress;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
      return null;
    }
  }
}

// Type declaration moved to vite-env.d.ts

export const walletConnect = new WalletConnect();