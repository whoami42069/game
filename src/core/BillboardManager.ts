import * as THREE from 'three';
import { Billboard3D, BillboardConfig } from './Billboard3D';

/**
 * Interface for Switchboard BTC price response
 */
interface SwitchboardPriceData {
  price?: number;
  lastUpdate?: string;
}

/**
 * Billboard Manager handles all billboards in the arena
 */
export class BillboardManager {
  private billboards: Map<string, Billboard3D> = new Map();
  private scene: THREE.Scene;
  private priceUpdateInterval: number = 15000; // 15 seconds
  private currentPrice: number = 0;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Initialize all billboards for the arena
   */
  public initialize(): void {
    this.createSwitchboardBillboard();
    this.createMonadBillboard();
    console.log('🏮 Billboard Manager initialized with SWITCHBOARD and MONAD billboards');
    
    // Start automatic price updates every 15 seconds
    this.startPriceUpdates();
  }

  /**
   * Create the SWITCHBOARD billboard with purple to blue gradient
   */
  private createSwitchboardBillboard(): void {
    const config: BillboardConfig = {
      text: 'SWITCHBOARD',
      width: 40,
      height: 20,
      colors: {
        primary: '#9d00ff',     // Purple
        secondary: '#0099ff',   // Blue
        text: '#ffffff',        // White text
        glow: '#00ffff'        // Cyan glow
      },
      position: new THREE.Vector3(-60, 20, -60), // Lowered position, left side
      rotation: new THREE.Euler(0, Math.PI / 8, 0), // Slight angle toward center
      enableGradient: true,
      gradientDirection: 'horizontal'
    };

    const switchboardBillboard = new Billboard3D(config);
    
    // Set up BTC price fetching
    switchboardBillboard.setUpdateCallback(async () => {
      try {
        const priceData = await this.fetchBTCPrice();
        return {
          primaryText: 'SWITCHBOARD',
          secondaryText: `BTC: $${priceData.price?.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          price: priceData.price,
          lastUpdate: new Date()
        };
      } catch (error) {
        console.warn('Failed to fetch BTC price:', error);
        return {
          primaryText: 'SWITCHBOARD',
          secondaryText: 'BTC: Loading...',
          lastUpdate: new Date()
        };
      }
    });

    // Add initial content with placeholder price
    switchboardBillboard.updateContent({
      primaryText: 'SWITCHBOARD',
      secondaryText: 'BTC: Loading...'
    });

    this.billboards.set('switchboard', switchboardBillboard);
    this.scene.add(switchboardBillboard.getGroup());
  }

  /**
   * Create the MONAD billboard with purple theme
   */
  private createMonadBillboard(): void {
    const config: BillboardConfig = {
      text: 'MONAD',
      width: 35,
      height: 18,
      colors: {
        primary: '#6d00cc',     // Deep purple
        secondary: '#9d00ff',   // Lighter purple (subtle gradient)
        text: '#ffffff',        // White text
        glow: '#cc00ff'        // Pink-purple glow
      },
      position: new THREE.Vector3(60, 20, -60), // Lowered position, right side
      rotation: new THREE.Euler(0, -Math.PI / 8, 0), // Slight angle toward center
      enableGradient: true,
      gradientDirection: 'vertical'
    };

    const monadBillboard = new Billboard3D(config);
    
    // Set up content updates (could be expanded for Monad-specific data)
    monadBillboard.setUpdateCallback(async () => {
      return {
        primaryText: 'MONAD',
        secondaryText: 'NEXT-GEN BLOCKCHAIN',
        lastUpdate: new Date()
      };
    });

    // Add initial content
    monadBillboard.updateContent({
      primaryText: 'MONAD',
      secondaryText: 'NEXT-GEN BLOCKCHAIN'
    });

    this.billboards.set('monad', monadBillboard);
    this.scene.add(monadBillboard.getGroup());
  }

  /**
   * Fetch BTC/USD price - try Switchboard first, then fallback to working API
   */
  private async fetchBTCPrice(): Promise<SwitchboardPriceData> {
    // First, try Switchboard endpoints
    const switchboardEndpoints = [
      'https://api.switchboard.xyz/api/v1/aggregator/f01cc150052ba08171863e5920bdce7433e200eb31a8558521b0015a09867630',
      'https://api.switchboard.xyz/api/data/feed/f01cc150052ba08171863e5920bdce7433e200eb31a8558521b0015a09867630',
      'https://switchboard-api.herokuapp.com/api/feed/btc-usd',
      'https://api.switchboard.xyz/feed/btc-usd'
    ];
    
    // Try each Switchboard endpoint
    for (const endpoint of switchboardEndpoints) {
      try {
        console.log(`Trying Switchboard endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Switchboard API response:', data);
          
          // Parse various possible response structures
          let price: number | undefined;
          
          if (data && typeof data.result === 'number') {
            price = data.result;
          } else if (data && typeof data.value === 'number') {
            price = data.value;
          } else if (data && typeof data.latest_result === 'number') {
            price = data.latest_result;
          } else if (data && typeof data.price === 'number') {
            price = data.price;
          } else if (data && data.data && typeof data.data.result === 'number') {
            price = data.data.result;
          } else if (data && data.data && typeof data.data.value === 'number') {
            price = data.data.value;
          }
          
          if (price !== undefined) {
            console.log(`✅ Successfully fetched BTC price from Switchboard: $${price}`);
            return {
              price,
              lastUpdate: new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.warn(`Switchboard endpoint failed: ${endpoint}`);
      }
    }
    
    // If Switchboard fails, use CoinGecko as fallback
    console.log('Switchboard unavailable, using CoinGecko fallback...');
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.bitcoin && data.bitcoin.usd) {
          console.log(`✅ Successfully fetched BTC price from CoinGecko: $${data.bitcoin.usd}`);
          return {
            price: data.bitcoin.usd,
            lastUpdate: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.error('CoinGecko fallback also failed:', error);
    }
    
    // If we have a previous price, keep showing it
    if (this.currentPrice > 0) {
      console.log('Using last known price:', this.currentPrice);
      return {
        price: this.currentPrice,
        lastUpdate: new Date().toISOString()
      };
    }
    
    // Only throw error if we have no price at all
    throw new Error('Unable to fetch BTC price from any source');
  }

  /**
   * Update all billboards
   */
  public update(deltaTime: number): void {
    this.billboards.forEach(billboard => {
      billboard.update(deltaTime);
    });
  }


  /**
   * Manually update SWITCHBOARD with new price data
   */
  public async updateSwitchboardPrice(): Promise<void> {
    const billboard = this.billboards.get('switchboard');
    if (billboard) {
      try {
        const priceData = await this.fetchBTCPrice();
        billboard.updateContent({
          secondaryText: `BTC: $${priceData.price?.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          price: priceData.price
        });
        this.currentPrice = priceData.price || 0;
      } catch (error) {
        console.error('Failed to update SWITCHBOARD price:', error);
        billboard.updateContent({
          secondaryText: 'BTC: Connection Error'
        });
      }
    }
  }




  /**
   * Start automatic price updates
   */
  private startPriceUpdates(): void {
    // Initial update
    this.updateSwitchboardPrice().catch(console.error);
    
    // Set up interval for updates every 15 seconds
    this.updateTimer = setInterval(() => {
      this.updateSwitchboardPrice().catch(console.error);
    }, this.priceUpdateInterval);
    
    console.log('📊 Started automatic BTC price updates every 15 seconds');
  }
  
  /**
   * Stop automatic price updates
   */
  private stopPriceUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('📊 Stopped automatic BTC price updates');
    }
  }
  
  /**
   * Dispose all billboards
   */
  public dispose(): void {
    this.stopPriceUpdates();
    this.billboards.forEach((billboard) => {
      this.scene.remove(billboard.getGroup());
      billboard.dispose();
    });
    this.billboards.clear();
    console.log('🏮 Billboard Manager disposed');
  }
}