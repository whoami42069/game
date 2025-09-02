import * as THREE from 'three';

export interface ArenaConfig {
  name: string;
  platformSize: number;
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  lighting: {
    ambient: {
      color: number;
      intensity: number;
    };
    directional?: {
      color: number;
      intensity: number;
      position: THREE.Vector3;
      castShadow?: boolean;
    };
    hemisphere?: {
      skyColor: number;
      groundColor: number;
      intensity: number;
    };
  };
  fog?: {
    type: 'linear' | 'exponential';
    color: number;
    density?: number;
    near?: number;
    far?: number;
  };
  environment: {
    skybox: boolean;
    particles: boolean;
    animations: boolean;
  };
}

export abstract class Arena {
  protected scene: THREE.Scene;
  protected config: ArenaConfig;
  protected platform: THREE.Group;
  protected environmentObjects: THREE.Object3D[] = [];
  protected lights: THREE.Light[] = [];
  protected time: number = 0;
  
  // Shared resource pools
  private static geometryPool: Map<string, THREE.BufferGeometry> = new Map();
  private static materialPool: Map<string, THREE.Material> = new Map();
  protected frameCounter: number = 0;

  constructor(scene: THREE.Scene, config: ArenaConfig) {
    this.scene = scene;
    this.config = config;
    this.platform = new THREE.Group();
  }

  /**
   * Initialize the arena - calls all setup methods in order
   */
  public initialize(): void {
    this.setupEnvironment();
    this.setupLighting();
    this.createPlatform();
    this.createHazards();
    this.setupAtmosphere();
    this.finalizeSetup();
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  protected abstract setupEnvironment(): void;
  protected abstract setupLighting(): void;
  protected abstract createHazards(): void;

  /**
   * Common platform creation - can be overridden by subclasses
   */
  protected createPlatform(): void {
    const platformGeometry = new THREE.CylinderGeometry(
      this.config.platformSize,
      this.config.platformSize * 0.8,
      2,
      16
    );

    const platformMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x444444,
      metalness: 0.3,
      roughness: 0.7
    });

    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1;
    platform.receiveShadow = true;
    this.platform.add(platform);

