import { createPublicClient, http } from 'viem';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple test to fetch game scores
async function testFetch() {
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS;
  const gameAddress = process.env.VITE_GAME_ADDRESS;
  
  console.log('🎮 Game ID:', gameAddress);
  console.log('📜 Contract:', contractAddress);
  
  const client = createPublicClient({
    chain: { id: 10143 },
    transport: http('https://testnet-rpc.monad.xyz'),
  });
  
  try {
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock > 99n ? latestBlock - 99n : 0n;
    
    console.log(`📦 Fetching blocks ${fromBlock} to ${latestBlock}`);
    
    const logs = await client.getLogs({
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
      args: { game: gameAddress },
      fromBlock,
      toBlock: latestBlock
    });
    
    console.log(`\n✅ Found ${logs.length} scores`);
    
    if (logs.length > 0) {
      // Get unique high scores per player
      const scores = new Map();
      for (const log of logs) {
        const player = log.args.player;
        const score = Number(log.args.scoreAmount);
        if (!scores.has(player) || score > scores.get(player)) {
          scores.set(player, score);
        }
      }
      
      // Sort and display
      const sorted = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      console.log('\n🏆 Top Scores:');
      sorted.forEach(([player, score], i) => {
        console.log(`${i+1}. ${player.slice(0,6)}...${player.slice(-4)}: ${score}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFetch();