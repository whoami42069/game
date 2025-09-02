import * as THREE from 'three';
import { GeometryCache, MaterialCache, ObjectPool } from './PerformanceUtils';

export interface ProjectileData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  owner: 'player' | 'boss' | 'minion';
  lifetime: number;
  spawnTime: number;
  type: 'bullet' | 'torpedo' | 'beam' | 'missile';
}

export class PooledProjectile extends THREE.Mesh {
  public data: ProjectileData;
  public isActive: boolean = false;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private maxDistance: number = 100; // Maximum travel distance

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material) {
    super(geometry, material);
    
    // Initialize data with safe defaults
    this.data = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      damage: 0,
      owner: 'player',
      lifetime: 5000, // 5 seconds default
      spawnTime: 0,
      type: 'bullet'
    };
  }

  public initialize(data: Partial<ProjectileData>): void {
    // Reset state
    this.isActive = true;
    this.visible = true;
    this.scale.setScalar(1);
    
    // Apply data
    Object.assign(this.data, data);
    
    // Set position and store start position
    if (data.position) {
      this.position.copy(data.position);
      this.startPosition.copy(data.position);
    }
    
    // Set spawn time if not provided
    if (!data.spawnTime) {
      this.data.spawnTime = performance.now();
    }
    
    // Orient projectile based on velocity direction
    if (data.velocity && data.velocity.length() > 0) {
      this.lookAt(this.position.clone().add(data.velocity.clone().normalize()));
    }
  }

  public update(deltaTime: number): boolean {
    if (!this.isActive) return false;
    
    const currentTime = performance.now();
    const age = currentTime - this.data.spawnTime;
    
    // Check lifetime expiry
    if (age > this.data.lifetime) {
      this.deactivate();
      return false;
    }
    
    // Check maximum travel distance
    if (this.position.distanceTo(this.startPosition) > this.maxDistance) {
      this.deactivate();
      return false;
    }
    
    // Update position based on velocity
    const velocityDelta = this.data.velocity.clone().multiplyScalar(deltaTime);
    this.position.add(velocityDelta);
    
    // Update visual effects based on age
    const lifeProgress = age / this.data.lifetime;
    const alpha = Math.max(0.1, 1 - lifeProgress * 0.3); // Fade slightly over time
    
    if (this.material instanceof THREE.MeshBasicMaterial) {
      this.material.opacity = alpha;
    }
    
    return true;
  }

  public deactivate(): void {
    this.isActive = false;
    this.visible = false;
    
    // Reset data to safe defaults
    this.data.spawnTime = 0;
    this.data.velocity.set(0, 0, 0);
    this.position.set(0, -1000, 0); // Move way off screen
  }

  public getBoundingSphere(): THREE.Sphere {
    // Simple bounding sphere for collision detection
    return new THREE.Sphere(this.position, 0.5);
  }
}

export class ProjectilePoolManager {
  private scene: THREE.Scene;
  private playerProjectilePool: ObjectPool<PooledProjectile>;
  private bossProjectilePool: ObjectPool<PooledProjectile>;
  private minionProjectilePool: ObjectPool<PooledProjectile>;
  
  // Cached resources
  private static playerGeometry: THREE.BufferGeometry | null = null;
  private static playerMaterial: THREE.Material | null = null;
  private static bossGeometry: THREE.BufferGeometry | null = null;
  private static bossMaterial: THREE.Material | null = null;
  private static minionGeometry: THREE.BufferGeometry | null = null;
  private static minionMaterial: THREE.Material | null = null;
  
  // Performance tracking
  private activeProjectiles: Set<PooledProjectile> = new Set();
  private readonly MAX_PROJECTILES_PER_OWNER = 50; // Limit per owner type
  private readonly MAX_TOTAL_PROJECTILES = 120; // Global limit
  
  // Spatial optimization
  private spatialGrid: Map<string, PooledProjectile[]> = new Map();
  private readonly GRID_SIZE = 20;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Initialize cached resources
    this.initializeCachedResources();
    
    // Create pools with generous pre-allocation
    this.playerProjectilePool = new ObjectPool(
      () => this.createPlayerProjectile(),
      (proj) => this.resetProjectile(proj),
      30, // Initial size
      this.MAX_PROJECTILES_PER_OWNER
    );
    
    this.bossProjectilePool = new ObjectPool(
      () => this.createBossProjectile(),
      (proj) => this.resetProjectile(proj),
      20,
      this.MAX_PROJECTILES_PER_OWNER
    );
    
