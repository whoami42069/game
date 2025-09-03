import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Define Monad testnet chain configuration
const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL || 'https://testnet.monad.xyz'],
    },
    public: {
      http: [import.meta.env.VITE_RPC_URL || 'https://testnet.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const;

// Simple high score contract ABI (if we have a deployed contract)
const HIGH_SCORE_ABI = [
  {
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'score', type: 'uint256' }
    ],
    name: 'updatePlayerData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export class HighScoreManager {
  private currentWalletAddress: string | null = null;
  private localHighScore: number = 0;
  private walletClient: any = null;
  private publicClient: any = null;
  private account: any = null;
  
  constructor() {
    // Load local high score from localStorage as backup
    const stored = localStorage.getItem('highScore');
    if (stored) {
      this.localHighScore = parseInt(stored, 10);
    }

    // Initialize wallet client with private key if available
    const privateKey = import.meta.env.VITE_WALLET_PRIVATE_KEY;
    console.log('Private key exists:', !!privateKey);
    console.log('Private key length:', privateKey?.length);
    
    if (privateKey) {
      try {
        this.account = privateKeyToAccount(privateKey as `0x${string}`);
        console.log('Account created from private key:', this.account.address);
        
        const rpcUrl = monadTestnet.rpcUrls.default.http[0];
        console.log('Using RPC URL:', rpcUrl);
        
        this.walletClient = createWalletClient({
          account: this.account,
          chain: monadTestnet,
          transport: http(rpcUrl),
        });

        this.publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(rpcUrl),
        });

        console.log('✅ Wallet client initialized with account:', this.account.address);
        console.log('✅ Ready to send transactions to Monad testnet');
      } catch (error) {
        console.error('❌ Failed to initialize wallet client:', error);
      }
    } else {
      console.warn('⚠️ No private key found in environment variables');
    }
  }
  
  async initialize(walletAddress: string) {
    this.currentWalletAddress = walletAddress;
    console.log('HighScoreManager initialized for wallet:', walletAddress);
    
    // Load high score from blockchain if contract is deployed
    await this.loadHighScoreFromChain();
  }
  
  async submitScore(score: number): Promise<boolean> {
    console.log('submitScore called with score:', score, 'current wallet:', this.currentWalletAddress);
    
    // Update local high score if this is higher
    if (score > this.localHighScore) {
      this.localHighScore = score;
      localStorage.setItem('highScore', score.toString());
    }
    
    // Store transaction hash for linking
    let transactionHash: string | undefined;
    
    // If no wallet address, just save locally
    if (!this.currentWalletAddress) {
      console.log('No wallet connected, saving score locally only');
      return true;
    }
    
    try {
      console.log('Attempting to submit score to blockchain...');
      
      // Check if we have a contract address
      const contractAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS;
      
      if (contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000') {
        // Submit to actual game contract
        if (this.walletClient && this.account) {
          console.log('Submitting score to game contract at:', contractAddress);
          
          const hash = await this.walletClient.writeContract({
            address: contractAddress as `0x${string}`,
            abi: HIGH_SCORE_ABI,
            functionName: 'updatePlayerData',
            args: [this.currentWalletAddress as `0x${string}`, BigInt(score)],
          });
          
          console.log('Transaction submitted:', hash);
          transactionHash = hash;
          
          // Wait for confirmation
          const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
          console.log('Transaction confirmed:', receipt);
          
          // Update leaderboard with transaction hash
          const { leaderboardManager } = await import('./LeaderboardManager');
          leaderboardManager.addScore(this.currentWalletAddress, score, transactionHash);
          
          return true;
        }
      } else {
        // Fallback: Create a simple transaction with score in data
        if (this.walletClient && this.account) {
          console.log('📝 No contract address, sending score as transaction memo');
          console.log('🔑 Using wallet:', this.account.address);
          
          const scoreData = `NEXUS_SCORE:${score}:PLAYER:${this.currentWalletAddress}:TIME:${new Date().toISOString()}`;
          const hexData = `0x${Buffer.from(scoreData).toString('hex')}`;
          
          console.log('📊 Score data:', scoreData);
          console.log('🔢 Hex data:', hexData);
          
          // Send transaction from the game wallet to itself with score data
          const tx = {
            to: this.account.address, // Send to self
            value: parseEther('0'), // No value transfer
            data: hexData as `0x${string}`,
          };
          
          console.log('📤 Sending transaction:', tx);
          
          const hash = await this.walletClient.sendTransaction(tx);
          
          console.log('✅ Score memo transaction sent:', hash);
          transactionHash = hash;
          
          // Wait for confirmation
          const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
          console.log('Transaction confirmed:', receipt);
          
          // Update leaderboard with transaction hash
          const { leaderboardManager } = await import('./LeaderboardManager');
          leaderboardManager.addScore(this.currentWalletAddress, score, transactionHash);
          
          return true;
        } else {
          console.log('No wallet client available, score saved locally only');
          // Still update leaderboard even without transaction
          const { leaderboardManager } = await import('./LeaderboardManager');
          leaderboardManager.addScore(this.currentWalletAddress, score);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to submit score to blockchain:', error);
      // Still update leaderboard even if transaction failed
      if (this.currentWalletAddress) {
        const { leaderboardManager } = await import('./LeaderboardManager');
        leaderboardManager.addScore(this.currentWalletAddress, score);
      }
      // Still return true as score was saved locally
      return true;
    }
    
    return true;
  }
  
  async loadHighScoreFromChain(): Promise<number> {
    // For now, return local score
    // In production, you'd read from the smart contract
    const contractAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS;
    
    if (contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000' && this.publicClient && this.currentWalletAddress) {
      try {
        // Would read high score from contract
        console.log('Would read high score from contract for:', this.currentWalletAddress);
      } catch (error) {
        console.error('Failed to load high score from chain:', error);
      }
    }
    
    return this.localHighScore;
  }
  
  getHighScore(): number {
    return this.localHighScore;
  }
  
  formatScore(score: number): string {
    return score.toLocaleString();
  }
  
  // Check if current score beats high score
  isNewHighScore(score: number): boolean {
    return score > this.localHighScore;
  }
}

export const highScoreManager = new HighScoreManager();