import * as THREE from 'three';
import { ProjectilePoolManager, PooledProjectile } from './ProjectilePoolManager';
import { OptimizedCollisionSystem, CollisionTarget, CollisionResult } from './OptimizedCollisionSystem';
import { ProjectileEffectsSystem } from './ProjectileEffectsSystem';

/**
 * Central projectile management system that integrates:
 * - Object pooling for memory efficiency
 * - Optimized collision detection
 * - High-performance visual effects
 * - Strict limits to prevent performance degradation
 */
export class ProjectileManager {
  // private scene: THREE.Scene;
  private poolManager: ProjectilePoolManager;
  private collisionSystem: OptimizedCollisionSystem;
  private effectsSystem: ProjectileEffectsSystem;
  
  // Performance limits and tracking
  private readonly GLOBAL_PROJECTILE_LIMIT = 100;
  private readonly PROJECTILES_PER_OWNER_LIMIT = {
    player: 40,
    boss: 30,
    minion: 30
  };
  
  // Batch processing for performance
  // private readonly UPDATE_BATCH_SIZE = 25;
  // private readonly COLLISION_BATCH_SIZE = 20;
  
  // Performance monitoring
  private frameStats = {
    activeProjectiles: 0,
    collisionChecks: 0,
    effectsRendered: 0,
    memoryUsage: 0
  };
  
  // Arena bounds for automatic cleanup
  private arenaBounds: { radius: number } | { min: THREE.Vector3, max: THREE.Vector3 } | null = null;

  constructor(scene: THREE.Scene) {
    // this.scene = scene;
    this.poolManager = new ProjectilePoolManager(scene);
    this.collisionSystem = new OptimizedCollisionSystem();
    this.effectsSystem = new ProjectileEffectsSystem(scene);
    
    console.log('🚀 ProjectileManager initialized with advanced optimizations');
  }

  public setArenaBounds(bounds: { radius: number } | { min: THREE.Vector3, max: THREE.Vector3 }): void {
    this.arenaBounds = bounds;
  }

  public spawnPlayerProjectile(
    position: THREE.Vector3, 
    direction: THREE.Vector3, 
    speed: number = 55, 
    damage: number = 10
  ): PooledProjectile | null {
    // Check player-specific limit
    const playerProjectiles = this.poolManager.getActiveProjectilesByOwner('player');
    if (playerProjectiles.length >= this.PROJECTILES_PER_OWNER_LIMIT.player) {
      return null;
    }
    
    const velocity = direction.clone().normalize().multiplyScalar(speed);
    
    const projectile = this.poolManager.spawnProjectile('player', {
      position: position.clone(),
      velocity,
      damage,
      lifetime: 4000, // 4 seconds
      type: 'bullet'
    });
    
    if (projectile) {
      // Create muzzle flash effect
      this.effectsSystem.createMuzzleFlash(
        position,
        direction,
        new THREE.Color(0x00ffff),
        1.0
      );
      
      // Add projectile glow
      this.effectsSystem.createProjectileGlow(
        position,
        new THREE.Color(0x00ffff),
        0.8
      );
    }
    
    return projectile;
  }

  public spawnBossProjectile(
    position: THREE.Vector3, 
    direction: THREE.Vector3, 
    speed: number = 30, 
    damage: number = 15
  ): PooledProjectile | null {
    const bossProjectiles = this.poolManager.getActiveProjectilesByOwner('boss');
    if (bossProjectiles.length >= this.PROJECTILES_PER_OWNER_LIMIT.boss) {
      return null;
    }
    
    const velocity = direction.clone().normalize().multiplyScalar(speed);
    
    const projectile = this.poolManager.spawnProjectile('boss', {
      position: position.clone(),
      velocity,
      damage,
      lifetime: 6000, // 6 seconds
      type: 'torpedo'
    });
    
    if (projectile) {
      this.effectsSystem.createMuzzleFlash(
        position,
        direction,
        new THREE.Color(0xff6600),
        1.2
      );
      
      this.effectsSystem.createProjectileGlow(
        position,
        new THREE.Color(0xff6600),
        1.0
      );
    }
    
    return projectile;
  }

