import * as THREE from 'three';
import { Billboard3D, BillboardConfig } from './Billboard3D';
import { priceManager } from './PriceManager';

/**
 * Interface for BTC price response
 */
interface PriceData {
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
    this.createCryptoBillboard();
    this.createMonadBillboard();
    console.log('🏮 Billboard Manager initialized with futuristic CRYPTO and MONAD billboards');
    
    // Start automatic price updates every 15 seconds
    this.startPriceUpdates();
  }

  /**
   * Create the CRYPTO billboard with futuristic purple to blue gradient
   */
  private createCryptoBillboard(): void {
    const config: BillboardConfig = {
      text: 'SWITCHBOARD',
      width: 40,
      height: 20,
      colors: {
        primary: '#9d00ff',     // Purple
        secondary: '#0099ff',   // Blue
        text: '#ffffff',        // White text
        glow: '#00ffff',       // Cyan glow
        accent: '#1a1a2e',      // Dark metallic frame
        hologram: '#00ffff'     // Cyan hologram
      },
      position: new THREE.Vector3(-60, 25, -60), // Elevated position for better visibility
      rotation: new THREE.Euler(0, Math.PI / 8, 0), // Slight angle toward center
      enableGradient: true,
      gradientDirection: 'horizontal',
      enableHologram: true,
      enableScanlines: true,
      enableParticles: true,
      glitchIntensity: 0.002  // Occasional glitch effect
    };

    const cryptoBillboard = new Billboard3D(config);
    
    // Set up BTC price fetching
    cryptoBillboard.setUpdateCallback(async () => {
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
    cryptoBillboard.updateContent({
      primaryText: 'SWITCHBOARD',
      secondaryText: 'BTC: Loading...'
    });

    this.billboards.set('crypto', cryptoBillboard);
    this.scene.add(cryptoBillboard.getGroup());
  }

  /**
   * Create the MONAD billboard with futuristic purple theme
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
        glow: '#cc00ff',       // Pink-purple glow
        accent: '#16213e',      // Dark blue metallic frame
        hologram: '#ff00ff'     // Magenta hologram
      },
      position: new THREE.Vector3(60, 25, -60), // Elevated position for better visibility
      rotation: new THREE.Euler(0, -Math.PI / 8, 0), // Slight angle toward center
      enableGradient: true,
      gradientDirection: 'vertical',
      enableHologram: true,
      enableScanlines: true,
      enableParticles: true,
      glitchIntensity: 0.001  // Less glitch than Switchboard
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
   * Fetch BTC/USD price from CoinGecko
   */
  private async fetchBTCPrice(): Promise<PriceData> {
    // Use our PriceManager to get Bitcoin price from CoinGecko
    try {
      const priceData = await priceManager.getPrice('bitcoin');
      
      if (priceData && priceData.bitcoin) {
        console.log(`✅ Successfully fetched BTC price from CoinGecko: $${priceData.bitcoin.usd}`);
        return {
          price: priceData.bitcoin.usd,
          lastUpdate: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Failed to fetch BTC price from CoinGecko:', error);
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
   * Manually update CRYPTO billboard with new price data
   */
  public async updateCryptoPrice(): Promise<void> {
    const billboard = this.billboards.get('crypto');
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
        console.error('Failed to update CRYPTO price:', error);
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
    this.updateCryptoPrice().catch(console.error);
    
    // Set up interval for updates every 15 seconds
    this.updateTimer = setInterval(() => {
      this.updateCryptoPrice().catch(console.error);
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
  
  // Add compatibility alias for old method name
  public async updateSwitchboardPrice(): Promise<void> {
    return this.updateCryptoPrice();
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
    console.log('🏮 Futuristic Billboard Manager disposed');
  }
}