import * as THREE from 'three';

export interface HitStopOptions {
  duration: number; // In milliseconds
  intensity: number; // 0-1
}

export interface ScreenShakeOptions {
  intensity: number;
  duration: number;
  fadeOut?: boolean;
}

export interface HitFlashOptions {
  color: THREE.Color;
  intensity: number;
  duration: number;
}

/**
 * Combat Feedback Manager
 * Handles all combat feedback effects for ultra-responsive combat feel
 */
export class CombatFeedbackManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  // Hitstop state
  private isHitStopped: boolean = false;
  private hitStopEndTime: number = 0;
  
  // Screen shake state
  private isShaking: boolean = false;
  private shakeIntensity: number = 0;
  private shakeStartTime: number = 0;
  private shakeDuration: number = 0;
  private originalCameraPosition: THREE.Vector3;
  
  // Time scale for hitstop effects
  private timeScale: number = 1;
  
  // Animation tracking
  private activeAnimations: Set<number> = new Set();
  private maxActiveParticles: number = 5;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.originalCameraPosition = new THREE.Vector3();
  }
  
  /**
   * Trigger hitstop effect for satisfying combat impact
   */
  public triggerHitStop(options: HitStopOptions = { duration: 50, intensity: 0.8 }): void {
    const currentTime = performance.now();
    
    // Only trigger if not already in hitstop or if new hitstop is more intense
    if (!this.isHitStopped || currentTime > this.hitStopEndTime) {
      this.isHitStopped = true;
      this.hitStopEndTime = currentTime + options.duration;
      this.timeScale = Math.max(0.1, 1 - options.intensity); // Scale time down
      
      console.log(`[CombatFeedback] HitStop triggered: ${options.duration}ms, scale: ${this.timeScale}`);
    }
  }
  
  /**
   * Trigger screen shake for impact feedback
   */
  public triggerScreenShake(options: ScreenShakeOptions): void {
    this.isShaking = true;
    this.shakeIntensity = options.intensity;
    this.shakeDuration = options.duration;
    this.shakeStartTime = performance.now();
    this.originalCameraPosition.copy(this.camera.position);
    
    console.log(`[CombatFeedback] Screen shake triggered: ${options.intensity} intensity, ${options.duration}ms`);
  }
  
  /**
   * Create instant hit flash effect on screen
   */
  public triggerHitFlash(options: HitFlashOptions): void {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(${options.color.r * 255}, ${options.color.g * 255}, ${options.color.b * 255}, ${options.intensity});
      pointer-events: none;
      z-index: 2000;
      mix-blend-mode: screen;
    `;
    document.body.appendChild(flash);
    
    // Instant fade out
    let opacity = options.intensity;
    const fadeStep = () => {
      opacity -= options.intensity / (options.duration / 16); // 60fps fade
      flash.style.background = `rgba(${options.color.r * 255}, ${options.color.g * 255}, ${options.color.b * 255}, ${Math.max(0, opacity)})`;
      
      if (opacity > 0) {
        requestAnimationFrame(fadeStep);
      } else {
        flash.remove();
      }
    };
    requestAnimationFrame(fadeStep);
  }
  
  /**
   * Create impact particles at hit location
   */
  public createImpactParticles(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0xffaa00), count: number = 8): void {
    // Limit active particle animations
    if (this.activeAnimations.size > this.maxActiveParticles) {
      return;
    }
    
    // Reduce particle count for performance
    const actualCount = Math.min(count, 5);
    const particles: { mesh: THREE.Mesh, velocity: THREE.Vector3, geometry: THREE.BufferGeometry, material: THREE.Material }[] = [];
    
    // Create all particles first
    for (let i = 0; i < actualCount; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5,
        (Math.random() - 0.5) * 10
      );
      
      this.scene.add(particle);
      particles.push({ mesh: particle, velocity, geometry: particleGeometry, material: particleMaterial });
    }
    
    // Single animation loop for all particles
    const gravity = new THREE.Vector3(0, -9.8, 0);
    const startTime = performance.now();
    const lifetime = 300; // Reduced lifetime
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed < lifetime) {
        const deltaTime = 0.016;
        const life = 1 - (elapsed / lifetime);
        
        particles.forEach(p => {
          p.velocity.add(gravity.clone().multiplyScalar(deltaTime));
          p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
          (p.material as THREE.MeshBasicMaterial).opacity = life;
          p.mesh.scale.setScalar(life);
        });
        
        const animId = requestAnimationFrame(animate);
        this.activeAnimations.add(animId);
      } else {
        // Cleanup all particles at once
        particles.forEach(p => {
          this.scene.remove(p.mesh);
          p.geometry.dispose();
          p.material.dispose();
        });
        this.activeAnimations.clear();
      }
    };
    animate();
  }
  
  /**
   * Create shockwave effect at impact location
   */
  public createShockwave(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0x00ffff), maxRadius: number = 5): void {
    // Limit shockwave effects
    if (this.activeAnimations.size > 3) {
      return;
    }
    
    const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.2, 16); // Reduced segments
    const shockwaveMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    
    shockwave.position.copy(position);
    shockwave.rotation.x = -Math.PI / 2;
    this.scene.add(shockwave);
    
    const startTime = performance.now();
    const duration = 200; // Reduced duration
    let animId: number;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const scale = 1 + progress * maxRadius;
        const opacity = 0.8 * (1 - progress);
        
        shockwave.scale.setScalar(scale);
        shockwaveMaterial.opacity = opacity;
        
        animId = requestAnimationFrame(animate);
        this.activeAnimations.add(animId);
      } else {
        this.scene.remove(shockwave);
        shockwaveGeometry.dispose();
        shockwaveMaterial.dispose();
        if (animId) this.activeAnimations.delete(animId);
      }
    };
    requestAnimationFrame(animate);
  }
  
  /**
   * Update function - call every frame
   */
  public update(deltaTime: number): number {
    const currentTime = performance.now();
    
    // Update hitstop
    if (this.isHitStopped) {
      if (currentTime >= this.hitStopEndTime) {
        this.isHitStopped = false;
        this.timeScale = 1;
        console.log('[CombatFeedback] HitStop ended');
      }
    }
    
    // Update screen shake
    if (this.isShaking) {
      const shakeElapsed = currentTime - this.shakeStartTime;
      
      if (shakeElapsed < this.shakeDuration) {
        // Apply shake
        const shakeProgress = shakeElapsed / this.shakeDuration;
        const currentIntensity = this.shakeIntensity * (1 - shakeProgress); // Fade out
        
        const shakeX = (Math.random() - 0.5) * currentIntensity;
        const shakeY = (Math.random() - 0.5) * currentIntensity;
        const shakeZ = (Math.random() - 0.5) * currentIntensity * 0.5;
        
        this.camera.position.copy(this.originalCameraPosition);
        this.camera.position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
      } else {
        // End shake
        this.isShaking = false;
        this.camera.position.copy(this.originalCameraPosition);
        console.log('[CombatFeedback] Screen shake ended');
      }
    }
    
    // Return modified delta time for hitstop
    return this.isHitStopped ? deltaTime * this.timeScale : deltaTime;
  }
  
  /**
   * Get current time scale (for external systems)
   */
  public getTimeScale(): number {
    return this.timeScale;
  }
  
  /**
   * Check if currently in hitstop
   */
  public isInHitStop(): boolean {
    return this.isHitStopped;
  }
  
  /**
   * Create combo hit effect with increasing intensity
   */
  public triggerComboHit(comboCount: number, position: THREE.Vector3): void {
    const intensity = Math.min(1, comboCount * 0.1);
    const duration = 50 + comboCount * 10;
    
    // Hitstop scales with combo
    this.triggerHitStop({ duration, intensity });
    
    // Screen shake scales with combo
    this.triggerScreenShake({ 
      intensity: intensity * 2, 
      duration: duration * 2 
    });
    
    // Color changes with combo level
    const color = new THREE.Color();
    if (comboCount < 5) {
      color.setRGB(1, 1, 0); // Yellow
    } else if (comboCount < 10) {
      color.setRGB(1, 0.5, 0); // Orange
    } else {
      color.setRGB(1, 0, 0); // Red
    }
    
    this.triggerHitFlash({ color, intensity: intensity * 0.3, duration: 100 });
    this.createImpactParticles(position, color, 4 + comboCount);
    this.createShockwave(position, color, 2 + comboCount * 0.5);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Reset camera position
    if (this.isShaking) {
      this.camera.position.copy(this.originalCameraPosition);
    }
    
    // Reset time scale
    this.timeScale = 1;
    this.isHitStopped = false;
    this.isShaking = false;
    
    console.log('[CombatFeedback] Disposed');
  }
}