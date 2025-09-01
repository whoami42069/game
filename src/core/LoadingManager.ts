/**
 * Manages loading of game assets and resources
 */
export class LoadingManager {
  private loadedAssets: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private totalAssets: number = 0;
  private loadedCount: number = 0;

  constructor() {
    console.log('📦 LoadingManager created');
  }

  public async initialize(): Promise<void> {
    console.log('📦 LoadingManager initialized');
  }

  public async loadAsset<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.loadedAssets.has(key)) {
      return this.loadedAssets.get(key) as T;
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key) as Promise<T>;
    }

    const promise = loader();
    this.loadingPromises.set(key, promise);
    this.totalAssets++;

    try {
      const asset = await promise;
      this.loadedAssets.set(key, asset);
      this.loadedCount++;
      return asset;
    } catch (error) {
      this.loadingPromises.delete(key);
      throw error;
    }
  }

  public getLoadingProgress(): number {
    return this.totalAssets > 0 ? (this.loadedCount / this.totalAssets) * 100 : 100;
  }

  public isAssetLoaded(key: string): boolean {
    return this.loadedAssets.has(key);
  }

  public getAsset<T>(key: string): T | null {
    return this.loadedAssets.get(key) || null;
  }
}