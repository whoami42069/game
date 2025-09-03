import * as THREE from 'three';
import { Arena, ArenaConfig } from '../Arena';
import { TextureManager } from '../../core/TextureManager';
import { BillboardManager } from '../../core/BillboardManager';

export class NebulaZoneArena extends Arena {
  // Core arena elements
  private nebulaClouds: THREE.Mesh[] = [];
  private energyRifts: THREE.Mesh[] = [];
  private ionStorms: THREE.Points[] = [];
  private electricalDischarges: THREE.LineSegments[] = [];
  private nebulaDust!: THREE.Points;
  private ambientFog!: THREE.Points;
  private electricalNodes: THREE.Mesh[] = [];
  
  // Managers
  private textureManager: TextureManager;
  private billboardManager: BillboardManager;
  
  // Animation data
  private riftAnimations: { rotation: number; pulse: number }[] = [];
  private stormAnimations: { velocity: THREE.Vector3; life: number }[] = [];
  private dischargeTimers: number[] = [];
  
  // Star hazard system
  private starHazards: {
    star: THREE.Mesh;
    bullets: THREE.Mesh[];
    fireTimer: number;
    lifetime: number;
    lastFireTime: number;
  }[] = [];
  private lastStarSpawnTime: number = 0;
  private starSpawnInterval: number = 30; // 30 seconds between spawns
  private starFireDuration: number = 5; // 5 seconds of firing
  private bulletFireInterval: number = 0.3; // Fire every 0.3 seconds