    this.minionProjectilePool = new ObjectPool(
      () => this.createMinionProjectile(),
      (proj) => this.resetProjectile(proj),
      15,
      this.MAX_PROJECTILES_PER_OWNER
    );
  }

  private initializeCachedResources(): void {
    // Player projectiles - sleek energy bullets
    if (!ProjectilePoolManager.playerGeometry) {
      ProjectilePoolManager.playerGeometry = GeometryCache.getOrCreate('playerProjectile', () => {
        return new THREE.ConeGeometry(0.08, 0.6, 6);
      });
    }
    
    if (!ProjectilePoolManager.playerMaterial) {
      ProjectilePoolManager.playerMaterial = MaterialCache.getOrCreate('playerProjectile', () => {
        return new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.9,
          // // emissive: new THREE.Color(0x004466), // Not supported on MeshBasicMaterial
          // emissiveIntensity: 0.3
        });
      });
    }
    
    // Boss projectiles - heavy torpedoes
    if (!ProjectilePoolManager.bossGeometry) {
      ProjectilePoolManager.bossGeometry = GeometryCache.getOrCreate('bossProjectile', () => {
        return new THREE.SphereGeometry(0.25, 8, 8);
      });
    }
    
    if (!ProjectilePoolManager.bossMaterial) {
      ProjectilePoolManager.bossMaterial = MaterialCache.getOrCreate('bossProjectile', () => {
        return new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.95,
          // emissive: new THREE.Color(0xff4400),
          // emissiveIntensity: 0.5
        });
      });
    }
    
    // Minion projectiles - small energy bolts
    if (!ProjectilePoolManager.minionGeometry) {
      ProjectilePoolManager.minionGeometry = GeometryCache.getOrCreate('minionProjectile', () => {
        return new THREE.SphereGeometry(0.1, 6, 6);
      });
    }
    
    if (!ProjectilePoolManager.minionMaterial) {
      ProjectilePoolManager.minionMaterial = MaterialCache.getOrCreate('minionProjectile', () => {
        return new THREE.MeshBasicMaterial({
          color: 0xff00ff,
          transparent: true,
          opacity: 0.8,
          // emissive: new THREE.Color(0x660033),
          // emissiveIntensity: 0.4
        });
      });
    }
  }

  private createPlayerProjectile(): PooledProjectile {
    const projectile = new PooledProjectile(
      ProjectilePoolManager.playerGeometry!,
      ProjectilePoolManager.playerMaterial!
    );
    projectile.castShadow = false; // Disable shadows for performance
    projectile.receiveShadow = false;
    return projectile;
  }

  private createBossProjectile(): PooledProjectile {
    const projectile = new PooledProjectile(
      ProjectilePoolManager.bossGeometry!,
      ProjectilePoolManager.bossMaterial!
    );
    projectile.castShadow = false;
    projectile.receiveShadow = false;
    return projectile;
  }

  private createMinionProjectile(): PooledProjectile {
    const projectile = new PooledProjectile(
      ProjectilePoolManager.minionGeometry!,
      ProjectilePoolManager.minionMaterial!
    );
    projectile.castShadow = false;
    projectile.receiveShadow = false;
    return projectile;
  }

  private resetProjectile(projectile: PooledProjectile): void {
    projectile.deactivate();
    this.scene.remove(projectile);
    this.activeProjectiles.delete(projectile);
  }

  public spawnProjectile(owner: 'player' | 'boss' | 'minion', data: Partial<ProjectileData>): PooledProjectile | null {
    // Check global limit
    if (this.activeProjectiles.size >= this.MAX_TOTAL_PROJECTILES) {
      return null;
    }
    
    // Get from appropriate pool
    let pool: ObjectPool<PooledProjectile>;
    switch (owner) {
      case 'player': pool = this.playerProjectilePool; break;
      case 'boss': pool = this.bossProjectilePool; break;
      case 'minion': pool = this.minionProjectilePool; break;
    }
    
    const projectile = pool.acquire();
    if (!projectile) return null;
    
    // Initialize projectile
    data.owner = owner;
    projectile.initialize(data);
    
    // Add to scene and tracking
    this.scene.add(projectile);
    this.activeProjectiles.add(projectile);
    
    // Add to spatial grid for collision optimization
    this.addToSpatialGrid(projectile);
    
    return projectile;
  }

  public update(deltaTime: number): void {
    const projectilesToRemove: PooledProjectile[] = [];
    
    // Update all active projectiles
    for (const projectile of this.activeProjectiles) {
      const stillActive = projectile.update(deltaTime);
      
      if (!stillActive) {
        projectilesToRemove.push(projectile);
      } else {
        // Update spatial grid position
        this.updateSpatialGrid(projectile);
      }
    }
    
    // Remove inactive projectiles
    for (const projectile of projectilesToRemove) {
      this.removeProjectile(projectile);
    }
  }

  public removeProjectile(projectile: PooledProjectile): void {
    if (!this.activeProjectiles.has(projectile)) return;
    
    // Remove from spatial grid
    this.removeFromSpatialGrid(projectile);
    
    // Return to appropriate pool
    switch (projectile.data.owner) {
      case 'player': this.playerProjectilePool.release(projectile); break;
      case 'boss': this.bossProjectilePool.release(projectile); break;
      case 'minion': this.minionProjectilePool.release(projectile); break;
    }
  }

  // Spatial partitioning for collision optimization
  private addToSpatialGrid(projectile: PooledProjectile): void {
    const gridKey = this.getGridKey(projectile.position);
    let gridCell = this.spatialGrid.get(gridKey);
    if (!gridCell) {
      gridCell = [];
      this.spatialGrid.set(gridKey, gridCell);
    }
    gridCell.push(projectile);
  }

  private updateSpatialGrid(_projectile: PooledProjectile): void {
    // This could be optimized further by tracking previous position
    // For now, we rely on the periodic cleanup in removeInactive
  }

  private removeFromSpatialGrid(projectile: PooledProjectile): void {
    const gridKey = this.getGridKey(projectile.position);
    const gridCell = this.spatialGrid.get(gridKey);
    if (gridCell) {
      const index = gridCell.indexOf(projectile);
      if (index > -1) {
        gridCell.splice(index, 1);
        if (gridCell.length === 0) {
          this.spatialGrid.delete(gridKey);
        }
      }
    }
  }

  private getGridKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.GRID_SIZE);
    const z = Math.floor(position.z / this.GRID_SIZE);
    return `${x},${z}`;
  }

  public getProjectilesInRadius(center: THREE.Vector3, radius: number, excludeOwner?: string): PooledProjectile[] {
    const result: PooledProjectile[] = [];
    const radiusSq = radius * radius;
    
    // Check spatial grid cells that might contain relevant projectiles
    const minGridX = Math.floor((center.x - radius) / this.GRID_SIZE);
    const maxGridX = Math.floor((center.x + radius) / this.GRID_SIZE);
    const minGridZ = Math.floor((center.z - radius) / this.GRID_SIZE);
    const maxGridZ = Math.floor((center.z + radius) / this.GRID_SIZE);
    
    for (let x = minGridX; x <= maxGridX; x++) {
      for (let z = minGridZ; z <= maxGridZ; z++) {
        const gridKey = `${x},${z}`;
        const gridCell = this.spatialGrid.get(gridKey);
        if (gridCell) {
          for (const projectile of gridCell) {
            if (!projectile.isActive) continue;
            if (excludeOwner && projectile.data.owner === excludeOwner) continue;
            
            const distanceSq = projectile.position.distanceToSquared(center);
            if (distanceSq <= radiusSq) {
              result.push(projectile);
            }
          }
        }
      }
    }
    
    return result;
  }

  public getAllActiveProjectiles(): PooledProjectile[] {
    return Array.from(this.activeProjectiles).filter(p => p.isActive);
  }

  public getActiveProjectilesByOwner(owner: string): PooledProjectile[] {
    return Array.from(this.activeProjectiles).filter(p => p.isActive && p.data.owner === owner);
  }

  public getStats() {
    return {
      total: this.activeProjectiles.size,
      player: this.getActiveProjectilesByOwner('player').length,
      boss: this.getActiveProjectilesByOwner('boss').length,
      minion: this.getActiveProjectilesByOwner('minion').length,
      pools: {
        player: this.playerProjectilePool.getStats(),
        boss: this.bossProjectilePool.getStats(),
        minion: this.minionProjectilePool.getStats()
      },
      spatialGridCells: this.spatialGrid.size
    };
  }

  public dispose(): void {
    // Clear all pools
    this.playerProjectilePool.clear();
    this.bossProjectilePool.clear();
    this.minionProjectilePool.clear();
    
    // Clear tracking sets
    this.activeProjectiles.clear();
    this.spatialGrid.clear();
    
    // Note: We don't dispose cached geometries/materials as they may be reused
    console.log('🧹 ProjectilePoolManager disposed');
  }
}