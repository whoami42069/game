import { createPublicClient, http } from 'viem';
import dotenv from 'dotenv';

dotenv.config();

async function fetchAllScores() {
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS;
  const gameAddress = process.env.VITE_GAME_ADDRESS;
  
  console.log('🎮 Game ID:', gameAddress);
  console.log('📜 Contract:', contractAddress);
  
  const client = createPublicClient({
    chain: { id: 10143 },
    transport: http('https://testnet-rpc.monad.xyz'),
  });
  
  try {
    // The transaction you showed was from block 34733754
    // Let's fetch from around that block
    const targetBlock = 34733754n;
    const latestBlock = await client.getBlockNumber();
    
    console.log(`📦 Latest block: ${latestBlock}`);
    console.log(`🎯 Target tx was in block: ${targetBlock}`);
    
    // Fetch a range around the known transaction
    const fromBlock = targetBlock - 50n;
    const toBlock = targetBlock + 50n;
    
    console.log(`📊 Fetching blocks ${fromBlock} to ${toBlock}`);
    
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
      toBlock
    });
    
    console.log(`\n✅ Found ${logs.length} score submissions`);
    
    if (logs.length > 0) {
      logs.forEach(log => {
        console.log('\n📝 Score submission:');
        console.log('  Player:', log.args.player);
        console.log('  Score:', Number(log.args.scoreAmount));
        console.log('  TX:', log.transactionHash);
        console.log('  Block:', log.blockNumber);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchAllScores();