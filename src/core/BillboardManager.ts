import * as THREE from 'three';
import { Billboard3D, BillboardConfig, BillboardContent } from './Billboard3D';

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
  private lastPriceUpdate: number = 0;
  private priceUpdateInterval: number = 30000; // 30 seconds
  private currentPrice: number = 0;

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
      position: new THREE.Vector3(-60, 30, -60), // Much closer to arena, left side
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
      position: new THREE.Vector3(60, 30, -60), // Much closer to arena, right side
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
   * Fetch BTC/USD price from Switchboard API only
   */
  private async fetchBTCPrice(): Promise<SwitchboardPriceData> {
    try {
      // Switchboard Explorer API endpoint using the specific feed ID for BTC/USD
      const feedId = 'f01cc150052ba08171863e5920bdce7433e200eb31a8558521b0015a09867630';
      
      // Try the Switchboard Labs explorer API endpoint
      const switchboardEndpoint = `https://api.switchboardlabs.xyz/feed/${feedId}`;

      const response = await fetch(switchboardEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Switchboard API response:', data);
        
        // Parse various possible response structures from Switchboard
        if (data && data.result && typeof data.result === 'number') {
          return {
            price: data.result,
            lastUpdate: new Date().toISOString()
          };
        } else if (data && data.value && typeof data.value === 'number') {
          return {
            price: data.value,
            lastUpdate: new Date().toISOString()
          };
        } else if (data && data.latest_result && typeof data.latest_result === 'number') {
          return {
            price: data.latest_result,
            lastUpdate: new Date().toISOString()
          };
        } else if (data && data.price && typeof data.price === 'number') {
          return {
            price: data.price,
            lastUpdate: new Date().toISOString()
          };
        } else if (data && data.data && typeof data.data.result === 'number') {
          return {
            price: data.data.result,
            lastUpdate: new Date().toISOString()
          };
        }
      }

      // If API fails, throw error - no mock data
      throw new Error('Unable to fetch BTC price from Switchboard API - check console for details');
      
    } catch (error) {
      console.error('Error fetching BTC price from Switchboard:', error);
      throw error;
    }
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
   * Get a specific billboard by name
   */
  public getBillboard(name: string): Billboard3D | undefined {
    return this.billboards.get(name);
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
   * Get current BTC price
   */
  public getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Add custom billboard
   */
  public addBillboard(name: string, config: BillboardConfig): Billboard3D {
    const billboard = new Billboard3D(config);
    this.billboards.set(name, billboard);
    this.scene.add(billboard.getGroup());
    return billboard;
  }

  /**
   * Remove billboard
   */
  public removeBillboard(name: string): void {
    const billboard = this.billboards.get(name);
    if (billboard) {
      this.scene.remove(billboard.getGroup());
      billboard.dispose();
      this.billboards.delete(name);
    }
  }

  /**
   * Dispose all billboards
   */
  public dispose(): void {
    this.billboards.forEach((billboard, name) => {
      this.scene.remove(billboard.getGroup());
      billboard.dispose();
    });
    this.billboards.clear();
    console.log('🏮 Billboard Manager disposed');
  }
}