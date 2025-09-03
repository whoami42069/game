import { priceManager } from '../core/PriceManager';

async function fetchPriceExamples() {
  console.log('Fetching cryptocurrency prices from CoinGecko...\n');

  const btcPrice = await priceManager.getPrice('bitcoin');
  if (btcPrice) {
    console.log('Bitcoin Price:', btcPrice.bitcoin.usd);
    console.log('24h Change:', btcPrice.bitcoin.usd_24h_change.toFixed(2) + '%\n');
  }

  const multipleCoins = await priceManager.getMultiplePrices([
    'bitcoin', 
    'ethereum', 
    'solana', 
    'cardano'
  ]);
  if (multipleCoins) {
    console.log('Multiple Coin Prices:');
    Object.entries(multipleCoins).forEach(([coin, data]) => {
      console.log(`${coin}: $${data.usd} (24h: ${data.usd_24h_change.toFixed(2)}%)`);
    });
    console.log();
  }

  const topCoins = await priceManager.getTopCoins(5);
  if (topCoins) {
    console.log('Top 5 Coins by Market Cap:');
    topCoins.forEach((coin, index) => {
      console.log(`${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()})`);
      console.log(`   Price: $${coin.current_price}`);
      console.log(`   Market Cap: $${coin.market_cap.toLocaleString()}`);
      console.log(`   24h Change: ${coin.price_change_percentage_24h.toFixed(2)}%`);
    });
    console.log();
  }

  const detailedData = await priceManager.getDetailedMarketData(['bitcoin', 'ethereum'], 2);
  if (detailedData) {
    console.log('Detailed Market Data:');
    detailedData.forEach(coin => {
      console.log(`${coin.name}:`);
      console.log(`  Current Price: $${coin.current_price}`);
      console.log(`  24h High: $${coin.high_24h}`);
      console.log(`  24h Low: $${coin.low_24h}`);
      console.log(`  24h Volume: $${coin.total_volume.toLocaleString()}`);
      console.log(`  Last Updated: ${new Date(coin.last_updated).toLocaleString()}`);
    });
  }
}

export { fetchPriceExamples };