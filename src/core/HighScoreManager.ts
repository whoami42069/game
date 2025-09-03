import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Define Monad testnet chain configuration
const monadTestnet = {
  id: 10143,  // Correct Monad testnet chain ID
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: [import.meta.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const;

// Contract ABI for updatePlayerData function on Monad Games contract
const HIGH_SCORE_ABI = [
  {
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'scoreAmount', type: 'uint256' },
      { name: 'transactionAmount', type: 'uint256' }
    ],
    name: 'updatePlayerData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'game', type: 'address' },
      { indexed: true, name: 'player', type: 'address' },
      { indexed: true, name: 'scoreAmount', type: 'uint256' },
      { indexed: false, name: 'transactionAmount', type: 'uint256' }
    ],
    name: 'PlayerDataUpdated',
    type: 'event'
  }
] as const;

export class HighScoreManager {
  private currentWalletAddress: string | null = null;
  private localHighScore: number = 0;
  private walletClient: any = null;
  private publicClient: any = null;
  private account: any = null;
  private pendingTransaction: boolean = false;
  
  constructor() {
    // Load local high score from localStorage as backup
    const stored = localStorage.getItem('highScore');
    if (stored) {
      this.localHighScore = parseInt(stored, 10);
    }

    // Initialize blockchain configuration
    console.log('🔗 === BLOCKCHAIN CONFIGURATION ===');
    
    // Check all required environment variables
    const privateKey = import.meta.env.VITE_WALLET_PRIVATE_KEY;
    const contractAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS;
    const gameAddress = import.meta.env.VITE_GAME_ADDRESS;
    const rpcUrl = import.meta.env.VITE_RPC_URL || monadTestnet.rpcUrls.default.http[0];
    
    console.log('🎮 Game Contract:', contractAddress || 'NOT CONFIGURED');
    console.log('🎯 Game Address:', gameAddress || 'NOT CONFIGURED');
    console.log('🌐 RPC URL:', rpcUrl);
    console.log('🔑 Private key configured:', !!privateKey);
    
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      console.error('⚠️ WARNING: No game contract address configured!');
      console.error('⚠️ Scores will be saved locally only');
    }
    
    if (!gameAddress) {
      console.error('⚠️ WARNING: No game address configured!');
      console.error('⚠️ This is required for blockchain transactions');
    }
    
    if (privateKey) {
      try {
        this.account = privateKeyToAccount(privateKey as `0x${string}`);
        console.log('👤 Game wallet address:', this.account.address);
        console.log('ℹ️ This wallet must have GAME_ROLE on the contract');
        
        this.walletClient = createWalletClient({
          account: this.account,
          chain: monadTestnet,
          transport: http(rpcUrl),
        });

        this.publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(rpcUrl),
        });

        console.log('✅ Blockchain client initialized successfully');
        console.log('🎯 Ready to submit scores to Monad testnet');
        