  public spawnMinionProjectile(
    position: THREE.Vector3, 
    direction: THREE.Vector3, 
    speed: number = 20, 
    damage: number = 5
  ): PooledProjectile | null {
    const minionProjectiles = this.poolManager.getActiveProjectilesByOwner('minion');
    if (minionProjectiles.length >= this.PROJECTILES_PER_OWNER_LIMIT.minion) {
      return null;
    }
    
    const velocity = direction.clone().normalize().multiplyScalar(speed);
    
    const projectile = this.poolManager.spawnProjectile('minion', {
      position: position.clone(),
      velocity,
      damage,
      lifetime: 5000, // 5 seconds
      type: 'beam'
    });
    
    if (projectile) {
      this.effectsSystem.createMuzzleFlash(
        position,
        direction,
        new THREE.Color(0xff00ff),
        0.8
      );
      
      this.effectsSystem.createProjectileGlow(
        position,
        new THREE.Color(0xff00ff),
        0.6
      );
    }
    
    return projectile;
  }

  public registerCollisionTarget(target: CollisionTarget): void {
    this.collisionSystem.registerTarget(target);
  }

  public unregisterCollisionTarget(target: CollisionTarget): void {
    this.collisionSystem.unregisterTarget(target);
  }

  public update(deltaTime: number, camera: THREE.Camera): CollisionResult[] {
    // Update projectiles in batches for performance
    this.poolManager.update(deltaTime);
    
    // Get all active projectiles
    const activeProjectiles = this.poolManager.getAllActiveProjectiles();
    
    // Clean up out-of-bounds projectiles
    this.cleanupOutOfBounds(activeProjectiles);
    
    // Check collisions
    const collisionResults = this.collisionSystem.checkCollisions(activeProjectiles);
    
    // Process collision results
    const { hitProjectiles } = this.collisionSystem.processCollisionResults(collisionResults);
    
    // Remove hit projectiles
    for (const projectile of hitProjectiles) {
      // Create impact effect
      this.effectsSystem.createImpactEffect(
        projectile.position,
        this.getProjectileColor(projectile),
        1.5
      );
      
      this.poolManager.removeProjectile(projectile);
    }
    
    // Update effects system
    const projectilePositions = activeProjectiles.map(p => p.position);
    this.effectsSystem.update(deltaTime, camera, projectilePositions);
    
    // Update performance stats
    this.updateFrameStats();
    
    return collisionResults;
  }

  private getProjectileColor(projectile: PooledProjectile): THREE.Color {
    switch (projectile.data.owner) {
      case 'player': return new THREE.Color(0x00ffff);
      case 'boss': return new THREE.Color(0xff6600);
      case 'minion': return new THREE.Color(0xff00ff);
      default: return new THREE.Color(0xffffff);
    }
  }

  private cleanupOutOfBounds(projectiles: PooledProjectile[]): void {
    if (!this.arenaBounds) return;
    
    for (const projectile of projectiles) {
      let isOutOfBounds = false;
      
      if ('radius' in this.arenaBounds) {
        // Circular bounds
        const distanceFromCenter = Math.sqrt(
          projectile.position.x * projectile.position.x + 
          projectile.position.z * projectile.position.z
        );
        isOutOfBounds = distanceFromCenter > this.arenaBounds.radius + 5;
      } else {
        // Rectangular bounds
        const pos = projectile.position;
        isOutOfBounds = pos.x < this.arenaBounds.min.x - 5 ||
                       pos.x > this.arenaBounds.max.x + 5 ||
                       pos.z < this.arenaBounds.min.z - 5 ||
                       pos.z > this.arenaBounds.max.z + 5;
      }
      
      // Also check Y bounds
      if (projectile.position.y < -10 || projectile.position.y > 100) {
        isOutOfBounds = true;
      }
      
      if (isOutOfBounds) {
        this.poolManager.removeProjectile(projectile);
      }
    }
  }

