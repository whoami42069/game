import { PrivyClient } from '@privy-io/js-sdk-core';

export interface User {
  wallet?: {
    address: string;
    chainId?: number;
  };
  id: string;
}

export class AuthManager {
  private privy: PrivyClient | null = null;
  private currentUser: User | null = null;
  private authCallbacks: ((user: User | null) => void)[] = [];
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    // Delay initialization to avoid blocking the game load
    this.initPromise = this.initPrivy();
  }
  
  private async initPrivy(): Promise<void> {
    const appId = import.meta.env.VITE_PRIVY_APP_ID || 'cmeg9jzf4009oib0by8nw41ml';
    
    try {
      // Delay init slightly to let game load first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.privy = new PrivyClient({
        appId,
        clientId: window.crypto.randomUUID ? window.crypto.randomUUID() : 'client-' + Math.random().toString(36).substr(2, 9),
        storage: {
          get: async (key: string) => {
            return localStorage.getItem(key);
          },
          put: async (key: string, value: string) => {
            localStorage.setItem(key, value);
          },
          del: async (key: string) => {
            localStorage.removeItem(key);
          },
          getKeys: async () => {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) keys.push(key);
            }
            return keys;
          }
        }
      });
      
      console.log('Privy initialized successfully with app ID:', appId);
    } catch (error) {
      console.error('Failed to initialize Privy:', error);
      // Don't throw - allow game to continue without auth
    }
  }
  
  async connectWallet(): Promise<User | null> {
    // Wait for initialization if still pending
    if (this.initPromise) {
      await this.initPromise;
    }
    
    if (!this.privy) {
      console.error('Privy not initialized');
      return null;
    }
    
    try {
      console.log('Starting wallet connection...');
      
      // Try to login with wallet
      const session = await this.privy.login({
        loginMethods: ['wallet'],
        onComplete: (user, isNewUser) => {
          console.log('Login complete:', { user, isNewUser });
        },
        onError: (error) => {
          console.error('Login error:', error);
        }
      });
      
      console.log('Session received:', session);
      
      if (session && session.user) {
        // Extract wallet address from the session
        let walletAddress: string | undefined;
        let chainId: number | undefined;
        
        // Check for wallet in different possible locations
        if (session.user.wallet) {
          walletAddress = session.user.wallet.address;
          chainId = session.user.wallet.chainId;
        } else if (session.user.linkedAccounts) {
          const walletAccount = session.user.linkedAccounts.find((acc: any) => acc.type === 'wallet');
          if (walletAccount) {
            walletAddress = walletAccount.address;
            chainId = walletAccount.chainId;
          }
        }
        
        if (walletAddress) {
          this.currentUser = {
            id: session.user.id,
            wallet: {
              address: walletAddress,
              chainId: chainId || 1
            }
          };
          
          console.log('User authenticated:', this.currentUser);
          this.notifyAuthCallbacks(this.currentUser);
          return this.currentUser;
        }
      }
      
      console.log('No wallet found in session');
      return null;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return null;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.privy) {
      try {
        await this.privy.logout();
        this.currentUser = null;
        this.notifyAuthCallbacks(null);
        console.log('User disconnected');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  }
  
  getCurrentUser(): User | null {
    return this.currentUser;
  }
  
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
  
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authCallbacks.push(callback);
    return () => {
      this.authCallbacks = this.authCallbacks.filter(cb => cb !== callback);
    };
  }
  
  private notifyAuthCallbacks(user: User | null) {
    this.authCallbacks.forEach(callback => callback(user));
  }
  
  getWalletAddress(): string | null {
    return this.currentUser?.wallet?.address || null;
  }
  
  getShortAddress(): string | null {
    const address = this.getWalletAddress();
    if (!address) return null;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}

export const authManager = new AuthManager();