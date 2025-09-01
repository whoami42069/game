import * as THREE from 'three';

export class Arena {
  private scene: THREE.Scene;
  private gridSize: number = 60;
  private walls: THREE.Mesh[] = [];
  // private _floor!: THREE.Mesh; // Kept for future compatibility
  private particles: THREE.InstancedMesh | null = null;
  private spaceDebris: THREE.Group[] = [];
  private asteroids: THREE.Mesh[] = [];
  private cosmicParticles: THREE.Points | null = null;
  private spacePlatform: THREE.Group | null = null;
  private nebula: THREE.Mesh | null = null;
  private skybox: THREE.Mesh | null = null;
  private planetLight: THREE.PointLight | null = null;
  private starField: THREE.Points | null = null;
  private solarWind: THREE.Points | null = null;
  private time: number = 0;
  private particleData: { angle: number, speed: number, radius: number, position: THREE.Vector3 }[] = [];
  private debrisData: { velocity: THREE.Vector3, rotation: THREE.Vector3, originalPosition: THREE.Vector3 }[] = [];
  private cosmicData: { velocity: THREE.Vector3, life: number, maxLife: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.createSpaceSkybox();
    this.createSpacePlatform();
    this.createWalls();
    this.createSpaceLighting();
    this.createStarField();
    this.createNebula();
    this.createAsteroids();
    this.createSpaceDebris();
    this.createCosmicParticles();
    this.createSolarWind();
    this.createOptimizedParticles();
    this.createSpaceAtmosphere();
  }

