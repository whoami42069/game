import * as THREE from 'three';

export class SimpleBoss {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public health: number = 100;
  public maxHealth: number = 100;
  public level: number = 1;
  public phase: number = 1;
  public isAttacking: boolean = false;
  
  private scene: THREE.Scene;
  private target: THREE.Vector3;
  private moveSpeed: number = 5;
  private attackCooldown: number = 2;
  private attackTimer: number = 0;
  private electrons: THREE.Mesh[] = [];
  private nucleus: THREE.Mesh;
  private time: number = 0;
  private originalSpawnPosition: THREE.Vector3;

  constructor(scene: THREE.Scene, level: number = 1) {
    this.scene = scene;
    this.level = level;
    this.originalSpawnPosition = new THREE.Vector3(0, 5, -15);
    this.position = this.originalSpawnPosition.clone();
    this.target = new THREE.Vector3();
    this.mesh = new THREE.Group();
    
    // Scale health with level
    this.maxHealth = 100 * Math.pow(1.5, level - 1);
    this.health = this.maxHealth;
    
    // Scale attack rate with level
    this.attackCooldown = Math.max(0.5, 2 - (level * 0.1));
    
    this.createAtomModel();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  private createAtomModel(): void {
    // Create atomic nucleus (simple sphere)
    const nucleusGeometry = new THREE.SphereGeometry(2 + this.level * 0.2, 16, 16);
    const nucleusMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6600,
      emissive: 0xff3300,
      emissiveIntensity: 0.5 + this.level * 0.1,
      metalness: 0.7,
      roughness: 0.3,
      clearcoat: 1
    });
    this.nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    this.nucleus.castShadow = true;
    this.nucleus.receiveShadow = true;
    this.mesh.add(this.nucleus);
    
    // Add nucleus glow
    const glowLight = new THREE.PointLight(0xff6600, 2 + this.level, 15);
    this.nucleus.add(glowLight);
    
    // No electron orbits - removed per user request
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3, bounds?: { min: THREE.Vector3, max: THREE.Vector3 }): void {
    this.time += deltaTime;
    
    // Update phase based on health
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent <= 0.33) {
      this.phase = 3;
    } else if (healthPercent <= 0.66) {
      this.phase = 2;
    } else {
      this.phase = 1;
    }
    
    // Simple movement AI
    this.target.copy(playerPosition);
    const direction = this.target.clone().sub(this.position);
    const distance = direction.length();
    
    if (distance > 8) {
      direction.normalize();
      const speed = this.moveSpeed * (1 + (this.phase - 1) * 0.3);
      this.position.add(direction.multiplyScalar(speed * deltaTime));
    } else if (distance < 5) {
      direction.normalize();
      this.position.sub(direction.multiplyScalar(this.moveSpeed * deltaTime * 0.5));
    }
    
    // Keep within bounds
    if (bounds) {
      this.position.x = Math.max(bounds.min.x, Math.min(bounds.max.x, this.position.x));
      this.position.z = Math.max(bounds.min.z, Math.min(bounds.max.z, this.position.z));
    }
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Animate nucleus
    this.nucleus.rotation.y += deltaTime;
    const scale = 1 + Math.sin(this.time * 3) * 0.1;
    this.nucleus.scale.setScalar(scale);
    
    // No electron animation - removed per user request
    
    // Update attack timer
    if (this.attackTimer > 0) {
      this.attackTimer -= deltaTime;
    }
  }

  public shoot(): THREE.Mesh[] | null {
    if (this.attackTimer > 0) return null;
    
    this.attackTimer = this.attackCooldown / this.phase;
    this.isAttacking = true;
    
    const projectiles: THREE.Mesh[] = [];
    
    // Shoot from center nucleus (more projectiles in higher phases)
    const projectileCount = Math.min(this.phase * 2, 6);
    
    for (let i = 0; i < projectileCount; i++) {
      const projectileGeometry = new THREE.SphereGeometry(0.4, 6, 6);
      const projectileMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.9
      });
      const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
      
      // Start from boss position
      projectile.position.copy(this.mesh.position);
      
      // Spread pattern based on projectile index
      const angle = (i / projectileCount) * Math.PI * 2;
      const spread = 0.3;
      const direction = new THREE.Vector3(
        Math.sin(angle) * spread,
        0,
        Math.cos(angle) * spread + 1
      ).normalize();
      
      projectile.userData = {
        velocity: direction.multiplyScalar(20 + this.phase * 5),
        damage: 10 * this.phase,
        owner: 'boss'
      };
      
      projectiles.push(projectile);
      this.scene.add(projectile);
    }
    
    // Simple attack effect
    this.createAttackEffect();
    
    setTimeout(() => {
      this.isAttacking = false;
    }, 500);
    
    return projectiles;
  }

  private createAttackEffect(): void {
    // Create simple expanding ring
    const ringGeometry = new THREE.RingGeometry(0.5, 3, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(this.position);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    
    // Animate and remove
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 0.5) {
        ring.scale.setScalar(1 + elapsed * 6);
        ringMaterial.opacity = 0.8 * (1 - elapsed * 2);
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(ring);
        ringGeometry.dispose();
        ringMaterial.dispose();
      }
    };
    animate();
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Flash effect
    if (this.nucleus.material instanceof THREE.MeshPhysicalMaterial) {
      const originalEmissive = this.nucleus.material.emissive.clone();
      this.nucleus.material.emissive.setHex(0xffffff);
      setTimeout(() => {
        if (this.nucleus.material instanceof THREE.MeshPhysicalMaterial) {
          this.nucleus.material.emissive.copy(originalEmissive);
        }
      }, 100);
    }
  }

  public evolve(): void {
    this.level++;
    this.maxHealth = 100 * Math.pow(1.5, this.level - 1);
    this.health = this.maxHealth;
    this.attackCooldown = Math.max(0.5, 2 - (this.level * 0.1));
    
    // Reset position
    this.position.copy(this.originalSpawnPosition);
    this.mesh.position.copy(this.originalSpawnPosition);
    
    // Update model scale and intensity
    const scale = 1 + (this.level - 1) * 0.15;
    this.mesh.scale.setScalar(scale);
    
    // Update nucleus glow
    if (this.nucleus.material instanceof THREE.MeshPhysicalMaterial) {
      this.nucleus.material.emissiveIntensity = 0.5 + this.level * 0.1;
    }
    
    // Defer evolution flash to prevent freezing
    requestAnimationFrame(() => {
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255,100,0,0.2);
        pointer-events: none;
        z-index: 999;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(flash);
      
      // Fade out
      requestAnimationFrame(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 300);
      });
    });
    
    this.mesh.visible = true;
  }

  public dispose(): void {
    // Clean up geometries and materials
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.mesh);
  }
}