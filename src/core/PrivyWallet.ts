import { PrivyClient } from '@privy-io/js-sdk-core';

class PrivyWallet {
  private privy: PrivyClient | null = null;
  private walletAddress: string | null = null;
  private isInitialized = false;
  
  async init() {
    if (this.isInitialized) return;
    
    const appId = import.meta.env.VITE_PRIVY_APP_ID || 'cmeg9jzf4009oib0by8nw41ml';
    
    try {
      this.privy = new PrivyClient({
        appId: appId,
        clientId: window.crypto.randomUUID(),
      });
      
      this.isInitialized = true;
      console.log('Privy initialized with app ID:', appId);
    } catch (error) {
      console.error('Failed to initialize Privy:', error);
      throw error;
    }
  }
  
  async connect(): Promise<string | null> {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.privy) {
      throw new Error('Privy not initialized');
    }
    
    try {
      // Use Privy's login flow with Cross-App authentication like mission7 example
      const authResponse = await this.privy.login({
        loginMethodsAndOrder: {
          primary: ['privy:cmd8euall0037le0my79qpz42'] // Monad Games ID Cross-App
        }
      });
      
      console.log('Auth response:', authResponse);
      
      // Get wallet address from the response
      if (authResponse?.user?.wallet?.address) {
        this.walletAddress = authResponse.user.wallet.address;
        return this.walletAddress;
      } else if (authResponse?.user?.linkedAccounts) {
        // Check linked accounts for wallet
        const walletAccount = authResponse.user.linkedAccounts.find(
          (account: any) => account.type === 'wallet'
        );
        if (walletAccount?.address) {
          this.walletAddress = walletAccount.address;
          return this.walletAddress;
        }
      }
      
      throw new Error('No wallet found in Privy response');
    } catch (error) {
      console.error('Privy login error:', error);
      throw error;
    }
  }
  
  async disconnect() {
    if (this.privy) {
      await this.privy.logout();
      this.walletAddress = null;
    }
  }
  
  getAddress(): string | null {
    return this.walletAddress;
  }
  
  getShortAddress(): string | null {
    if (!this.walletAddress) return null;
    return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
  }
}

export const privyWallet = new PrivyWallet();