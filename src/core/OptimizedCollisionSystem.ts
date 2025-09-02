import * as THREE from 'three';
import { PooledProjectile } from './ProjectilePoolManager';

export interface CollisionTarget {
  position: THREE.Vector3;
  boundingRadius: number;
  owner: 'player' | 'boss' | 'minion';
  takeDamage?: (amount: number) => boolean; // Returns true if target was destroyed
  mesh?: THREE.Object3D;
}

export interface CollisionResult {
  projectile: PooledProjectile;
  target: CollisionTarget;
  hitPosition: THREE.Vector3;
  damage: number;
}

export class OptimizedCollisionSystem {
  private collisionTargets: Map<string, CollisionTarget[]> = new Map();
  private readonly COLLISION_GRID_SIZE = 10;
  
  // Collision batching for performance
  private collisionBatch: CollisionResult[] = [];
  private readonly MAX_COLLISIONS_PER_FRAME = 20;
  
  // Performance tracking
  private collisionChecks = 0;
  private lastFrameCollisionChecks = 0;
  
  constructor() {
    // Initialize grid categories
    this.collisionTargets.set('player', []);
    this.collisionTargets.set('boss', []);
    this.collisionTargets.set('minion', []);
  }

  public registerTarget(target: CollisionTarget): void {
    const targets = this.collisionTargets.get(target.owner);
    if (targets && !targets.includes(target)) {
      targets.push(target);
    }
  }

  public unregisterTarget(target: CollisionTarget): void {
    const targets = this.collisionTargets.get(target.owner);
    if (targets) {
      const index = targets.indexOf(target);
      if (index > -1) {
        targets.splice(index, 1);
      }
    }
  }

  public checkCollisions(projectiles: PooledProjectile[]): CollisionResult[] {
    this.collisionChecks = 0;
    this.collisionBatch = [];
    
    // Early exit if no projectiles
    if (projectiles.length === 0) return [];
    
    // Group projectiles by owner for batch processing
    const projectilesByOwner = {
      player: projectiles.filter(p => p.data.owner === 'player'),
      boss: projectiles.filter(p => p.data.owner === 'boss'),
      minion: projectiles.filter(p => p.data.owner === 'minion')
    };
    
    // Check player projectiles vs enemies
    this.checkProjectileVsTargets(projectilesByOwner.player, ['boss', 'minion']);
    
    // Check boss projectiles vs player
    this.checkProjectileVsTargets(projectilesByOwner.boss, ['player']);
    
    // Check minion projectiles vs player
    this.checkProjectileVsTargets(projectilesByOwner.minion, ['player']);
    
    this.lastFrameCollisionChecks = this.collisionChecks;
    return this.collisionBatch;
  }

  private checkProjectileVsTargets(projectiles: PooledProjectile[], targetOwners: string[]): void {
    if (projectiles.length === 0) return;
    
    // Get all relevant targets
    const targets: CollisionTarget[] = [];
    for (const owner of targetOwners) {
      const ownerTargets = this.collisionTargets.get(owner);
      if (ownerTargets) {
        targets.push(...ownerTargets);
      }
    }
    
    if (targets.length === 0) return;
    
    // Optimized collision checking with early exits
    for (const projectile of projectiles) {
      if (!projectile.isActive) continue;
      if (this.collisionBatch.length >= this.MAX_COLLISIONS_PER_FRAME) break;
      
      const projectilePos = projectile.position;
      const projectileRadius = 0.5; // Standard projectile collision radius
      
      for (const target of targets) {
        this.collisionChecks++;
        
        // Quick distance check (squared distance to avoid sqrt)
        const distanceSq = projectilePos.distanceToSquared(target.position);
        const combinedRadius = projectileRadius + target.boundingRadius;
        const combinedRadiusSq = combinedRadius * combinedRadius;
        
        if (distanceSq <= combinedRadiusSq) {
          // More precise collision check if needed
          if (this.preciseCollisionCheck(projectile, target)) {
            this.collisionBatch.push({
              projectile,
              target,
              hitPosition: projectile.position.clone(),
              damage: projectile.data.damage
            });
            break; // Projectile can only hit one target
          }
        }
      }
    }
  }

