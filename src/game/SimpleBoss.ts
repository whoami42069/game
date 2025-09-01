import * as THREE from 'three';
import { TextureManager } from '@/core/TextureManager';

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
  // private electrons: THREE.Mesh[] = []; // Unused variable
  private nucleus!: THREE.Mesh;
  private time: number = 0;
  private originalSpawnPosition: THREE.Vector3;
  private crystallineShards: THREE.Mesh[] = [];
  private corruptionAura: THREE.Points | null = null;
  private textureManager: TextureManager;

  constructor(scene: THREE.Scene, level: number = 1) {
    this.scene = scene;
    this.level = level;
    this.originalSpawnPosition = new THREE.Vector3(0, 5, -10); // Keep within circular arena
    this.position = this.originalSpawnPosition.clone();
    this.target = new THREE.Vector3();
    this.mesh = new THREE.Group();
    this.textureManager = TextureManager.getInstance();
    
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
    // Create crystalline core instead of simple sphere
    const nucleusGeometry = new THREE.IcosahedronGeometry(2 + this.level * 0.2, 1);
    
    // Get crystalline textures
    const crystalTextures = this.textureManager.generateCrystallineTexture(256, this.level / 5);
    
    const nucleusMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8800cc,
      map: crystalTextures.diffuse,
      normalMap: crystalTextures.normal,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughnessMap: crystalTextures.roughness,
      metalnessMap: crystalTextures.metalness,
      emissiveMap: crystalTextures.emissive,
      emissive: new THREE.Color(0xff00ff),
      emissiveIntensity: 0.5 + this.level * 0.15,
      metalness: 0.3,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      transmission: 0.3,
      thickness: 0.5,
      ior: 2.4,
      attenuationColor: new THREE.Color(0x660099),
      attenuationDistance: 1.0,
      envMapIntensity: 2.0,
      specularIntensity: 2.0,
      specularColor: new THREE.Color(0xff00ff),
      sheen: 0.5,
      sheenRoughness: 0.2,
      sheenColor: new THREE.Color(0xff66ff)
    });
    
    this.nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    this.nucleus.castShadow = true;
    this.nucleus.receiveShadow = true;
    this.mesh.add(this.nucleus);
    
    // Enhanced glow with pulsing effect
    const glowLight = new THREE.PointLight(0xff00ff, 3 + this.level, 20);
    glowLight.decay = 2;
    this.nucleus.add(glowLight);
    
    // Add orbiting crystal shards
    this.createCrystalShards();
    
    // Add corruption aura particle system
    this.createCorruptionAura();
  }
  
  private createCrystalShards(): void {
    const shardCount = 6 + this.level * 2;
    const shardGeometry = new THREE.OctahedronGeometry(0.3 + this.level * 0.05, 0);
    
    for (let i = 0; i < shardCount; i++) {
      const shardMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.8 + Math.random() * 0.1, 1, 0.5),
        emissive: new THREE.Color(0xaa00ff),
        emissiveIntensity: 0.3 + Math.random() * 0.3,
        metalness: 0.2,
        roughness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        transmission: 0.9,
        thickness: 0.2,
        ior: 2.0,
        envMapIntensity: 3.0,
        transparent: true,
        opacity: 0.9
      });
      
      const shard = new THREE.Mesh(shardGeometry, shardMaterial);
      
      // Random orbit parameters
      shard.userData = {
        orbitRadius: 3 + Math.random() * 2,
        orbitSpeed: 0.5 + Math.random() * 0.5,
        orbitOffset: Math.random() * Math.PI * 2,
        verticalOffset: (Math.random() - 0.5) * 2,
        rotationSpeed: new THREE.Vector3(
          Math.random() * 2,
          Math.random() * 2,
          Math.random() * 2
        )
      };
      
      this.crystallineShards.push(shard);
      this.mesh.add(shard);
      
      // Add glow to each shard
      const shardLight = new THREE.PointLight(0xff00ff, 0.5, 3);
      shardLight.decay = 2;
      shard.add(shardLight);
    }
  }
  
  private createCorruptionAura(): void {
    // Create particle system for corruption aura
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random position around boss
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 4;
      const height = (Math.random() - 0.5) * 4;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * radius;
      
      // Purple-magenta color variation
      colors[i3] = 0.8 + Math.random() * 0.2;
      colors[i3 + 1] = 0;
      colors[i3 + 2] = 0.8 + Math.random() * 0.2;
      
      sizes[i] = 0.1 + Math.random() * 0.3;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.corruptionAura = new THREE.Points(geometry, material);
    this.mesh.add(this.corruptionAura);
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3, bounds?: { min: THREE.Vector3, max: THREE.Vector3, radius?: number }): void {
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
    
    // Enhanced movement AI with phase-based behavior
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
    
    // Keep within circular bounds
    if (bounds) {
      const radius = bounds.radius;
      if (radius) {
        // Check distance from center
        const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
        if (distanceFromCenter > radius - 2) { // Keep boss slightly inside boundary
          // Push boss back inside the circle
          const angle = Math.atan2(this.position.z, this.position.x);
          this.position.x = Math.cos(angle) * (radius - 2);
          this.position.z = Math.sin(angle) * (radius - 2);
        }
      } else {
        // Fallback to rectangular bounds
        this.position.x = Math.max(bounds.min.x, Math.min(bounds.max.x, this.position.x));
        this.position.z = Math.max(bounds.min.z, Math.min(bounds.max.z, this.position.z));
      }
    }
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Animate crystalline nucleus with phase-based intensity
    this.nucleus.rotation.y += deltaTime * (0.5 + this.phase * 0.3);
    this.nucleus.rotation.x = Math.sin(this.time * 2) * 0.2;
    const scale = 1 + Math.sin(this.time * 3 + this.phase) * 0.15;
    this.nucleus.scale.setScalar(scale);
    
    // Update crystalline shard orbits
    this.crystallineShards.forEach((shard, index) => {
      const data = shard.userData;
      const orbitAngle = this.time * data.orbitSpeed + data.orbitOffset;
      
      shard.position.x = Math.cos(orbitAngle) * data.orbitRadius;
      shard.position.z = Math.sin(orbitAngle) * data.orbitRadius;
      shard.position.y = data.verticalOffset + Math.sin(this.time * 2 + index) * 0.5;
      
      // Rotate shards
      shard.rotation.x += data.rotationSpeed.x * deltaTime;
      shard.rotation.y += data.rotationSpeed.y * deltaTime;
      shard.rotation.z += data.rotationSpeed.z * deltaTime;
      
      // Scale pulse based on phase
      const shardScale = 1 + Math.sin(this.time * 4 + index) * 0.2 * this.phase;
      shard.scale.setScalar(shardScale);
    });
    
    // Animate corruption aura
    if (this.corruptionAura) {
      this.corruptionAura.rotation.y += deltaTime * 0.1;
      
      // Update particle positions for swirling effect
      const positions = this.corruptionAura.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const angle = Math.atan2(positions[i + 2], positions[i]);
        const radius = Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]);
        
        positions[i] = Math.cos(angle + deltaTime * 0.5) * radius;
        positions[i + 2] = Math.sin(angle + deltaTime * 0.5) * radius;
        positions[i + 1] += Math.sin(this.time * 2 + i) * deltaTime * 0.5;
        
        // Reset height if too far
        if (Math.abs(positions[i + 1]) > 3) {
          positions[i + 1] = (Math.random() - 0.5) * 2;
        }
      }
      this.corruptionAura.geometry.attributes.position.needsUpdate = true;
      
      // Pulse opacity based on phase
      (this.corruptionAura.material as THREE.PointsMaterial).opacity = 0.4 + this.phase * 0.2 + Math.sin(this.time * 3) * 0.1;
    }
    
    // Update nucleus light intensity
    const nucleusLight = this.nucleus.children.find(child => child instanceof THREE.PointLight) as THREE.PointLight;
    if (nucleusLight) {
      nucleusLight.intensity = 3 + this.level + Math.sin(this.time * 4) * 2 + this.phase;
    }
    
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
        // emissive removed - not available on MeshBasicMaterial
        // emissiveIntensity: 1,
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
    
    // Enhanced damage effect with crystalline shattering
    if (this.nucleus.material instanceof THREE.MeshPhysicalMaterial) {
      const originalEmissive = this.nucleus.material.emissive.clone();
      this.nucleus.material.emissive.setHex(0xffffff);
      this.nucleus.material.emissiveIntensity = 2.0;
      
      // Shatter effect on shards
      this.crystallineShards.forEach(shard => {
        const originalPos = shard.position.clone();
        const shakeAmount = 0.5;
        shard.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * shakeAmount,
          (Math.random() - 0.5) * shakeAmount,
          (Math.random() - 0.5) * shakeAmount
        ));
        
        setTimeout(() => {
          shard.position.copy(originalPos);
        }, 100);
      });
      
      setTimeout(() => {
        if (this.nucleus.material instanceof THREE.MeshPhysicalMaterial) {
          this.nucleus.material.emissive.copy(originalEmissive);
          this.nucleus.material.emissiveIntensity = 0.5 + this.level * 0.15;
        }
      }, 150);
    }
    
    // Create damage particles
    this.createDamageParticles();
  }
  
  private createDamageParticles(): void {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.2, 0);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.8, 1, 0.5 + Math.random() * 0.3),
        transparent: true,
        opacity: 0.9
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(this.position);
      
      // Random velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5,
        (Math.random() - 0.5) * 10
      );
      
      this.scene.add(particle);
      
      // Animate particle
      const startTime = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        
        if (elapsed < 1.5) {
          particle.position.add(velocity.clone().multiplyScalar(0.02));
          velocity.y -= 0.3; // Gravity
          particle.rotation.x += 0.1;
          particle.rotation.y += 0.15;
          particleMaterial.opacity = 0.9 * (1 - elapsed / 1.5);
          requestAnimationFrame(animate);
        } else {
          this.scene.remove(particle);
          particleGeometry.dispose();
          particleMaterial.dispose();
        }
      };
      animate();
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
    // Clean up crystalline shards
    this.crystallineShards.forEach(shard => {
      shard.geometry.dispose();
      if (shard.material instanceof THREE.Material) {
        shard.material.dispose();
      }
    });
    
    // Clean up corruption aura
    if (this.corruptionAura) {
      this.corruptionAura.geometry.dispose();
      (this.corruptionAura.material as THREE.Material).dispose();
    }
    
    // Clean up main mesh
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