  constructor(scene: THREE.Scene) {
    const config: ArenaConfig = {
      name: 'Nebula Zone',
      platformSize: 35,
      bounds: {
        min: new THREE.Vector3(-33, 0, -33),
        max: new THREE.Vector3(33, 25, 33)
      },
      lighting: {
        ambient: {
          color: 0x1a0a2a,
          intensity: 0.4
        },
        hemisphere: {
          skyColor: 0x9d4eff,
          groundColor: 0x4a0080,
          intensity: 0.6
        },
        directional: {
          color: 0xff44dd,
          intensity: 1.2,
          position: new THREE.Vector3(40, 80, 40),
          castShadow: true
        }
      },
      fog: {
        type: 'exponential',
        color: 0x330055,
        density: 0.015 // Limited visibility fog
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
    this.createNebulaSkybox();
    this.createNebulaClouds();
    this.createNebulaDust();
    this.createAmbientFog();
    this.createNebulaCore();
  }

  protected setupLighting(): void {
    // Use standard lighting setup from base class
    this.setupStandardLighting();
    
    // Enhance shadow settings for nebula zone
    const nebulaLight = this.lights.find(light => light instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    if (nebulaLight) {
      nebulaLight.shadow.camera.far = 400;
      nebulaLight.shadow.camera.left = -80;
      nebulaLight.shadow.camera.right = 80;
      nebulaLight.shadow.camera.top = 80;
      nebulaLight.shadow.camera.bottom = -80;
      nebulaLight.shadow.bias = -0.0005;
      nebulaLight.shadow.normalBias = 0.015;
    }
    
    // Energy rift lights
    const riftLight1 = new THREE.PointLight(0xff00ff, 1.0, 100);
    riftLight1.position.set(60, 20, -80);
    this.addLight(riftLight1);
    
    const riftLight2 = new THREE.PointLight(0x9d00ff, 0.8, 80);
    riftLight2.position.set(-70, 30, 90);
    this.addLight(riftLight2);
    
    // Electrical discharge light
    const electricalLight = new THREE.PointLight(0x44ffff, 1.5, 60);
    electricalLight.position.set(0, 40, 0);
    this.addLight(electricalLight);
    
    // Platform core light
    const coreLight = new THREE.PointLight(0xdd44ff, 2.0, 45);
    coreLight.position.set(0, 8, 0);
    this.addLight(coreLight);
  }

  protected createPlatform(): void {
    // Main platform with nebula-themed design
    const platformGeometry = new THREE.CylinderGeometry(
      this.config.platformSize,
      this.config.platformSize * 0.85,
      2.5,
      16
    );
    
    // Get nebula platform textures
    const platformTextures = this.textureManager.generatePlatformTexture(512);
    
    const platformMaterial = new THREE.MeshPhysicalMaterial({
      map: platformTextures.diffuse,
      normalMap: platformTextures.normal,
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughnessMap: platformTextures.roughness,
      metalnessMap: platformTextures.metalness,
      
      // Nebula-themed properties
      metalness: 0.4,
      roughness: 0.6,
      emissive: 0x220033,
      emissiveIntensity: 0.15,
      
      // Enhanced for fog visibility
      transparent: true,
      opacity: 0.95
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1.25;
    platform.receiveShadow = true;
    this.platform.add(platform);
    
    // Add SKRUMPEY text with nebula theme
    this.createSkrumpeyText({
      primaryColor: '#dd44ff',
      secondaryColor: '#44ffff',
      glowColor: '#dd44ff',
      shadowColor: '#dd44ff',
      opacity: 0.9,
      size: { width: 22, height: 5.5 }
    });
    
    // Add energy core with electrical effect
    const coreGeometry = new THREE.OctahedronGeometry(4, 3);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xdd44ff,
      transparent: true,
      opacity: 0.8,
      wireframe: true
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 1;
    this.platform.add(core);
    
    // Add platform ring with electrical nodes
    this.createElectricalNodes();
    
    this.scene.add(this.platform);
  }

  protected createHazards(): void {
    this.createEnergyRifts();
    this.createIonStorms();
    this.createElectricalDischarges();
    // Star hazards will spawn dynamically
  }

  private createNebulaSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(400, 32, 20);
    
    // Create nebula gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Purple/magenta gradient background
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#660099');    // Deep purple center
    gradient.addColorStop(0.3, '#990066'); // Purple-magenta
    gradient.addColorStop(0.6, '#330033'); // Dark purple
    gradient.addColorStop(1, '#110011');   // Very dark purple edges
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add nebula clouds
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 30 + Math.random() * 80;
      const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      nebulaGradient.addColorStop(0, '#ff44dd');
      nebulaGradient.addColorStop(0.5, '#9d00ff');
      nebulaGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = nebulaGradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    
    // Add electrical veins
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#44ffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(Math.random() * 512, Math.random() * 512);
      }
      ctx.stroke();
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

  private createNebulaClouds(): void {
    const cloudCount = 12;
    
    for (let i = 0; i < cloudCount; i++) {
      const cloudGeometry = new THREE.SphereGeometry(8 + Math.random() * 15, 16, 12);
      
      // Distort cloud shape
      const positions = cloudGeometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const vertex = new THREE.Vector3(
          positions.getX(j),
          positions.getY(j),
          positions.getZ(j)
        );
        vertex.multiplyScalar(1 + (Math.random() - 0.5) * 0.4);
        positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
      }
      cloudGeometry.computeVertexNormals();
      
      const cloudMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0x9d00ff) }, // Purple
          color2: { value: new THREE.Color(0xff00ff) }, // Magenta
          color3: { value: new THREE.Color(0x330055) }  // Dark purple
        },
        vertexShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          void main() {
            vPosition = position;
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          uniform vec3 color3;
          varying vec3 vPosition;
          varying vec3 vNormal;
          
          void main() {
            float noise = sin(vPosition.x * 0.1 + time) * cos(vPosition.y * 0.1 + time) * sin(vPosition.z * 0.1 + time);
            float fresnel = 1.0 - abs(dot(normalize(vNormal), vec3(0, 0, 1)));
            
            vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
            color = mix(color, color3, fresnel);
            
            float alpha = 0.3 + noise * 0.2 + fresnel * 0.3;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      
      // Position clouds around the arena
      const angle = (i / cloudCount) * Math.PI * 2;
      const distance = 50 + Math.random() * 80;
      cloud.position.set(
        Math.cos(angle) * distance,
        10 + Math.random() * 30,
        Math.sin(angle) * distance
      );
      
      cloud.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      this.nebulaClouds.push(cloud);
      this.addEnvironmentObject(cloud);
    }
  }

  private createEnergyRifts(): void {
    const riftCount = 6;
    
    for (let i = 0; i < riftCount; i++) {
      // Create rift geometry as a twisted plane
      const riftGeometry = new THREE.PlaneGeometry(3, 20, 1, 10);
      const positions = riftGeometry.attributes.position;
      
      // Twist the rift
      for (let j = 0; j < positions.count; j++) {
        const y = positions.getY(j);
        const twist = (y / 10) * Math.PI * 0.5;
        const x = positions.getX(j) * Math.cos(twist);
        const z = positions.getX(j) * Math.sin(twist);
        positions.setXYZ(j, x, y, z);
      }
      riftGeometry.computeVertexNormals();
      
      const riftMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: 1.0 }
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
          uniform float intensity;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
            float pulse = sin(time * 3.0 + vPosition.y * 0.5) * 0.5 + 0.5;
            
            vec3 color = vec3(1.0, 0.0, 1.0) * edge * pulse * intensity;
            float alpha = edge * pulse * 0.8;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      
      const rift = new THREE.Mesh(riftGeometry, riftMaterial);
      
      // Position rifts around the arena
      const angle = (i / riftCount) * Math.PI * 2;
      const distance = 40 + Math.random() * 60;
      rift.position.set(
        Math.cos(angle) * distance,
        Math.random() * 20,
        Math.sin(angle) * distance
      );
      
      rift.rotation.y = angle + Math.PI / 2;
      rift.rotation.z = (Math.random() - 0.5) * 0.5;
      
      this.energyRifts.push(rift);
      this.addEnvironmentObject(rift);
      
      // Initialize animation data
      this.riftAnimations.push({
        rotation: Math.random() * Math.PI * 2,
        pulse: Math.random()
      });
    }
  }

  private createIonStorms(): void {
    const stormCount = 4;
    
    for (let i = 0; i < stormCount; i++) {
      const particleCount = 150;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      for (let j = 0; j < particleCount; j++) {
        const j3 = j * 3;
        
        // Create swirling storm pattern
        const radius = Math.random() * 15;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 30;
        
        positions[j3] = radius * Math.cos(angle);
        positions[j3 + 1] = height;
        positions[j3 + 2] = radius * Math.sin(angle);
        
        // Ion colors (cyan to white)
        const intensity = 0.5 + Math.random() * 0.5;
        colors[j3] = intensity * 0.3;     // Red
        colors[j3 + 1] = intensity;       // Green
        colors[j3 + 2] = intensity;       // Blue
        
        sizes[j] = Math.random() * 1.5 + 0.5;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      const stormMaterial = new THREE.PointsMaterial({
        size: 1.2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      const storm = new THREE.Points(geometry, stormMaterial);
      
      // Position storms around the arena
      const angle = (i / stormCount) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      storm.position.set(
        Math.cos(angle) * distance,
        15 + Math.random() * 10,
        Math.sin(angle) * distance
      );
      
      this.ionStorms.push(storm);
      this.addEnvironmentObject(storm);
      
      // Initialize storm animation
      this.stormAnimations.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5
        ),
        life: Math.random() * 100
      });
    }
  }

  private createElectricalDischarges(): void {
    const dischargeCount = 8;
    
    for (let i = 0; i < dischargeCount; i++) {
      const segmentCount = 10;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(segmentCount * 2 * 3); // Line segments
      
      // Create jagged electrical path
      let currentPos = new THREE.Vector3(0, 0, 0);
      for (let j = 0; j < segmentCount; j++) {
        const j6 = j * 6;
        
        positions[j6] = currentPos.x;
        positions[j6 + 1] = currentPos.y;
        positions[j6 + 2] = currentPos.z;
        
        // Add random jaggedness
        currentPos.add(new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3,
          (Math.random() - 0.5) * 4
        ));
        
        positions[j6 + 3] = currentPos.x;
        positions[j6 + 4] = currentPos.y;
        positions[j6 + 5] = currentPos.z;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const dischargeMaterial = new THREE.LineBasicMaterial({
        color: 0x44ffff,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
      });
      
      const discharge = new THREE.LineSegments(geometry, dischargeMaterial);
      
      // Position discharges
      const angle = (i / dischargeCount) * Math.PI * 2;
      const distance = 25 + Math.random() * 35;
      discharge.position.set(
        Math.cos(angle) * distance,
        5 + Math.random() * 15,
        Math.sin(angle) * distance
      );
      
      discharge.visible = false; // Start invisible
      
      this.electricalDischarges.push(discharge);
      this.addEnvironmentObject(discharge);
      
      // Initialize discharge timer
      this.dischargeTimers.push(Math.random() * 5);
    }
  }

  private createNebulaDust(): void {
    // Use standardized particle system
    this.nebulaDust = this.createParticleSystem({
      count: 800,
      positionRange: { x: 150, y: 50, z: 150 },
      colors: [
        new THREE.Color(0.6, 0.2, 0.8),  // Purple
        new THREE.Color(0.8, 0.2, 0.8),  // Magenta
        new THREE.Color(0.3, 0.8, 0.9)   // Cyan
      ],
      size: { min: 0.2, max: 1.0 },
      material: {
        size: 0.6,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      }
    });
    this.addEnvironmentObject(this.nebulaDust);
  }

  private createAmbientFog(): void {
    // Use standardized particle system for fog
    this.ambientFog = this.createParticleSystem({
      count: 300,
      positionRange: { x: 200, y: 60, z: 200 },
      colors: [
        new THREE.Color(0.5, 0.25, 0.6),  // Purple fog
        new THREE.Color(0.6, 0.25, 0.7),  // Magenta fog
        new THREE.Color(0.4, 0.3, 0.7)    // Blue fog
      ],
      size: { min: 1.5, max: 2.5 },
      material: {
        size: 2.0,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: false
      }
    });
    this.addEnvironmentObject(this.ambientFog);
  }

  private createNebulaCore(): void {
    // Large nebula core in the distance
    const coreGeometry = new THREE.SphereGeometry(25, 32, 32);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 1.0 }
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
        uniform float intensity;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          float core = 1.0 - smoothstep(0.3, 1.0, dist);
          float pulse = sin(time * 2.0) * 0.3 + 0.7;
          
          vec3 color = vec3(0.6, 0.0, 1.0) * core * pulse * intensity;
          float alpha = core * pulse * 0.6;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const nebulaCore = new THREE.Mesh(coreGeometry, coreMaterial);
    nebulaCore.position.set(-150, 40, -200);
    this.addEnvironmentObject(nebulaCore);
  }