  private preciseCollisionCheck(projectile: PooledProjectile, target: CollisionTarget): boolean {
    // For most cases, the distance check is sufficient
    // This method can be expanded for more complex collision shapes
    const distance = projectile.position.distanceTo(target.position);
    const combinedRadius = 0.5 + target.boundingRadius;
    return distance <= combinedRadius;
  }

  public processCollisionResults(results: CollisionResult[]): {
    destroyedTargets: CollisionTarget[],
    hitProjectiles: PooledProjectile[]
  } {
    const destroyedTargets: CollisionTarget[] = [];
    const hitProjectiles: PooledProjectile[] = [];
    
    for (const result of results) {
      const { projectile, target, damage } = result;
      
      // Mark projectile for removal
      hitProjectiles.push(projectile);
      
      // Apply damage to target
      if (target.takeDamage) {
        const wasDestroyed = target.takeDamage(damage);
        if (wasDestroyed) {
          destroyedTargets.push(target);
        }
      }
    }
    
    return { destroyedTargets, hitProjectiles };
  }

  // Spatial optimization helpers
  private getGridKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.COLLISION_GRID_SIZE);
    const z = Math.floor(position.z / this.COLLISION_GRID_SIZE);
    return `${x},${z}`;
  }

  public getTargetsInRadius(center: THREE.Vector3, radius: number, excludeOwner?: string): CollisionTarget[] {
    const result: CollisionTarget[] = [];
    const radiusSq = radius * radius;
    
    for (const [owner, targets] of this.collisionTargets.entries()) {
      if (excludeOwner && owner === excludeOwner) continue;
      
      for (const target of targets) {
        const distanceSq = target.position.distanceToSquared(center);
        if (distanceSq <= radiusSq) {
          result.push(target);
        }
      }
    }
    
    return result;
  }

  public getCollisionStats() {
    return {
      lastFrameChecks: this.lastFrameCollisionChecks,
      registeredTargets: {
        player: this.collisionTargets.get('player')?.length || 0,
        boss: this.collisionTargets.get('boss')?.length || 0,
        minion: this.collisionTargets.get('minion')?.length || 0
      },
      totalTargets: Array.from(this.collisionTargets.values()).reduce((sum, targets) => sum + targets.length, 0)
    };
  }

  public clearTargets(): void {
    for (const targets of this.collisionTargets.values()) {
      targets.length = 0;
    }
  }

  public dispose(): void {
    this.clearTargets();
    this.collisionBatch = [];
    console.log('🧹 OptimizedCollisionSystem disposed');
  }
}

// Collision helper functions for common shapes
export class CollisionHelpers {
  static sphereVsSphere(pos1: THREE.Vector3, radius1: number, pos2: THREE.Vector3, radius2: number): boolean {
    const distanceSq = pos1.distanceToSquared(pos2);
    const combinedRadius = radius1 + radius2;
    return distanceSq <= combinedRadius * combinedRadius;
  }

  static pointVsSphere(point: THREE.Vector3, spherePos: THREE.Vector3, radius: number): boolean {
    return point.distanceToSquared(spherePos) <= radius * radius;
  }

  static rayVsSphere(rayOrigin: THREE.Vector3, rayDirection: THREE.Vector3, spherePos: THREE.Vector3, radius: number): { hit: boolean, distance?: number } {
    const oc = rayOrigin.clone().sub(spherePos);
    const a = rayDirection.dot(rayDirection);
    const b = 2.0 * oc.dot(rayDirection);
    const c = oc.dot(oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
      return { hit: false };
    }
    
    const distance = (-b - Math.sqrt(discriminant)) / (2.0 * a);
    return { hit: true, distance: Math.max(0, distance) };
  }

  // Bounding box collision for more complex objects
  static aabbVsAABB(min1: THREE.Vector3, max1: THREE.Vector3, min2: THREE.Vector3, max2: THREE.Vector3): boolean {
    return (min1.x <= max2.x && max1.x >= min2.x) &&
           (min1.y <= max2.y && max1.y >= min2.y) &&
           (min1.z <= max2.z && max1.z >= min2.z);
  }
}