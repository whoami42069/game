import * as THREE from 'three';

export class Boss {
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
  private rings: THREE.Mesh[] = [];
  private core: THREE.Mesh;
  private weapons: THREE.Mesh[] = [];
  private time: number = 0;
  private auraParticles: THREE.InstancedMesh | null = null;
  private lastUpdateTime: number = 0;
  private updateFrequency: number = 0.016; // 60 FPS
  private originalSpawnPosition: THREE.Vector3; // Store original spawn position

  constructor(scene: THREE.Scene, level: number = 1) {
    this.scene = scene;
    this.level = level;
    this.originalSpawnPosition = new THREE.Vector3(0, 3, -10); // Store original position
    this.position = this.originalSpawnPosition.clone();
    this.target = new THREE.Vector3();
    this.mesh = new THREE.Group();
    
    // Initialize boss properties
    
    // Scale health with level
    this.maxHealth = 100 * Math.pow(1.5, level - 1);
    this.health = this.maxHealth;
    
    // Scale attack rate with level
    this.attackCooldown = Math.max(0.5, 2 - (level * 0.1));
    
    this.createModel();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  private createModel(): void {
    // Create simplified atom-like boss design for better performance
    const coreGroup = new THREE.Group();
    
    // Central nucleus (simplified sphere)
    const nucleusGeometry = new THREE.SphereGeometry(3, 16, 16);
    const nucleusMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2
    });
    this.core = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    this.core.castShadow = true;
    this.core.receiveShadow = true;
    coreGroup.add(this.core);
    
