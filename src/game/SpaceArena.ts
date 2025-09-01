import * as THREE from 'three';
import { TextureManager } from '@/core/TextureManager';
import { BillboardManager } from '@/core/BillboardManager';

export class SpaceArena {
  private scene: THREE.Scene;
  private platform: THREE.Group;
  private asteroids: THREE.Mesh[] = [];
  private debris: THREE.Group[] = [];
  private stars!: THREE.Points;
  private nebula!: THREE.Mesh;
  private cosmicParticles!: THREE.Points;
  private solarWind!: THREE.Points;
  private time: number = 0;
  private platformSize: number = 40;
  private textureManager: TextureManager;
  private billboardManager: BillboardManager;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.platform = new THREE.Group();
    this.textureManager = TextureManager.getInstance();
    this.billboardManager = new BillboardManager(scene);
    
    this.createSpaceSkybox();
    this.createStarField();
    this.createNebula();
    this.createSpacePlatform();
    this.createAsteroids();
    this.createSpaceDebris();
    this.createCosmicParticles();
    this.createSolarWind();
    this.createSpaceLighting();
    this.createPlanets();
    this.setupSpaceAtmosphere();
    this.createBillboards();
  }

  private createSpaceSkybox(): void {
    // Create space skybox with shader material
    const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Deep space background
          vec3 spaceColor = vec3(0.02, 0.02, 0.08);
          
          // Nebula colors
          vec3 nebula1 = vec3(0.5, 0.1, 0.8); // Purple
          vec3 nebula2 = vec3(0.1, 0.3, 0.9); // Blue
          vec3 nebula3 = vec3(0.9, 0.2, 0.5); // Pink
          
          // Create nebula patterns
          float n1 = noise(uv * 3.0 + time * 0.02);
          float n2 = noise(uv * 5.0 - time * 0.01);
          float n3 = noise(uv * 8.0 + vec2(time * 0.03, 0.0));
          
          vec3 nebula = mix(nebula1, nebula2, n1);
          nebula = mix(nebula, nebula3, n2 * 0.5);
          
          // Add cosmic glow
          float glow = pow(n3, 3.0) * 0.5;
          vec3 color = mix(spaceColor, nebula, glow);
          
          // Add subtle animation
          color += vec3(0.05) * sin(time * 0.5 + uv.x * 10.0) * 0.1;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
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
    this.scene.add(this.stars);
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
        
        float noise(vec2 p) {
          return sin(p.x * 10.0) * sin(p.y * 10.0);
        }
        
        void main() {
          vec2 uv = vUv;
          float n = noise(uv * 5.0 + time * 0.1);
          
          vec3 color = mix(color1, color2, n);
          color = mix(color, color3, sin(time * 0.5) * 0.5 + 0.5);
          
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
    this.scene.add(this.nebula);
  }

  private createSpacePlatform(): void {
    // Main platform with simple circular geometry
    const platformGeometry = new THREE.CylinderGeometry(
      this.platformSize, 
      this.platformSize * 0.8, 
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
    
    // Add SKRUMPEY text on the platform
    this.addSkrumpeyText();
    
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
    
    // Border removed - no longer needed
    
    this.scene.add(this.platform);
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
      this.scene.add(asteroid);
    }
  }

  private createSpaceDebris(): void {
    const debrisCount = 25;
    
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
      this.scene.add(debrisGroup);
    }
  }

  private createCosmicParticles(): void {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      positions[i3] = (Math.random() - 0.5) * 200;
      positions[i3 + 1] = Math.random() * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 200;
      
      // Cosmic dust colors
      colors[i3] = 0.5 + Math.random() * 0.5;
      colors[i3 + 1] = 0.5 + Math.random() * 0.5;
      colors[i3 + 2] = 0.8 + Math.random() * 0.2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.cosmicParticles = new THREE.Points(geometry, material);
    this.scene.add(this.cosmicParticles);
  }

  private createSolarWind(): void {
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
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
    this.scene.add(this.solarWind);
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
    this.scene.add(moon);
    
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
    this.scene.add(planet);
    
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
    this.scene.add(rings);
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

  private createSpaceLighting(): void {
    // Enhanced ambient light with hemisphere for better colors
    const hemisphereLight = new THREE.HemisphereLight(0x4040ff, 0x002030, 0.5);
    this.scene.add(hemisphereLight);
    
    // Subtle ambient for base visibility
    const ambient = new THREE.AmbientLight(0x0a0a1a, 0.3);
    this.scene.add(ambient);
    
    // Main star light (sun) - Enhanced quality
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.mapSize.width = 4096;  // Higher resolution shadows
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.bias = -0.001;  // Reduce shadow acne
    sunLight.shadow.normalBias = 0.02;
    this.scene.add(sunLight);
    
    // Planet reflection light
    const planetLight = new THREE.PointLight(0x4444ff, 0.8, 200);
    planetLight.position.set(150, 30, -250);
    this.scene.add(planetLight);
    
    // Nebula light
    const nebulaLight = new THREE.PointLight(0x9d00ff, 0.6, 150);
    nebulaLight.position.set(100, 50, -200);
    this.scene.add(nebulaLight);
    
    // Platform core light
    const coreLight = new THREE.PointLight(0x00ffff, 1.5, 50);
    coreLight.position.set(0, 5, 0);
    this.scene.add(coreLight);
  }

  private setupSpaceAtmosphere(): void {
    // Very subtle fog for depth
    this.scene.fog = new THREE.FogExp2(0x000011, 0.0008);
    
    // Dark space background
    this.scene.background = null; // Let skybox show through
  }
  
  private addSkrumpeyText(): void {
    // Create canvas for text texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Draw SKRUMPEY text
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 120px Arial';
    ctx.fillStyle = '#00ffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fillText('SKRUMPEY', canvas.width / 2, canvas.height / 2);
    
    // Add glow effect
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.strokeText('SKRUMPEY', canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create plane for text
    const textGeometry = new THREE.PlaneGeometry(20, 5);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.rotation.x = -Math.PI / 2;
    textMesh.position.y = 0.1; // Just above platform
    textMesh.position.z = 0;
    
    this.platform.add(textMesh);
    
    // Add second rotated text for visual effect
    const textMesh2 = textMesh.clone();
    textMesh2.rotation.z = Math.PI / 2;
    textMesh2.material = textMaterial.clone();
    textMesh2.material.opacity = 0.4;
    this.platform.add(textMesh2);
  }

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

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Update billboard system
    this.billboardManager.update(deltaTime);
    
    // Rotate stars slowly
    if (this.stars) {
      this.stars.rotation.y += deltaTime * 0.01;
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
    
    // Animate asteroids
    this.asteroids.forEach((asteroid, i) => {
      asteroid.rotation.x += deltaTime * 0.1 * (1 + i * 0.1);
      asteroid.rotation.y += deltaTime * 0.15 * (1 + i * 0.05);
      
      // Slight floating motion
      asteroid.position.y += Math.sin(this.time + i) * 0.01;
    });
    
    // Animate space debris
    this.debris.forEach((debris, i) => {
      debris.rotation.x += deltaTime * 0.2;
      debris.rotation.y += deltaTime * 0.3;
      
      // Floating motion
      const floatSpeed = 0.5 + (i % 3) * 0.2;
      debris.position.x += Math.sin(this.time * floatSpeed + i) * 0.02;
      debris.position.y += Math.cos(this.time * floatSpeed + i * 2) * 0.02;
    });
    
    // Animate cosmic particles
    if (this.cosmicParticles) {
      const positions = this.cosmicParticles.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        positions.setY(i, y - deltaTime * 5);
        
        // Reset particles that fall too low
        if (y < -10) {
          positions.setY(i, 100);
        }
      }
      positions.needsUpdate = true;
    }
    
    // Animate solar wind
    if (this.solarWind) {
      const positions = this.solarWind.geometry.attributes.position;
      const velocities = this.solarWind.geometry.attributes.velocity;
      
      for (let i = 0; i < positions.count; i++) {
        const z = positions.getZ(i);
        const vz = velocities.getZ(i);
        positions.setZ(i, z + vz * deltaTime);
        
        // Reset particles that go too far
        if (z > 150) {
          positions.setZ(i, -150);
          positions.setX(i, (Math.random() - 0.5) * 100);
          positions.setY(i, Math.random() * 50);
        }
      }
      positions.needsUpdate = true;
    }
    
    // Update skybox shader
    const sky = this.scene.children.find(child => 
      child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial
    ) as THREE.Mesh | undefined;
    if (sky && sky.material instanceof THREE.ShaderMaterial) {
      (sky.material as THREE.ShaderMaterial).uniforms.time.value = this.time;
    }
  }

  public getBounds(): { min: THREE.Vector3, max: THREE.Vector3 } {
    const halfSize = this.platformSize - 2;
    return {
      min: new THREE.Vector3(-halfSize, 0, -halfSize),
      max: new THREE.Vector3(halfSize, 30, halfSize)
    };
  }

  /**
   * Get billboard manager for external access
   */
  public getBillboardManager(): BillboardManager {
    return this.billboardManager;
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.billboardManager.dispose();
    console.log('✅ Space Arena disposed');
  }
}