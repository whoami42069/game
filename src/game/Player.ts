import * as THREE from 'three';
import { TextureManager } from '@/core/TextureManager';
import { GPUParticleSystem } from '@/core/GPUParticleSystem';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  dash: boolean;
}

export class Player {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public health: number = 100;
  public maxHealth: number = 100;
  public energy: number = 100;
  public maxEnergy: number = 100;
  public isDashing: boolean = false;
  public canShoot: boolean = true;
  public isInvulnerable: boolean = false;
  public speedMultiplier: number = 1; // For speed boost items
  public weaponLevel: number = 1; // For weapon upgrades
  public hasShield: boolean = false; // For shield items
  public shieldEndTime: number = 0; // When shield immunity expires
  
  private scene: THREE.Scene;
  private input: PlayerInput;
  // private lastInputDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1); // For future use
  private textureManager: TextureManager;
  
  // Movement constants optimized for responsive combat feel
  private readonly MOVE_SPEED: number = 15;        // Direct movement speed (like original moveSpeed)
  private readonly DASH_SPEED: number = 25;        // Dash speed boost
  private readonly ROTATION_SPEED: number = 3;     // Tank control rotation speed
  
  private dashDuration: number = 0.2;
  private dashCooldown: number = 1;
  private dashTimer: number = 0;
  private baseShootCooldown: number = 0.2;
  private shootCooldown: number = 0.2;
  private shootTimer: number = 0;
  private invulnerabilityDuration: number = 1;
  private invulnerabilityTimer: number = 0;
  private trailMesh: THREE.InstancedMesh | null = null;
  private trailPositions: THREE.Vector3[] = [];
  private trailCount: number = 15;
  
  // Enhanced particle systems for AAA effects
  private leftEngineTrail: GPUParticleSystem | null = null;
  private rightEngineTrail: GPUParticleSystem | null = null;
  
