import { createPublicClient, http } from 'viem';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Monad testnet configuration
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [process.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    },
  },
};

async function fetchGameScores() {
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS;
  const gameAddress = process.env.VITE_GAME_ADDRESS;
  
  if (!contractAddress || !gameAddress) {
    console.error('❌ Missing contract or game address in environment variables');
    return;
  }

  console.log('🎮 Fetching scores for game:', gameAddress);
  console.log('📜 Contract address:', contractAddress);

  try {
    // Create public client
    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(process.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz'),
    });

    // Get latest block
    const latestBlock = await publicClient.getBlockNumber();
    console.log('📦 Latest block:', latestBlock);

    // Fetch PlayerDataUpdated events with chunking to avoid RPC limits
    const BLOCK_CHUNK_SIZE = 100n;
    const allLogs = [];
    const startBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n;
    
    console.log(`📦 Fetching events from block ${startBlock} to ${latestBlock}`);
    
    for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += BLOCK_CHUNK_SIZE) {
      const toBlock = fromBlock + BLOCK_CHUNK_SIZE - 1n > latestBlock 
        ? latestBlock 
        : fromBlock + BLOCK_CHUNK_SIZE - 1n;
      
      try {
        const logs = await publicClient.getLogs({
          address: contractAddress,
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
            game: gameAddress
          },
          fromBlock: fromBlock,
          toBlock: toBlock
        });
        
        allLogs.push(...logs);
      } catch (chunkError) {
        console.warn(`⚠️ Failed to fetch logs for blocks ${fromBlock}-${toBlock}`);
      }
    }
    
    const logs = allLogs;

    console.log(`\n📊 Found ${logs.length} score submissions`);

    // Process and display scores
    const playerScores = new Map();
    
    for (const log of logs) {
      const player = log.args.player;
      const score = Number(log.args.scoreAmount);
      const txHash = log.transactionHash;
      
      const existing = playerScores.get(player);
      if (!existing || score > existing.score) {
        playerScores.set(player, { score, txHash });
      }
    }

    // Sort by score
    const sortedScores = Array.from(playerScores.entries())
      .map(([player, data]) => ({ player, ...data }))
      .sort((a, b) => b.score - a.score);

    console.log('\n🏆 TOP SCORES:');
    console.log('=====================================');
    
    sortedScores.slice(0, 10).forEach((entry, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      console.log(`${medal} ${entry.player.slice(0, 6)}...${entry.player.slice(-4)} - Score: ${entry.score.toLocaleString()}`);
      console.log(`   📝 TX: https://testnet.monadexplorer.com/tx/${entry.txHash}`);
    });

    console.log('\n✅ Successfully fetched blockchain scores!');
    console.log(`📈 Total unique players: ${sortedScores.length}`);
    console.log(`🏆 Highest score: ${sortedScores[0]?.score?.toLocaleString() || 'N/A'}`);

  } catch (error) {
    console.error('❌ Error fetching scores:', error);
  }
}

// Run the test
fetchGameScores();