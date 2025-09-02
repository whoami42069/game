import * as THREE from 'three';
import { Arena, ArenaConfig } from '../Arena';
import { TextureManager } from '../../core/TextureManager';
import { BillboardManager } from '../../core/BillboardManager';

export class AsteroidFieldArena extends Arena {
  private asteroids: THREE.Mesh[] = [];
  private movingAsteroids: THREE.Mesh[] = [];
  private asteroidVelocities: THREE.Vector3[] = [];
  private gravityWells: THREE.Group[] = [];
  private meteorShowers: THREE.Points[] = [];
  private meteorParticles: THREE.Group[] = [];
  private dustClouds: THREE.Points[] = [];
  private textureManager: TextureManager;
  private billboardManager: BillboardManager;
  
  // Falling asteroid hazard system
  private fallingAsteroids: THREE.Mesh[] = [];
  private fallingAsteroidTimers: number[] = [];
  private nextAsteroidDropTime: number = 0;
  private asteroidDropMinInterval: number = 15; // 15 seconds minimum
  private asteroidDropMaxInterval: number = 30; // 30 seconds maximum
  private asteroidFallSpeed: number = 60; // Units per second
  private asteroidDamage: number = 80; // Nearly one-shot damage
  private warningIndicators: THREE.Mesh[] = [];
  private playerCollisionCallback?: (damage: number) => void;
  
  // Animation state
  private meteorTimer: number = 0;
  private gravityEffectRadius: number = 25;

  constructor(scene: THREE.Scene) {
    const config: ArenaConfig = {
      name: 'Asteroid Field Arena',
      platformSize: 35,
      bounds: {
        min: new THREE.Vector3(-45, 0, -45),
        max: new THREE.Vector3(45, 40, 45)
      },
      lighting: {
        ambient: {
          color: 0x1a0a0a,
          intensity: 0.2
        },
        hemisphere: {
          skyColor: 0x662200,
          groundColor: 0x331100,
          intensity: 0.4
        },
        directional: {
          color: 0xffaa44,
          intensity: 1.2,
          position: new THREE.Vector3(80, 120, 60),
          castShadow: true
        }
      },
      fog: {
        type: 'linear',
        color: 0x332211,
        near: 20,
        far: 120
      },
      environment: {
        skybox: true,
        particles: true,
        animations: true
      }
    };

    super(scene, config);
    
    this.textureManager = TextureManager.getInstance();
    this.billboardManager = new BillboardManager(scene);
    
    // Initialize the arena
    this.initialize();
    
    // Create billboards after initialization
    this.createBillboards();
  }

  protected setupEnvironment(): void {
    this.createAsteroidFieldSkybox();
    this.createDustClouds();
    this.createDistantStars();
    this.createSpaceFog();
  }

  protected setupLighting(): void {
    // Use standard lighting setup from base class
    this.setupStandardLighting();
    
    // Enhance shadow settings for asteroid field
    const starLight = this.lights.find(light => light instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    if (starLight) {
      starLight.shadow.camera.far = 600;
      starLight.shadow.camera.left = -150;
      starLight.shadow.camera.right = 150;
      starLight.shadow.camera.top = 150;
      starLight.shadow.camera.bottom = -150;
      starLight.shadow.bias = -0.0005;
      starLight.shadow.normalBias = 0.01;
    }
    
    // Asteroid reflection lights
    const redGiantLight = new THREE.PointLight(0xff4422, 0.6, 180);
    redGiantLight.position.set(-120, 40, -180);
    this.addLight(redGiantLight);
    
    const blueStarLight = new THREE.PointLight(0x2244ff, 0.4, 120);
    blueStarLight.position.set(100, 60, 150);
    this.addLight(blueStarLight);
    
    // Platform mining light
    const miningLight = new THREE.PointLight(0xffaa00, 1.8, 60);
    miningLight.position.set(0, 8, 0);
    this.addLight(miningLight);
  }

  protected createPlatform(): void {
    // Create a minimal transparent platform ring for boundaries
    const ringGeometry = new THREE.TorusGeometry(
      this.config.platformSize,
      0.5,
      8,
      32
    );
    
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0;
    ring.rotation.x = -Math.PI / 2;
    this.platform.add(ring);
    
    // Add floating SKRUMPEY text with asteroid field theme
    this.createSkrumpeyText({
      primaryColor: '#ffaa00',
      secondaryColor: '#ff4422',
      glowColor: '#ffaa00',
      opacity: 0.85,
      size: { width: 20, height: 5 }
    });
    
    // Move SKRUMPEY text higher so it floats
    const textMesh = this.platform.children.find(child => 
      child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry
    );
    if (textMesh) {
      textMesh.position.y = 15; // Float above the arena
    }
    
    // Add some floating mining equipment instead of on-platform
    this.addFloatingMiningEquipment();
    
    // Add energy field markers instead of barriers
    this.addEnergyMarkers();
    
    this.scene.add(this.platform);
  }

  protected createHazards(): void {
    this.createStaticAsteroids();
    this.createMovingAsteroids();
    this.createGravityWells();
    this.createMeteorShowers();
    this.initializeFallingAsteroids();
  }

  private createAsteroidFieldSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(450, 24, 16);
    
    // Create asteroid field background texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Warm orange-brown gradient for asteroid field
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#2a1810');
    gradient.addColorStop(0.3, '#1a1008');
    gradient.addColorStop(0.7, '#0a0604');
    gradient.addColorStop(1, '#050302');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    
    // Add distant nebula patches
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ff4422';
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const radius = 20 + Math.random() * 40;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.addEnvironmentObject(sky);
  }

