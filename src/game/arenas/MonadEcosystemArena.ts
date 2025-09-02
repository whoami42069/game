import * as THREE from 'three';
import { Arena, ArenaConfig } from '../Arena';
import { TextureManager } from '@/core/TextureManager';

export class MonadEcosystemArena extends Arena {
  private stars!: THREE.Points;
  private cosmicParticles!: THREE.Points;
  private textureManager: TextureManager;
  private monadLogoTexture!: THREE.Texture;

  constructor(scene: THREE.Scene) {
    const config: ArenaConfig = {
      name: 'Monad Ecosystem',
      platformSize: 40,
      bounds: {
        min: new THREE.Vector3(-38, 0, -38),
        max: new THREE.Vector3(38, 30, 38)
      },
      lighting: {
        ambient: {
          color: 0x4a148c,
          intensity: 0.4
        },
        hemisphere: {
          skyColor: 0x8e44ad,
          groundColor: 0x311b92,
          intensity: 0.6
        },
        directional: {
          color: 0xffffff,
          intensity: 1.2,
          position: new THREE.Vector3(50, 100, 50),
          castShadow: true
        }
      },
      fog: {
        type: 'exponential',
        color: 0x2e1a47,
        density: 0.0005
      },
      environment: {
        skybox: true,
        particles: true,
        animations: true
      }
    };

    super(scene, config);
    
    this.textureManager = TextureManager.getInstance();
    
    // Initialize the arena
    this.initialize();
  }

  protected setupEnvironment(): void {
    this.createMonadSkybox();
    this.createStarField();
    this.createCosmicParticles();
  }

  protected setupLighting(): void {
    // Use standard lighting setup from base class
    this.setupStandardLighting();
    
    // Add Monad-themed purple accent lights
    const purpleLight1 = new THREE.PointLight(0x8e44ad, 1.0, 100);
    purpleLight1.position.set(-30, 20, -30);
    this.addLight(purpleLight1);
    
    const purpleLight2 = new THREE.PointLight(0x9c27b0, 1.0, 100);
    purpleLight2.position.set(30, 20, 30);
    this.addLight(purpleLight2);
    
    // Platform core light with purple tint
    const coreLight = new THREE.PointLight(0xbb86fc, 1.5, 50);
    coreLight.position.set(0, 5, 0);
    this.addLight(coreLight);
  }

  protected createPlatform(): void {
    // Load the Monad logo texture
    const textureLoader = new THREE.TextureLoader();
    this.monadLogoTexture = textureLoader.load('658ea50d2ab956b00dd0480e_what-is-monad.png');
    this.monadLogoTexture.wrapS = THREE.RepeatWrapping;
    this.monadLogoTexture.wrapT = THREE.RepeatWrapping;
    
    // Main platform with circular geometry
    const platformGeometry = new THREE.CylinderGeometry(
      this.config.platformSize, 
      this.config.platformSize * 0.9, 
      3, 
      32
    );
    
    // Create material with Monad logo
    const platformMaterial = new THREE.MeshPhysicalMaterial({
      map: this.monadLogoTexture,
      metalness: 0.2,
      roughness: 0.4,
      emissive: 0x4a148c,
      emissiveIntensity: 0.2,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1;
    platform.receiveShadow = true;
    this.platform.add(platform);
    
    // Add MONAD ECOSYSTEM text
    this.createSkrumpeyText({
      primaryColor: '#bb86fc',
      secondaryColor: '#ffffff',
      glowColor: '#8e44ad',
      opacity: 0.9,
      size: { width: 25, height: 6 },
      customText: 'MONAD ECOSYSTEM'
    });
    
    // Add glowing purple border ring
    const borderGeometry = new THREE.TorusGeometry(this.config.platformSize, 1, 8, 32);
    const borderMaterial = new THREE.MeshBasicMaterial({
      color: 0xbb86fc,
      transparent: true,
      opacity: 0.8
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = 0;
    border.rotation.x = Math.PI / 2;
    this.platform.add(border);
    
    // Add floating Monad logo above platform
    const logoGeometry = new THREE.PlaneGeometry(15, 15);
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: this.monadLogoTexture,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const floatingLogo = new THREE.Mesh(logoGeometry, logoMaterial);
    floatingLogo.position.y = 25;
    floatingLogo.rotation.x = -Math.PI / 6;
    this.platform.add(floatingLogo);
    
    this.scene.add(this.platform);
  }

  protected createHazards(): void {
    // No hazards in this peaceful arena - players can practice shooting
  }

  private createMonadSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 20);
    
    // Create purple gradient skybox
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Create radial gradient with Monad purple colors
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
    gradient.addColorStop(0, '#2e1a47');
    gradient.addColorStop(0.3, '#4a148c');
    gradient.addColorStop(0.6, '#6a1b9a');
    gradient.addColorStop(1, '#311b92');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add some nebula-like effects
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#bb86fc';
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 50 + Math.random() * 100;
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

  private createStarField(): void {
    const starCount = 2000;
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
      
      // Purple-tinted stars
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1; // White
      } else if (colorChoice < 0.7) {
        colors[i3] = 0.9; colors[i3 + 1] = 0.7; colors[i3 + 2] = 1; // Light purple
      } else {
        colors[i3] = 0.7; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0.9; // Purple
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

  private createCosmicParticles(): void {
    // Purple cosmic dust particles
    this.cosmicParticles = this.createParticleSystem({
      count: 150,
      positionRange: { x: 100, y: 50, z: 100 },
      colors: [
        new THREE.Color(0.7, 0.5, 1),    // Light purple
        new THREE.Color(0.9, 0.7, 1),    // Very light purple
        new THREE.Color(1, 0.9, 1)       // Almost white with purple tint
      ],
      size: { min: 0.3, max: 0.8 },
      material: {
        size: 0.6,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      }
    });
    this.addEnvironmentObject(this.cosmicParticles);
  }

  protected updateEnvironment(deltaTime: number): void {
    // Rotate stars slowly
    if (this.stars && this.time % 0.1 < deltaTime) {
      this.stars.rotation.y += 0.0005;
    }
    
    // Rotate floating logo
    const floatingLogo = this.platform.children.find(child => 
      child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry
    ) as THREE.Mesh | undefined;
    if (floatingLogo) {
      floatingLogo.rotation.y += deltaTime * 0.2;
      floatingLogo.position.y = 25 + Math.sin(this.time * 0.5) * 2;
    }
    
    // Pulse border ring
    const border = this.platform.children.find(child => 
      'geometry' in child && child.geometry instanceof THREE.TorusGeometry
    ) as THREE.Mesh | undefined;
    if (border) {
      border.rotation.z += deltaTime * 0.1;
      const scale = 1 + Math.sin(this.time * 2) * 0.05;
      border.scale.setScalar(scale);
    }
  }

  protected updateHazards(_deltaTime: number): void {
    // No hazards to update - peaceful arena for practice
    
    // Update cosmic particles
    if (this.cosmicParticles) {
      this.updateParticleSystem(this.cosmicParticles, {
        frameSkip: 5,
        batchSize: 30,
        updateFunction: (positions, i) => {
          const y = positions.getY(i);
          positions.setY(i, y - 0.5);
          if (y < -10) {
            positions.setY(i, 50);
          }
        }
      });
    }
  }

  protected finalizeSetup(): void {
    // Set purple-tinted background
    this.scene.background = null; // Let skybox show through
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Dispose texture
    if (this.monadLogoTexture) {
      this.monadLogoTexture.dispose();
    }
    
    // Call parent dispose
    super.dispose();
    
    console.log('✅ Monad Ecosystem Arena disposed');
  }
}