        // Verify the account has balance (optional)
        this.verifyAccountBalance();
      } catch (error) {
        console.error('❌ Failed to initialize wallet client:', error);
      }
    } else {
      console.error('❌ No private key found in environment variables!');
      console.error('❌ Blockchain transactions will not be possible');
    }
  }
  
  async initialize(walletAddress: string) {
    this.currentWalletAddress = walletAddress;
    console.log('HighScoreManager initialized for wallet:', walletAddress);
    
    // Load high score from blockchain if contract is deployed
    await this.loadHighScoreFromChain();
  }
  
  async submitScore(score: number): Promise<boolean> {
    console.log('🎮=== SUBMITTING GAME SCORE TO BLOCKCHAIN ===');
    console.log('🏆 Score:', score);
    console.log('👤 Player wallet:', this.currentWalletAddress);
    
    // Check if another transaction is pending
    if (this.pendingTransaction) {
      console.warn('⏳ Another transaction is pending, skipping this submission');
      return true;
    }
    
    // Update local high score if this is higher
    if (score > this.localHighScore) {
      this.localHighScore = score;
      localStorage.setItem('highScore', score.toString());
      console.log('✨ New local high score!');
    }
    
    // Store transaction hash for linking
    let transactionHash: string | undefined;
    
    // If no wallet address, just save locally
    if (!this.currentWalletAddress) {
      console.warn('⚠️ No wallet connected, saving score locally only');
      return true;
    }
    
    try {
      console.log('Attempting to submit score to blockchain...');
      this.pendingTransaction = true;
      
      // Check if we have a contract address
      const contractAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS;
      const gameAddress = import.meta.env.VITE_GAME_ADDRESS;
      
      if (contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000') {
        // Submit to actual game contract
        if (this.walletClient && this.account && gameAddress) {
          console.log('🎮 Submitting score to Monad Games contract');
          console.log('📝 Contract address:', contractAddress);
          console.log('🎯 Game address:', gameAddress);
          console.log('👤 Player address:', this.currentWalletAddress);
          console.log('🏆 Score:', score);
          
          // Important: The contract expects the game wallet (with GAME_ROLE) to call it
          // The game address in the event will be msg.sender (the wallet making the tx)
          // So we use the account with GAME_ROLE to send the transaction
          
          // Get current nonce to ensure proper transaction ordering
          const nonce = await this.publicClient.getTransactionCount({
            address: this.account.address,
            blockTag: 'pending' // Include pending transactions
          });
          console.log('🔢 Transaction nonce:', nonce);
          
          // Get current gas price and add priority fee for Monad
          const gasPrice = await this.publicClient.getGasPrice();
          const priorityGasPrice = (gasPrice * BigInt(150)) / BigInt(100); // 50% higher priority for Monad
          
          console.log('⛽ Gas price:', gasPrice.toString());
          console.log('🚀 Priority gas price:', priorityGasPrice.toString());
          
          // Retry logic for priority errors
          let retries = 3;
          let lastError: any = null;
          
          while (retries > 0) {
            try {
              const hash = await this.walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: HIGH_SCORE_ABI,
                functionName: 'updatePlayerData',
                args: [
                  this.currentWalletAddress as `0x${string}`, // player address
                  BigInt(score), // scoreAmount
                  BigInt(0) // transactionAmount (set to 0 for now, can be used for rewards later)
                ],
                account: this.account, // Use the wallet with GAME_ROLE
                nonce: nonce, // Explicitly set nonce
                maxFeePerGas: priorityGasPrice,
                maxPriorityFeePerGas: priorityGasPrice / BigInt(2),
                gas: BigInt(200000), // Estimated gas limit
              });
              
              // Success - save and process the transaction
              transactionHash = hash;
              break; // Exit retry loop
              
            } catch (error: any) {
              lastError = error;
              
              if (error?.message?.includes('Another transaction has higher priority')) {
                retries--;
                if (retries > 0) {
                  console.log(`⏳ Priority conflict, retrying... (${retries} attempts left)`);
                  // Wait before retry with exponential backoff
                  await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
                  // Increase gas price for next attempt
                  const newPriorityGasPrice = (priorityGasPrice * BigInt(150)) / BigInt(100);
                  console.log('🔺 Increasing priority gas price to:', newPriorityGasPrice.toString());
                  continue;
                }
              }
              
              // Non-priority error or out of retries
              throw error;
            }
          }
          
          // If we exhausted retries, throw the last error
          if (!transactionHash && lastError) {
            throw lastError;
          }
          
          const hash = transactionHash;
          
          console.log('✅ Transaction submitted:', hash);
          console.log('🔗 View on explorer: https://testnet.monadexplorer.com/tx/' + hash);
          transactionHash = hash;
          
          // Save transaction hash to localStorage for UI display
          if (this.currentWalletAddress) {
            localStorage.setItem(`last_tx_${this.currentWalletAddress}`, JSON.stringify({
              hash: hash,
              score: score,
              timestamp: Date.now()
            }));
          }
          
          // Wait for confirmation
          const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
          console.log('✅ Transaction confirmed:', receipt);
          console.log('📊 Block number:', receipt.blockNumber);
          console.log('⛽ Gas used:', receipt.gasUsed);
          console.log('🔗 View transaction: https://testnet.monadexplorer.com/tx/' + hash);
          
          // Update leaderboard with transaction hash
          const { leaderboardManager } = await import('./LeaderboardManager');
          leaderboardManager.addScore(this.currentWalletAddress, score, transactionHash);
          
          // Clear pending flag on success
          this.pendingTransaction = false;
          return true;
        }
      } else {
        console.error('❌ No game contract address configured!');
        console.log('📋 Updating local leaderboard only');
        // Still update leaderboard even without blockchain transaction
        const { leaderboardManager } = await import('./LeaderboardManager');
        leaderboardManager.addScore(this.currentWalletAddress, score);
        return true;
      }
    } catch (error: any) {
      console.error('❌ Failed to submit score to blockchain:', error);
      
      // Log specific error details
      if (error?.message) {
        console.error('📦 Error message:', error.message);
      }
      if (error?.code) {
        console.error('🔢 Error code:', error.code);
      }
      if (error?.cause) {
        console.error('🔍 Error cause:', error.cause);
      }
      
      // Common error handling
      if (error?.message?.includes('insufficient funds')) {
        console.error('💰 Insufficient funds for gas fees on Monad testnet');
      } else if (error?.message?.includes('user rejected')) {
        console.error('🚫 User rejected the transaction');
      } else if (error?.message?.includes('network')) {
        console.error('🌐 Network error - check RPC connection to Monad testnet');
      } else if (error?.message?.includes('GAME_ROLE')) {
        console.error('🔒 Permission error - wallet does not have GAME_ROLE');
      } else if (error?.message?.includes('Another transaction has higher priority')) {
        console.error('⚡ Transaction priority too low - network congestion detected');
        console.error('💡 The contract requires higher gas priority during busy periods');
      } else if (error?.message?.includes('reverted')) {
        console.error('📜 Smart contract reverted the transaction');
        console.error('📋 Revert reason:', error?.shortMessage || error?.message);
      }
      
      // Still update leaderboard even if transaction failed
      if (this.currentWalletAddress) {
        console.log('📋 Updating local leaderboard despite blockchain error');
        const { leaderboardManager } = await import('./LeaderboardManager');
        leaderboardManager.addScore(this.currentWalletAddress, score);
      }
      
      // Still return true as score was saved locally
      console.log('✅ Score saved locally despite blockchain error');
      return true;
    } finally {
      // Clear pending flag
      this.pendingTransaction = false;
    }
    
    return true;
  }
  
  async loadHighScoreFromChain(): Promise<number> {
    const contractAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS;
    const gameAddress = import.meta.env.VITE_GAME_ADDRESS;
    
    if (contractAddress && contractAddress !== '0x0000000000000000000000000000000000' && this.publicClient && this.currentWalletAddress) {
      try {
        console.log('📊 Fetching high score from blockchain for:', this.currentWalletAddress);
        
        // Get the latest block number
        const latestBlock = await this.publicClient.getBlockNumber();
        
        // Fetch recent player scores (simplified)
        const fromBlock = latestBlock > BigInt(99) ? latestBlock - BigInt(99) : BigInt(0);
        
        const logs = await this.publicClient.getLogs({
          address: contractAddress as `0x${string}`,
          event: {
            anonymous: false,
            inputs: [
              { indexed: true, name: 'game', type: 'address' },
              { indexed: true, name: 'player', type: 'address' },
              { indexed: true, name: 'scoreAmount', type: 'uint256' },
              { indexed: false, name: 'transactionAmount', type: 'uint256' }
            ],
            name: 'PlayerDataUpdated',
            type: 'event'
          },
          args: {
            game: gameAddress as `0x${string}`,
            player: this.currentWalletAddress as `0x${string}`
          },
          fromBlock: fromBlock,
          toBlock: latestBlock
        });
        
        if (logs.length > 0) {
          // Find the highest score from all events
          let highestScore = 0;
          for (const log of logs) {
            const score = Number(log.args.scoreAmount);
            if (score > highestScore) {
              highestScore = score;
            }
          }
          
          console.log('✅ Found blockchain high score:', highestScore);
          
          // Update local high score if blockchain has higher
          if (highestScore > this.localHighScore) {
            this.localHighScore = highestScore;
            localStorage.setItem('highScore', highestScore.toString());
          }
          
          return highestScore;
        } else {
          console.log('ℹ️ No blockchain scores found for this player');
        }
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
  
  // Fetch all scores from Monad Games API
  async fetchAllGameScores(): Promise<Array<{player: string, score: number, transactionHash: string}>> {
    try {
      console.log('🎮 Fetching scores from Monad Games API...');
      
      // Fetch from Monad Games leaderboard API
      const response = await fetch('https://monad-games-id-site.vercel.app/api/leaderboard?page=1&gameId=261&sortBy=scores&limit=50');
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`📊 Found ${data.data?.length || 0} scores from API`);
      
      // Convert API response to our format
      const scores = (data.data || []).map((entry: any) => ({
        player: entry.walletAddress,
        score: entry.score,
        transactionHash: '' // API doesn't provide tx hash
      }));
      
      return scores;
      
    } catch (error) {
      console.error('❌ Failed to fetch from Monad Games API, falling back to blockchain:', error);
      
      // Fallback to blockchain fetching
      return this.fetchAllGameScoresFromBlockchain();
    }
  }
  
  // Original blockchain fetching method (as fallback)
  private async fetchAllGameScoresFromBlockchain(): Promise<Array<{player: string, score: number, transactionHash: string}>> {
    const contractAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS;
    const gameAddress = import.meta.env.VITE_GAME_ADDRESS;
    
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000' || !this.publicClient) {
      console.log('⚠️ Cannot fetch game scores - blockchain not configured');
      return [];
    }
    
    try {
      console.log('🎮 Fetching scores for game:', gameAddress);
      
      // Get the latest block number
      const latestBlock = await this.publicClient.getBlockNumber();
      
      // Try to fetch from a known good starting point
      // We know there are scores around block 34876507
      const KNOWN_SCORE_BLOCK = BigInt(34876000);
      let allLogs = [];
      
      // Try fetching recent blocks first
      try {
        const recentFrom = latestBlock > BigInt(99) ? latestBlock - BigInt(99) : BigInt(0);
        const recentLogs = await this.publicClient.getLogs({
          address: contractAddress as `0x${string}`,
          event: {
            anonymous: false,
            inputs: [
              { indexed: true, name: 'game', type: 'address' },
              { indexed: true, name: 'player', type: 'address' },
              { indexed: true, name: 'scoreAmount', type: 'uint256' },
              { indexed: false, name: 'transactionAmount', type: 'uint256' }
            ],
            name: 'PlayerDataUpdated',
            type: 'event'
          },
          args: {
            game: gameAddress as `0x${string}`
          },
          fromBlock: recentFrom,
          toBlock: latestBlock
        });
        allLogs.push(...recentLogs);
      } catch (e) {
        console.warn('Failed to fetch recent logs:', e);
      }
      
      // Also try fetching from known score area
      if (latestBlock > KNOWN_SCORE_BLOCK) {
        try {
          const historicLogs = await this.publicClient.getLogs({
            address: contractAddress as `0x${string}`,
            event: {
              anonymous: false,
              inputs: [
                { indexed: true, name: 'game', type: 'address' },
                { indexed: true, name: 'player', type: 'address' },
                { indexed: true, name: 'scoreAmount', type: 'uint256' },
                { indexed: false, name: 'transactionAmount', type: 'uint256' }
              ],
              name: 'PlayerDataUpdated',
              type: 'event'
            },
            args: {
              game: gameAddress as `0x${string}`
            },
            fromBlock: KNOWN_SCORE_BLOCK,
            toBlock: KNOWN_SCORE_BLOCK + BigInt(99)
          });
          allLogs.push(...historicLogs);
        } catch (e) {
          console.warn('Failed to fetch historic logs:', e);
        }
      }
      
      const logs = allLogs;
      console.log(`📦 Fetched ${logs.length} events from blockchain`);
      
      console.log(`📊 Found ${logs.length} score submissions on-chain`);
      
      // Process logs and get highest score per player
      const playerScores = new Map<string, {score: number, transactionHash: string}>();
      
      for (const log of logs) {
        const player = log.args.player as string;
        const score = Number(log.args.scoreAmount);
        const txHash = log.transactionHash;
        
        const existing = playerScores.get(player);
        if (!existing || score > existing.score) {
          playerScores.set(player, { score, transactionHash: txHash });
        }
      }
      
      // Convert to array and sort by score
      const scores = Array.from(playerScores.entries())
        .map(([player, data]) => ({
          player,
          score: data.score,
          transactionHash: data.transactionHash
        }))
        .sort((a, b) => b.score - a.score);
      
      console.log(`✅ Processed ${scores.length} unique player high scores`);
      return scores;
      
    } catch (error) {
      console.error('❌ Failed to fetch game scores from blockchain:', error);
      return [];
    }
  }
  
  // Helper method to verify account has balance for gas
  private async verifyAccountBalance(): Promise<void> {
    try {
      if (this.publicClient && this.account) {
        const balance = await this.publicClient.getBalance({
          address: this.account.address,
        });
        
        const balanceInMON = Number(balance) / 1e18;
        console.log(`💰 Game wallet balance: ${balanceInMON.toFixed(4)} MON`);
        
        if (balanceInMON < 0.001) {
          console.warn('⚠️ Low balance! May not have enough gas for transactions');
          console.warn('💸 Please fund the game wallet:', this.account.address);
        }
      }
    } catch (error) {
      console.error('⚠️ Could not check wallet balance:', error);
    }
  }
}

export const highScoreManager = new HighScoreManager();