  private updateFrameStats(): void {
    const activeProjectiles = this.poolManager.getAllActiveProjectiles();
    const collisionStats = this.collisionSystem.getCollisionStats();
    const effectStats = this.effectsSystem.getActiveEffectCounts();
    
    this.frameStats = {
      activeProjectiles: activeProjectiles.length,
      collisionChecks: collisionStats.lastFrameChecks,
      effectsRendered: effectStats.muzzleFlashes + effectStats.projectileGlows + effectStats.impacts,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in MB
    const activeProjectiles = this.poolManager.getAllActiveProjectiles().length;
    const activeEffects = Object.values(this.effectsSystem.getActiveEffectCounts())
      .reduce((sum, count) => sum + count, 0);
    
    // Each projectile: ~1KB, each effect: ~0.5KB
    return (activeProjectiles * 1024 + activeEffects * 512) / (1024 * 1024);
  }

  // Batch operations for performance
  public spawnProjectileBatch(requests: Array<{
    owner: 'player' | 'boss' | 'minion',
    position: THREE.Vector3,
    direction: THREE.Vector3,
    speed?: number,
    damage?: number
  }>): PooledProjectile[] {
    const spawned: PooledProjectile[] = [];
    
    for (const request of requests) {
      let projectile: PooledProjectile | null = null;
      
      switch (request.owner) {
        case 'player':
          projectile = this.spawnPlayerProjectile(
            request.position, 
            request.direction, 
            request.speed, 
            request.damage
          );
          break;
        case 'boss':
          projectile = this.spawnBossProjectile(
            request.position, 
            request.direction, 
            request.speed, 
            request.damage
          );
          break;
        case 'minion':
          projectile = this.spawnMinionProjectile(
            request.position, 
            request.direction, 
            request.speed, 
            request.damage
          );
          break;
      }
      
      if (projectile) {
        spawned.push(projectile);
      }
      
      // Respect global limit
      if (this.poolManager.getAllActiveProjectiles().length >= this.GLOBAL_PROJECTILE_LIMIT) {
        break;
      }
    }
    
    return spawned;
  }

  // Performance monitoring
  public getPerformanceStats() {
    const poolStats = this.poolManager.getStats();
    const collisionStats = this.collisionSystem.getCollisionStats();
    const effectStats = this.effectsSystem.getActiveEffectCounts();
    
    return {
      frame: this.frameStats,
      pools: poolStats,
      collisions: collisionStats,
      effects: effectStats,
      limits: {
        global: this.GLOBAL_PROJECTILE_LIMIT,
        perOwner: this.PROJECTILES_PER_OWNER_LIMIT
      }
    };
  }

  public getActiveProjectilesByOwner(owner: string): PooledProjectile[] {
    return this.poolManager.getActiveProjectilesByOwner(owner);
  }

  public getAllActiveProjectiles(): PooledProjectile[] {
    return this.poolManager.getAllActiveProjectiles();
  }

  // Emergency performance measures
  public emergencyCleanup(): void {
    const activeProjectiles = this.poolManager.getAllActiveProjectiles();
    
    // Remove oldest projectiles if over limit
    if (activeProjectiles.length > this.GLOBAL_PROJECTILE_LIMIT * 0.8) {
      const sortedByAge = activeProjectiles.sort((a, b) => a.data.spawnTime - b.data.spawnTime);
      const toRemove = sortedByAge.slice(0, Math.floor(activeProjectiles.length * 0.3));
      
      for (const projectile of toRemove) {
        this.poolManager.removeProjectile(projectile);
      }
      
      console.warn('🧹 Emergency projectile cleanup executed');
    }
  }

  public dispose(): void {
    this.poolManager.dispose();
    this.collisionSystem.dispose();
    this.effectsSystem.dispose();
    
    console.log('🧹 ProjectileManager disposed');
  }
}