    this.scene.add(this.platform);
  }

  /**
   * Setup atmospheric effects like fog
   */
  protected setupAtmosphere(): void {
    if (this.config.fog) {
      if (this.config.fog.type === 'linear') {
        this.scene.fog = new THREE.Fog(
          this.config.fog.color,
          this.config.fog.near || 50,
          this.config.fog.far || 200
        );
      } else {
        this.scene.fog = new THREE.FogExp2(
          this.config.fog.color,
          this.config.fog.density || 0.01
        );
      }
    }
  }

  /**
   * Final setup after all components are created
   */
  protected finalizeSetup(): void {
    // Override in subclasses for any final setup
  }

  /**
   * Update the arena
   */
  public update(deltaTime: number, isPaused: boolean = false): void {
    if (isPaused) return;
    
    this.time += deltaTime;
    this.frameCounter++;
    this.updateEnvironment(deltaTime);
    this.updateHazards(deltaTime);
  }

  /**
   * Update environment elements - can be overridden
   */
  protected updateEnvironment(_deltaTime: number): void {
    // Default implementation - override in subclasses
  }

  /**
   * Update hazards - can be overridden
   */
  protected updateHazards(_deltaTime: number): void {
    // Default implementation - override in subclasses
  }

  /**
   * Get arena bounds for collision detection
   */
  public getBounds(): { min: THREE.Vector3, max: THREE.Vector3 } {
    return {
      min: this.config.bounds.min.clone(),
      max: this.config.bounds.max.clone()
    };
  }

  /**
   * Get the platform size
   */
  public getPlatformSize(): number {
    return this.config.platformSize;
  }

  /**
   * Get the arena name
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * Add an environment object to be managed by the arena
   */
  protected addEnvironmentObject(object: THREE.Object3D): void {
    this.environmentObjects.push(object);
    this.scene.add(object);
  }

  /**
   * Add a light to be managed by the arena
   */
  protected addLight(light: THREE.Light): void {
    this.lights.push(light);
    this.scene.add(light);
  }

  /**
   * Get or create shared geometry from pool
   */
  protected getSharedGeometry(key: string, creator: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (!Arena.geometryPool.has(key)) {
      Arena.geometryPool.set(key, creator());
    }
    return Arena.geometryPool.get(key)!.clone();
  }

  /**
   * Get or create shared material from pool (cloned for safe modification)
   */
  protected getSharedMaterial(key: string, creator: () => THREE.Material): THREE.Material {
    if (!Arena.materialPool.has(key)) {
      Arena.materialPool.set(key, creator());
    }
    return Arena.materialPool.get(key)!.clone();
  }

  /**
   * Create SKRUMPEY text with customizable theme colors
   */
  protected createSkrumpeyText(options?: {
    primaryColor?: string;
    secondaryColor?: string;
    glowColor?: string;
    shadowColor?: string;
    opacity?: number;
    size?: { width: number; height: number };
    position?: { x?: number; y?: number; z?: number };
  }): void {
    const opts = {
      primaryColor: '#00ffff',
      secondaryColor: '#ff00ff',
      glowColor: '#00ffff',
      shadowColor: '#00ffff',
      opacity: 0.8,
      size: { width: 20, height: 5 },
      position: { x: 0, y: 0.1, z: 0 },
      ...options
    };

    // Create canvas for text texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw SKRUMPEY text
    ctx.font = 'bold 120px Arial';
    ctx.fillStyle = opts.primaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = opts.shadowColor;
    ctx.shadowBlur = 20;
    ctx.fillText('SKRUMPEY', canvas.width / 2, canvas.height / 2);
    
    // Add glow effect
    ctx.strokeStyle = opts.secondaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = opts.glowColor;
    ctx.shadowBlur = 15;
    ctx.strokeText('SKRUMPEY', canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create plane for text
    const textGeometry = this.getSharedGeometry('skrumpey-text-plane', () => 
      new THREE.PlaneGeometry(opts.size.width, opts.size.height)
    );
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: opts.opacity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.rotation.x = -Math.PI / 2;
    textMesh.position.set(opts.position.x || 0, opts.position.y || 0.1, opts.position.z || 0);
    
    this.platform.add(textMesh);
  }

  /**
   * Create standardized particle system
   */
  protected createParticleSystem(config: {
    count: number;
    positionRange: { x: number; y: number; z: number };
    colors: THREE.Color[];
    size: { min: number; max: number };
    material?: {
      size?: number;
      opacity?: number;
      blending?: THREE.Blending;
      sizeAttenuation?: boolean;
    };
  }): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const colors = new Float32Array(config.count * 3);
    const sizes = new Float32Array(config.count);
    
    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      
      // Position particles
      positions[i3] = (Math.random() - 0.5) * config.positionRange.x;
      positions[i3 + 1] = Math.random() * config.positionRange.y;
      positions[i3 + 2] = (Math.random() - 0.5) * config.positionRange.z;
      
      // Assign random color from palette
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Random size
      sizes[i] = config.size.min + Math.random() * (config.size.max - config.size.min);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const materialConfig = {
      size: 1,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      ...config.material
    };
    
    const material = new THREE.PointsMaterial(materialConfig);
    return new THREE.Points(geometry, material);
  }

  /**
   * Standardized particle update with optimized batching
   */
  protected updateParticleSystem(particles: THREE.Points, config: {
    frameSkip?: number;
    batchSize?: number;
    updateFunction: (positions: THREE.BufferAttribute, index: number, time: number) => void;
  }): void {
    const frameSkip = config.frameSkip || 5;
    const batchSize = config.batchSize || 75;
    
    // Skip frames for performance
    if (this.frameCounter % frameSkip !== 0) return;
    
    const positions = particles.geometry.attributes.position as THREE.BufferAttribute;
    const totalParticles = positions.count;
    const startIndex = (Math.floor(this.time * 10) % Math.ceil(totalParticles / batchSize)) * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalParticles);
    
    // Update only a batch of particles per frame
    for (let i = startIndex; i < endIndex; i++) {
      config.updateFunction(positions, i, this.time);
    }
    
    positions.needsUpdate = true;
  }

  /**
   * Create common lighting setup
   */
  protected setupStandardLighting(): void {
    // Hemisphere light for natural ambient lighting
    if (this.config.lighting.hemisphere) {
      const hemisphereLight = new THREE.HemisphereLight(
        this.config.lighting.hemisphere.skyColor,
        this.config.lighting.hemisphere.groundColor,
        this.config.lighting.hemisphere.intensity
      );
      this.addLight(hemisphereLight);
    }
    
    // Basic ambient light
    const ambient = new THREE.AmbientLight(
      this.config.lighting.ambient.color,
      this.config.lighting.ambient.intensity
    );
    this.addLight(ambient);
    
    // Main directional light with shadows
    if (this.config.lighting.directional) {
      const dirLight = new THREE.DirectionalLight(
        this.config.lighting.directional.color,
        this.config.lighting.directional.intensity
      );
      dirLight.position.copy(this.config.lighting.directional.position);
      
      if (this.config.lighting.directional.castShadow) {
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.001;
        dirLight.shadow.normalBias = 0.02;
      }
      
      this.addLight(dirLight);
    }
  }

  /**
   * Dispose of all arena resources
   */
  public dispose(): void {
    // Remove and dispose environment objects
    this.environmentObjects.forEach(obj => {
      this.scene.remove(obj);
      if ('geometry' in obj && obj.geometry) {
        (obj.geometry as THREE.BufferGeometry).dispose();
      }
      if ('material' in obj && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });

    // Remove lights
    this.lights.forEach(light => {
      this.scene.remove(light);
    });

    // Remove platform
    this.scene.remove(this.platform);
    this.platform.traverse((child) => {
      if ('geometry' in child && child.geometry) {
        (child.geometry as THREE.BufferGeometry).dispose();
      }
      if ('material' in child && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          (child.material as THREE.Material).dispose();
        }
      }
    });

    // Clear arrays
    this.environmentObjects.length = 0;
    this.lights.length = 0;

    // Remove fog
    this.scene.fog = null;

    console.log(`✅ Arena "${this.config.name}" disposed`);
  }

  /**
   * Dispose shared resource pools (call when shutting down the game)
   */
  public static disposeSharedResources(): void {
    Arena.geometryPool.forEach(geometry => geometry.dispose());
    Arena.materialPool.forEach(material => material.dispose());
    Arena.geometryPool.clear();
    Arena.materialPool.clear();
    console.log('✅ Arena shared resources disposed');
  }
}