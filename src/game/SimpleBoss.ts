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
  private moveSpeed: number = 3.2; // Reduced to 0.8x of original speed (was 4)
  private attackCooldown: number = 2;
  private attackTimer: number = 0;
  // private electrons: THREE.Mesh[] = []; // Unused variable
  private nucleus!: THREE.Mesh;
  private time: number = 0;
  private originalSpawnPosition: THREE.Vector3;
  private targetRotation: number = 0; // For smooth rotation with drift
  private currentRotation: number = 0; // Current rotation for drift effect
  private rotationSpeed: number = 0.8; // How fast the boss can turn (radians per second) - much slower for heavy drift
  // private crystallineShards: THREE.Mesh[] = []; // Removed - using spacecraft model now
  private corruptionAura: THREE.Points | null = null;
  private textureManager: TextureManager;
  private attackAnimationId: number | null = null;
  private currentBeam: THREE.Mesh | null = null; // Track current beam to ensure cleanup
  private currentFlash: THREE.PointLight | null = null; // Track current flash
  private damageAnimationIds: Set<number> = new Set();
  private lastAuraUpdate: number = 0;
  private auraUpdateInterval: number = 0.033; // ~30fps for aura
  
  // Particle pool for damage effects
  private particlePool: { mesh: THREE.Mesh, geometry: THREE.BufferGeometry, material: THREE.Material }[] = [];
  // Removed unused activeParticles set
  
  // Cached mesh references to avoid traversal
  private phaserMeshes: THREE.Mesh[] = [];
  private deflectorMesh: THREE.Mesh | null = null;
  private engineMeshes: THREE.Mesh[] = [];
  // private bridgeMesh: THREE.Mesh | null = null;
  // Removed unused warpNacelleMeshes
  
  // Static texture cache to prevent regeneration during evolve
  public static cachedHullTextures: any = null;
  public static cachedSaucerTextures: any = null;
  
  // Static material pools to prevent shader recompilation
  private static projectileMaterialPool: THREE.MeshPhysicalMaterial[] = [];
  private static beamMaterial: THREE.MeshPhysicalMaterial | null = null;
  private static particleMaterial: THREE.MeshBasicMaterial | null = null;
  
  // Static geometry pool to prevent geometry recreation
  private static torpedoGeometry: THREE.SphereGeometry | null = null;
  // private static beamGeometry: THREE.CylinderGeometry | null = null;

  constructor(scene: THREE.Scene, level: number = 1) {
    this.scene = scene;
    this.level = level;
    this.originalSpawnPosition = new THREE.Vector3(0, 1, -10); // Same height as player (y=1)
    this.position = this.originalSpawnPosition.clone();
    this.target = new THREE.Vector3();
    this.mesh = new THREE.Group();
    this.textureManager = TextureManager.getInstance();
    
    // Scale health with level
    this.maxHealth = 100 * Math.pow(1.5, level - 1);
    this.health = this.maxHealth;
    
    // Scale attack rate with level
    this.attackCooldown = Math.max(0.5, 2 - (level * 0.1));
    
    // Initialize material pools to prevent shader recompilation
    this.initializeMaterialPools();
    
    this.createAtomModel();
    this.mesh.position.copy(this.position);
    this.mesh.position.y = 1; // Ensure boss starts at player height
    this.scene.add(this.mesh);
  }
  
  private initializeMaterialPools(): void {
    // Initialize projectile material pool (create once, reuse forever)
    if (SimpleBoss.projectileMaterialPool.length === 0) {
      // Pre-create 20 projectile materials (enough for max projectile count)
      for (let i = 0; i < 20; i++) {
        SimpleBoss.projectileMaterialPool.push(new THREE.MeshPhysicalMaterial({
          color: 0xff6600,
          emissive: new THREE.Color(0xff4400),
          emissiveIntensity: 3.0,
          metalness: 0.0,
          roughness: 0.0,
          transmission: 0.7,
          thickness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          transparent: true,
          opacity: 0.95
        }));
      }
    }
    
    // Initialize beam material (single instance)
    if (!SimpleBoss.beamMaterial) {
      SimpleBoss.beamMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff8800,
        emissive: new THREE.Color(0xff6600),
        emissiveIntensity: 4.0,
        metalness: 0.0,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
    }
    
    // Initialize particle material for damage effects
    if (!SimpleBoss.particleMaterial) {
      SimpleBoss.particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.9
      });
    }
  }

  private createAtomModel(): void {
    // Create Star Trek Federation-style starship
    this.createEngineeringHull();
    this.createSaucerSection();
    this.createWarpNacelles();
    this.createDeflectorDish();
    this.createBridge();
    this.createPhaserArrays();
    this.createWindowArrays();
    this.createHullDetails();
    this.createEngineGlows();
    this.createWarpPlasmaTrails();
  }
  
  private createEngineeringHull(): void {
    // Secondary hull - elongated cylindrical shape
    const hullGeometry = new THREE.CylinderGeometry(
      1.2,  // top radius
      1.5,  // bottom radius
      4,    // height
      16,   // radial segments
      4     // height segments
    );
    
    // Transform vertices for more spacecraft-like shape
    const positionAttribute = hullGeometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);
      
      // Flatten the hull (make it wider than tall)
      positionAttribute.setX(i, x * 1.2);
      positionAttribute.setZ(i, z * 0.7);
      
      // Taper the front
      if (y > 1) {
        const taper = 1 - (y - 1) / 3 * 0.4;
        positionAttribute.setX(i, x * taper * 1.2);
        positionAttribute.setZ(i, z * taper * 0.7);
      }
    }
    hullGeometry.computeVertexNormals();
    
    // Use cached textures to prevent regeneration
    if (!SimpleBoss.cachedHullTextures) {
      SimpleBoss.cachedHullTextures = this.textureManager.generateMetallicPanelTexture(512, 0.9);
    }
    const hullTextures = SimpleBoss.cachedHullTextures;
    const hullMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa0a8b0,
      map: hullTextures.diffuse,
      normalMap: hullTextures.normal,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughnessMap: hullTextures.roughness,
      metalnessMap: hullTextures.metalness,
      aoMap: hullTextures.ao,
      metalness: 0.85,
      roughness: 0.2,
      clearcoat: 0.3,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8,
      reflectivity: 0.8
    });
    
    this.nucleus = new THREE.Mesh(hullGeometry, hullMaterial);
    this.nucleus.rotation.z = Math.PI / 2;
    this.nucleus.rotation.y = -Math.PI / 2; // Rotate to face forward
    this.nucleus.position.set(0, 0, -1);
    this.nucleus.castShadow = true;
    this.nucleus.receiveShadow = true;
    this.mesh.add(this.nucleus);
    
    // Hull lighting
    const hullLight = new THREE.PointLight(0x4488ff, 2, 15);
    hullLight.position.set(0, 0, 0);
    this.nucleus.add(hullLight);
  }
  
  private createSaucerSection(): void {
    // Primary saucer section
    const saucerRadius = 3;
    const saucerGeometry = new THREE.CylinderGeometry(
      saucerRadius * 0.4,
      saucerRadius,
      0.8,
      32,
      1
    );
    
    // Flatten for saucer shape
    const positions = saucerGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      positions.setY(i, y * 0.5);
    }
    saucerGeometry.computeVertexNormals();
    
    // Use cached textures for saucer
    if (!SimpleBoss.cachedSaucerTextures) {
      SimpleBoss.cachedSaucerTextures = this.textureManager.generateMetallicPanelTexture(1024, 0.92);
    }
    const saucerTextures = SimpleBoss.cachedSaucerTextures;
    const saucerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb0b8c0,
      map: saucerTextures.diffuse,
      normalMap: saucerTextures.normal,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: saucerTextures.roughness,
      metalnessMap: saucerTextures.metalness,
      aoMap: saucerTextures.ao,
      metalness: 0.88,
      roughness: 0.15,
      clearcoat: 0.5,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.0
    });
    
    const saucer = new THREE.Mesh(saucerGeometry, saucerMaterial);
    saucer.position.set(0, 0, 1.5);
    saucer.castShadow = true;
    saucer.receiveShadow = true;
    this.mesh.add(saucer);
  }
  
  private createWarpNacelles(): void {
    // Create warp nacelles on pylons
    for (let side of [-1, 1]) {
      // Nacelle
      const nacelleGeometry = new THREE.CapsuleGeometry(0.35, 3, 8, 16);
      const nacelleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x7080a0,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 0.6,
        clearcoatRoughness: 0.02,
        emissive: new THREE.Color(0x0044ff),
        emissiveIntensity: 0.3 + this.phase * 0.2
      });
      
      const nacelle = new THREE.Mesh(nacelleGeometry, nacelleMaterial);
      nacelle.position.set(side * 2.2, 0, -2);
      nacelle.rotation.z = Math.PI / 2;
      nacelle.rotation.y = -Math.PI / 2; // Align with forward direction
      nacelle.castShadow = true;
      this.mesh.add(nacelle);
      
      // Bussard collector (red glow)
      const collectorGeometry = new THREE.ConeGeometry(0.4, 0.6, 12);
      const collectorMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff4400,
        emissive: new THREE.Color(0xff2200),
        emissiveIntensity: 1.8,
        metalness: 0.2,
        roughness: 0.0,
        transmission: 0.6,
        thickness: 0.2,
        ior: 1.5
      });
      
      const collector = new THREE.Mesh(collectorGeometry, collectorMaterial);
      collector.position.set(side * 2.2, 0, -0.5);
      collector.rotation.z = -Math.PI / 2;
      this.mesh.add(collector);
      
      // Pylon
      const pylonGeometry = new THREE.BoxGeometry(0.2, 1.0, 0.3);
      const pylonMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x909090,
        metalness: 0.85,
        roughness: 0.2
      });
      
      const pylon = new THREE.Mesh(pylonGeometry, pylonMaterial);
      pylon.position.set(side * 1.5, 0, -2);
      pylon.rotation.z = side * 0.3;
      this.mesh.add(pylon);
      
      // Nacelle light
      const nacelleLight = new THREE.SpotLight(0x0066ff, 3, 15, Math.PI / 4, 0.5, 2);
      nacelleLight.position.copy(nacelle.position);
      nacelleLight.target.position.set(side * 2.2, 0, -5);
      this.mesh.add(nacelleLight);
      this.mesh.add(nacelleLight.target);
    }
  }
  
  private createDeflectorDish(): void {
    // Main deflector array
    const dishGeometry = new THREE.ConeGeometry(0.7, 0.4, 24, 1, true);
    const dishMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4488ff,
      emissive: new THREE.Color(0x0066ff),
      emissiveIntensity: 2.5,
      metalness: 0.1,
      roughness: 0.0,
      transmission: 0.8,
      thickness: 0.3,
      ior: 1.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0
    });
    
    const dish = new THREE.Mesh(dishGeometry, dishMaterial);
    dish.position.set(0, 0, 1.8);
    dish.rotation.x = Math.PI / 2;
    this.mesh.add(dish);
    this.deflectorMesh = dish; // Cache reference
    
    // Deflector glow
    const dishLight = new THREE.PointLight(0x0088ff, 4 + this.level, 12);
    dishLight.position.copy(dish.position);
    this.mesh.add(dishLight);
  }
  
  private createBridge(): void {
    // Bridge module on top of saucer
    const bridgeGeometry = new THREE.CylinderGeometry(0.35, 0.4, 0.25, 12);
    const bridgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa8b0b8,
      metalness: 0.8,
      roughness: 0.25,
      clearcoat: 0.4
    });
    
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    bridge.position.set(0, 0.6, 1.5);
    this.mesh.add(bridge);
    // this.bridgeMesh = bridge; // Cache reference
    
    // Bridge viewport
    const viewportGeometry = new THREE.BoxGeometry(0.5, 0.06, 0.25);
    const viewportMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      emissive: new THREE.Color(0x4488ff),
      emissiveIntensity: 0.8,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.9,
      thickness: 0.05
    });
    
    const viewport = new THREE.Mesh(viewportGeometry, viewportMaterial);
    viewport.position.set(0, 0.65, 1.7);
    this.mesh.add(viewport);
  }
  
  private createPhaserArrays(): void {
    // Phaser strips
    const phaserGeometry = new THREE.BoxGeometry(1.5, 0.04, 0.08);
    const phaserMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff8800,
      emissive: new THREE.Color(0xff4400),
      emissiveIntensity: 0.4 + this.phase * 0.2,
      metalness: 0.4,
      roughness: 0.1,
      clearcoat: 0.8
    });
    
    // Upper array
    const upperPhaser = new THREE.Mesh(phaserGeometry, phaserMaterial);
    upperPhaser.position.set(0, 0.45, 1.2);
    this.mesh.add(upperPhaser);
    this.phaserMeshes.push(upperPhaser); // Cache reference
    
    // Lower array
    const lowerPhaser = new THREE.Mesh(phaserGeometry, phaserMaterial.clone());
    lowerPhaser.position.set(0, -0.45, 1.2);
    this.mesh.add(lowerPhaser);
    this.phaserMeshes.push(lowerPhaser); // Cache reference
  }
  
  private createWindowArrays(): void {
    // Window strips with glow
    const windowCount = 20;
    const windowGeometry = new THREE.BoxGeometry(0.12, 0.04, 0.06);
    
    for (let i = 0; i < windowCount; i++) {
      const angle = (i / windowCount) * Math.PI * 2;
      const radius = 2.8;
      
      const windowMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffaa,
        emissive: new THREE.Color(0xffff88),
        emissiveIntensity: 0.7 + Math.random() * 0.3,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.95
      });
      
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius + 1.5
      );
      window.lookAt(new THREE.Vector3(0, 0, 1.5));
      this.mesh.add(window);
    }
  }
  
  private createHullDetails(): void {
    // Add panel lines and details
    const lineCount = 12;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x606070,
      transparent: true,
      opacity: 0.4
    });
    
    for (let i = 0; i < lineCount; i++) {
      const points = [];
      const z = -2 + i * 0.35;
      
      for (let j = 0; j <= 16; j++) {
        const angle = (j / 16) * Math.PI * 2;
        const radius = 1.3 * (1 - Math.abs(z + 1) / 3 * 0.3);
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 1.2,
          Math.sin(angle) * radius * 0.7,
          z
        ));
      }
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.rotation.z = Math.PI / 2;
      line.rotation.y = -Math.PI / 2; // Align with forward direction
      this.mesh.add(line);
    }
    
    // Navigation lights
    const navLights = [
      { pos: new THREE.Vector3(-3, 0, 1.5), color: 0xff0000 },
      { pos: new THREE.Vector3(3, 0, 1.5), color: 0x00ff00 },
      { pos: new THREE.Vector3(0, 0.8, 1.5), color: 0xffffff }
    ];
    
    navLights.forEach(light => {
      const geometry = new THREE.SphereGeometry(0.06, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: light.color
      });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(light.pos);
      this.mesh.add(marker);
    });
  }
  
  private createEngineGlows(): void {
    // Main impulse engines
    for (let i = 0; i < 2; i++) {
      const engineGeometry = new THREE.CylinderGeometry(0.25, 0.35, 0.15, 12);
      const engineMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff6600,
        emissive: new THREE.Color(0xff3300),
        emissiveIntensity: 2.0 + this.phase * 0.5,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.9,
        clearcoat: 1.0
      });
      
      const engine = new THREE.Mesh(engineGeometry, engineMaterial);
      engine.position.set((i - 0.5) * 1.0, 0, -2.2);
      engine.rotation.x = Math.PI / 2;
      this.mesh.add(engine);
      this.engineMeshes.push(engine); // Cache reference
      
      // Engine light
      const engineLight = new THREE.PointLight(0xff6600, 2 + this.level, 8);
      engineLight.position.copy(engine.position);
      this.mesh.add(engineLight);
    }
  }
  
  private createWarpPlasmaTrails(): void {
    // Warp plasma particle trails
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const side = i < particleCount / 2 ? -1 : 1;
      
      positions[i3] = side * 2.2 + (Math.random() - 0.5) * 0.2;
      positions[i3 + 1] = (Math.random() - 0.5) * 0.2;
      positions[i3 + 2] = -3.5 - Math.random() * 2;
      
      // Blue-white plasma
      colors[i3] = 0.5 + Math.random() * 0.5;
      colors[i3 + 1] = 0.7 + Math.random() * 0.3;
      colors[i3 + 2] = 1.0;
      
      sizes[i] = 0.08 + Math.random() * 0.12;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
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
    
    // Enhanced movement AI with phase-based behavior and drift mechanics
    this.target.copy(playerPosition);
    const direction = this.target.clone().sub(this.position);
    const distance = direction.length();
    
    // Calculate target rotation (where boss wants to face)
    if (direction.length() > 0.1) {
      this.targetRotation = Math.atan2(direction.x, direction.z);
    }
    
    // Apply rotation smoothing/drift (boss doesn't instantly turn)
    const maxRotationSpeed = this.rotationSpeed * deltaTime; // Maximum rotation per frame
    const rotationDiff = this.targetRotation - this.currentRotation;
    
    // Normalize rotation difference to [-PI, PI]
    let normalizedDiff = rotationDiff;
    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
    
    // Apply rotation with maximum turn speed (creates drift effect)
    if (Math.abs(normalizedDiff) < maxRotationSpeed) {
      // Close enough to target, snap to it
      this.currentRotation = this.targetRotation;
    } else {
      // Apply maximum rotation speed in the correct direction
      this.currentRotation += Math.sign(normalizedDiff) * maxRotationSpeed;
    }
    
    // Keep rotation in [-PI, PI] range
    while (this.currentRotation > Math.PI) this.currentRotation -= Math.PI * 2;
    while (this.currentRotation < -Math.PI) this.currentRotation += Math.PI * 2;
    
    // Move in the direction the boss is currently facing (not necessarily toward player)
    const moveDirection = new THREE.Vector3(
      Math.sin(this.currentRotation),
      0,
      Math.cos(this.currentRotation)
    );
    
    if (distance > 8) {
      const speed = this.moveSpeed * (1 + (this.phase - 1) * 0.2); // Reduced phase speed bonus
      this.position.add(moveDirection.multiplyScalar(speed * deltaTime));
    } else if (distance < 5) {
      // Move backward but still with current facing direction
      this.position.sub(moveDirection.multiplyScalar(this.moveSpeed * deltaTime * 0.4));
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
    
    // Update mesh position - ensure it's exactly at boss position for hit detection
    this.mesh.position.x = this.position.x;
    this.mesh.position.y = this.position.y + Math.sin(this.time * 0.7) * 0.2; // Small float animation
    this.mesh.position.z = this.position.z;
    
    // Animate spacecraft with realistic movement
    // Use the smoothed rotation for the mesh
    this.mesh.rotation.y = this.currentRotation;
    
    // Boss position stays at constant height for consistent hit detection
    // The mesh can float slightly but the hitbox position remains stable
    this.position.y = 1; // Same as player height
    
    // Pitch when moving forward/backward
    const targetPitch = distance > 8 ? -0.08 : (distance < 5 ? 0.08 : 0);
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, targetPitch, deltaTime * 2);
    
    // Banking when turning (enhanced for drift effect)
    const turnRate = normalizedDiff; // Use the normalized difference we already calculated
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, -turnRate * 0.5, deltaTime * 2); // More banking
    
    // Hovering motion is now handled above when setting mesh position
    
    // Update engine glow intensity
    this.updateEngineGlows(deltaTime);
    
    // Update cached mesh emissive intensities directly (no traversal)
    // Update phaser arrays - REMOVED FLASHING ANIMATION THAT CAUSED FPS DROPS
    // The rapid Math.sin(this.time * 15) was causing performance issues
    this.phaserMeshes.forEach(mesh => {
      if (mesh.material && (mesh.material as THREE.MeshPhysicalMaterial).emissive) {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        // Keep constant glow, no flashing
        mat.emissiveIntensity = 0.4 + this.phase * 0.2;
      }
    });
    
    // Update deflector dish
    if (this.deflectorMesh && this.deflectorMesh.material) {
      const mat = this.deflectorMesh.material as THREE.MeshPhysicalMaterial;
      if (mat.emissive) {
        mat.emissiveIntensity = 2.5 + Math.sin(this.time * 3) * 0.5;
      }
    }
    
    // Update engine glows
    this.engineMeshes.forEach(mesh => {
      if (mesh.material && (mesh.material as THREE.MeshPhysicalMaterial).emissive) {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        mat.emissiveIntensity = 2.0 + this.phase * 0.5 + Math.sin(this.time * 5) * 0.3;
      }
    });
    
    // Animate warp plasma trails
    if (this.corruptionAura) {
      // Only update particle positions at reduced framerate
      this.lastAuraUpdate += deltaTime;
      if (this.lastAuraUpdate >= this.auraUpdateInterval) {
        const positions = this.corruptionAura.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          // Stream particles backward
          positions[i + 2] -= this.lastAuraUpdate * 10 * (1 + this.phase * 0.5);
          
          // Reset particles that go too far
          if (positions[i + 2] < -6) {
            positions[i + 2] = -3.5;
            const side = i < positions.length / 2 ? -1 : 1;
            positions[i] = side * 2.2 + (Math.random() - 0.5) * 0.2;
            positions[i + 1] = (Math.random() - 0.5) * 0.2;
          }
          
          // Add turbulence
          positions[i] += (Math.random() - 0.5) * this.lastAuraUpdate * 0.8;
          positions[i + 1] += (Math.random() - 0.5) * this.lastAuraUpdate * 0.5;
        }
        this.corruptionAura.geometry.attributes.position.needsUpdate = true;
        this.lastAuraUpdate = 0;
      }
      
      // Pulse opacity based on phase
      (this.corruptionAura.material as THREE.PointsMaterial).opacity = 0.6 + this.phase * 0.1 + Math.sin(this.time * 4) * 0.2;
    }
    
    // Update ship lights
    this.mesh.traverse(child => {
      if (child instanceof THREE.PointLight || child instanceof THREE.SpotLight) {
        // Pulse lights based on ship status
        const baseIntensity = child.userData.baseIntensity || 3;
        child.intensity = baseIntensity * (0.9 + Math.sin(this.time * 2) * 0.1);
      }
    });
    
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
    
    // Fire photon torpedoes
    const projectileCount = Math.min(this.phase * 2, 6);
    
    // Create shared geometry once if not exists
    if (!SimpleBoss.torpedoGeometry) {
      SimpleBoss.torpedoGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    }
    
    for (let i = 0; i < projectileCount; i++) {
      // Use pooled geometry and material - NO NEW GEOMETRY CREATION!
      const torpedoMaterial = SimpleBoss.projectileMaterialPool[i % SimpleBoss.projectileMaterialPool.length];
      
      const torpedo = new THREE.Mesh(SimpleBoss.torpedoGeometry, torpedoMaterial);
      
      // Launch from torpedo tubes (front of ship)
      torpedo.position.copy(this.mesh.position);
      const forwardOffset = 2; // Distance in front of ship
      const sideOffset = (i % 2 - 0.5) * 0.4; // Spread between tubes
      
      // Calculate spawn position based on boss's current rotation
      torpedo.position.x += Math.sin(this.currentRotation) * forwardOffset + Math.cos(this.currentRotation) * sideOffset;
      torpedo.position.z += Math.cos(this.currentRotation) * forwardOffset - Math.sin(this.currentRotation) * sideOffset;
      
      // Calculate targeting - fire in the direction the boss is currently facing with some aim toward player
      // Mix between current facing direction and target direction for more realistic aiming
      const facingDirection = new THREE.Vector3(
        Math.sin(this.currentRotation),
        0,
        Math.cos(this.currentRotation)
      );
      const targetDirection = this.target.clone().sub(torpedo.position).normalize();
      
      // Blend 70% facing direction with 30% target direction for slight tracking
      const baseDirection = facingDirection.multiplyScalar(0.7).add(targetDirection.multiplyScalar(0.3)).normalize();
      
      const spreadAngle = ((i - projectileCount / 2) / projectileCount) * 0.3;
      const direction = new THREE.Vector3(
        baseDirection.x * Math.cos(spreadAngle) - baseDirection.z * Math.sin(spreadAngle),
        baseDirection.y,
        baseDirection.x * Math.sin(spreadAngle) + baseDirection.z * Math.cos(spreadAngle)
      ).normalize();
      
      // REMOVED: PointLight causes memory leak and GPU exhaustion
      // Visual effect handled by emissive material instead
      
      torpedo.userData = {
        velocity: direction.multiplyScalar(12 + this.phase * 2), // Reduced projectile speed for better gameplay
        damage: 15 * this.phase,
        owner: 'boss'
      };
      
      projectiles.push(torpedo);
      this.scene.add(torpedo);
    }
    
    // Phaser beam effect - DISABLED FOR TESTING
    // this.createPhaserEffect();
    
    setTimeout(() => {
      this.isAttacking = false;
    }, 500);
    
    return projectiles;
  }

  // Disabled phaser effect method to prevent performance issues
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // private createPhaserEffect(): void {
  //   // Cancel previous attack animation if still running
  //   if (this.attackAnimationId !== null) {
  //     cancelAnimationFrame(this.attackAnimationId);
  //     this.attackAnimationId = null;
  //   }
  //   
  //   // Clean up any existing beam/flash that wasn't properly disposed
  //   if (this.currentBeam) {
  //     this.scene.remove(this.currentBeam);
  //     if (this.currentBeam.geometry) this.currentBeam.geometry.dispose();
  //     if (this.currentBeam.material instanceof THREE.Material) {
  //       this.currentBeam.material.dispose();
  //     }
  //     this.currentBeam = null;
  //   }
  //   if (this.currentFlash) {
  //     this.scene.remove(this.currentFlash);
  //     this.currentFlash = null;
  //   }
  //   
  //   // Use pooled geometry to avoid creating new geometry every shot
  //   if (!SimpleBoss.beamGeometry) {
  //     SimpleBoss.beamGeometry = new THREE.CylinderGeometry(0.08, 0.04, 8, 6);
  //   }
  //   // Clone the pooled material so we can modify it without affecting the pool
  //   const beamMaterial = SimpleBoss.beamMaterial!.clone();
  //   
  //   const beam = new THREE.Mesh(SimpleBoss.beamGeometry, beamMaterial);
  //   const direction = this.target.clone().sub(this.mesh.position);
  //   const distance = direction.length();
  //   
  //   beam.position.copy(this.mesh.position);
  //   beam.position.y += 0.45; // From phaser array position
  //   beam.scale.y = distance / 8;
  //   beam.lookAt(this.target);
  //   beam.rotateX(Math.PI / 2);
  //   
  //   this.scene.add(beam);
  //   this.currentBeam = beam; // Track reference
  //   
  //   // Flash effect
  //   const flash = new THREE.PointLight(0xff8800, 8, 20);
  //   flash.position.copy(beam.position);
  //   this.scene.add(flash);
  //   this.currentFlash = flash; // Track reference
  //   
  //   // Animate and remove
  //   const startTime = Date.now();
  //   const animate = () => {
  //     const elapsed = (Date.now() - startTime) / 1000;
  //     if (elapsed < 0.25) {
  //       beamMaterial.opacity = 0.9 * (1 - elapsed * 4);
  //       beamMaterial.emissiveIntensity = 4.0 * (1 - elapsed * 3);
  //       flash.intensity = 8 * (1 - elapsed * 4);
  //       beam.scale.x = 1 + elapsed * 1.5;
  //       beam.scale.z = 1 + elapsed * 1.5;
  //       this.attackAnimationId = requestAnimationFrame(animate);
  //     } else {
  //       // Properly clean up the beam
  //       if (this.currentBeam === beam) {
  //         this.scene.remove(beam);
  //         // Don't dispose the pooled geometry!
  //         beamMaterial.dispose(); // Only dispose the cloned material
  //         this.currentBeam = null;
  //       }
  //       if (this.currentFlash === flash) {
  //         this.scene.remove(flash);
  //         this.currentFlash = null;
  //       }
  //       this.attackAnimationId = null;
  //     }
  //   };
  //   animate();
  // }
  
  
  private updateEngineGlows(_deltaTime: number): void {
    // REMOVED EXPENSIVE MESH TRAVERSAL - This was causing the FPS drops!
    // Engine glows are already updated via cached engineMeshes array in update()
    // No need to traverse the entire mesh hierarchy every frame
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Shield impact effect - flash the hull
    if (this.nucleus.material instanceof THREE.MeshPhysicalMaterial) {
      const originalColor = this.nucleus.material.color.clone();
      const originalEmissive = this.nucleus.material.emissive ? this.nucleus.material.emissive.clone() : new THREE.Color(0x000000);
      
      // Shield flash effect
      this.nucleus.material.color.setHex(0xffffff);
      this.nucleus.material.emissive = new THREE.Color(0x4488ff);
      this.nucleus.material.emissiveIntensity = 1.5;
      
      // Shake the ship
      const originalPos = this.mesh.position.clone();
      const shakeAmount = 0.3;
      this.mesh.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * shakeAmount,
        (Math.random() - 0.5) * shakeAmount,
        (Math.random() - 0.5) * shakeAmount
      ));
      
      setTimeout(() => {
        this.mesh.position.copy(originalPos);
        if (this.nucleus.material instanceof THREE.MeshPhysicalMaterial) {
          this.nucleus.material.color.copy(originalColor);
          this.nucleus.material.emissive = originalEmissive;
          this.nucleus.material.emissiveIntensity = 0;
        }
      }, 150);
    }
    
    // Create damage particles (sparks and debris)
    this.createDamageParticles();
  }
  
  private createDamageParticles(): void {
    // Limit active damage animations
    if (this.damageAnimationIds.size > 3) {
      return; // Skip if too many animations running
    }
    
    const particleCount = 10; // Reduced from 20
    const particles: { mesh: THREE.Mesh, velocity: THREE.Vector3, geometry: THREE.BufferGeometry, material: THREE.Material }[] = [];
    
    // Initialize particle pool if needed
    if (this.particlePool.length < particleCount) {
      const needed = particleCount - this.particlePool.length;
      for (let i = 0; i < needed; i++) {
        const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        // Use pooled particle material instead of creating new one
        const particleMaterial = SimpleBoss.particleMaterial!;
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        this.particlePool.push({ mesh: particle, geometry: particleGeometry, material: particleMaterial });
      }
    }
    
    // Reuse particles from pool
    for (let i = 0; i < particleCount; i++) {
      const poolItem = this.particlePool[i];
      const particle = poolItem.mesh;
      const material = poolItem.material as THREE.MeshBasicMaterial;
      
      // Reset particle properties
      particle.scale.set(
        0.8 + Math.random() * 0.4,
        0.8 + Math.random() * 0.4,
        0.8 + Math.random() * 0.4
      );
      material.color.setHex(i < particleCount / 2 ? 0xffaa00 : 0x808080);
      material.opacity = 0.9;
      particle.position.copy(this.position);
      particle.visible = true;
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5,
        (Math.random() - 0.5) * 10
      );
      
      this.scene.add(particle);
      particles.push({ mesh: particle, velocity, geometry: poolItem.geometry, material: poolItem.material });
    }
    
    // Single animation loop for all particles
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      if (elapsed < 1.5) {
        particles.forEach(p => {
          p.mesh.position.add(p.velocity.clone().multiplyScalar(0.02));
          p.velocity.y -= 0.3;
          p.mesh.rotation.x += 0.1;
          p.mesh.rotation.y += 0.15;
          (p.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - elapsed / 1.5);
        });
        const animId = requestAnimationFrame(animate);
        this.damageAnimationIds.add(animId);
      } else {
        // Return particles to pool
        particles.forEach(p => {
          this.scene.remove(p.mesh);
          p.mesh.visible = false;
          // Don't dispose - keep in pool for reuse
        });
        this.damageAnimationIds.forEach(id => cancelAnimationFrame(id));
        this.damageAnimationIds.clear();
      }
    };
    animate();
  }

  public evolve(): void {
    // Cancel any running animations before evolving
    if (this.attackAnimationId !== null) {
      cancelAnimationFrame(this.attackAnimationId);
      this.attackAnimationId = null;
    }
    this.damageAnimationIds.forEach(id => cancelAnimationFrame(id));
    this.damageAnimationIds.clear();
    
    // Clean up any lingering beam/flash before evolving
    if (this.currentBeam) {
      this.scene.remove(this.currentBeam);
      if (this.currentBeam.geometry) this.currentBeam.geometry.dispose();
      if (this.currentBeam.material instanceof THREE.Material) {
        this.currentBeam.material.dispose();
      }
      this.currentBeam = null;
    }
    if (this.currentFlash) {
      this.scene.remove(this.currentFlash);
      this.currentFlash = null;
    }
    
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
    // Cancel all running animations
    if (this.attackAnimationId !== null) {
      cancelAnimationFrame(this.attackAnimationId);
      this.attackAnimationId = null;
    }
    this.damageAnimationIds.forEach(id => cancelAnimationFrame(id));
    this.damageAnimationIds.clear();
    
    // Clean up any lingering beam/flash
    if (this.currentBeam) {
      this.scene.remove(this.currentBeam);
      if (this.currentBeam.geometry) this.currentBeam.geometry.dispose();
      if (this.currentBeam.material instanceof THREE.Material) {
        this.currentBeam.material.dispose();
      }
      this.currentBeam = null;
    }
    if (this.currentFlash) {
      this.scene.remove(this.currentFlash);
      this.currentFlash = null;
    }
    
    // Clean up any remaining particles or effects
    
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