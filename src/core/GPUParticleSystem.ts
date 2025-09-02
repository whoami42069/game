import * as THREE from 'three';

export interface GPUParticleOptions {
  maxParticles: number;
  particleSize: number;
  particleLifetime: number;
  emissionRate: number;
  spread: number;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  color: THREE.Color;
  colorVariation: number;
  blending: THREE.Blending;
  transparent: boolean;
}

/**
 * GPU-based particle system for high-performance particle effects
 */
export class GPUParticleSystem {
  private scene: THREE.Scene;
  private options: GPUParticleOptions;
  private position: THREE.Vector3;
  private particleSystem!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private particleCount: number = 0;
  private time: number = 0;
  private emissionTimer: number = 0;
  private sizeFactor: number = 1.0;
  private updateFrame: number = 0;
  private texture: THREE.Texture | null = null;
  private needsAttributeUpdate: boolean = false;
  
  // Particle attributes
  private positions!: Float32Array;
  private velocities!: Float32Array;
  private accelerations!: Float32Array;
  private colors!: Float32Array;
  private lifetimes!: Float32Array;
  private sizes!: Float32Array;
  private startTimes!: Float32Array;

  constructor(scene: THREE.Scene, options: GPUParticleOptions, position: THREE.Vector3) {
    this.scene = scene;
    this.options = options;
    this.position = position.clone();
    
    this.initParticleSystem();
  }