  // Input buffer for frame-perfect controls
  private inputBuffer: Map<string, number> = new Map();
  private readonly INPUT_BUFFER_TIME: number = 200; // 200ms buffer

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(0, 1, 10);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.mesh = new THREE.Group();
    this.textureManager = TextureManager.getInstance();
    
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shoot: false,
      dash: false
    };

    this.createModel();
    this.createOptimizedTrail();
    this.createEngineParticles();
    this.setupInput();
  }

  private createModel(): void {
    // Get AAA-quality ship hull textures
    const hullTextures = this.textureManager.generateMetalHullTexture(512);
    
    // === MAIN FUSELAGE - Angular Space Fighter Design ===
    const fuselageGroup = new THREE.Group();
    
    // Forward nose section - angular design
    const noseGeometry = new THREE.ConeGeometry(0.3, 1.2, 6);
    const noseMaterial = new THREE.MeshPhysicalMaterial({
      map: hullTextures.diffuse,
      normalMap: hullTextures.normal,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: hullTextures.roughness,
      metalnessMap: hullTextures.metalness,
      
      // Enhanced AAA material properties
      metalness: 0.95,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      
      // Glowing blue accents
      // emissive removed - not available on MeshBasicMaterial,
      emissiveIntensity: 0.4,
      
      // IBL support
      envMapIntensity: 1.5,
      
      // Physical properties
      ior: 1.5,
      specularIntensity: 1.2,
      specularColor: new THREE.Color(0x88ccff)
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0, -1.5);
    nose.rotation.x = Math.PI / 2;
    nose.castShadow = true;
    fuselageGroup.add(nose);
    
    // Main body - elongated octahedron for angular look
    const bodyGeometry = new THREE.OctahedronGeometry(0.6, 0);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      map: hullTextures.diffuse,
      normalMap: hullTextures.normal,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: hullTextures.roughness,
      metalnessMap: hullTextures.metalness,
      
      // Enhanced body material
      metalness: 0.9,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      
      // Stronger emissive for main body
      // emissive removed - not available on MeshBasicMaterial,
      emissiveIntensity: 0.5,
      
      // Enhanced reflections
      envMapIntensity: 1.8,
      
      // Transmission for subtle transparency
      ior: 1.5,
      transmission: 0.02,
      thickness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 0.6, 2);
    body.castShadow = true;
    body.receiveShadow = true;
    fuselageGroup.add(body);
    
    // Cockpit canopy - glowing blue
    const cockpitGeometry = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00ccff,
      // emissive removed - not available on MeshBasicMaterial,
      emissiveIntensity: 0.6,
      metalness: 0.1,
      roughness: 0.0,
      transparent: true,
      opacity: 0.7,
      transmission: 0.3
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.3, -0.5);
    fuselageGroup.add(cockpit);
    
    this.mesh.add(fuselageGroup);
    
    // === WING SYSTEM - Variable Geometry ===
    const wingsGroup = new THREE.Group();
    
    // Main wings - swept angular design
    const mainWingShape = new THREE.Shape();
    mainWingShape.moveTo(0, 0);
    mainWingShape.lineTo(2.5, -0.3);
    mainWingShape.lineTo(2.2, 0.8);
    mainWingShape.lineTo(1.8, 1.2);
    mainWingShape.lineTo(0.2, 0.5);
    mainWingShape.closePath();
    
    const wingGeometry = new THREE.ExtrudeGeometry(mainWingShape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02
    });
    
    const wingMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff0066,
      // emissive removed - not available on MeshBasicMaterial,
      emissiveIntensity: 0.4,
      metalness: 0.85,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    
    const leftMainWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftMainWing.position.set(-0.4, 0, 0.3);
    leftMainWing.rotation.set(-Math.PI/2, 0, Math.PI);
    leftMainWing.castShadow = true;
    wingsGroup.add(leftMainWing);
    
    const rightMainWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightMainWing.position.set(0.4, 0, 0.3);
    rightMainWing.rotation.set(-Math.PI/2, 0, 0);
    rightMainWing.castShadow = true;
    wingsGroup.add(rightMainWing);
    
    // Secondary stabilizer wings
    const stabWingShape = new THREE.Shape();
    stabWingShape.moveTo(0, 0);
    stabWingShape.lineTo(1.2, 0);
    stabWingShape.lineTo(1.0, 0.6);
    stabWingShape.lineTo(0.1, 0.4);
    stabWingShape.closePath();
    
    const stabWingGeometry = new THREE.ExtrudeGeometry(stabWingShape, {
      depth: 0.08,
      bevelEnabled: false
    });
    
    const stabWingMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6600cc,
      // emissive removed - not available on MeshBasicMaterial,
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const leftStabWing = new THREE.Mesh(stabWingGeometry, stabWingMaterial);
    leftStabWing.position.set(-0.3, 0, 1.2);
    leftStabWing.rotation.set(-Math.PI/2, 0, Math.PI);
    wingsGroup.add(leftStabWing);
    
    const rightStabWing = new THREE.Mesh(stabWingGeometry, stabWingMaterial);
    rightStabWing.position.set(0.3, 0, 1.2);
    rightStabWing.rotation.set(-Math.PI/2, 0, 0);
    wingsGroup.add(rightStabWing);
    
    this.mesh.add(wingsGroup);
    
    // === ENGINE SYSTEM - Detailed Thrusters ===
    const engineGroup = new THREE.Group();
    
    // Main engine nozzles
    const nozzleGeometry = new THREE.CylinderGeometry(0.25, 0.35, 0.8, 8);
    const nozzleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x333333,
      // emissive removed - not available on MeshBasicMaterial,
      emissiveIntensity: 0.2,
      metalness: 1.0,
      roughness: 0.3
    });
    
    const leftNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    leftNozzle.position.set(-0.6, 0, 1.4);
    leftNozzle.castShadow = true;
    engineGroup.add(leftNozzle);
    
    const rightNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    rightNozzle.position.set(0.6, 0, 1.4);
    rightNozzle.castShadow = true;
    engineGroup.add(rightNozzle);
    
    // Engine core glow effects
    const coreGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const coreGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.9
    });
    
    const leftEngineCore = new THREE.Mesh(coreGeometry, coreGlowMaterial);
    leftEngineCore.position.set(-0.6, 0, 1.6);
    engineGroup.add(leftEngineCore);
    
    const rightEngineCore = new THREE.Mesh(coreGeometry, coreGlowMaterial);
    rightEngineCore.position.set(0.6, 0, 1.6);
    engineGroup.add(rightEngineCore);
    
    // Vernier thrusters
    for (let i = 0; i < 4; i++) {
      const vernierGeometry = new THREE.ConeGeometry(0.08, 0.3, 6);
      const vernierMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.4
      });
      const vernier = new THREE.Mesh(vernierGeometry, vernierMaterial);
      const angle = (i / 4) * Math.PI * 2;
      vernier.position.set(
        Math.cos(angle) * 0.8,
        Math.sin(angle) * 0.3,
        0.8
      );
      vernier.rotation.x = Math.PI / 2;
      engineGroup.add(vernier);
    }
    
    this.mesh.add(engineGroup);
    
    // === WEAPON HARDPOINTS ===
    const weaponGroup = new THREE.Group();
    
    // Beam cannon mounts
    const cannonGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8);
    const cannonMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00aaff,
      // emissive removed - not available on MeshBasicMaterial,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const leftCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    leftCannon.position.set(-1.2, 0, -0.8);
    leftCannon.rotation.x = Math.PI / 2;
    weaponGroup.add(leftCannon);
    
    const rightCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    rightCannon.position.set(1.2, 0, -0.8);
    rightCannon.rotation.x = Math.PI / 2;
    weaponGroup.add(rightCannon);
    
    // Missile pods
    const podGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.8);
    const podMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.3
    });
    
    const leftPod = new THREE.Mesh(podGeometry, podMaterial);
    leftPod.position.set(-0.8, -0.2, 0.5);
    weaponGroup.add(leftPod);
    
    const rightPod = new THREE.Mesh(podGeometry, podMaterial);
    rightPod.position.set(0.8, -0.2, 0.5);
    weaponGroup.add(rightPod);
    
    this.mesh.add(weaponGroup);
    
    // === PANEL LINES AND DETAILS ===
    const detailGroup = new THREE.Group();
    
    // Panel lines
    for (let i = 0; i < 6; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.02, 0.01, 1.5);
      const lineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.7
      });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set((i - 2.5) * 0.2, 0.31, 0);
      detailGroup.add(line);
    }
    
    // Warning stripes
    for (let i = 0; i < 3; i++) {
      const stripeGeometry = new THREE.BoxGeometry(0.05, 0.01, 0.2);
      const stripeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,
        // emissive removed - not available on MeshBasicMaterial
        // emissiveIntensity: 0.3
      });
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.set(0, 0.32, 0.5 + i * 0.3);
      detailGroup.add(stripe);
    }
    
    this.mesh.add(detailGroup);
    
    // === LIGHTING SYSTEM ===
    // Main illumination
    const mainLight = new THREE.PointLight(0x00ccff, 3, 12);
    mainLight.position.set(0, 0, 0);
    this.mesh.add(mainLight);
    
    // Engine lights
    const engineLight1 = new THREE.PointLight(0x00ffaa, 1.5, 8);
    engineLight1.position.set(-0.6, 0, 1.6);
    this.mesh.add(engineLight1);
    
    const engineLight2 = new THREE.PointLight(0x00ffaa, 1.5, 8);
    engineLight2.position.set(0.6, 0, 1.6);
    this.mesh.add(engineLight2);
    
    // Navigation lights
    const navLight1 = new THREE.PointLight(0xff0044, 0.8, 4);
    navLight1.position.set(-2.0, 0, 0.5);
    this.mesh.add(navLight1);
    
    const navLight2 = new THREE.PointLight(0x00ff44, 0.8, 4);
    navLight2.position.set(2.0, 0, 0.5);
    this.mesh.add(navLight2);
    
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  private createOptimizedTrail(): void {
    // Use instanced rendering for trail particles
    const geometry = new THREE.SphereGeometry(0.15, 4, 4);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.trailMesh = new THREE.InstancedMesh(geometry, material, this.trailCount);
    this.trailMesh.count = 0; // Start with no visible instances
    
    // Initialize trail positions
    for (let i = 0; i < this.trailCount; i++) {
      this.trailPositions.push(new THREE.Vector3());
    }
    
    this.scene.add(this.trailMesh);
  }

  private createEngineParticles(): void {
    // Create left engine particle trail
    this.leftEngineTrail = new GPUParticleSystem(this.scene, {
      maxParticles: 300,
      particleSize: 0.4,
      particleLifetime: 1.2,
      emissionRate: 120,
      spread: 0.3,
      velocity: new THREE.Vector3(0, 0, 8),
      acceleration: new THREE.Vector3(0, -0.5, 0),
      color: new THREE.Color(0x00ffaa),
      colorVariation: 0.3,
      blending: THREE.AdditiveBlending,
      transparent: true
    }, new THREE.Vector3(-0.6, 0, 1.8));
    
    // Create right engine particle trail
    this.rightEngineTrail = new GPUParticleSystem(this.scene, {
      maxParticles: 300,
      particleSize: 0.4,
      particleLifetime: 1.2,
      emissionRate: 120,
      spread: 0.3,
      velocity: new THREE.Vector3(0, 0, 8),
      acceleration: new THREE.Vector3(0, -0.5, 0),
      color: new THREE.Color(0x00ffaa),
      colorVariation: 0.3,
      blending: THREE.AdditiveBlending,
      transparent: true
    }, new THREE.Vector3(0.6, 0, 1.8));
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      const currentTime = Date.now();
      
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.input.forward = true;
          this.inputBuffer.set('forward', currentTime);
          break;
        case 's':
        case 'arrowdown':
          this.input.backward = true;
          this.inputBuffer.set('backward', currentTime);
          break;
        case 'a':
        case 'arrowleft':
          this.input.left = true;
          this.inputBuffer.set('left', currentTime);
          break;
        case 'd':
        case 'arrowright':
          this.input.right = true;
          this.inputBuffer.set('right', currentTime);
          break;
        case ' ':
          this.input.shoot = true;
          this.inputBuffer.set('shoot', currentTime);
          break;
        case 'shift':
          this.input.dash = true;
          this.inputBuffer.set('dash', currentTime);
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.input.forward = false;
          this.inputBuffer.delete('forward');
          break;
        case 's':
        case 'arrowdown':
          this.input.backward = false;
          this.inputBuffer.delete('backward');
          break;
        case 'a':
        case 'arrowleft':
          this.input.left = false;
          this.inputBuffer.delete('left');
          break;
        case 'd':
        case 'arrowright':
          this.input.right = false;
          this.inputBuffer.delete('right');
          break;
        case ' ':
          this.input.shoot = false;
          this.inputBuffer.delete('shoot');
          break;
        case 'shift':
          this.input.dash = false;
          this.inputBuffer.delete('dash');
          break;
      }
    });
  }

  private processInputBuffer(): PlayerInput {
    const currentTime = Date.now();
    const bufferedInput = { ...this.input };
    
    // Check buffered inputs and apply if within buffer time
    for (const [action, timestamp] of this.inputBuffer.entries()) {
      if (currentTime - timestamp <= this.INPUT_BUFFER_TIME) {
        switch (action) {
          case 'forward':
            bufferedInput.forward = true;
            break;
          case 'backward':
            bufferedInput.backward = true;
            break;
          case 'left':
            bufferedInput.left = true;
            break;
          case 'right':
            bufferedInput.right = true;
            break;
          case 'shoot':
            bufferedInput.shoot = true;
            break;
          case 'dash':
            bufferedInput.dash = true;
            break;
        }
      } else {
        // Remove expired buffer entries
        this.inputBuffer.delete(action);
      }
    }
    
    return bufferedInput;
  }

  public update(deltaTime: number, bounds: { min: THREE.Vector3, max: THREE.Vector3 }, _camera?: THREE.Camera): void {
    // Update timers
    if (this.shootTimer > 0) {
      this.shootTimer -= deltaTime;
      this.canShoot = this.shootTimer <= 0;
    }
    
    if (this.dashTimer > 0) {
      this.dashTimer -= deltaTime;
      if (this.dashTimer <= this.dashCooldown - this.dashDuration) {
        this.isDashing = false;
      }
    }
    
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= deltaTime;
      this.isInvulnerable = this.invulnerabilityTimer > 0;
      
      // Flash effect when invulnerable
      if (this.mesh.children[0] instanceof THREE.Mesh) {
        const material = this.mesh.children[0].material as THREE.MeshPhysicalMaterial;
        material.opacity = this.isInvulnerable ? 0.5 + Math.sin(this.invulnerabilityTimer * 20) * 0.3 : 1;
      }
    }
    
    // Process input with buffer for frame-perfect controls
    const bufferedInput = this.processInputBuffer();
    
    // Witcher-style tank controls
    // A/D rotate the character, W/S move forward/backward
    
    // Handle rotation with A/D keys
    if (bufferedInput.left) {
      this.mesh.rotation.y += this.ROTATION_SPEED * deltaTime;
    }
    if (bufferedInput.right) {
      this.mesh.rotation.y -= this.ROTATION_SPEED * deltaTime;
    }
    
    // Calculate movement based on character's facing direction
    const moveSpeed = (this.isDashing ? this.DASH_SPEED : this.MOVE_SPEED) * this.speedMultiplier;
    
    // Get character's forward direction from their rotation
    const forward = new THREE.Vector3(
      Math.sin(this.mesh.rotation.y),
      0,
      Math.cos(this.mesh.rotation.y)
    );
    
    // W/S move forward/backward in the direction character is facing
    const moveDirection = new THREE.Vector3();
    if (bufferedInput.forward) {
      moveDirection.copy(forward);
    } else if (bufferedInput.backward) {
      moveDirection.copy(forward).negate();
    }
    
    if (moveDirection.length() > 0) {
      // this.lastInputDirection = moveDirection.clone(); // For future use
      this.velocity = moveDirection.multiplyScalar(moveSpeed);
    } else {
      this.velocity.set(0, 0, 0);
    }
    
    // Handle dash
    if (bufferedInput.dash && this.dashTimer <= 0 && this.energy >= 20) {
      this.isDashing = true;
      this.dashTimer = this.dashCooldown;
      this.energy -= 20;
      
      // Create dash effect
      this.createDashEffect();
    }
    
    // Apply velocity
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Keep within bounds
    this.position.x = Math.max(bounds.min.x, Math.min(bounds.max.x, this.position.x));
    this.position.z = Math.max(bounds.min.z, Math.min(bounds.max.z, this.position.z));
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Rotation is now handled by tank controls (A/D keys)
    
    // Update trail
    this.updateTrail();
    
    // Update engine particle systems
    this.updateEngineParticles(deltaTime);
    
    // Regenerate energy
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + deltaTime * 10);
    }
  }

  private updateTrail(): void {
    // Only update trail if moving for better performance
    if (this.trailMesh && this.velocity.length() > 0.5) {
      // Shift trail positions
      for (let i = this.trailPositions.length - 1; i > 0; i--) {
        this.trailPositions[i].copy(this.trailPositions[i - 1]);
      }
      this.trailPositions[0].copy(this.position);
      
      // Update instanced mesh
      const matrix = new THREE.Matrix4();
      const scale = new THREE.Vector3();
      
      for (let i = 0; i < this.trailCount; i++) {
        const opacity = 1 - (i / this.trailCount);
        const scaleValue = 1 - (i / this.trailCount) * 0.7;
        
        scale.setScalar(scaleValue);
        matrix.compose(this.trailPositions[i], new THREE.Quaternion(), scale);
        this.trailMesh.setMatrixAt(i, matrix);
        
        // Set color with opacity
        const color = new THREE.Color(0x00ffff);
        color.multiplyScalar(opacity);
        this.trailMesh.setColorAt(i, color);
      }
      
      this.trailMesh.count = this.trailCount;
      this.trailMesh.instanceMatrix.needsUpdate = true;
      if (this.trailMesh.instanceColor) {
        this.trailMesh.instanceColor.needsUpdate = true;
      }
    } else if (this.trailMesh) {
      // Hide trail when not moving
      this.trailMesh.count = 0;
    }
  }

  private updateEngineParticles(deltaTime: number): void {
    const isMoving = this.velocity.length() > 0.1;
    const throttle = Math.min(this.velocity.length() / this.MOVE_SPEED, 1.0);
    
    if (this.leftEngineTrail) {
      // Position relative to ship
      const leftEnginePos = this.position.clone();
      leftEnginePos.add(new THREE.Vector3(
        Math.cos(this.mesh.rotation.y + Math.PI/2) * 0.6,
        0,
        Math.sin(this.mesh.rotation.y + Math.PI/2) * 0.6
      ));
      leftEnginePos.y += 0.2; // Slightly above ship
      leftEnginePos.add(new THREE.Vector3(
        -Math.sin(this.mesh.rotation.y) * 1.8,
        0,
        -Math.cos(this.mesh.rotation.y) * 1.8
      )); // Behind the ship
      
      this.leftEngineTrail.setPosition(leftEnginePos);
      this.leftEngineTrail.setEmissionRate(isMoving ? 120 * throttle : 10);
      this.leftEngineTrail.setSizeFactor(0.5 + throttle * 0.8);
      this.leftEngineTrail.update(deltaTime, this.position);
    }
    
    if (this.rightEngineTrail) {
      // Position relative to ship
      const rightEnginePos = this.position.clone();
      rightEnginePos.add(new THREE.Vector3(
        Math.cos(this.mesh.rotation.y - Math.PI/2) * 0.6,
        0,
        Math.sin(this.mesh.rotation.y - Math.PI/2) * 0.6
      ));
      rightEnginePos.y += 0.2; // Slightly above ship
      rightEnginePos.add(new THREE.Vector3(
        -Math.sin(this.mesh.rotation.y) * 1.8,
        0,
        -Math.cos(this.mesh.rotation.y) * 1.8
      )); // Behind the ship
      
      this.rightEngineTrail.setPosition(rightEnginePos);
      this.rightEngineTrail.setEmissionRate(isMoving ? 120 * throttle : 10);
      this.rightEngineTrail.setSizeFactor(0.5 + throttle * 0.8);
      this.rightEngineTrail.update(deltaTime, this.position);
    }
  }

  private createDashEffect(): void {
    // Create expanding ring effect
    const geometry = new THREE.RingGeometry(0.5, 2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(this.position);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    
    // Animate and remove
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 0.5) {
        ring.scale.setScalar(1 + elapsed * 4);
        material.opacity = 0.8 * (1 - elapsed * 2);
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(ring);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  public shoot(): THREE.Mesh[] | null {
    const bufferedInput = this.processInputBuffer();
    if (!this.canShoot || !bufferedInput.shoot || this.energy < 5) return null;
    
    this.canShoot = false;
    // Apply weapon level to fire rate
    this.shootCooldown = this.baseShootCooldown / (1 + (this.weaponLevel - 1) * 0.2);
    this.shootTimer = this.shootCooldown;
    this.energy -= 5;
    
    // Always shoot in the direction the ship is facing (not input direction)
    const shootDirection = new THREE.Vector3(
      Math.sin(this.mesh.rotation.y),
      0,
      Math.cos(this.mesh.rotation.y)
    );
    
    // Create projectiles
    const projectiles: THREE.Mesh[] = [];
    
    // Create two projectiles (dual cannons)
    const offsets = [-0.3, 0.3];
    offsets.forEach(offset => {
      // Create projectile mesh
      const geometry = new THREE.ConeGeometry(0.2, 0.8, 6);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.9
      });
      const projectile = new THREE.Mesh(geometry, material);
      
      // Reset projectile properties
      projectile.position.copy(this.position);
      
      // Offset perpendicular to shooting direction for dual cannons
      const perpendicular = new THREE.Vector3(-shootDirection.z, 0, shootDirection.x).normalize();
      projectile.position.add(perpendicular.multiplyScalar(offset));
      
      // Offset forward in shoot direction
      projectile.position.add(shootDirection.clone().multiplyScalar(1.5));
      
      // Rotate projectile to match direction
      if (shootDirection.length() > 0) {
        projectile.lookAt(projectile.position.clone().add(shootDirection));
        projectile.rotateX(Math.PI / 2);
      }
      
      
      // Set velocity in the exact direction we're moving/facing
      // Apply weapon level to damage
      projectile.userData = {
        velocity: shootDirection.clone().multiplyScalar(40), // Faster bullets
        damage: 10 * this.weaponLevel, // Scale damage with weapon level
        owner: 'player'
      };
      
      projectiles.push(projectile);
      this.scene.add(projectile);
    });
    
    return projectiles;
  }

  public takeDamage(amount: number): void {
    if (this.isInvulnerable) return;
    
    // Shield provides complete immunity for its duration
    if (this.hasShield && Date.now() < this.shieldEndTime) {
      // Shield is active - no damage taken
      return;
    } else if (this.hasShield && Date.now() >= this.shieldEndTime) {
      // Shield expired
      this.hasShield = false;
      this.createShieldBreakEffect();
    }
    
    this.health = Math.max(0, this.health - amount);
    this.invulnerabilityTimer = this.invulnerabilityDuration;
    this.isInvulnerable = true;
    
    // Create damage effect
    this.createDamageEffect();
  }

  private createDamageEffect(): void {
    // Flash red
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(3, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5
      })
    );
    flash.position.copy(this.position);
    this.scene.add(flash);
    
    // Animate and remove
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 0.3) {
        (flash.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - elapsed * 3.33);
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(flash);
        flash.geometry.dispose();
        (flash.material as THREE.Material).dispose();
      }
    };
    animate();
  }
  
  private createShieldBreakEffect(): void {
    // Shield break visual effect
    const shieldGeometry = new THREE.SphereGeometry(3, 16, 16);
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      wireframe: true
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.copy(this.position);
    this.scene.add(shield);
    
    // Animate shield breaking
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 0.5) {
        shield.scale.setScalar(1 + elapsed * 2);
        shieldMaterial.opacity = 0.6 * (1 - elapsed * 2);
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(shield);
        shieldGeometry.dispose();
        shieldMaterial.dispose();
      }
    };
    animate();
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    
    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.dispose();
    }
    
    // Dispose particle systems
    if (this.leftEngineTrail) {
      this.leftEngineTrail.dispose();
      this.leftEngineTrail = null;
    }
    
    if (this.rightEngineTrail) {
      this.rightEngineTrail.dispose();
      this.rightEngineTrail = null;
    }
  }
}