  private createDistantStars(): void {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      
      // Distribute stars in distant sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 200 + Math.random() * 300;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Warm star colors for asteroid field
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        colors[i3] = 1; colors[i3 + 1] = 0.8; colors[i3 + 2] = 0.6; // Orange
      } else if (colorChoice < 0.7) {
        colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 0.9; // White
      } else if (colorChoice < 0.9) {
        colors[i3] = 1; colors[i3 + 1] = 0.6; colors[i3 + 2] = 0.4; // Red
      } else {
        colors[i3] = 0.8; colors[i3 + 1] = 0.9; colors[i3 + 2] = 1; // Blue
      }
      
      sizes[i] = Math.random() * 1.5 + 0.3;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
      size: 0.8,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    const stars = new THREE.Points(geometry, starMaterial);
    this.addEnvironmentObject(stars);
  }

  private createDustClouds(): void {
    const cloudCount = 3;
    
    for (let i = 0; i < cloudCount; i++) {
      // Use standardized particle system with custom positioning
      const centerX = (Math.random() - 0.5) * 200;
      const centerY = Math.random() * 60 + 20;
      const centerZ = (Math.random() - 0.5) * 200;
      
      const dustCloud = this.createParticleSystem({
        count: 400,
        positionRange: { x: 80, y: 40, z: 80 },
        colors: [
          new THREE.Color(0.7, 0.49, 0.28),  // Brown
          new THREE.Color(0.6, 0.42, 0.24),  // Dark brown
          new THREE.Color(0.8, 0.56, 0.32)   // Light brown
        ],
        size: { min: 0.5, max: 2.0 },
        material: {
          size: 0.8,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true
        }
      });
      
      // Position the cloud
      dustCloud.position.set(centerX, centerY, centerZ);
      
      this.dustClouds.push(dustCloud);
      this.addEnvironmentObject(dustCloud);
    }
  }

  private createSpaceFog(): void {
    // Add subtle brownish fog for atmosphere
    if (this.config.fog) {
      this.scene.fog = new THREE.Fog(
        this.config.fog.color,
        this.config.fog.near!,
        this.config.fog.far!
      );
    }
  }

  private createStaticAsteroids(): void {
    const asteroidCount = 20;
    
    for (let i = 0; i < asteroidCount; i++) {
      const size = 3 + Math.random() * 12;
      const detail = Math.floor(Math.random() * 2) + 1;
      const geometry = new THREE.IcosahedronGeometry(size, detail);
      
      // Distort vertices for realistic irregular shape
      const positions = geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const vertex = new THREE.Vector3(
          positions.getX(j),
          positions.getY(j),
          positions.getZ(j)
        );
        vertex.multiplyScalar(1 + Math.random() * 0.4 - 0.2);
        positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
      }
      geometry.computeVertexNormals();
      
      // Get asteroid textures
      const asteroidTextures = this.textureManager.generateAsteroidTexture(256);
      
      const material = new THREE.MeshPhysicalMaterial({
        map: asteroidTextures.diffuse,
        normalMap: asteroidTextures.normal,
        normalScale: new THREE.Vector2(2.0, 2.0),
        roughnessMap: asteroidTextures.roughness,
        metalnessMap: asteroidTextures.metalness,
        
        // Realistic asteroid properties
        metalness: 0.15,
        roughness: 0.95,
        emissive: 0x110a05,
        emissiveIntensity: 0.05,
        envMapIntensity: 0.2
      });
      
      const asteroid = new THREE.Mesh(geometry, material);
      
      // Position static asteroids in a ring around platform
      const angle = (i / asteroidCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 55 + Math.random() * 80;
      asteroid.position.set(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 50 + 15,
        Math.sin(angle) * distance
      );
      
      asteroid.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      asteroid.castShadow = true;
      asteroid.receiveShadow = true;
      
      this.asteroids.push(asteroid);
      this.addEnvironmentObject(asteroid);
    }
  }

  private createMovingAsteroids(): void {
    const movingCount = 8;
    
    for (let i = 0; i < movingCount; i++) {
      const size = 2 + Math.random() * 6;
      const geometry = new THREE.IcosahedronGeometry(size, 1);
      
      // Distort for irregular shape
      const positions = geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const vertex = new THREE.Vector3(
          positions.getX(j),
          positions.getY(j),
          positions.getZ(j)
        );
        vertex.multiplyScalar(1 + Math.random() * 0.3 - 0.15);
        positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
      }
      geometry.computeVertexNormals();
      
      const asteroidTextures = this.textureManager.generateAsteroidTexture(256);
      
      const material = new THREE.MeshPhysicalMaterial({
        map: asteroidTextures.diffuse,
        normalMap: asteroidTextures.normal,
        roughnessMap: asteroidTextures.roughness,
        metalnessMap: asteroidTextures.metalness,
        metalness: 0.1,
        roughness: 0.9,
        emissive: 0x0a0504,
        emissiveIntensity: 0.08
      });
      
      const asteroid = new THREE.Mesh(geometry, material);
      
      // Random starting position
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 60;
      asteroid.position.set(
        Math.cos(angle) * distance,
        Math.random() * 40 + 5,
        Math.sin(angle) * distance
      );
      
      asteroid.castShadow = true;
      asteroid.receiveShadow = true;
      
      // Create random velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20
      );
      
      this.movingAsteroids.push(asteroid);
      this.asteroidVelocities.push(velocity);
      this.addEnvironmentObject(asteroid);
    }
  }

  private createGravityWells(): void {
    const wellCount = 3;
    
    for (let i = 0; i < wellCount; i++) {
      const wellGroup = new THREE.Group();
      
      // Visible gravity well effect
      const wellGeometry = new THREE.SphereGeometry(this.gravityEffectRadius, 16, 12);
      const wellMaterial = new THREE.MeshBasicMaterial({
        color: 0x4422ff,
        transparent: true,
        opacity: 0.1,
        wireframe: true
      });
      const wellSphere = new THREE.Mesh(wellGeometry, wellMaterial);
      wellGroup.add(wellSphere);
      
      // Central core
      const coreGeometry = new THREE.SphereGeometry(2, 8, 6);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x8844ff,
        transparent: true,
        opacity: 0.8
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      wellGroup.add(core);
      
      // Position gravity wells
      const angle = (i / wellCount) * Math.PI * 2;
      const distance = 100 + Math.random() * 50;
      wellGroup.position.set(
        Math.cos(angle) * distance,
        20 + Math.random() * 20,
        Math.sin(angle) * distance
      );
      
      this.gravityWells.push(wellGroup);
      this.addEnvironmentObject(wellGroup);
    }
  }

  private createMeteorShowers(): void {
    const showerCount = 2;
    
    for (let i = 0; i < showerCount; i++) {
      const meteorCount = 150;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(meteorCount * 3);
      const velocities = new Float32Array(meteorCount * 3);
      const colors = new Float32Array(meteorCount * 3);
      
      // Position meteors in a stream
      const streamAngle = (i / showerCount) * Math.PI * 2;
      const streamDirection = new THREE.Vector3(
        Math.cos(streamAngle),
        -0.3,
        Math.sin(streamAngle)
      );
      
      for (let j = 0; j < meteorCount; j++) {
        const j3 = j * 3;
        
        // Starting positions in a line formation
        const lineOffset = j * 5;
        const basePos = new THREE.Vector3(
          streamDirection.x * -200 + streamDirection.z * lineOffset * 0.1,
          60 + Math.random() * 40,
          streamDirection.z * -200 + streamDirection.x * lineOffset * 0.1
        );
        
        positions[j3] = basePos.x + (Math.random() - 0.5) * 10;
        positions[j3 + 1] = basePos.y + (Math.random() - 0.5) * 20;
        positions[j3 + 2] = basePos.z + (Math.random() - 0.5) * 10;
        
        // Velocity in stream direction
        const speed = 15 + Math.random() * 10;
        velocities[j3] = streamDirection.x * speed;
        velocities[j3 + 1] = streamDirection.y * speed;
        velocities[j3 + 2] = streamDirection.z * speed;
        
        // Fiery colors
        colors[j3] = 1;
        colors[j3 + 1] = 0.4 + Math.random() * 0.4;
        colors[j3 + 2] = 0.1 + Math.random() * 0.2;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const meteorMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      const meteorShower = new THREE.Points(geometry, meteorMaterial);
      this.meteorShowers.push(meteorShower);
      this.addEnvironmentObject(meteorShower);
    }
  }

  private addFloatingMiningEquipment(): void {
    // Floating mining drones
    for (let i = 0; i < 3; i++) {
      const droneGroup = new THREE.Group();
      
      // Drone body
      const droneGeometry = new THREE.OctahedronGeometry(2, 0);
      const droneMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffaa00,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xffaa00,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
      });
      const drone = new THREE.Mesh(droneGeometry, droneMaterial);
      droneGroup.add(drone);
      
      // Mining laser
      const laserGeometry = new THREE.CylinderGeometry(0.1, 0.3, 4, 8);
      const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
      });
      const laser = new THREE.Mesh(laserGeometry, laserMaterial);
      laser.position.y = -3;
      droneGroup.add(laser);
      
      const angle = (i / 3) * Math.PI * 2;
      const radius = 25;
      droneGroup.position.set(
        Math.cos(angle) * radius,
        10 + Math.random() * 5,
        Math.sin(angle) * radius
      );
      
      this.platform.add(droneGroup);
    }
  }

  private initializeFallingAsteroids(): void {
    // Schedule the first asteroid drop
    this.scheduleNextAsteroidDrop();
  }

  private scheduleNextAsteroidDrop(): void {
    // Random time between 15-30 seconds
    const interval = this.asteroidDropMinInterval + 
      Math.random() * (this.asteroidDropMaxInterval - this.asteroidDropMinInterval);
    this.nextAsteroidDropTime = this.time + interval;
  }

  private createFallingAsteroid(): void {
    // Create a large, dangerous-looking asteroid
    const size = 8 + Math.random() * 4; // 8-12 units
    const geometry = new THREE.IcosahedronGeometry(size, 2);
    
    // Distort for irregular shape
    const positions = geometry.attributes.position;
    for (let j = 0; j < positions.count; j++) {
      const vertex = new THREE.Vector3(
        positions.getX(j),
        positions.getY(j),
        positions.getZ(j)
      );
      vertex.multiplyScalar(1 + Math.random() * 0.3 - 0.15);
      positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    
    // Make it look menacing with a red-hot glow
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x442211,
      metalness: 0.3,
      roughness: 0.6,
      emissive: 0xff3300,
      emissiveIntensity: 0.5
    });
    
    const asteroid = new THREE.Mesh(geometry, material);
    
    // Random position within the arena bounds
    const x = (Math.random() - 0.5) * 80; // Within platform area
    const z = (Math.random() - 0.5) * 80;
    asteroid.position.set(x, 100, z); // Start high above
    
    // Random rotation
    asteroid.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    asteroid.castShadow = true;
    asteroid.receiveShadow = true;
    
    // Create warning indicator on the ground
    const warningGeometry = new THREE.RingGeometry(size * 0.8, size * 1.2, 32);
    const warningMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const warning = new THREE.Mesh(warningGeometry, warningMaterial);
    warning.position.set(x, 0.1, z);
    warning.rotation.x = -Math.PI / 2;
    
    // Store references
    this.fallingAsteroids.push(asteroid);
    this.fallingAsteroidTimers.push(0);
    this.warningIndicators.push(warning);
    
    // Add to scene
    this.addEnvironmentObject(asteroid);
    this.addEnvironmentObject(warning);
    
    console.log(`⚠️ Falling asteroid spawned at (${x.toFixed(1)}, ${z.toFixed(1)})`);
  }

  private checkFallingAsteroidCollisions(asteroidIndex: number): void {
    const asteroid = this.fallingAsteroids[asteroidIndex];
    if (!asteroid) return;
    
    // Check if asteroid has hit the ground
    if (asteroid.position.y <= 0) {
      // Create impact effect
      this.createImpactEffect(asteroid.position.x, asteroid.position.z);
      
      // Remove the asteroid and its warning
      this.removeFallingAsteroid(asteroidIndex);
      return;
    }
    
    // Check collision with player (assuming player is at origin with some radius)
    // This would need to be connected to the actual player position
    const playerRadius = 2; // Approximate player collision radius
    const asteroidRadius = 10; // Approximate asteroid collision radius
    const collisionDistance = playerRadius + asteroidRadius;
    
    // For now, check collision with origin (where player typically is)
    const distanceToOrigin = Math.sqrt(
      asteroid.position.x * asteroid.position.x + 
      asteroid.position.z * asteroid.position.z
    );
    
    if (asteroid.position.y < 10 && distanceToOrigin < collisionDistance) {
      // Player hit!
      console.log(`💥 Player hit by falling asteroid! ${this.asteroidDamage} damage!`);
      
      // Trigger damage callback if set
      if (this.playerCollisionCallback) {
        this.playerCollisionCallback(this.asteroidDamage);
      }
      
      // Create impact effect and remove asteroid
      this.createImpactEffect(asteroid.position.x, asteroid.position.z);
      this.removeFallingAsteroid(asteroidIndex);
    }
  }

  private createImpactEffect(x: number, z: number): void {
    // Create a particle explosion effect
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start at impact point
      positions[i3] = x;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = z;
      
      // Random outward velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = Math.random() * 20 + 10; // Upward
      velocities[i3 + 2] = Math.sin(angle) * speed;
      
      // Orange/red colors
      colors[i3] = 1;
      colors[i3 + 1] = Math.random() * 0.5;
      colors[i3 + 2] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });
    
    const explosion = new THREE.Points(geometry, material);
    this.addEnvironmentObject(explosion);
    
    // Remove explosion after 2 seconds
    setTimeout(() => {
      // Remove from scene and environmentObjects array
      this.scene.remove(explosion);
      const index = this.environmentObjects.indexOf(explosion);
      if (index > -1) {
        this.environmentObjects.splice(index, 1);
      }
      explosion.geometry.dispose();
      (explosion.material as THREE.Material).dispose();
    }, 2000);
  }

  private removeFallingAsteroid(index: number): void {
    const asteroid = this.fallingAsteroids[index];
    const warning = this.warningIndicators[index];
    
    if (asteroid) {
      // Remove from scene and environmentObjects array
      this.scene.remove(asteroid);
      const index = this.environmentObjects.indexOf(asteroid);
      if (index > -1) {
        this.environmentObjects.splice(index, 1);
      }
      asteroid.geometry.dispose();
      (asteroid.material as THREE.Material).dispose();
    }
    
    if (warning) {
      // Remove from scene and environmentObjects array
      this.scene.remove(warning);
      const index = this.environmentObjects.indexOf(warning);
      if (index > -1) {
        this.environmentObjects.splice(index, 1);
      }
      warning.geometry.dispose();
      (warning.material as THREE.Material).dispose();
    }
    
    // Remove from arrays
    this.fallingAsteroids.splice(index, 1);
    this.fallingAsteroidTimers.splice(index, 1);
    this.warningIndicators.splice(index, 1);
  }

  /**
   * Set a callback for when a falling asteroid hits the player
   */
  public setPlayerCollisionCallback(callback: (damage: number) => void): void {
    this.playerCollisionCallback = callback;
  }

  /**
   * Get the player position for collision detection
   * This should be called by the game to update player position
   */
  public updatePlayerPosition(position: THREE.Vector3): void {
    // Check collisions with current player position
    for (let i = this.fallingAsteroids.length - 1; i >= 0; i--) {
      const asteroid = this.fallingAsteroids[i];
      if (!asteroid) continue;
      
      const playerRadius = 2;
      const asteroidRadius = 10;
      const collisionDistance = playerRadius + asteroidRadius;
      
      const distance = asteroid.position.distanceTo(position);
      
      if (asteroid.position.y < position.y + 5 && distance < collisionDistance) {
        console.log(`💥 Player hit by falling asteroid! ${this.asteroidDamage} damage!`);
        
        if (this.playerCollisionCallback) {
          this.playerCollisionCallback(this.asteroidDamage);
        }
        
        this.createImpactEffect(asteroid.position.x, asteroid.position.z);
        this.removeFallingAsteroid(i);
      }
    }
  }

  private addEnergyMarkers(): void {
    const markerCount = 8;
    
    for (let i = 0; i < markerCount; i++) {
      // Energy field marker
      const markerGroup = new THREE.Group();
      
      // Glowing orb
      const orbGeometry = new THREE.SphereGeometry(0.5, 8, 6);
      const orbMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.8
      });
      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      markerGroup.add(orb);
      
      // Energy beam
      const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 20, 8);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.2
      });
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.y = 10;
      markerGroup.add(beam);
      
      const angle = (i / markerCount) * Math.PI * 2;
      const radius = this.config.platformSize;
      markerGroup.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      
      this.platform.add(markerGroup);
    }
  }

  private createBillboards(): void {
    this.billboardManager.initialize();
    
    // Initial price fetch
    setTimeout(() => {
      this.billboardManager.updateSwitchboardPrice();
    }, 1000);
  }

  protected updateEnvironment(deltaTime: number): void {
    // Update billboard system
    this.billboardManager.update(deltaTime);
    
    // Animate dust clouds using standardized updates
    this.dustClouds.forEach((cloud, index) => {
      cloud.rotation.y += deltaTime * 0.02 * (1 + index * 0.1);
      
      // Use standardized particle update for floating motion
      this.updateParticleSystem(cloud, {
        frameSkip: 5,
        batchSize: 50,
        updateFunction: (positions, i, time) => {
          const y = positions.getY(i);
          positions.setY(i, y + Math.sin(time * 0.5 + i * 0.1) * 0.01);
        }
      });
    });
    
    // Animate gravity wells
    this.gravityWells.forEach((well) => {
      well.rotation.y += deltaTime * 0.5;
      
      // Pulsing effect
      const scale = 1 + Math.sin(this.time * 2) * 0.1;
      well.children[0].scale.setScalar(scale); // Well sphere
      well.children[1].scale.setScalar(1 + Math.sin(this.time * 3) * 0.2); // Core
    });
    
    // Animate floating mining drones
    this.platform.children.forEach((child) => {
      if (child instanceof THREE.Group && child.children.length === 2) {
        // This is a drone group
        child.rotation.y += deltaTime * 0.5;
        child.position.y += Math.sin(this.time * 2 + child.position.x) * deltaTime * 0.5;
        
        // Animate the laser
        const laser = child.children[1];
        if (laser) {
          laser.scale.y = 1 + Math.sin(this.time * 3) * 0.3;
        }
      }
    });
    
    // Animate energy markers
    this.platform.children.forEach((child) => {
      if (child instanceof THREE.Group && child.children.some(c => c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry)) {
        // Energy marker animation
        const orb = child.children[0];
        if (orb) {
          const scale = 1 + Math.sin(this.time * 2) * 0.3;
          orb.scale.setScalar(scale);
        }
      }
    });
  }

  protected updateHazards(deltaTime: number): void {
    // Check if it's time to spawn a new falling asteroid
    if (this.time >= this.nextAsteroidDropTime) {
      this.createFallingAsteroid();
      this.scheduleNextAsteroidDrop();
    }
    
    // Update falling asteroids
    for (let i = this.fallingAsteroids.length - 1; i >= 0; i--) {
      const asteroid = this.fallingAsteroids[i];
      const warning = this.warningIndicators[i];
      
      if (!asteroid) continue;
      
      // Update timer
      this.fallingAsteroidTimers[i] += deltaTime;
      
      // Fall down
      asteroid.position.y -= this.asteroidFallSpeed * deltaTime;
      
      // Rotate while falling
      asteroid.rotation.x += deltaTime * 2;
      asteroid.rotation.z += deltaTime * 1.5;
      
      // Pulse warning indicator
      if (warning) {
        const pulse = Math.sin(this.fallingAsteroidTimers[i] * 8) * 0.3 + 0.5;
        (warning.material as THREE.MeshBasicMaterial).opacity = pulse;
        
        // Scale warning as asteroid gets closer
        const heightFactor = Math.max(0.5, asteroid.position.y / 100);
        warning.scale.setScalar(1 + (1 - heightFactor) * 0.5);
      }
      
      // Check collisions
      this.checkFallingAsteroidCollisions(i);
    }
    
    // Update moving asteroids
    this.movingAsteroids.forEach((asteroid, index) => {
      const velocity = this.asteroidVelocities[index];
      
      // Apply gravity well effects
      this.gravityWells.forEach((well) => {
        const distance = asteroid.position.distanceTo(well.position);
        if (distance < this.gravityEffectRadius) {
          const force = new THREE.Vector3()
            .subVectors(well.position, asteroid.position)
            .normalize()
            .multiplyScalar(200 / (distance * distance + 1));
          velocity.add(force.multiplyScalar(deltaTime));
        }
      });
      
      // Update position
      asteroid.position.add(velocity.clone().multiplyScalar(deltaTime));
      
      // Rotate asteroid
      asteroid.rotation.x += deltaTime * 0.5;
      asteroid.rotation.y += deltaTime * 0.3;
      
      // Boundary checking - respawn if too far
      if (asteroid.position.length() > 200) {
        // Reset to new random position
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 60;
        asteroid.position.set(
          Math.cos(angle) * distance,
          Math.random() * 40 + 5,
          Math.sin(angle) * distance
        );
        
        // Reset velocity
        velocity.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 20
        );
      }
    });
    
    // Update meteor showers
    this.meteorTimer += deltaTime;
    if (this.meteorTimer > 0.1) { // Update every 100ms for performance
      this.meteorTimer = 0;
      
      this.meteorShowers.forEach((shower) => {
        // Use standardized particle update
        this.updateParticleSystem(shower, {
          frameSkip: 5,
          batchSize: 75,
          updateFunction: (positions, i) => {
            const velocities = shower.geometry.attributes.velocity as THREE.BufferAttribute;
            
            // Update position
            positions.setX(i, positions.getX(i) + velocities.getX(i) * 0.1);
            positions.setY(i, positions.getY(i) + velocities.getY(i) * 0.1);
            positions.setZ(i, positions.getZ(i) + velocities.getZ(i) * 0.1);
            
            // Reset if too far
            if (positions.getZ(i) > 200 || positions.getY(i) < -10) {
              positions.setX(i, -200 + Math.random() * 20);
              positions.setY(i, 60 + Math.random() * 40);
              positions.setZ(i, -200 + Math.random() * 20);
            }
          }
        });
      });
    }
    
    // Animate static asteroids (rotation only) - standardized frame skipping
    if (this.frameCounter % 5 === 0) { // Every 5 frames
      this.asteroids.slice(0, 5).forEach((asteroid, i) => {
        asteroid.rotation.x += 0.005 * (1 + i * 0.1);
        asteroid.rotation.y += 0.008 * (1 + i * 0.05);
      });
    }
  }

  /**
   * Get billboard manager for external access
   */
  public getBillboardManager(): BillboardManager {
    return this.billboardManager;
  }

  protected finalizeSetup(): void {
    // Set warm space background
    this.scene.background = new THREE.Color(0x0a0604);
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Dispose billboard manager
    this.billboardManager.dispose();
    
    // Call parent dispose which handles lights, environment objects, and platform
    super.dispose();
    
    // Clear AsteroidFieldArena-specific arrays
    this.asteroids.length = 0;
    this.movingAsteroids.length = 0;
    this.asteroidVelocities.length = 0;
    this.gravityWells.length = 0;
    this.meteorShowers.length = 0;
    this.meteorParticles.length = 0;
    this.dustClouds.length = 0;
    
    // Clear falling asteroid arrays
    this.fallingAsteroids.forEach(asteroid => {
      if (asteroid) {
        // Remove from scene and environmentObjects array
        this.scene.remove(asteroid);
        const index = this.environmentObjects.indexOf(asteroid);
        if (index > -1) {
          this.environmentObjects.splice(index, 1);
        }
        asteroid.geometry.dispose();
        (asteroid.material as THREE.Material).dispose();
      }
    });
    this.warningIndicators.forEach(warning => {
      if (warning) {
        // Remove from scene and environmentObjects array
        this.scene.remove(warning);
        const index = this.environmentObjects.indexOf(warning);
        if (index > -1) {
          this.environmentObjects.splice(index, 1);
        }
        warning.geometry.dispose();
        (warning.material as THREE.Material).dispose();
      }
    });
    this.fallingAsteroids.length = 0;
    this.fallingAsteroidTimers.length = 0;
    this.warningIndicators.length = 0;
    
    console.log('✅ Asteroid Field Arena disposed');
  }
}