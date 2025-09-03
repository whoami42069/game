import * as THREE from 'three';
import { Arena, ArenaConfig } from '../Arena';
import { TextureManager } from '@/core/TextureManager';
import { BillboardManager } from '@/core/BillboardManager';

export class SpaceArena extends Arena {
  private asteroids: THREE.Mesh[] = [];
  private debris: THREE.Group[] = [];
  private stars!: THREE.Points;
  private nebula!: THREE.Mesh;
  private cosmicParticles!: THREE.Points;
  private solarWind!: THREE.Points;
  private textureManager: TextureManager;
  private billboardManager: BillboardManager;

  constructor(scene: THREE.Scene) {
    const config: ArenaConfig = {
      name: 'Space Arena',
      platformSize: 40,
      bounds: {
        min: new THREE.Vector3(-38, 0, -38),
        max: new THREE.Vector3(38, 30, 38)
      },
      lighting: {
        ambient: {
          color: 0x0a0a1a,
          intensity: 0.3
        },
        hemisphere: {
          skyColor: 0x4040ff,
          groundColor: 0x002030,
          intensity: 0.5
        },
        directional: {
          color: 0xffffff,
          intensity: 1.5,
          position: new THREE.Vector3(50, 100, 50),
          castShadow: true
        }
      },
      fog: {
        type: 'exponential',
        color: 0x000011,
        density: 0.0008
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
    this.createSpaceSkybox();
    this.createStarField();
    this.createNebula();
    this.createCosmicParticles();
    this.createSolarWind();
    this.createPlanets();
  }

  protected setupLighting(): void {
    // Use standard lighting setup from base class
    this.setupStandardLighting();

    // Add space-specific additional lights
    const sunLight = this.lights.find(light => light instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    if (sunLight) {
      // Enhance shadow quality for space arena
      sunLight.shadow.mapSize.width = 4096;  // Higher resolution shadows
      sunLight.shadow.mapSize.height = 4096;
      sunLight.shadow.bias = -0.001;  // Reduce shadow acne
      sunLight.shadow.normalBias = 0.02;
    }

    // Planet reflection light
    const planetLight = new THREE.PointLight(0x4444ff, 0.8, 200);
    planetLight.position.set(150, 30, -250);
    this.addLight(planetLight);

    // Nebula light
    const nebulaLight = new THREE.PointLight(0x9d00ff, 0.6, 150);
    nebulaLight.position.set(100, 50, -200);
    this.addLight(nebulaLight);

    // Platform core light
    const coreLight = new THREE.PointLight(0x00ffff, 1.5, 50);
    coreLight.position.set(0, 5, 0);
    this.addLight(coreLight);
  }

  protected createPlatform(): void {
    // Main platform with simple circular geometry
    const platformGeometry = new THREE.CylinderGeometry(
      this.config.platformSize,
      this.config.platformSize * 0.8,
      2,
      16
    );

    // Get platform textures
    const platformTextures = this.textureManager.generatePlatformTexture(512);

    const platformMaterial = new THREE.MeshPhysicalMaterial({
      map: platformTextures.diffuse,
      normalMap: platformTextures.normal,
      normalScale: new THREE.Vector2(2.0, 2.0),
      roughnessMap: platformTextures.roughness,
      metalnessMap: platformTextures.metalness,

      // Simple material properties
      metalness: 0.3,
      roughness: 0.7,
      emissive: 0x001122,
      emissiveIntensity: 0.1
    });

    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1;
    platform.receiveShadow = true;
    this.platform.add(platform);

    // Add SKRUMPEY text with space theme
    this.createSkrumpeyText({
      primaryColor: '#00ffff',
      secondaryColor: '#ff00ff',
      glowColor: '#00ffff',
      opacity: 0.8,
      size: { width: 20, height: 5 }
    });

    // Add energy core in the center
    const coreGeometry = new THREE.OctahedronGeometry(3, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
      wireframe: true
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 0;
    this.platform.add(core);

    this.scene.add(this.platform);
  }

  protected createHazards(): void {
    this.createAsteroids();
    this.createSpaceDebris();
  }

  private createSpaceSkybox(): void {
    // SIMPLIFIED: Use basic gradient instead of complex shader
    const skyGeometry = new THREE.SphereGeometry(500, 32, 20); // Reduced segments

    // Create simple gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Create vertical gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#050512'); // Dark purple top
    gradient.addColorStop(0.5, '#0a0a20'); // Deep blue middle
    gradient.addColorStop(1, '#141428'); // Dark blue bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Add some subtle nebula spots
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(50, 50, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(200, 150, 40, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);

    const skyMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.addEnvironmentObject(sky);
  }

  private createStarField(): void {
    const starCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Distribute stars in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 100 + Math.random() * 400;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Star colors (white, yellow, blue, red)
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i3] = colors[i3 + 1] = colors[i3 + 2] = 1; // White
      } else if (colorChoice < 0.8) {
        colors[i3] = 1; colors[i3 + 1] = 0.9; colors[i3 + 2] = 0.7; // Yellow
      } else if (colorChoice < 0.95) {
        colors[i3] = 0.7; colors[i3 + 1] = 0.8; colors[i3 + 2] = 1; // Blue
      } else {
        colors[i3] = 1; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0.5; // Red
      }

      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geometry, starMaterial);
    this.addEnvironmentObject(this.stars);
  }

  private createNebula(): void {
    const nebulaGeometry = new THREE.PlaneGeometry(300, 300, 1, 1);
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x9d00ff) }, // Purple
        color2: { value: new THREE.Color(0x00ffff) }, // Cyan
        color3: { value: new THREE.Color(0xff00ff) }  // Magenta
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          // Simplified gradient without noise function
          float gradient = uv.x * 0.5 + uv.y * 0.5;
          
          vec3 color = mix(color1, color2, gradient);
          // Simple time-based color mix without sin
          float timeFactor = mod(time * 0.1, 1.0);
          color = mix(color, color3, timeFactor);
          
          float alpha = 0.3 * (1.0 - length(uv - 0.5) * 2.0);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    this.nebula.position.set(100, 50, -200);
    this.nebula.rotation.z = Math.PI / 6;
    this.addEnvironmentObject(this.nebula);
  }