    // Armored shell segments around core
    for (let i = 0; i < 8; i++) {
      const shellGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.2);
      const shellMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x2a2a2a,
        emissive: 0x441100,
        emissiveIntensity: 0.2,
        metalness: 1.0,
        roughness: 0.4
      });
      const shell = new THREE.Mesh(shellGeometry, shellMaterial);
      const angle = (i / 8) * Math.PI * 2;
      shell.position.set(
        Math.cos(angle) * 2.8,
        Math.sin(angle) * 0.5,
        Math.sin(angle) * 2.8
      );
      shell.rotation.y = angle;
      shell.castShadow = true;
      coreGroup.add(shell);
    }
    
    this.mesh.add(coreGroup);
    
    // === DEFENSIVE RING SYSTEM - Rotating Energy Barriers ===
    const ringCount = Math.min(3 + Math.floor(this.level / 2), 6);
    for (let i = 0; i < ringCount; i++) {
      const ringRadius = 3.5 + (i * 1.2);
      
      // Main energy ring structure
      const ringGeometry = new THREE.TorusGeometry(ringRadius, 0.3, 12, 32);
      const ringMaterial = new THREE.MeshPhysicalMaterial({
        color: i % 3 === 0 ? 0xff00aa : i % 3 === 1 ? 0xaa00ff : 0x00aaff,
        emissive: i % 3 === 0 ? 0xff0066 : i % 3 === 1 ? 0x6600ff : 0x0066ff,
        emissiveIntensity: 0.6 + (this.phase * 0.2),
        metalness: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = (i / ringCount) * Math.PI * 0.8;
      ring.rotation.z = (i / ringCount) * Math.PI * 0.6;
      ring.castShadow = true;
      this.rings.push(ring);
      this.mesh.add(ring);
      
      // Energy nodes on rings
      for (let j = 0; j < 6; j++) {
        const nodeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const nodeMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        });
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        const nodeAngle = (j / 6) * Math.PI * 2;
        node.position.set(
          Math.cos(nodeAngle) * ringRadius,
          0,
          Math.sin(nodeAngle) * ringRadius
        );
        ring.add(node);
      }
    }
    
    // === WEAPON SYSTEM ARRAYS - Multiple Configurations ===
    const weaponCount = Math.min(4 + Math.floor(this.level / 2), 8);
    
    for (let i = 0; i < weaponCount; i++) {
      const weaponAssembly = new THREE.Group();
      
      // Main weapon housing
      const housingGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.5, 8);
      const housingMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x333333,
        emissive: 0x004400,
        emissiveIntensity: 0.3,
        metalness: 0.95,
        roughness: 0.2
      });
      const housing = new THREE.Mesh(housingGeometry, housingMaterial);
      housing.castShadow = true;
      weaponAssembly.add(housing);
      
      // Barrel/cannon
      const barrelGeometry = new THREE.CylinderGeometry(0.2, 0.25, 2, 8);
      const barrelMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ff44,
        emissive: 0x00aa22,
        emissiveIntensity: 0.5 + (this.phase * 0.2),
        metalness: 0.9,
        roughness: 0.1
      });
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.position.set(0, 1.2, 0);
      barrel.castShadow = true;
      weaponAssembly.add(barrel);
      
      // Energy focusing crystal at barrel tip
      const crystalGeometry = new THREE.ConeGeometry(0.15, 0.4, 6);
      const crystalMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
      });
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.position.set(0, 2.4, 0);
      weaponAssembly.add(crystal);
      
      // Position weapon around boss
      const angle = (i / weaponCount) * Math.PI * 2;
      const radius = 4.5 + (Math.sin(i) * 0.5);
      weaponAssembly.position.set(
        Math.cos(angle) * radius,
        Math.sin(i * 0.7) * 1.5,
        Math.sin(angle) * radius
      );
      weaponAssembly.lookAt(0, 0, 0);
      weaponAssembly.rotateX(Math.PI / 2);
      weaponAssembly.castShadow = true;
      
      this.weapons.push(weaponAssembly);
      this.mesh.add(weaponAssembly);
    }
    
    // === MECHA LIMB SYSTEM - Mechanical Arms/Extensions ===
    const limbGroup = new THREE.Group();
    
    for (let i = 0; i < 4; i++) {
      const limbAssembly = new THREE.Group();
      
      // Upper limb segment
      const upperSegmentGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8);
      const upperSegmentMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x444444,
        emissive: 0x222200,
        emissiveIntensity: 0.1,
        metalness: 0.9,
        roughness: 0.3
      });
      const upperSegment = new THREE.Mesh(upperSegmentGeometry, upperSegmentMaterial);
      upperSegment.position.set(0, 1.5, 0);
      limbAssembly.add(upperSegment);
      
      // Joint sphere
      const jointGeometry = new THREE.SphereGeometry(0.5, 12, 8);
      const jointMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x666666,
        metalness: 1.0,
        roughness: 0.2
      });
      const joint = new THREE.Mesh(jointGeometry, jointMaterial);
      joint.position.set(0, 3, 0);
      limbAssembly.add(joint);
      
      // Lower limb segment
      const lowerSegmentGeometry = new THREE.CylinderGeometry(0.25, 0.35, 2, 8);
      const lowerSegment = new THREE.Mesh(lowerSegmentGeometry, upperSegmentMaterial);
      lowerSegment.position.set(0, 4.5, 0);
      limbAssembly.add(lowerSegment);
      
      // Position limbs around boss
      const limbAngle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      limbAssembly.position.set(
        Math.cos(limbAngle) * 3.5,
        0,
        Math.sin(limbAngle) * 3.5
      );
      limbAssembly.rotation.y = limbAngle;
      limbAssembly.rotation.z = Math.PI * 0.3;
      
      limbGroup.add(limbAssembly);
    }
    
    this.mesh.add(limbGroup);
    
    // === PANEL LINES AND MECHA DETAILS ===
    const detailGroup = new THREE.Group();
    
    // Armor panel lines on core
    for (let i = 0; i < 12; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.05, 0.02, 4);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8
      });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      const angle = (i / 12) * Math.PI * 2;
      line.position.set(
        Math.cos(angle) * 2.2,
        0,
        Math.sin(angle) * 2.2
      );
      line.rotation.y = angle;
      detailGroup.add(line);
    }
    
    // Warning markings
    for (let i = 0; i < 8; i++) {
      const warningGeometry = new THREE.BoxGeometry(0.3, 0.02, 0.8);
      const warningMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 0.4
      });
      const warning = new THREE.Mesh(warningGeometry, warningMaterial);
      const angle = (i / 8) * Math.PI * 2;
      warning.position.set(
        Math.cos(angle) * 2.5,
        0.5,
        Math.sin(angle) * 2.5
      );
      warning.rotation.y = angle;
      detailGroup.add(warning);
    }
    
    // Energy conduits
    for (let i = 0; i < 6; i++) {
      const conduitGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 6);
      const conduitMaterial = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        emissive: 0x0066aa,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7
      });
      const conduit = new THREE.Mesh(conduitGeometry, conduitMaterial);
      const angle = (i / 6) * Math.PI * 2;
      conduit.position.set(
        Math.cos(angle) * 2.8,
        Math.sin(i) * 1.5,
        Math.sin(angle) * 2.8
      );
      conduit.rotation.z = angle;
      detailGroup.add(conduit);
    }
    
    this.mesh.add(detailGroup);
    
    // === INTIMIDATING LIGHTING SYSTEM ===
    // Main reactor light - scales with phase
    const reactorLight = new THREE.PointLight(0xff4400, 4 + (this.phase * 2), 20);
    reactorLight.position.set(0, 0, 0);
    this.mesh.add(reactorLight);
    
    // Ring accent lights
    this.rings.forEach((ring, index) => {
      const ringLight = new THREE.PointLight(
        index % 3 === 0 ? 0xff00aa : index % 3 === 1 ? 0xaa00ff : 0x00aaff,
        2,
        12
      );
      ring.add(ringLight);
    });
    
    // Weapon charging lights
    this.weapons.forEach((weapon) => {
      const weaponLight = new THREE.PointLight(0x00ff44, 1.5, 8);
      weaponLight.position.set(0, 2, 0);
      weapon.add(weaponLight);
    });
    
    // Danger zone lighting
    const dangerLight = new THREE.PointLight(0xff0000, 3, 15);
    dangerLight.position.set(0, 0, 0);
    dangerLight.intensity = 0.5 + Math.sin(this.time * 5) * 0.5; // Pulsing effect
    this.mesh.add(dangerLight);
    
    // Phase-based energy aura
    if (this.phase >= 2) {
      const auraGeometry = new THREE.SphereGeometry(8, 32, 32);
      const auraMaterial = new THREE.MeshBasicMaterial({
        color: this.phase === 2 ? 0xff6600 : 0xff0000,
        transparent: true,
        opacity: 0.1 * this.phase,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      });
      const aura = new THREE.Mesh(auraGeometry, auraMaterial);
      this.mesh.add(aura);
    }
  }


  public update(deltaTime: number, playerPosition: THREE.Vector3, bounds?: { min: THREE.Vector3, max: THREE.Vector3 }): void {
    this.time += deltaTime;
    
    // Throttle expensive updates for better performance
    const shouldUpdateVisuals = this.time - this.lastUpdateTime > this.updateFrequency;
    
    // Update phase based on health
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent <= 0.33) {
      this.phase = 3;
    } else if (healthPercent <= 0.66) {
      this.phase = 2;
    } else {
      this.phase = 1;
    }
    
    // Movement AI
    this.target.copy(playerPosition);
    const direction = this.target.clone().sub(this.position);
    const distance = direction.length();
    
    if (distance > 5) {
      direction.normalize();
      const speed = this.moveSpeed * (1 + (this.phase - 1) * 0.5);
      this.position.add(direction.multiplyScalar(speed * deltaTime));
    } else if (distance < 3) {
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
    
    // Throttled visual updates for better performance
    if (shouldUpdateVisuals) {
      // Animate rings with reduced frequency
      this.rings.forEach((ring, i) => {
        ring.rotation.x += this.updateFrequency * (1 + i * 0.2) * this.phase;
        ring.rotation.y += this.updateFrequency * (0.5 + i * 0.1) * this.phase;
      });
      
      // Animate core
      this.core.rotation.y += this.updateFrequency * 2;
      const scale = 1 + Math.sin(this.time * 3) * 0.05; // Reduced scale animation
      this.core.scale.setScalar(scale);
      
      // Animate weapons
      this.weapons.forEach((weapon, i) => {
          const angle = (i / this.weapons.length) * Math.PI * 2 + this.time * 0.5; // Slower rotation
          weapon.position.x = Math.cos(angle) * 3;
          weapon.position.z = Math.sin(angle) * 3;
          weapon.position.y = Math.sin(this.time * 2 + i) * 0.3; // Reduced movement
      });
      
      // Update material based on phase (reduced frequency)
      if (this.core.material instanceof THREE.MeshPhysicalMaterial) {
        this.core.material.emissiveIntensity = 0.5 + (this.phase - 1) * 0.2;
      }
      
      this.lastUpdateTime = this.time;
    }
    
    // Update attack timer (always update for gameplay)
    if (this.attackTimer > 0) {
      this.attackTimer -= deltaTime;
    }
  }

  public attack(playerPosition: THREE.Vector3): THREE.Mesh[] | null {
    if (this.attackTimer > 0) return null;
    
    this.attackTimer = this.attackCooldown / this.phase;
    this.isAttacking = true;
    
    const projectiles: THREE.Mesh[] = [];
    
    // Different attack patterns based on phase
    switch(this.phase) {
      case 1:
        // Single targeted shot
        projectiles.push(this.createProjectile(playerPosition, 0xff4400));
        break;
        
      case 2:
        // Spread shot
        for (let i = -1; i <= 1; i++) {
          const target = playerPosition.clone();
          target.x += i * 3;
          projectiles.push(this.createProjectile(target, 0xff00ff));
        }
        break;
        
      case 3:
        // Spiral pattern
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const target = this.position.clone();
          target.x += Math.cos(angle) * 10;
          target.z += Math.sin(angle) * 10;
          projectiles.push(this.createProjectile(target, 0x00ff00));
        }
        break;
    }
    
    projectiles.forEach(p => this.scene.add(p));
    
    // Attack effect
    this.createAttackEffect();
    
    setTimeout(() => {
      this.isAttacking = false;
    }, 500);
    
    return projectiles;
  }

  private createProjectile(target: THREE.Vector3, color: number): THREE.Mesh {
    // Create projectile mesh
    const geometry = new THREE.ConeGeometry(0.3, 1, 6);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const projectile = new THREE.Mesh(geometry, material);
    
    projectile.position.copy(this.position);
    
    const direction = target.clone().sub(this.position).normalize();
    projectile.userData = {
      velocity: direction.multiplyScalar(15 + this.phase * 2),
      damage: 10 * this.phase,
      owner: 'boss'
    };
    
    // Rotate projectile to face direction
    projectile.lookAt(projectile.position.clone().add(direction));
    projectile.rotateX(Math.PI / 2);
    
    return projectile;
  }

  private createAttackEffect(): void {
    // Create expanding sphere effect
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(this.position);
    this.scene.add(sphere);
    
    // Animate and remove
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 0.5) {
        sphere.scale.setScalar(1 + elapsed * 6);
        material.opacity = 0.5 * (1 - elapsed * 2);
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(sphere);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Flash effect
    if (this.core.material instanceof THREE.MeshPhysicalMaterial) {
      const originalColor = this.core.material.color.clone();
      this.core.material.color.setHex(0xffffff);
      setTimeout(() => {
        if (this.core.material instanceof THREE.MeshPhysicalMaterial) {
          this.core.material.color.copy(originalColor);
        }
      }, 100);
    }
  }

  public evolve(): void {
    this.level++;
    this.maxHealth = 100 * Math.pow(1.5, this.level - 1);
    this.health = this.maxHealth;
    this.attackCooldown = Math.max(0.5, 2 - (this.level * 0.1));
    
    // Reset position to original spawn point
    this.position.copy(this.originalSpawnPosition);
    this.mesh.position.copy(this.originalSpawnPosition);
    
    // Update existing model instead of recreating (prevents lag)
    this.updateModelForLevel();
    
    // Simple evolution effect without complex animation
    this.createSimpleEvolutionEffect();
    
    // Ensure visibility
    this.mesh.visible = true;
  }
  
  private updateModelForLevel(): void {
    // Update scale based on level
    const scale = 1 + (this.level - 1) * 0.1;
    this.mesh.scale.setScalar(scale);
    
    // Update material colors based on level
    if (this.core && this.core.material instanceof THREE.MeshPhysicalMaterial) {
      const intensity = 0.5 + (this.level - 1) * 0.1;
      this.core.material.emissiveIntensity = Math.min(intensity, 1);
    }
  }
  
  private createSimpleEvolutionEffect(): void {
    // Create simple flash effect without complex geometry
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
      opacity: 1;
      pointer-events: none;
      z-index: 999;
    `;
    document.body.appendChild(flash);
    
    // Simple fade out
    setTimeout(() => {
      flash.style.transition = 'opacity 0.5s';
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 500);
    }, 100);
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
  }
}