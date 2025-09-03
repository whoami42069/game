import { highScoreManager } from './src/core/HighScoreManager.ts';

async function test() {
  console.log('Testing game fetch implementation...');
  
  const scores = await highScoreManager.fetchAllGameScores();
  
  console.log(`Found ${scores.length} scores`);
  
  if (scores.length > 0) {
    console.log('\n🏆 Leaderboard:');
    scores.slice(0, 5).forEach((entry, i) => {
      console.log(`${i+1}. ${entry.player.slice(0,6)}...${entry.player.slice(-4)}: ${entry.score}`);
      console.log(`   TX: ${entry.transactionHash}`);
    });
  }
}

test().catch(console.error);