  private createElectricalNodes(): void {
    const nodeCount = 8;
    
    for (let i = 0; i < nodeCount; i++) {
      const nodeGeometry = new THREE.SphereGeometry(1.5, 8, 8);
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: 0x44ffff,
        transparent: true,
        opacity: 0.8
      });
      
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      
      // Position nodes around platform edge
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = this.config.platformSize - 3;
      node.position.set(
        Math.cos(angle) * radius,
        2,
        Math.sin(angle) * radius
      );
      
      this.electricalNodes.push(node);
      this.platform.add(node);
    }
  }

  // SKRUMPEY text creation moved to base class

  private createBillboards(): void {
    this.billboardManager.initialize();
    
    // Initial price fetch
    setTimeout(() => {
      this.billboardManager.updateSwitchboardPrice();
    }, 1000);
  }

  private spawnStarHazard(): void {
    // Create star geometry
    const starGeometry = new THREE.ConeGeometry(3, 6, 4);
    const starMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    
    const star = new THREE.Mesh(starGeometry, starMaterial);
    
    // Random position above the arena
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 20;
    star.position.set(
      Math.cos(angle) * distance,
      35 + Math.random() * 10, // 35-45 units above ground
      Math.sin(angle) * distance
    );
    
    // Point downward
    star.rotation.x = Math.PI;
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    star.add(glow);
    
    this.addEnvironmentObject(star);
    
    // Add to hazards list
    this.starHazards.push({
      star: star,
      bullets: [],
      fireTimer: 0,
      lifetime: 0,
      lastFireTime: 0
    });
  }

  private fireBulletFromStar(starHazard: typeof NebulaZoneArena.prototype.starHazards[0]): void {
    // Create bullet
    const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9
    });
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position at star location
    bullet.position.copy(starHazard.star.position);
    
    // Set bullet velocity direction (downward with slight spread)
    const spread = 0.2;
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      -1, // Downward
      (Math.random() - 0.5) * spread
    ).normalize();
    
    // Store direction as userData for movement
    bullet.userData = {
      velocity: direction.multiplyScalar(25), // Bullet speed
      lifetime: 0
    };
    
    // Add bullet trail effect
    const trailGeometry = new THREE.CylinderGeometry(0.1, 0.3, 2, 4);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.5
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.y = 1;
    bullet.add(trail);
    
    this.addEnvironmentObject(bullet);
    starHazard.bullets.push(bullet);
  }

  protected updateEnvironment(deltaTime: number): void {
    // Update billboard system
    this.billboardManager.update(deltaTime);
    
    // Update nebula clouds
    this.nebulaClouds.forEach(cloud => {
      if (cloud.material instanceof THREE.ShaderMaterial) {
        cloud.material.uniforms.time.value = this.time;
      }
      cloud.rotation.y += deltaTime * 0.1;
      cloud.rotation.z += deltaTime * 0.05;
    });
    
    // Update platform core rotation and pulsing
    const core = this.platform.children.find(child => 
      'geometry' in child && child.geometry instanceof THREE.OctahedronGeometry
    ) as THREE.Mesh | undefined;
    if (core) {
      core.rotation.x += deltaTime * 0.8;
      core.rotation.y += deltaTime * 0.6;
      
      // Enhanced pulse effect for nebula theme
      const scale = 1 + Math.sin(this.time * 3) * 0.15;
      core.scale.setScalar(scale);
    }
    
    // Update electrical nodes
    this.electricalNodes.forEach((node, index) => {
      const pulse = Math.sin(this.time * 4 + index) * 0.3 + 0.7;
      if (node.material instanceof THREE.MeshBasicMaterial) {
        node.material.opacity = pulse;
      }
    });
    
    // Slowly drift nebula dust using standardized updates
    if (this.nebulaDust) {
      this.nebulaDust.rotation.y += deltaTime * 0.02;
      
      this.updateParticleSystem(this.nebulaDust, {
        frameSkip: 5,
        batchSize: 50,
        updateFunction: (positions, i) => {
          const y = positions.getY(i);
          positions.setY(i, y + deltaTime * 2);
          if (y > 50) {
            positions.setY(i, 0);
          }
        }
      });
    }
    
    // Drift ambient fog
    if (this.ambientFog) {
      this.ambientFog.rotation.x += deltaTime * 0.01;
      this.ambientFog.rotation.y += deltaTime * 0.015;
    }
  }

  protected updateHazards(deltaTime: number): void {
    // Check if it's time to spawn a new star
    if (this.time - this.lastStarSpawnTime > this.starSpawnInterval) {
      this.spawnStarHazard();
      this.lastStarSpawnTime = this.time;
    }
    
    // Update existing star hazards
    for (let i = this.starHazards.length - 1; i >= 0; i--) {
      const starHazard = this.starHazards[i];
      starHazard.lifetime += deltaTime;
      
      // Star rotation animation
      starHazard.star.rotation.y += deltaTime * 2;
      
      // Pulse effect
      const scale = 1 + Math.sin(this.time * 5) * 0.1;
      starHazard.star.scale.setScalar(scale);
      
      // Fire bullets for first 5 seconds
      if (starHazard.lifetime < this.starFireDuration) {
        starHazard.fireTimer += deltaTime;
        
        // Check if it's time to fire a bullet
        if (starHazard.fireTimer - starHazard.lastFireTime >= this.bulletFireInterval) {
          this.fireBulletFromStar(starHazard);
          starHazard.lastFireTime = starHazard.fireTimer;
        }
      } else if (starHazard.lifetime > this.starFireDuration + 0.5) {
        // Remove star after firing phase + small delay
        this.scene.remove(starHazard.star);
        const envIndex = this.environmentObjects.indexOf(starHazard.star);
        if (envIndex > -1) {
          this.environmentObjects.splice(envIndex, 1);
        }
        this.starHazards.splice(i, 1);
        continue;
      }
      
      // Update bullets
      for (let j = starHazard.bullets.length - 1; j >= 0; j--) {
        const bullet = starHazard.bullets[j];
        bullet.userData.lifetime += deltaTime;
        
        // Move bullet
        bullet.position.add(
          bullet.userData.velocity.clone().multiplyScalar(deltaTime)
        );
        
        // Rotate bullet
        bullet.rotation.x += deltaTime * 10;
        bullet.rotation.y += deltaTime * 8;
        
        // Remove bullet if it goes too low or has lived too long
        if (bullet.position.y < -10 || bullet.userData.lifetime > 3) {
          this.scene.remove(bullet);
          const envIndex = this.environmentObjects.indexOf(bullet);
          if (envIndex > -1) {
            this.environmentObjects.splice(envIndex, 1);
          }
          starHazard.bullets.splice(j, 1);
        }
      }
    }
    
    // Update energy rifts
    this.energyRifts.forEach((rift, index) => {
      if (rift.material instanceof THREE.ShaderMaterial) {
        rift.material.uniforms.time.value = this.time;
        
        // Animate rift intensity
        this.riftAnimations[index].pulse += deltaTime * 2;
        const intensity = 0.8 + Math.sin(this.riftAnimations[index].pulse) * 0.4;
        rift.material.uniforms.intensity.value = intensity;
      }
      
      // Subtle rotation
      this.riftAnimations[index].rotation += deltaTime * 0.1;
      rift.rotation.y += deltaTime * 0.05;
    });
    
    // Update ion storms using standardized updates
    this.ionStorms.forEach((storm) => {
      storm.rotation.y += deltaTime * 0.5;
      
      // Use standardized particle update for swirling motion
      this.updateParticleSystem(storm, {
        frameSkip: 5,
        batchSize: 30,
        updateFunction: (positions, i, time) => {
          const colors = storm.geometry.attributes.color as THREE.BufferAttribute;
          
          // Swirl particles
          const angle = time * 2 + i * 0.1;
          const radius = 8 + Math.sin(time + i * 0.2) * 5;
          positions.setX(i, Math.cos(angle) * radius);
          positions.setZ(i, Math.sin(angle) * radius);
          
          // Animate colors
          const intensity = 0.5 + Math.sin(time * 3 + i) * 0.3;
          colors.setY(i, intensity);
          colors.setZ(i, intensity);
        }
      });
      
      // Update colors separately (hack for now)
      const colors = storm.geometry.attributes.color as THREE.BufferAttribute;
      colors.needsUpdate = true;
    });
    
    // Update electrical discharges
    this.electricalDischarges.forEach((discharge, index) => {
      this.dischargeTimers[index] -= deltaTime;
      
      if (this.dischargeTimers[index] <= 0) {
        // Show discharge briefly
        discharge.visible = true;
        
        // Regenerate discharge path
        const positions = discharge.geometry.attributes.position;
        let currentPos = new THREE.Vector3(0, 0, 0);
        
        for (let j = 0; j < positions.count / 2; j++) {
          const j6 = j * 6;
          
          positions.setXYZ(j6, currentPos.x, currentPos.y, currentPos.z);
          
          currentPos.add(new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 3,
            (Math.random() - 0.5) * 4
          ));
          
          positions.setXYZ(j6 + 3, currentPos.x, currentPos.y, currentPos.z);
        }
        positions.needsUpdate = true;
        
        // Hide after short duration
        setTimeout(() => {
          discharge.visible = false;
        }, 100 + Math.random() * 200);
        
        // Reset timer
        this.dischargeTimers[index] = 2 + Math.random() * 4;
      }
    });
  }

  /**
   * Get billboard manager for external access
   */
  public getBillboardManager(): BillboardManager {
    return this.billboardManager;
  }

  protected finalizeSetup(): void {
    // Let nebula skybox show through
    this.scene.background = null;
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Dispose billboard manager first
    this.billboardManager.dispose();
    
    // Call parent dispose which handles lights, environment objects, and platform
    super.dispose();
    
    // Clear NebulaZoneArena-specific arrays
    this.nebulaClouds.length = 0;
    this.energyRifts.length = 0;
    this.ionStorms.length = 0;
    this.electricalDischarges.length = 0;
    this.electricalNodes.length = 0;
    this.riftAnimations.length = 0;
    this.stormAnimations.length = 0;
    this.dischargeTimers.length = 0;
    
    // Clear star hazards
    this.starHazards.forEach(starHazard => {
      this.scene.remove(starHazard.star);
      const starIndex = this.environmentObjects.indexOf(starHazard.star);
      if (starIndex > -1) {
        this.environmentObjects.splice(starIndex, 1);
      }
      starHazard.bullets.forEach(bullet => {
        this.scene.remove(bullet);
        const bulletIndex = this.environmentObjects.indexOf(bullet);
        if (bulletIndex > -1) {
          this.environmentObjects.splice(bulletIndex, 1);
        }
      });
    });
    this.starHazards.length = 0;
    
    console.log('✅ Nebula Zone Arena disposed');
  }
}