  private initParticleSystem(): void {
    const particleCount = this.options.maxParticles;
    
    // Initialize attribute arrays
    this.positions = new Float32Array(particleCount * 3);
    this.velocities = new Float32Array(particleCount * 3);
    this.accelerations = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.lifetimes = new Float32Array(particleCount);
    this.sizes = new Float32Array(particleCount);
    this.startTimes = new Float32Array(particleCount);
    
    // Initialize all particles as inactive
    for (let i = 0; i < particleCount; i++) {
      this.lifetimes[i] = -1; // Negative lifetime means inactive
      this.sizes[i] = 0;
    }
    
    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    
    // Create material with vertex colors and size attenuation
    this.material = new THREE.PointsMaterial({
      size: this.options.particleSize,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: this.options.transparent,
      opacity: 0.8,
      blending: this.options.blending,
      depthWrite: false,
      map: this.createParticleTexture()
    });
    
    // Create the particle system
    this.particleSystem = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particleSystem);
  }

  private createParticleTexture(): THREE.Texture {
    // Check if we have a cached particle texture from preloading
    if ((window as any).__cachedParticleTexture) {
      return (window as any).__cachedParticleTexture;
    }
    
    // Fallback: create texture if not preloaded (shouldn't happen normally)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Create a soft circular gradient
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.needsUpdate = true;
    
    // Cache for future use
    (window as any).__cachedParticleTexture = this.texture;
    
    return this.texture;
  }

  private emitParticle(): void {
    // Find an inactive particle
    for (let i = 0; i < this.options.maxParticles; i++) {
      if (this.lifetimes[i] < 0) {
        // Activate this particle
        const i3 = i * 3;
        
        // Set position with spread
        this.positions[i3] = this.position.x + (Math.random() - 0.5) * this.options.spread;
        this.positions[i3 + 1] = this.position.y + (Math.random() - 0.5) * this.options.spread;
        this.positions[i3 + 2] = this.position.z + (Math.random() - 0.5) * this.options.spread;
        
        // Set velocity with variation
        const velocityVariation = 0.3;
        this.velocities[i3] = this.options.velocity.x + (Math.random() - 0.5) * velocityVariation;
        this.velocities[i3 + 1] = this.options.velocity.y + (Math.random() - 0.5) * velocityVariation;
        this.velocities[i3 + 2] = this.options.velocity.z + (Math.random() - 0.5) * velocityVariation;
        
        // Set acceleration
        this.accelerations[i3] = this.options.acceleration.x;
        this.accelerations[i3 + 1] = this.options.acceleration.y;
        this.accelerations[i3 + 2] = this.options.acceleration.z;
        
        // Set color with variation
        const colorVariation = this.options.colorVariation;
        this.colors[i3] = Math.min(1, this.options.color.r + (Math.random() - 0.5) * colorVariation);
        this.colors[i3 + 1] = Math.min(1, this.options.color.g + (Math.random() - 0.5) * colorVariation);
        this.colors[i3 + 2] = Math.min(1, this.options.color.b + (Math.random() - 0.5) * colorVariation);
        
        // Set lifetime and size
        this.lifetimes[i] = this.options.particleLifetime;
        this.sizes[i] = this.options.particleSize * this.sizeFactor * (0.5 + Math.random() * 0.5);
        this.startTimes[i] = this.time;
        
        this.particleCount++;
        break;
      }
    }
  }

  public update(deltaTime: number, _playerPosition?: THREE.Vector3): void {
    // Early return if no emission and no active particles
    if (this.options.emissionRate <= 0 && this.particleCount <= 0) {
      return;
    }
    
    this.time += deltaTime;
    this.updateFrame++;
    
    // Emit new particles based on emission rate
    const emissionInterval = this.options.emissionRate > 0 ? 1 / this.options.emissionRate : Infinity;
    this.emissionTimer += deltaTime;
    
    while (this.emissionTimer >= emissionInterval && this.particleCount < this.options.maxParticles) {
      this.emitParticle();
      this.emissionTimer -= emissionInterval;
      this.needsAttributeUpdate = true;
    }
    
    // Update existing particles
    for (let i = 0; i < this.options.maxParticles; i++) {
      if (this.lifetimes[i] > 0) {
        const i3 = i * 3;
        
        // Update lifetime
        this.lifetimes[i] -= deltaTime;
        
        if (this.lifetimes[i] <= 0) {
          // Deactivate particle
          this.lifetimes[i] = -1;
          this.sizes[i] = 0;
          this.particleCount--;
          this.needsAttributeUpdate = true;
        } else {
          // Update physics
          // Update velocity with acceleration
          this.velocities[i3] += this.accelerations[i3] * deltaTime;
          this.velocities[i3 + 1] += this.accelerations[i3 + 1] * deltaTime;
          this.velocities[i3 + 2] += this.accelerations[i3 + 2] * deltaTime;
          
          // Update position with velocity
          this.positions[i3] += this.velocities[i3] * deltaTime;
          this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
          this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;
          
          // Fade out based on lifetime
          const lifeRatio = this.lifetimes[i] / this.options.particleLifetime;
          // Remove random component from size calculation to reduce per-frame updates
          this.sizes[i] = this.options.particleSize * this.sizeFactor * lifeRatio * 0.75;
          
          // Only update color every 3 frames to reduce computation
          if (this.updateFrame % 3 === 0) {
            const fadeFactor = Math.pow(lifeRatio, 0.5);
            const originalColor = this.options.color;
            this.colors[i3] = originalColor.r * fadeFactor;
            this.colors[i3 + 1] = originalColor.g * fadeFactor;
            this.colors[i3 + 2] = originalColor.b * fadeFactor;
          }
          this.needsAttributeUpdate = true;
        }
      }
    }
    
    // Batch attribute updates - reduce frequency for better performance
    if (this.needsAttributeUpdate) {
      // Only update position every 3 frames
      if (this.updateFrame % 3 === 0) {
        this.geometry.attributes.position.needsUpdate = true;
      }
      
      // Only update size every 5 frames
      if (this.updateFrame % 5 === 0) {
        this.geometry.attributes.size.needsUpdate = true;
      }
      
      // Only update color every 7 frames
      if (this.updateFrame % 7 === 0) {
        this.geometry.attributes.color.needsUpdate = true;
      }
      
      // Skip bounding sphere calculation entirely for particles
      // this.geometry.computeBoundingSphere(); // REMOVED - not needed for particles
      
      this.needsAttributeUpdate = false;
    }
  }

  public setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
  }

  public setEmissionRate(rate: number): void {
    this.options.emissionRate = rate;
  }

  public setSizeFactor(factor: number): void {
    this.sizeFactor = factor;
  }

  public dispose(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.geometry.dispose();
      this.material.dispose();
      if (this.texture) {
        this.texture.dispose();
        this.texture = null;
      }
    }
  }

  /**
   * Static factory method to create explosion effect
   */
  public static createExplosion(scene: THREE.Scene, position: THREE.Vector3): GPUParticleSystem {
    const explosionOptions: GPUParticleOptions = {
      maxParticles: 200,
      particleSize: 0.5,
      particleLifetime: 1.0,
      emissionRate: 1000, // Burst emission
      spread: 0.5,
      velocity: new THREE.Vector3(0, 5, 0),
      acceleration: new THREE.Vector3(0, -10, 0),
      color: new THREE.Color(0xffaa00),
      colorVariation: 0.3,
      blending: THREE.AdditiveBlending,
      transparent: true
    };
    
    const explosion = new GPUParticleSystem(scene, explosionOptions, position);
    
    // Emit all particles at once for explosion effect
    for (let i = 0; i < 50; i++) {
      explosion.emitParticle();
    }
    
    // Stop emission after burst
    explosion.setEmissionRate(0);
    
    return explosion;
  }
}