  private createAsteroids(): void {
    const asteroidCount = 15;

    for (let i = 0; i < asteroidCount; i++) {
      const size = 2 + Math.random() * 8;
      const detail = Math.floor(Math.random() * 2) + 1;
      const geometry = new THREE.IcosahedronGeometry(size, detail);

      // Distort vertices for irregular shape
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

      // Get AAA-quality asteroid PBR textures
      const asteroidTextures = this.textureManager.generateAsteroidTexture(512);

      const material = new THREE.MeshPhysicalMaterial({
        map: asteroidTextures.diffuse,
        normalMap: asteroidTextures.normal,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughnessMap: asteroidTextures.roughness,
        metalnessMap: asteroidTextures.metalness,

        // Realistic asteroid surface properties
        metalness: 0.1,
        roughness: 0.9,

        // Subtle emissive for mineral veins
        emissive: 0x222222,
        emissiveIntensity: 0.1,

        // Environmental reflections
        envMapIntensity: 0.3,

        // Enhanced shadow reception
        shadowSide: THREE.DoubleSide
      });

      const asteroid = new THREE.Mesh(geometry, material);

      // Position asteroids around the arena
      const angle = (i / asteroidCount) * Math.PI * 2;
      const distance = 60 + Math.random() * 100;
      asteroid.position.set(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 40,
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

  private createSpaceDebris(): void {
    const debrisCount = 8; // Reduced from 25 for performance

    for (let i = 0; i < debrisCount; i++) {
      const debrisGroup = new THREE.Group();

      // Random debris shapes
      const shapeType = Math.floor(Math.random() * 3);
      let geometry;

      switch (shapeType) {
        case 0:
          geometry = new THREE.BoxGeometry(
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5
          );
          break;
        case 1:
          geometry = new THREE.TetrahedronGeometry(Math.random() * 1.5 + 0.5);
          break;
        default:
          geometry = new THREE.OctahedronGeometry(Math.random() * 1.5 + 0.5);
      }

      const material = new THREE.MeshPhysicalMaterial({
        color: 0x666666,
        metalness: 0.9,
        roughness: 0.3,
        emissive: 0x0066ff,
        emissiveIntensity: 0.1
      });

      const debris = new THREE.Mesh(geometry, material);
      debris.castShadow = true;
      debrisGroup.add(debris);

      // Position debris
      const radius = 40 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      debrisGroup.position.set(
        radius * Math.cos(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        radius * Math.sin(theta) * Math.cos(phi)
      );

      debrisGroup.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.debris.push(debrisGroup);
      this.addEnvironmentObject(debrisGroup);
    }
  }

  private createCosmicParticles(): void {
    // Use standardized particle system
    this.cosmicParticles = this.createParticleSystem({
      count: 200,
      positionRange: { x: 200, y: 100, z: 200 },
      colors: [
        new THREE.Color(1, 1, 0.8),    // Light blue-white
        new THREE.Color(0.8, 0.8, 1),  // Pale blue
        new THREE.Color(0.9, 0.9, 1)   // Very pale blue
      ],
      size: { min: 0.3, max: 0.7 },
      material: {
        size: 0.5,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      }
    });
    this.addEnvironmentObject(this.cosmicParticles);
  }

  private createSolarWind(): void {
    // Use standardized particle system with custom positioning
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(300 * 3);
    const velocities = new Float32Array(300 * 3);

    for (let i = 0; i < 300; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = Math.random() * 50;
      positions[i3 + 2] = -50 - Math.random() * 100;

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 20 + Math.random() * 10;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.3,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.solarWind = new THREE.Points(geometry, material);
    this.addEnvironmentObject(this.solarWind);
  }

  private createPlanets(): void {
    // Large moon
    const moonGeometry = new THREE.SphereGeometry(20, 32, 32);
    const moonTexture = this.createMoonTexture();
    const moonMaterial = new THREE.MeshPhysicalMaterial({
      map: moonTexture,
      metalness: 0.1,
      roughness: 0.9,
      emissive: 0x222222,
      emissiveIntensity: 0.1
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(-80, 60, -150);
    moon.castShadow = true;
    moon.receiveShadow = true;
    this.addEnvironmentObject(moon);

    // Distant planet
    const planetGeometry = new THREE.SphereGeometry(35, 32, 32);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4444ff,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0x000088,
      emissiveIntensity: 0.3
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.position.set(150, 30, -250);
    this.addEnvironmentObject(planet);

    // Planet rings
    const ringGeometry = new THREE.RingGeometry(40, 55, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x888888,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    rings.position.copy(planet.position);
    rings.rotation.x = Math.PI / 3;
    this.addEnvironmentObject(rings);
  }

  private createMoonTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base gray color
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 512, 512);

    // Add craters
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 5 + Math.random() * 20;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(64, 64, 64, ${0.3 + Math.random() * 0.4})`;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // SKRUMPEY text creation moved to base class

  /**
   * Create professional billboards
   */
  private createBillboards(): void {
    this.billboardManager.initialize();

    // Initial BTC price fetch
    setTimeout(() => {
      this.billboardManager.updateSwitchboardPrice();
    }, 1000);
  }

  protected updateEnvironment(deltaTime: number): void {
    // Update billboard system
    this.billboardManager.update(deltaTime);

    // Rotate stars slowly - reduced frequency
    if (this.stars && this.time % 0.1 < deltaTime) { // Update less frequently
      this.stars.rotation.y += 0.001;
    }

    // Animate nebula
    if (this.nebula && this.nebula.material instanceof THREE.ShaderMaterial) {
      this.nebula.material.uniforms.time.value = this.time;
      this.nebula.rotation.z += deltaTime * 0.05;
    }

    // Rotate platform core
    const core = this.platform.children.find(child =>
      'geometry' in child && child.geometry instanceof THREE.OctahedronGeometry
    ) as THREE.Mesh | undefined;
    if (core) {
      core.rotation.x += deltaTime * 0.5;
      core.rotation.y += deltaTime * 0.3;

      // Pulse effect
      const scale = 1 + Math.sin(this.time * 2) * 0.1;
      core.scale.setScalar(scale);
    }

    // Rotate platform border
    const border = this.platform.children.find(child => 'geometry' in child && child.geometry instanceof THREE.TorusGeometry) as THREE.Mesh | undefined;
    if (border) {
      border.rotation.z += deltaTime * 0.3;
    }
  }

  protected updateHazards(_deltaTime: number): void {
    // OPTIMIZED: Reduced animations for performance
    // Only animate every 3rd frame and fewer objects
    const frameSkip = Math.floor(this.time * 60) % 3 === 0;
    if (frameSkip) {
      // Animate only first 3 asteroids (was 15)
      this.asteroids.slice(0, 3).forEach((asteroid, i) => {
        asteroid.rotation.x += 0.006 * (1 + i * 0.1);
        asteroid.rotation.y += 0.009 * (1 + i * 0.05);
      });

      // Animate only first 2 debris
      this.debris.slice(0, 2).forEach((debris) => {
        debris.rotation.x += 0.04;
        debris.rotation.y += 0.06;
      });
    }

    // OPTIMIZED: Use standardized particle updates
    if (this.cosmicParticles) {
      this.updateParticleSystem(this.cosmicParticles, {
        frameSkip: 5,
        batchSize: 50,
        updateFunction: (positions, i) => {
          const y = positions.getY(i);
          positions.setY(i, y - 1.0);
          if (y < -10) {
            positions.setY(i, 100);
          }
        }
      });
    }

    if (this.solarWind) {
      this.updateParticleSystem(this.solarWind, {
        frameSkip: 5,
        batchSize: 75,
        updateFunction: (positions, i) => {
          const velocities = this.solarWind.geometry.attributes.velocity as THREE.BufferAttribute;
          const z = positions.getZ(i);
          const vz = velocities.getZ(i);
          positions.setZ(i, z + vz * 0.1);
          if (z > 150) {
            positions.setZ(i, -150);
          }
        }
      });
    }

    // Update skybox shader
    const sky = this.environmentObjects.find(obj =>
      obj instanceof THREE.Mesh && obj.material instanceof THREE.ShaderMaterial
    ) as THREE.Mesh | undefined;
    if (sky && sky.material instanceof THREE.ShaderMaterial) {
      (sky.material as THREE.ShaderMaterial).uniforms.time.value = this.time;
    }
  }

  /**
   * Get billboard manager for external access
   */
  public getBillboardManager(): BillboardManager {
    return this.billboardManager;
  }

  protected finalizeSetup(): void {
    // Dark space background
    this.scene.background = null; // Let skybox show through
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Dispose billboard manager first
    this.billboardManager.dispose();

    // Call parent dispose which handles lights, environment objects, and platform
    super.dispose();

    // Clear SpaceArena-specific arrays
    this.asteroids.length = 0;
    this.debris.length = 0;

    console.log('✅ Space Arena disposed');
  }
}