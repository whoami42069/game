// Simple Privy authentication using iframe integration
export class PrivyAuth {
  private appId: string;
  private walletAddress: string | null = null;
  private authCallbacks: ((address: string | null) => void)[] = [];
  
  constructor() {
    this.appId = import.meta.env.VITE_PRIVY_APP_ID || 'cmeg9jzf4009oib0by8nw41ml';
  }
  
  async login(): Promise<string | null> {
    return new Promise((resolve) => {
      // Create Privy login URL
      const loginUrl = `https://auth.privy.io/auth?app_id=${this.appId}`;
      
      // Open in a popup
      const width = 400;
      const height = 600;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const authWindow = window.open(
        loginUrl,
        'privy-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Listen for messages from the popup
      const messageHandler = (event: MessageEvent) => {
        // Check if message is from Privy
        if (event.origin !== 'https://auth.privy.io') return;
        
        if (event.data && event.data.type === 'privy-auth-success') {
          // Extract wallet address from the auth data
          const walletAddress = event.data.walletAddress || event.data.address;
          if (walletAddress) {
            this.walletAddress = walletAddress;
            this.notifyCallbacks(walletAddress);
            window.removeEventListener('message', messageHandler);
            if (authWindow) authWindow.close();
            resolve(walletAddress);
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (authWindow && authWindow.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          resolve(this.walletAddress);
        }
      }, 500);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        if (authWindow && !authWindow.closed) authWindow.close();
        resolve(null);
      }, 120000);
    });
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
  
  disconnect() {
    this.walletAddress = null;
    this.notifyCallbacks(null);
  }
}

export const privyAuth = new PrivyAuth();