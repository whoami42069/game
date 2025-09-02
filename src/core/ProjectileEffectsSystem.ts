import * as THREE from 'three';
import { InstancedRenderer } from './PerformanceUtils';

export interface EffectData {
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  scale: number;
  lifetime: number;
}

/**
 * High-performance visual effects system for projectiles
 * Uses instanced rendering instead of individual lights to maintain 60fps
 */
export class ProjectileEffectsSystem {
  private scene: THREE.Scene;
  
  // Instanced renderers for different effect types
  private muzzleFlashRenderer: InstancedRenderer | null = null;
  private projectileGlowRenderer: InstancedRenderer | null = null;
  private impactRenderer: InstancedRenderer | null = null;
  
  // Effect pools for reuse
  private muzzleFlashes: Array<{ data: EffectData, spawnTime: number }> = [];
  private projectileGlows: Array<{ data: EffectData, spawnTime: number }> = [];
  private impactEffects: Array<{ data: EffectData, spawnTime: number }> = [];
  
  // Global lighting instead of per-projectile lights
  private globalProjectileLight: THREE.PointLight | null = null;
  private lightUpdateInterval = 50; // Update every 50ms instead of every frame
  private lastLightUpdate = 0;
  
  // Performance settings
  private readonly MAX_EFFECTS_PER_TYPE = 30;
  private readonly MUZZLE_FLASH_LIFETIME = 200; // ms
  private readonly PROJECTILE_GLOW_LIFETIME = 1000; // ms
  private readonly IMPACT_LIFETIME = 500; // ms

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeRenderers();
    this.initializeGlobalLighting();
  }

  private initializeRenderers(): void {
    // Muzzle flash geometry - simple quad with additive blending
    const muzzleFlashGeometry = new THREE.PlaneGeometry(1, 1);
    const muzzleFlashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.muzzleFlashRenderer = new InstancedRenderer(
      muzzleFlashGeometry,
      muzzleFlashMaterial,
      this.MAX_EFFECTS_PER_TYPE
    );
    this.scene.add(this.muzzleFlashRenderer.getMesh());

    // Projectile glow - small billboarded sprites
    const glowGeometry = new THREE.PlaneGeometry(0.4, 0.4);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.projectileGlowRenderer = new InstancedRenderer(
      glowGeometry,
      glowMaterial,
      this.MAX_EFFECTS_PER_TYPE * 2 // More projectile glows than muzzle flashes
    );
    this.scene.add(this.projectileGlowRenderer.getMesh());

    // Impact effects - radial burst sprites
    const impactGeometry = new THREE.PlaneGeometry(2, 2);
    const impactMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.impactRenderer = new InstancedRenderer(
      impactGeometry,
      impactMaterial,
      this.MAX_EFFECTS_PER_TYPE
    );
    this.scene.add(this.impactRenderer.getMesh());
  }

  private initializeGlobalLighting(): void {
    // Single moving light that follows projectile activity
    this.globalProjectileLight = new THREE.PointLight(0x44aaff, 0.5, 25);
    this.globalProjectileLight.position.set(0, 5, 0);
    this.globalProjectileLight.castShadow = false; // Disable shadows for performance
    this.scene.add(this.globalProjectileLight);
  }

  public createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3, color: THREE.Color = new THREE.Color(0x00ffff), intensity: number = 1.0): void {
    if (this.muzzleFlashes.length >= this.MAX_EFFECTS_PER_TYPE) {
      this.muzzleFlashes.shift(); // Remove oldest
    }

    this.muzzleFlashes.push({
      data: {
        position: position.clone(),
        color: color.clone(),
        intensity,
        scale: 0.5 * intensity,
        lifetime: this.MUZZLE_FLASH_LIFETIME
      },
      spawnTime: performance.now()
    });
  }

  public createProjectileGlow(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0x00ffff), intensity: number = 0.8): void {
    if (this.projectileGlows.length >= this.MAX_EFFECTS_PER_TYPE * 2) {
      this.projectileGlows.shift();
    }

    this.projectileGlows.push({
      data: {
        position: position.clone(),
        color: color.clone(),
        intensity,
        scale: 0.3 * intensity,
        lifetime: this.PROJECTILE_GLOW_LIFETIME
      },
      spawnTime: performance.now()
    });
  }

  public createImpactEffect(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0xffaa00), intensity: number = 1.5): void {
    if (this.impactEffects.length >= this.MAX_EFFECTS_PER_TYPE) {
      this.impactEffects.shift();
    }

    this.impactEffects.push({
      data: {
        position: position.clone(),
        color: color.clone(),
        intensity,
        scale: 0.1, // Start small, will grow
        lifetime: this.IMPACT_LIFETIME
      },
      spawnTime: performance.now()
    });
  }

  public update(deltaTime: number, camera: THREE.Camera, projectilePositions?: THREE.Vector3[]): void {
    const currentTime = performance.now();
    
    // Update muzzle flashes
    this.updateMuzzleFlashes(currentTime, camera);
    
    // Update projectile glows
    this.updateProjectileGlows(currentTime, camera);
    
    // Update impact effects
    this.updateImpactEffects(currentTime, camera);
    
    // Update global lighting (less frequently)
    if (currentTime - this.lastLightUpdate > this.lightUpdateInterval) {
      this.updateGlobalLighting(projectilePositions);
      this.lastLightUpdate = currentTime;
    }
  }

  private updateMuzzleFlashes(currentTime: number, camera: THREE.Camera): void {
    const activeFlashes: typeof this.muzzleFlashes = [];
    let instanceIndex = 0;

    for (const flash of this.muzzleFlashes) {
      const age = currentTime - flash.spawnTime;
      if (age > flash.data.lifetime) continue;
      
      activeFlashes.push(flash);
      
      // Calculate animation values
      const progress = age / flash.data.lifetime;
      const scale = flash.data.scale * (1 - progress * 0.5); // Slight shrink
      const opacity = flash.data.intensity * (1 - progress); // Fade out
      
      // Billboard to camera
      const direction = new THREE.Vector3()
        .subVectors(flash.data.position, camera.position)
        .normalize();
      const up = camera.up.clone();
      const right = new THREE.Vector3().crossVectors(direction, up).normalize();
      const realUp = new THREE.Vector3().crossVectors(right, direction);
      
      // Set instance transform
      const rotation = new THREE.Euler();
      rotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, realUp, direction));
      
      if (this.muzzleFlashRenderer && instanceIndex < this.MAX_EFFECTS_PER_TYPE) {
        this.muzzleFlashRenderer.setInstance(
          instanceIndex,
          flash.data.position,
          rotation,
          new THREE.Vector3(scale, scale, scale)
        );
        instanceIndex++;
      }
    }

    this.muzzleFlashes = activeFlashes;
    if (this.muzzleFlashRenderer) {
      this.muzzleFlashRenderer.updateCount(instanceIndex);
    }
  }

  private updateProjectileGlows(currentTime: number, camera: THREE.Camera): void {
    const activeGlows: typeof this.projectileGlows = [];
    let instanceIndex = 0;

    for (const glow of this.projectileGlows) {
      const age = currentTime - glow.spawnTime;
      if (age > glow.data.lifetime) continue;
      
      activeGlows.push(glow);
      
      // Calculate animation values
      const progress = age / glow.data.lifetime;
      const scale = glow.data.scale * (1 + Math.sin(progress * Math.PI * 4) * 0.2); // Pulse effect
      const opacity = glow.data.intensity * (1 - progress * 0.3); // Gentle fade
      
      // Billboard to camera (simplified)
      const rotation = new THREE.Euler();
      // Simple billboard - just face camera
      
      if (this.projectileGlowRenderer && instanceIndex < this.MAX_EFFECTS_PER_TYPE * 2) {
        this.projectileGlowRenderer.setInstance(
          instanceIndex,
          glow.data.position,
          rotation,
          new THREE.Vector3(scale, scale, scale)
        );
        instanceIndex++;
      }
    }

    this.projectileGlows = activeGlows;
    if (this.projectileGlowRenderer) {
      this.projectileGlowRenderer.updateCount(instanceIndex);
    }
  }

  private updateImpactEffects(currentTime: number, camera: THREE.Camera): void {
    const activeImpacts: typeof this.impactEffects = [];
    let instanceIndex = 0;

    for (const impact of this.impactEffects) {
      const age = currentTime - impact.spawnTime;
      if (age > impact.data.lifetime) continue;
      
      activeImpacts.push(impact);
      
      // Calculate animation values
      const progress = age / impact.data.lifetime;
      const scale = impact.data.scale + progress * 3; // Rapid expansion
      const opacity = impact.data.intensity * (1 - progress * progress); // Quadratic fade
      
      // Billboard to camera
      const rotation = new THREE.Euler();
      
      if (this.impactRenderer && instanceIndex < this.MAX_EFFECTS_PER_TYPE) {
        this.impactRenderer.setInstance(
          instanceIndex,
          impact.data.position,
          rotation,
          new THREE.Vector3(scale, scale, scale)
        );
        instanceIndex++;
      }
    }

    this.impactEffects = activeImpacts;
    if (this.impactRenderer) {
      this.impactRenderer.updateCount(instanceIndex);
    }
  }

  private updateGlobalLighting(projectilePositions?: THREE.Vector3[]): void {
    if (!this.globalProjectileLight || !projectilePositions || projectilePositions.length === 0) {
      return;
    }

    // Move light to center of projectile activity
    const center = new THREE.Vector3();
    for (const pos of projectilePositions) {
      center.add(pos);
    }
    center.divideScalar(projectilePositions.length);
    center.y += 3; // Slightly above
    
    // Smooth light movement
    this.globalProjectileLight.position.lerp(center, 0.1);
    
    // Adjust intensity based on activity
    const intensity = Math.min(2.0, 0.3 + projectilePositions.length * 0.05);
    this.globalProjectileLight.intensity = intensity;
  }

  // Batch creation methods for performance
  public createMuzzleFlashBatch(flashes: Array<{ position: THREE.Vector3, direction: THREE.Vector3, color?: THREE.Color, intensity?: number }>): void {
    for (const flash of flashes) {
      this.createMuzzleFlash(
        flash.position,
        flash.direction,
        flash.color || new THREE.Color(0x00ffff),
        flash.intensity || 1.0
      );
    }
  }

  public getActiveEffectCounts(): { muzzleFlashes: number, projectileGlows: number, impacts: number } {
    return {
      muzzleFlashes: this.muzzleFlashes.length,
      projectileGlows: this.projectileGlows.length,
      impacts: this.impactEffects.length
    };
  }

  public dispose(): void {
    // Dispose renderers
    if (this.muzzleFlashRenderer) {
      this.scene.remove(this.muzzleFlashRenderer.getMesh());
      this.muzzleFlashRenderer.dispose();
      this.muzzleFlashRenderer = null;
    }
    
    if (this.projectileGlowRenderer) {
      this.scene.remove(this.projectileGlowRenderer.getMesh());
      this.projectileGlowRenderer.dispose();
      this.projectileGlowRenderer = null;
    }
    
    if (this.impactRenderer) {
      this.scene.remove(this.impactRenderer.getMesh());
      this.impactRenderer.dispose();
      this.impactRenderer = null;
    }

    // Remove global light
    if (this.globalProjectileLight) {
      this.scene.remove(this.globalProjectileLight);
      this.globalProjectileLight = null;
    }

    // Clear arrays
    this.muzzleFlashes = [];
    this.projectileGlows = [];
    this.impactEffects = [];

    console.log('🧹 ProjectileEffectsSystem disposed');
  }
}