  private createSpaceSkybox(): void {
    // Create a massive sphere for the skybox
    const skyboxGeometry = new THREE.SphereGeometry(500, 64, 32);
    const skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        starDensity: { value: 2.0 },
        nebulaColor1: { value: new THREE.Color(0x4a0080) },
        nebulaColor2: { value: new THREE.Color(0x001a4d) },
        nebulaColor3: { value: new THREE.Color(0x660033) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float starDensity;
        uniform vec3 nebulaColor1;
        uniform vec3 nebulaColor2;
        uniform vec3 nebulaColor3;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        // Noise function for procedural generation
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        
        float noise(vec3 x) {
          vec3 p = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)), f.x),
                         mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)), f.x),
                         mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)), f.x), f.y), f.z);
        }
        
        void main() {
          vec3 coord = normalize(vWorldPosition) * 10.0;
          
          // Create stars
          float star = hash(floor(coord * starDensity));
          star = smoothstep(0.99, 1.0, star) * 0.8;
          
          // Create nebula
          float nebula1 = noise(coord * 0.5 + time * 0.1);
          float nebula2 = noise(coord * 0.8 + time * 0.15);
          float nebula3 = noise(coord * 1.2 + time * 0.08);
          
          vec3 nebulaColor = mix(nebulaColor1, nebulaColor2, nebula1);
          nebulaColor = mix(nebulaColor, nebulaColor3, nebula2);
          
          float nebulaMask = smoothstep(0.3, 0.7, nebula3) * 0.4;
          
          // Combine stars and nebula
          vec3 finalColor = nebulaColor * nebulaMask + vec3(1.0) * star;
          
          // Add some cosmic glow
          float glow = pow(1.0 - dot(normalize(vWorldPosition), vec3(0, 1, 0)), 2.0) * 0.2;
          finalColor += vec3(0.1, 0.3, 0.8) * glow;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    this.scene.add(this.skybox);
  }

  private createSpacePlatform(): void {
    this.spacePlatform = new THREE.Group();
    
    // Main platform base - simple circular platform
    const platformGeometry = new THREE.CylinderGeometry(this.gridSize * 0.4, this.gridSize * 0.35, 2, 16);
    const platformMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.15 },
        rimColor: { value: new THREE.Color(0x00ffff) },
        coreColor: { value: new THREE.Color(0xff00ff) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec3 rimColor;
        uniform vec3 coreColor;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          // Simple surface pattern
          vec2 coord = vUv * 8.0;
          float pattern = sin(coord.x * 3.14159) * sin(coord.y * 3.14159) * 0.5 + 0.5;
          pattern = smoothstep(0.3, 0.7, pattern);
          
          // Rim lighting effect
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float rim = 1.0 - dot(viewDirection, vNormal);
          rim = pow(rim, 2.0);
          
          // Pulsing energy effect
          float pulse = sin(time * 2.0 + length(vUv - 0.5) * 8.0) * 0.5 + 0.5;
          vec3 color = mix(coreColor, rimColor, pulse);
          
          float finalOpacity = (pattern + rim * 0.5) * opacity;
          gl_FragColor = vec4(color, finalOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -0.5;
    this.spacePlatform.add(platform);
    
    // Platform ring details
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ringGeometry = new THREE.TorusGeometry(this.gridSize * 0.45, 0.5, 8, 16);
      const ringMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x004488,
        transparent: true,
        opacity: 0.3,
        metalness: 0.8,
        roughness: 0.2,
        emissive: new THREE.Color(0x002244),
        emissiveIntensity: 0.2
      });
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(
        Math.cos(angle) * this.gridSize * 0.3,
        -0.8,
        Math.sin(angle) * this.gridSize * 0.3
      );
      ring.rotation.x = -Math.PI / 2;
      ring.scale.set(0.1, 0.1, 0.1);
      this.spacePlatform.add(ring);
    }
    
    // Center energy core
    const coreGeometry = new THREE.SphereGeometry(2, 16, 16);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 1.5 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec3 vPosition;
        
        void main() {
          float dist = length(vPosition) / 2.0;
          float pulse = sin(time * 3.0 + dist * 4.0) * 0.5 + 0.5;
          
          vec3 color = vec3(0.0, 0.8, 1.0) * pulse * intensity;
          float alpha = (1.0 - dist) * 0.6;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 3;
    this.spacePlatform.add(core);
    
    this.scene.add(this.spacePlatform);
    // this._floor = platform; // Keep reference for compatibility
  }

  private createWalls(): void {
    // Create invisible cylindrical boundary matching the circular platform
    const wallHeight = 50;
    const platformRadius = this.gridSize * 0.4; // Match the actual platform radius
    
    // Completely invisible wall material
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0x000033,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });

    // Create cylindrical boundary wall
    const wallGeometry = new THREE.CylinderGeometry(
      platformRadius + 2,  // Slightly larger than platform
      platformRadius + 2,  // Same radius top and bottom
      wallHeight,
      32  // Smooth cylinder with 32 segments
    );
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = wallHeight/2;
    wall.name = 'boundary-cylinder';
    // Make it a hollow cylinder for collision detection on the edges only
    const innerGeometry = new THREE.CylinderGeometry(
      platformRadius - 1,
      platformRadius - 1,
      wallHeight,
      32
    );
    const innerWall = new THREE.Mesh(innerGeometry, wallMaterial);
    wall.updateMatrix();
    innerWall.updateMatrix();
    
    // For collision, we'll use the outer cylinder
    this.walls.push(wall);
    this.scene.add(wall);
    
    // Add floor boundary
    const floorGeometry = new THREE.CylinderGeometry(
      platformRadius + 2,
      platformRadius + 2,
      1,
      32
    );
    const floor = new THREE.Mesh(floorGeometry, wallMaterial);
    floor.position.y = -1;
    floor.name = 'boundary-floor';
    floor.visible = false;
    this.walls.push(floor);
    this.scene.add(floor);
    
    // Add ceiling boundary
    const ceilingGeometry = new THREE.CylinderGeometry(
      platformRadius + 2,
      platformRadius + 2,
      1,
      32
    );
    const ceiling = new THREE.Mesh(ceilingGeometry, wallMaterial);
    ceiling.position.y = wallHeight;
    ceiling.name = 'boundary-ceiling';
    ceiling.visible = false;
    this.walls.push(ceiling);
    this.scene.add(ceiling);
  }

  private createSpaceLighting(): void {
    // Deep space ambient light
    const ambient = new THREE.AmbientLight(0x0a0a1a, 0.3);
    this.scene.add(ambient);

    // Main star light (acts as sun)
    const starLight = new THREE.DirectionalLight(0xffffff, 1.2);
    starLight.position.set(50, 100, 50);
    starLight.castShadow = true;
    starLight.shadow.camera.near = 0.1;
    starLight.shadow.camera.far = 200;
    starLight.shadow.camera.left = -60;
    starLight.shadow.camera.right = 60;
    starLight.shadow.camera.top = 60;
    starLight.shadow.camera.bottom = -60;
    starLight.shadow.mapSize.width = 2048;
    starLight.shadow.mapSize.height = 2048;
    this.scene.add(starLight);

    // Large planet reflection light
    this.planetLight = new THREE.PointLight(0x4a90e2, 0.8, 100);
    this.planetLight.position.set(-40, 30, -60);
    this.scene.add(this.planetLight);

    // Nebula rim light
    const nebulaLight = new THREE.PointLight(0x8a2be2, 0.5, 80);
    nebulaLight.position.set(30, 20, -40);
    this.scene.add(nebulaLight);

    // Platform core light
    const coreLight = new THREE.PointLight(0x00ccff, 1.5, 25);
    coreLight.position.set(0, 5, 0);
    this.scene.add(coreLight);

    // Multiple colored accent lights for anime effect
    const accentLights = [
      { color: 0xff0080, pos: [20, 10, 20], intensity: 0.6 },
      { color: 0x00ff80, pos: [-20, 10, 20], intensity: 0.6 },
      { color: 0x8000ff, pos: [0, 15, -25], intensity: 0.8 },
      { color: 0xffc000, pos: [15, 8, -15], intensity: 0.4 }
    ];

    accentLights.forEach(light => {
      const pointLight = new THREE.PointLight(light.color, light.intensity, 30);
      pointLight.position.set(light.pos[0], light.pos[1], light.pos[2]);
      this.scene.add(pointLight);
    });
  }

  private createStarField(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Random positions in a large sphere
      const radius = 400 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random star colors
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; // White
      } else if (colorChoice < 0.5) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.6; // Yellow
      } else if (colorChoice < 0.7) {
        colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0; // Blue
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.7; colors[i * 3 + 2] = 0.7; // Red
      }

      sizes[i] = Math.random() * 2 + 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          float twinkle = sin(time * 3.0 + position.x * 0.01) * 0.3 + 0.7;
          gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starField);
  }

  private createNebula(): void {
    const nebulaGeometry = new THREE.SphereGeometry(300, 32, 32);
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.2 },
        color1: { value: new THREE.Color(0x4a0080) },
        color2: { value: new THREE.Color(0x8a2be2) },
        color3: { value: new THREE.Color(0x001a4d) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec3 vWorldPosition;
        
        // Simplified noise for nebula
        float noise(vec3 p) {
          return sin(p.x * 0.01) * sin(p.y * 0.01) * sin(p.z * 0.01);
        }
        
        void main() {
          vec3 pos = vWorldPosition * 0.005;
          float n1 = noise(pos + time * 0.1);
          float n2 = noise(pos * 2.0 + time * 0.15);
          float n3 = noise(pos * 4.0 + time * 0.08);
          
          float density = (n1 + n2 * 0.5 + n3 * 0.25) * 0.5 + 0.5;
          density = smoothstep(0.3, 0.8, density);
          
          vec3 color = mix(color1, color2, n1 * 0.5 + 0.5);
          color = mix(color, color3, n2 * 0.5 + 0.5);
          
          gl_FragColor = vec4(color, density * opacity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });

    this.nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    this.nebula.position.set(100, 50, -150);
    this.scene.add(this.nebula);
  }

  private createAsteroids(): void {
    const asteroidCount = 12;
    
    for (let i = 0; i < asteroidCount; i++) {
      // Create irregular asteroid geometry
      const baseGeometry = new THREE.DodecahedronGeometry(2 + Math.random() * 3, 1);
      const vertices = baseGeometry.attributes.position.array;
      
      // Distort vertices for irregular shape
      for (let j = 0; j < vertices.length; j += 3) {
        vertices[j] *= (0.8 + Math.random() * 0.4);
        vertices[j + 1] *= (0.8 + Math.random() * 0.4);
        vertices[j + 2] *= (0.8 + Math.random() * 0.4);
      }
      
      baseGeometry.computeVertexNormals();
      
      const asteroidMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x444444,
        roughness: 0.9,
        metalness: 0.1,
        emissive: new THREE.Color(0x111111),
        normalScale: new THREE.Vector2(0.5, 0.5)
      });
      
      const asteroid = new THREE.Mesh(baseGeometry, asteroidMaterial);
      
      // Position asteroids in a ring around the arena
      const angle = (i / asteroidCount) * Math.PI * 2;
      const radius = 80 + Math.random() * 40;
      asteroid.position.set(
        Math.cos(angle) * radius,
        10 + Math.random() * 20,
        Math.sin(angle) * radius
      );
      
      asteroid.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      asteroid.scale.setScalar(0.5 + Math.random() * 1.5);
      this.asteroids.push(asteroid);
      this.scene.add(asteroid);
    }
  }

  private createSpaceDebris(): void {
    const debrisCount = 20;
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisGroup = new THREE.Group();
      
      // Create various debris pieces
      const pieces = Math.floor(2 + Math.random() * 4);
      
      for (let j = 0; j < pieces; j++) {
        let geometry;
        const geometryType = Math.floor(Math.random() * 4);
        
        switch (geometryType) {
          case 0:
            geometry = new THREE.BoxGeometry(
              0.5 + Math.random() * 2,
              0.2 + Math.random() * 0.5,
              0.5 + Math.random() * 2
            );
            break;
          case 1:
            geometry = new THREE.CylinderGeometry(
              0.1 + Math.random() * 0.3,
              0.1 + Math.random() * 0.3,
              1 + Math.random() * 3,
              6
            );
            break;
          case 2:
            geometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.7, 8, 6);
            break;
          default:
            geometry = new THREE.TetrahedronGeometry(0.5 + Math.random() * 1);
        }
        
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.3, 0.3),
          roughness: 0.8,
          metalness: 0.6,
          emissive: new THREE.Color().setHSL(Math.random() * 0.6, 0.5, 0.05)
        });
        
        const piece = new THREE.Mesh(geometry, material);
        piece.position.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        );
        piece.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        debrisGroup.add(piece);
      }
      
      // Position debris groups around the arena
      const radius = 60 + Math.random() * 80;
      const angle = Math.random() * Math.PI * 2;
      const height = 5 + Math.random() * 30;
      
      debrisGroup.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      this.spaceDebris.push(debrisGroup);
      this.scene.add(debrisGroup);
      
      // Store animation data
      this.debrisData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.5
        ),
        rotation: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        originalPosition: debrisGroup.position.clone()
      });
    }
  }

  private createCosmicParticles(): void {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Random positions in a large area around the arena
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      
      // Cosmic dust colors (blue to purple to white)
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0; // Blue
      } else if (colorChoice < 0.7) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1.0; // Purple
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; // White
      }
      
      sizes[i] = 0.5 + Math.random() * 1.5;
      
      // Store animation data
      this.cosmicData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 2
        ),
        life: Math.random() * 100,
        maxLife: 50 + Math.random() * 100
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (50.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float opacity = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.6;
          gl_FragColor = vec4(vColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
    
    this.cosmicParticles = new THREE.Points(geometry, material);
    this.scene.add(this.cosmicParticles);
  }

  private createSolarWind(): void {
    const windCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(windCount * 3);
    const colors = new Float32Array(windCount * 3);
    
    for (let i = 0; i < windCount; i++) {
      // Create streaming particles from one side
      positions[i * 3] = -150 + Math.random() * 300;
      positions[i * 3 + 1] = Math.random() * 100;
      positions[i * 3 + 2] = -150 + Math.random() * 300;
      
      // Golden solar wind colors
      const intensity = 0.5 + Math.random() * 0.5;
      colors[i * 3] = 1.0 * intensity;
      colors[i * 3 + 1] = 0.8 * intensity;
      colors[i * 3 + 2] = 0.4 * intensity;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          
          vec3 pos = position;
          // Stream effect
          pos.x += sin(time * 0.5 + position.y * 0.01) * 5.0;
          pos.z += cos(time * 0.3 + position.x * 0.01) * 3.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 1.5 * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float opacity = (1.0 - dist * 2.0) * 0.3;
          gl_FragColor = vec4(vColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
    
    this.solarWind = new THREE.Points(geometry, material);
    this.scene.add(this.solarWind);
  }

  private createOptimizedParticles(): void {
    // Use instanced rendering for better performance
    const particleCount = 100;
    const geometry = new THREE.SphereGeometry(0.15, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.InstancedMesh(geometry, material, particleCount);
    this.particles.count = particleCount;

    // Initialize particle data
    for (let i = 0; i < particleCount; i++) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * this.gridSize,
        Math.random() * 20,
        (Math.random() - 0.5) * this.gridSize
      );
      
      // Store data for animation
      this.particleData.push({
        angle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
        radius: 2 + Math.random() * 3,
        position: position.clone()
      });

      matrix.setPosition(position);
      this.particles.setMatrixAt(i, matrix);
      
      // Set random colors using instanced color attribute
      const color = new THREE.Color();
      const colorChoice = Math.random();
      if (colorChoice < 0.5) {
        color.setHex(0x00ffff); // Cyan
      } else {
        color.setHex(0xff00ff); // Magenta
      }
      this.particles.setColorAt(i, color);
    }

    this.particles.instanceMatrix.needsUpdate = true;
    if (this.particles.instanceColor) {
      this.particles.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particles);
  }

  private createSpaceAtmosphere(): void {
    // Deep space fog with very low density
    this.scene.fog = new THREE.FogExp2(0x000022, 0.005);
    
    // Remove background color since we have a skybox
    this.scene.background = null;
  }

  public update(deltaTime: number, _camera?: THREE.Camera): void {
    this.time += deltaTime;

    // Update skybox shader
    if (this.skybox && this.skybox.material instanceof THREE.ShaderMaterial) {
      this.skybox.material.uniforms.time.value = this.time;
    }

    // Update space platform shader
    if (this.spacePlatform) {
      this.spacePlatform.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
          child.material.uniforms.time.value = this.time;
        }
      });
    }

    // Update star field twinkling
    if (this.starField && this.starField.material instanceof THREE.ShaderMaterial) {
      this.starField.material.uniforms.time.value = this.time;
    }

    // Update nebula animation
    if (this.nebula && this.nebula.material instanceof THREE.ShaderMaterial) {
      this.nebula.material.uniforms.time.value = this.time;
      // Slow rotation for the nebula
      this.nebula.rotation.y += deltaTime * 0.1;
    }

    // Update solar wind animation
    if (this.solarWind && this.solarWind.material instanceof THREE.ShaderMaterial) {
      this.solarWind.material.uniforms.time.value = this.time;
    }

    // Animate asteroids rotation
    this.asteroids.forEach((asteroid, index) => {
      asteroid.rotation.x += deltaTime * (0.2 + index * 0.1);
      asteroid.rotation.y += deltaTime * (0.15 + index * 0.08);
      asteroid.rotation.z += deltaTime * (0.1 + index * 0.05);
    });

    // Animate space debris
    this.spaceDebris.forEach((debris, index) => {
      const data = this.debrisData[index];
      if (data) {
        // Floating movement
        debris.position.add(data.velocity);
        debris.rotation.x += data.rotation.x;
        debris.rotation.y += data.rotation.y;
        debris.rotation.z += data.rotation.z;
        
        // Keep debris in bounds with slow drift back
        const maxDrift = 50;
        if (Math.abs(debris.position.x - data.originalPosition.x) > maxDrift) {
          data.velocity.x *= -0.1;
        }
        if (Math.abs(debris.position.z - data.originalPosition.z) > maxDrift) {
          data.velocity.z *= -0.1;
        }
        if (Math.abs(debris.position.y - data.originalPosition.y) > maxDrift / 2) {
          data.velocity.y *= -0.1;
        }
      }
    });

    // Update cosmic particles
    if (this.cosmicParticles) {
      const positions = this.cosmicParticles.geometry.attributes.position;
      
      for (let i = 0; i < this.cosmicData.length; i++) {
        const data = this.cosmicData[i];
        
        // Update particle life and position
        data.life += deltaTime * 10;
        
        if (data.life > data.maxLife) {
          // Reset particle
          data.life = 0;
          positions.setXYZ(i,
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 200
          );
        } else {
          // Move particle
          positions.setXYZ(i,
            positions.getX(i) + data.velocity.x * deltaTime,
            positions.getY(i) + data.velocity.y * deltaTime,
            positions.getZ(i) + data.velocity.z * deltaTime
          );
        }
      }
      
      positions.needsUpdate = true;
    }

    // Animate planet light intensity
    if (this.planetLight) {
      this.planetLight.intensity = 0.8 + Math.sin(this.time * 0.5) * 0.2;
    }

    // Optimized energy particle animation using instanced rendering
    if (this.particles) {
      const matrix = new THREE.Matrix4();
      
      // Update particles with reduced frequency for better performance
      for (let i = 0; i < this.particleData.length; i++) {
        const data = this.particleData[i];
        
        // Animate position
        data.angle += deltaTime * data.speed * 0.5;
        data.position.y += Math.sin(this.time * 2 + i * 0.1) * 0.02;
        
        // Orbital movement around platform
        const x = Math.cos(data.angle) * data.radius;
        const z = Math.sin(data.angle) * data.radius;
        data.position.x = data.position.x * 0.95 + x * 0.05;
        data.position.z = data.position.z * 0.95 + z * 0.05;
        
        // Keep within bounds
        if (data.position.y < 1) data.position.y = 20;
        if (data.position.y > 20) data.position.y = 1;
        
        // Update matrix
        matrix.setPosition(data.position);
        this.particles.setMatrixAt(i, matrix);
      }
      
      this.particles.instanceMatrix.needsUpdate = true;
    }
  }


  public getBounds(): { min: THREE.Vector3, max: THREE.Vector3, radius?: number } {
    const platformRadius = this.gridSize * 0.4; // Actual platform radius
    return {
      min: new THREE.Vector3(-platformRadius, 0, -platformRadius),
      max: new THREE.Vector3(platformRadius, 45, platformRadius),
      radius: platformRadius // Add radius for circular boundary checking
    };
  }
  
  public getWalls(): THREE.Mesh[] {
    return this.walls;
  }
}