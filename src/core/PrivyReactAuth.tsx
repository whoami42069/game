import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, useWallets, type CrossAppAccountWithMetadata } from '@privy-io/react-auth';

// Wallet connection component
function WalletConnector({ onConnect }: { onConnect: (address: string) => void }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if we're in a redirect/popup scenario
    if (window.location.search.includes('privy_oauth_code') || 
        window.location.search.includes('privy_oauth_state') ||
        window.opener) {
      console.log('Detected Privy redirect scenario');
      
      // If we have an opener, we're in a popup
      if (window.opener && authenticated && user && user.wallet?.address) {
        console.log('Sending auth success to parent window');
        window.opener.postMessage({
          type: 'privy-auth-success',
          address: user.wallet.address
        }, window.location.origin);
        
        // Close this window/tab after a short delay
        setTimeout(() => {
          window.close();
        }, 100);
        return;
      }
    }
    
    if (authenticated && user) {
      console.log('Privy user authenticated:', user);
      
      // Set up wallet provider for transactions
      if (wallets && wallets.length > 0) {
        const wallet = wallets[0];
        // Check if wallet has getEthereumProvider method (for embedded wallets)
        if ('getEthereumProvider' in wallet) {
          (wallet as any).getEthereumProvider().then((provider: any) => {
            (window as any).privyProvider = provider;
            console.log('Privy provider set for transactions');
          }).catch((err: any) => {
            console.error('Failed to get Privy provider:', err);
          });
        }
      }
      
      // Check for Cross-App account with Monad Games ID
      if (user.linkedAccounts) {
        const crossAppAccount = user.linkedAccounts.find(
          (account: any) => 
            account.type === 'cross_app' && 
            account.providerApp?.id === 'cmd8euall0037le0my79qpz42'
        ) as CrossAppAccountWithMetadata | undefined;
        
        console.log('Cross-app account:', crossAppAccount);
        
        if (crossAppAccount && crossAppAccount.embeddedWallets && crossAppAccount.embeddedWallets.length > 0) {
          const address = crossAppAccount.embeddedWallets[0].address;
          console.log('Found embedded wallet address:', address);
          setWalletAddress(address);
          onConnect(address);
          
          // Close the modal after successful connection
          setTimeout(() => {
            const modal = document.getElementById('privy-react-modal');
            if (modal) {
              modal.style.display = 'none';
            }
          }, 1000);
          return;
        }
      }
      
      // Fallback: check for regular wallet
      if (user.wallet?.address) {
        const address = user.wallet.address;
        console.log('Found wallet address:', address);
        setWalletAddress(address);
        onConnect(address);
        
        setTimeout(() => {
          const modal = document.getElementById('privy-react-modal');
          if (modal) {
            modal.style.display = 'none';
          }
        }, 1000);
      }
    }
  }, [authenticated, user, wallets, onConnect]);
  
  const handleConnect = async () => {
    if (!ready) return;
    
    try {
      console.log('Starting Privy login...');
      // Store current window reference before login
      const currentWindow = window.self;
      
      await login();
      
      // After login, ensure we're in the correct window
      if (window.opener && window.opener !== window) {
        // We're in a popup/new tab, send message to parent and close
        if (authenticated && user && user.wallet?.address) {
          window.opener.postMessage({
            type: 'privy-auth-success',
            address: user.wallet.address
          }, window.location.origin);
          window.close();
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  if (!ready) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading Privy...</div>;
  }
  
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
      {!authenticated ? (
        <div>
          <h3 style={{ color: '#00ff88', marginBottom: '20px' }}>Connect Wallet</h3>
          <button 
            onClick={handleConnect}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#8B5FBF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Connect with Monad Games ID
          </button>
          <p style={{ marginTop: '15px', fontSize: '12px', color: '#888' }}>
            Click to authenticate with your Monad Games ID
          </p>
        </div>
      ) : (
        <div>
          {walletAddress ? (
            <>
              <p style={{ color: '#00ff88' }}>
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
              <button 
                onClick={logout}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <p style={{ color: '#ffaa00' }}>
              Please link your Monad Games ID account
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Main Privy auth class
export class PrivyReactAuth {
  private root: ReactDOM.Root | null = null;
  private modalDiv: HTMLDivElement | null = null;
  private walletAddress: string | null = null;
  private onConnectCallback: ((address: string) => void) | null = null;
  
  init() {
    // Create modal div if it doesn't exist
    if (!this.modalDiv) {
      this.modalDiv = document.createElement('div');
      this.modalDiv.id = 'privy-react-modal';
      this.modalDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        background: rgba(26, 31, 46, 0.98);
        border: 2px solid #8B5FBF;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        min-width: 400px;
        display: none;
      `;
      document.body.appendChild(this.modalDiv);
      
      // Create React root
      this.root = ReactDOM.createRoot(this.modalDiv);
    }
  }
  
  async connect(): Promise<string | null> {
    this.init();
    
    return new Promise((resolve) => {
      if (!this.modalDiv || !this.root) {
        resolve(null);
        return;
      }
      
      // Listen for messages from popup windows (in case of redirect)
      const popupMessageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'privy-auth-success' && event.data.address) {
          console.log('Received auth success from popup:', event.data.address);
          this.walletAddress = event.data.address;
          
          // Hide modal
          if (this.modalDiv) {
            this.modalDiv.style.display = 'none';
          }
          
          window.removeEventListener('message', popupMessageHandler);
          resolve(event.data.address);
        }
      };
      window.addEventListener('message', popupMessageHandler);
      
      // Show modal
      this.modalDiv.style.display = 'block';
      
      // Set callback
      this.onConnectCallback = (address: string) => {
        this.walletAddress = address;
        window.removeEventListener('message', popupMessageHandler);
        resolve(address);
      };
      
      // Use YOUR app ID and configuration
      const appId = 'cmeg9jzf4009oib0by8nw41ml'; // Your specific app ID
      
      console.log('Initializing Privy with app ID:', appId);
      
      this.root.render(
        <PrivyProvider
          appId={appId}
          config={{
            // Configure for Cross-App authentication
            loginMethodsAndOrder: {
              primary: ['privy:cmd8euall0037le0my79qpz42'] // Monad Games ID
            },
            // Make sure embedded wallets are enabled
            embeddedWallets: {
              createOnLogin: 'users-without-wallets'
            },
            // Add appearance customization
            appearance: {
              theme: 'dark',
              accentColor: '#8B5FBF'
            }
          }}
        >
          <WalletConnector onConnect={this.onConnectCallback} />
        </PrivyProvider>
      );
      
      // Add ESC key handler to close
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.modalDiv) {
          this.modalDiv.style.display = 'none';
          document.removeEventListener('keydown', handleEsc);
          window.removeEventListener('message', popupMessageHandler);
          resolve(this.walletAddress);
        }
      };
      document.addEventListener('keydown', handleEsc);
      
      // Add click outside to close
      const handleClickOutside = (e: MouseEvent) => {
        if (this.modalDiv && !this.modalDiv.contains(e.target as Node)) {
          this.modalDiv.style.display = 'none';
          document.removeEventListener('click', handleClickOutside);
          document.removeEventListener('keydown', handleEsc);
          window.removeEventListener('message', popupMessageHandler);
          resolve(this.walletAddress);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    });
  }
  
  getAddress(): string | null {
    return this.walletAddress;
  }
  
  getShortAddress(): string | null {
    if (!this.walletAddress) return null;
    return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
  }
  
  disconnect() {
    this.walletAddress = null;
    if (this.modalDiv) {
      this.modalDiv.style.display = 'none';
    }
  }
}

export const privyReactAuth = new PrivyReactAuth();