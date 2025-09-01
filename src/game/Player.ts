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
  private dynamicLights: any;
  
  // Movement constants optimized for ultra-responsive combat feel
  private readonly MOVE_SPEED: number = 18;        // Increased base speed for snappier movement
  private readonly DASH_SPEED: number = 42;        // Increased dash speed for instant response
  private readonly ROTATION_SPEED: number = 4.5;   // Faster rotation for responsive turning
  
  // Frame-perfect timing constants
  private readonly COYOTE_TIME_FRAMES: number = 4;   // 4 frame coyote time
  
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
  
  // Enhanced input buffer for frame-perfect controls
  private inputBuffer: Map<string, number> = new Map();
  private readonly INPUT_BUFFER_TIME: number = 100; // Reduced to 100ms for more responsive feel
  private lastFrameInputs: Map<string, boolean> = new Map();
  private inputQueue: Array<{action: string, timestamp: number}> = [];
  
  // Movement interpolation for smooth visuals during frame drops
  private previousPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private smoothingFactor: number = 0.8; // Higher = more responsive
  
  // Memory management
  private eventListeners: Array<{ target: EventTarget, type: string, listener: EventListener }> = [];
  private timers: Set<number> = new Set();
  private animationFrames: Set<number> = new Set();

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
    // Get battle-damaged AAA-quality ship hull textures for Skyrim-like weathered look
    const hullTextures = this.textureManager.generateBattleDamagedHullTexture(512, 0.4);
    
    // === MAIN FUSELAGE - Angular Space Fighter Design ===
    const fuselageGroup = new THREE.Group();
    
    // Forward nose section - angular design
    const noseGeometry = new THREE.ConeGeometry(0.3, 1.2, 6);
    const noseMaterial = new THREE.MeshPhysicalMaterial({
      map: hullTextures.diffuse,
      normalMap: hullTextures.normal,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughnessMap: hullTextures.roughness,
      metalnessMap: hullTextures.metalness,
      aoMap: hullTextures.ao,
      emissiveMap: hullTextures.emissive,
      
      // Enhanced Skyrim-style weathered metal properties
      metalness: 0.92,
      roughness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      
      // Glowing energy accents
      emissive: new THREE.Color(0x002244),
      emissiveIntensity: 0.5,
      
      // Enhanced environment reflections
      envMapIntensity: 2.0,
      
      // Physical properties for realistic lighting
      ior: 1.5,
      specularIntensity: 1.4,
      specularColor: new THREE.Color(0x88ccff),
      
      // Subtle transmission for damaged areas
      transmission: 0.02,
      thickness: 0.1,
      attenuationColor: new THREE.Color(0x002244),
      attenuationDistance: 0.5,
      
      // Sheen for worn metal look
      sheen: 0.3,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(0x444466)
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
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughnessMap: hullTextures.roughness,
      metalnessMap: hullTextures.metalness,
      aoMap: hullTextures.ao,
      emissiveMap: hullTextures.emissive,
      
      // Enhanced weathered body material
      metalness: 0.88,
      roughness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      
      // Stronger emissive for main body energy systems
      emissive: new THREE.Color(0x003366),
      emissiveIntensity: 0.6,
      
      // Enhanced reflections for cinematic look
      envMapIntensity: 2.2,
      
      // Physical properties
      ior: 1.45,
      transmission: 0.03,
      thickness: 0.15,
      attenuationColor: new THREE.Color(0x001133),
      attenuationDistance: 0.8,
      
      // Battle-worn sheen
      sheen: 0.4,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color(0x666688)
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
      emissive: new THREE.Color(0x0088ff),
      emissiveIntensity: 0.8,
      metalness: 0.0,
      roughness: 0.0,
      transparent: true,
      opacity: 0.6,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.8,
      attenuationColor: new THREE.Color(0x0066cc),
      attenuationDistance: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 3.0,
      specularIntensity: 2.0,
      specularColor: new THREE.Color(0x00ffff)
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
    
    // Get damaged wing textures
    const wingTextures = this.textureManager.generateBattleDamagedHullTexture(256, 0.6);
    
    const wingMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff0066,
      map: wingTextures.diffuse,
      normalMap: wingTextures.normal,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: wingTextures.roughness,
      metalnessMap: wingTextures.metalness,
      emissive: new THREE.Color(0x660033),
      emissiveIntensity: 0.5,
      emissiveMap: wingTextures.emissive,
      metalness: 0.85,
      roughness: 0.25,
      transparent: true,
      opacity: 0.95,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.8,
      sheen: 0.5,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color(0xff6688)
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
      map: wingTextures.diffuse,
      normalMap: wingTextures.normal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: wingTextures.roughness,
      emissive: new THREE.Color(0x330066),
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.15,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.5
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
    // Get heat-damaged engine textures
    const engineTextures = this.textureManager.generateBattleDamagedHullTexture(256, 0.8);
    
    const nozzleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x333333,
      map: engineTextures.diffuse,
      normalMap: engineTextures.normal,
      normalScale: new THREE.Vector2(2.0, 2.0),
      roughnessMap: engineTextures.roughness,
      metalnessMap: engineTextures.metalness,
      aoMap: engineTextures.ao,
      emissive: new THREE.Color(0x110000),
      emissiveIntensity: 0.3,
      metalness: 0.95,
      roughness: 0.4,
      clearcoat: 0.2,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.8
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
      emissive: new THREE.Color(0x0066cc),
      emissiveIntensity: 0.7,
      metalness: 0.95,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 2.5,
      specularIntensity: 2.0,
      specularColor: new THREE.Color(0x00ffff)
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
    
    // === ENHANCED LIGHTING SYSTEM FOR SKYRIM-STYLE ATMOSPHERE ===
    // Main illumination with dynamic intensity
    const mainLight = new THREE.PointLight(0x00ccff, 4, 15);
    mainLight.position.set(0, 0, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.setScalar(1024);
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 20;
    mainLight.decay = 2;
    this.mesh.add(mainLight);
    
    // Engine lights with volumetric glow
    const engineLight1 = new THREE.PointLight(0x00ffaa, 3, 12);
    engineLight1.position.set(-0.6, 0, 1.6);
    engineLight1.castShadow = true;
    engineLight1.shadow.mapSize.setScalar(512);
    engineLight1.decay = 2;
    this.mesh.add(engineLight1);
    
    const engineLight2 = new THREE.PointLight(0x00ffaa, 3, 12);
    engineLight2.position.set(0.6, 0, 1.6);
    engineLight2.castShadow = true;
    engineLight2.shadow.mapSize.setScalar(512);
    engineLight2.decay = 2;
    this.mesh.add(engineLight2);
    
    // Enhanced navigation lights
    const navLight1 = new THREE.PointLight(0xff0044, 1.5, 6);
    navLight1.position.set(-2.0, 0, 0.5);
    navLight1.decay = 2;
    this.mesh.add(navLight1);
    
    const navLight2 = new THREE.PointLight(0x00ff44, 1.5, 6);
    navLight2.position.set(2.0, 0, 0.5);
    navLight2.decay = 2;
    this.mesh.add(navLight2);
    
    // Add spotlight for dramatic effect
    const spotLight = new THREE.SpotLight(0x0088ff, 2, 20, Math.PI / 6, 0.5, 2);
    spotLight.position.set(0, 2, -2);
    spotLight.target.position.set(0, 0, 2);
    this.mesh.add(spotLight);
    this.mesh.add(spotLight.target);
    
    // Store light references for dynamic updates
    this.dynamicLights = {
      main: mainLight,
      engine1: engineLight1,
      engine2: engineLight2,
      nav1: navLight1,
      nav2: navLight2,
      spot: spotLight
    };
    
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
    // Input is now handled by the centralized InputManager
    // This method is kept for backwards compatibility but does nothing
    console.log('Player input setup - delegated to InputManager');
  }

  private processEnhancedInputBuffer(_deltaTime: number): PlayerInput {
    const currentTime = performance.now();
    const bufferedInput = { ...this.input };
    
    // Process input queue for frame-perfect timing
    this.inputQueue = this.inputQueue.filter(entry => {
      const age = currentTime - entry.timestamp;
      if (age <= this.INPUT_BUFFER_TIME) {
        // Apply buffered input
        switch (entry.action) {
          case 'forward': bufferedInput.forward = true; break;
          case 'backward': bufferedInput.backward = true; break;
          case 'left': bufferedInput.left = true; break;
          case 'right': bufferedInput.right = true; break;
          case 'shoot': bufferedInput.shoot = true; break;
          case 'dash': bufferedInput.dash = true; break;
        }
        return true; // Keep in queue
      }
      return false; // Remove expired
    });
    
    // Enhanced responsiveness: Check for input prediction
    // If we had input last frame but not this frame, provide coyote time
    const coyoteTimeMs = (this.COYOTE_TIME_FRAMES / 60) * 1000;
    
    for (const [action, hadInput] of this.lastFrameInputs.entries()) {
      if (hadInput && !this.getCurrentInput(action)) {
        const bufferEntry = this.inputBuffer.get(action);
        if (bufferEntry && currentTime - bufferEntry <= coyoteTimeMs) {
          switch (action) {
            case 'forward': bufferedInput.forward = true; break;
            case 'backward': bufferedInput.backward = true; break;
            case 'left': bufferedInput.left = true; break;
            case 'right': bufferedInput.right = true; break;
          }
        }
      }
    }
    
    // Store current frame inputs for next frame prediction
    this.lastFrameInputs.set('forward', bufferedInput.forward);
    this.lastFrameInputs.set('backward', bufferedInput.backward);
    this.lastFrameInputs.set('left', bufferedInput.left);
    this.lastFrameInputs.set('right', bufferedInput.right);
    
    return bufferedInput;
  }
  
  private getCurrentInput(action: string): boolean {
    switch (action) {
      case 'forward': return this.input.forward;
      case 'backward': return this.input.backward;
      case 'left': return this.input.left;
      case 'right': return this.input.right;
      case 'shoot': return this.input.shoot;
      case 'dash': return this.input.dash;
      default: return false;
    }
  }

  public update(deltaTime: number, bounds: { min: THREE.Vector3, max: THREE.Vector3 }, _camera?: THREE.Camera, inputManager?: any): void {
    // Store previous position for interpolation
    this.previousPosition.copy(this.position);
    // Update dynamic lighting based on ship state
    this.updateDynamicLighting();
    
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
    
    // Get input from InputManager if provided, otherwise fall back to internal input
    let bufferedInput;
    if (inputManager) {
      bufferedInput = {
        forward: inputManager.isKeyPressed('KeyW') || inputManager.isKeyPressed('ArrowUp'),
        backward: inputManager.isKeyPressed('KeyS') || inputManager.isKeyPressed('ArrowDown'),
        left: inputManager.isKeyPressed('KeyA') || inputManager.isKeyPressed('ArrowLeft'),
        right: inputManager.isKeyPressed('KeyD') || inputManager.isKeyPressed('ArrowRight'),
        shoot: inputManager.isKeyPressed('Space'),
        dash: inputManager.isKeyPressed('ShiftLeft') || inputManager.isKeyPressed('ShiftRight')
      };
    } else {
      bufferedInput = this.processEnhancedInputBuffer(deltaTime);
    }
    
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
    
    // Keep within circular bounds
    const radius = (bounds as any).radius;
    if (radius) {
      // Check distance from center (0, y, 0)
      const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
      if (distanceFromCenter > radius) {
        // Push player back inside the circle
        const angle = Math.atan2(this.position.z, this.position.x);
        this.position.x = Math.cos(angle) * radius;
        this.position.z = Math.sin(angle) * radius;
      }
    } else {
      // Fallback to rectangular bounds if radius not provided
      this.position.x = Math.max(bounds.min.x, Math.min(bounds.max.x, this.position.x));
      this.position.z = Math.max(bounds.min.z, Math.min(bounds.max.z, this.position.z));
    }
    
    // Smooth position interpolation for consistent visuals
    this.targetPosition.copy(this.position);
    
    // Apply position with smoothing for frame drops
    if (deltaTime > 0.025) { // If frame time > 25ms (40fps), use interpolation
      this.mesh.position.lerpVectors(this.previousPosition, this.targetPosition, this.smoothingFactor);
    } else {
      this.mesh.position.copy(this.position);
    }
    
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
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.add(frameId);
      } else {
        this.scene.remove(ring);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  public shoot(inputManager?: any): THREE.Mesh[] | null {
    // Check if we should shoot based on input
    let shouldShoot = false;
    if (inputManager) {
      shouldShoot = inputManager.isKeyPressed('Space') || inputManager.wasKeyPressedRecently('Space', 50);
    } else {
      const bufferedInput = this.processEnhancedInputBuffer(0);
      shouldShoot = bufferedInput.shoot;
    }
    
    if (!this.canShoot || !shouldShoot || this.energy < 5) return null;
    
    this.canShoot = false;
    // Apply weapon level to fire rate for responsive shooting
    this.shootCooldown = this.baseShootCooldown / (1 + (this.weaponLevel - 1) * 0.25);
    this.shootTimer = this.shootCooldown;
    this.energy -= 5;
    
    // Instant visual feedback - create muzzle flash IMMEDIATELY
    this.createInstantMuzzleFlash();
    
    // Instant screen flash for tactile combat feedback
    this.createCombatScreenFlash();
    
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
      // Create enhanced projectile with instant feedback
      const geometry = new THREE.ConeGeometry(0.25, 1.0, 8); // Slightly larger and more detailed
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1.0 // Full opacity for visibility
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
      
      
      // Enhanced projectile properties for responsive combat
      projectile.userData = {
        velocity: shootDirection.clone().multiplyScalar(55), // Much faster bullets for instant hit feel
        damage: 10 * this.weaponLevel,
        owner: 'player',
        spawnTime: performance.now()
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
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.add(frameId);
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
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.add(frameId);
      } else {
        this.scene.remove(shield);
        shieldGeometry.dispose();
        shieldMaterial.dispose();
      }
    };
    animate();
  }

  private updateDynamicLighting(): void {
    if (!this.dynamicLights) return;
    
    // Main light intensity based on health and speed
    const healthFactor = this.health / this.maxHealth;
    const speedFactor = Math.min(this.velocity.length() / this.MOVE_SPEED, 1.0);
    
    this.dynamicLights.main.intensity = 3 + speedFactor * 2 + (1 - healthFactor) * 1;
    
    // Color shift based on damage
    const damageColor = new THREE.Color().lerpColors(
      new THREE.Color(0x00ccff),
      new THREE.Color(0xff4400),
      1 - healthFactor
    );
    this.dynamicLights.main.color = damageColor;
    
    // Engine lights pulse with movement
    const engineIntensity = 2 + speedFactor * 3 + Math.sin(Date.now() * 0.003) * 0.5;
    this.dynamicLights.engine1.intensity = engineIntensity;
    this.dynamicLights.engine2.intensity = engineIntensity;
    
    // Navigation lights blink when damaged
    if (healthFactor < 0.3) {
      const blink = Math.sin(Date.now() * 0.01) > 0;
      this.dynamicLights.nav1.intensity = blink ? 2 : 0.5;
      this.dynamicLights.nav2.intensity = blink ? 2 : 0.5;
    }
  }
  
  public dispose(): void {
    // Clear all tracked timers
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    // Clear all tracked animation frames
    for (const frameId of this.animationFrames) {
      cancelAnimationFrame(frameId);
    }
    this.animationFrames.clear();
    
    // Remove all event listeners
    for (const { target, type, listener } of this.eventListeners) {
      target.removeEventListener(type, listener);
    }
    this.eventListeners.length = 0;
    
    // Clear input buffers
    this.inputBuffer.clear();
    
    // Remove mesh from scene and dispose resources
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.disposeMeshResources(this.mesh);
    }
    
    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.dispose();
      this.trailMesh = null;
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
    
    // Clear arrays
    this.trailPositions.length = 0;
    
    console.log('🧹 Player disposed completely');
  }
  
  private createInstantMuzzleFlash(): void {
    // Create dual muzzle flashes for both cannons
    const offsets = [-0.3, 0.3];
    const shootDirection = new THREE.Vector3(
      Math.sin(this.mesh.rotation.y),
      0,
      Math.cos(this.mesh.rotation.y)
    );
    
    offsets.forEach(offset => {
      const flashGeometry = new THREE.SphereGeometry(0.4, 8, 8);
      const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
      });
      const flash = new THREE.Mesh(flashGeometry, flashMaterial);
      
      // Position at cannon
      flash.position.copy(this.position);
      const perpendicular = new THREE.Vector3(-shootDirection.z, 0, shootDirection.x).normalize();
      flash.position.add(perpendicular.multiplyScalar(offset));
      flash.position.add(shootDirection.clone().multiplyScalar(1.2));
      
      this.scene.add(flash);
      
      // Instant fade animation (no delays)
      let opacity = 0.8;
      const fadeStep = () => {
        opacity -= 0.1;
        flashMaterial.opacity = Math.max(0, opacity);
        if (opacity > 0) {
          requestAnimationFrame(fadeStep);
        } else {
          this.scene.remove(flash);
          flashGeometry.dispose();
          flashMaterial.dispose();
        }
      };
      requestAnimationFrame(fadeStep);
    });
  }
  
  private createCombatScreenFlash(): void {
    // Instant screen flash for combat feedback
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 255, 255, 0.1);
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(flash);
    
    // Remove immediately for instant feedback
    setTimeout(() => {
      flash.remove();
    }, 50);
  }
  
  private disposeMeshResources(mesh: THREE.Object3D): void {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
      if (child instanceof THREE.Light) {
        // Lights don't have geometry/material but we can dispose them
        child.dispose?.();
      }
    });
  }
}