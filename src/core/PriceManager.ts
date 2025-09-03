import axios from 'axios';

interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

interface PriceData {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export class PriceManager {
  private static instance: PriceManager;
  private readonly BASE_URL = 'https://api.coingecko.com/api/v3';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): PriceManager {
    if (!PriceManager.instance) {
      PriceManager.instance = new PriceManager();
    }
    return PriceManager.instance;
  }

  async getPrice(coinId: string): Promise<PriceData | null> {
    try {
      const cacheKey = `price_${coinId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.BASE_URL}/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      });

      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching price for ${coinId}:`, error);
      return null;
    }
  }

  async getMultiplePrices(coinIds: string[]): Promise<PriceData | null> {
    try {
      const cacheKey = `prices_${coinIds.join(',')}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.BASE_URL}/simple/price`, {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      });

      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      return null;
    }
  }

  async getDetailedMarketData(
    coinIds: string[], 
    limit: number = 10
  ): Promise<CoinPrice[] | null> {
    try {
      const cacheKey = `market_${coinIds.join(',')}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: coinIds.join(','),
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false
        }
      });

      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }

  async getTopCoins(limit: number = 10): Promise<CoinPrice[] | null> {
    try {
      const cacheKey = `top_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false
        }
      });

      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching top coins:', error);
      return null;
    }
  }

  async searchCoins(query: string): Promise<any[] | null> {
    try {
      const response = await axios.get(`${this.BASE_URL}/search`, {
        params: { query }
      });
      return response.data.coins;
    } catch (error) {
      console.error('Error searching coins:', error);
      return null;
    }
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const priceManager = PriceManager.getInstance();