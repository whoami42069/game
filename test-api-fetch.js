// Test fetching from Monad Games API
async function testAPI() {
  console.log('🎮 Testing Monad Games API...\n');
  
  try {
    const response = await fetch('https://monad-games-id-site.vercel.app/api/leaderboard?page=1&gameId=261&sortBy=scores&limit=10');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received!');
    console.log(`📊 Total players: ${data.pagination.total}`);
    console.log(`📄 Current page: ${data.pagination.page}/${data.pagination.totalPages}`);
    console.log(`🎮 Game ID: ${data.gameId}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n🏆 LEADERBOARD:');
      console.log('=====================================');
      
      data.data.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        console.log(`${medal} ${entry.username}`);
        console.log(`   Wallet: ${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`);
        console.log(`   Score: ${entry.score.toLocaleString()}`);
        console.log(`   Rank: #${entry.rank}`);
        console.log('');
      });
    } else {
      console.log('\n📭 No scores found in leaderboard');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();