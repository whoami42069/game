import * as THREE from 'three';

/**
 * Interface for billboard configuration
 */
export interface BillboardConfig {
  text: string;
  width: number;
  height: number;
  colors: {
    primary: string;
    secondary?: string;
    text: string;
    glow?: string;
    accent?: string;
    hologram?: string;
  };
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  enableGradient?: boolean;
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
  enableHologram?: boolean;
  enableScanlines?: boolean;
  enableParticles?: boolean;
  glitchIntensity?: number;
}

/**
 * Interface for dynamic content updates
 */
export interface BillboardContent {
  primaryText: string;
  secondaryText?: string;
  price?: number;
  lastUpdate?: Date;
}

/**
 * 3D Billboard class for creating professional-looking billboards in the arena
 */
export class Billboard3D {
  private group: THREE.Group;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private texture!: THREE.CanvasTexture;
  private material!: THREE.MeshPhysicalMaterial;
  private mesh!: THREE.Mesh;
  private glowMesh!: THREE.Mesh;
  private hologramMesh?: THREE.Mesh;
  private frameMesh?: THREE.Mesh;
  private particleSystem?: THREE.Points;
  private scanlinesMesh?: THREE.Mesh;
  private config: BillboardConfig;
  private content: BillboardContent;
  private animationTime: number = 0;
  private glitchTime: number = 0;
  private updateCallback?: () => Promise<BillboardContent>;

  constructor(config: BillboardConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.content = {
      primaryText: config.text,
      secondaryText: '',
      lastUpdate: new Date()
    };
    
    this.initializeCanvas();
    this.createBillboard();
    this.createGlow();
    this.createFrame();
    
    if (config.enableHologram !== false) {
      this.createHologramEffect();
    }
    
    if (config.enableScanlines !== false) {
      this.createScanlines();
    }
    
    if (config.enableParticles !== false) {
      this.createParticleEffect();
    }
    
    this.updateTexture();
    
    // Position and rotate the billboard
    this.group.position.copy(config.position);
    if (config.rotation) {
      this.group.rotation.copy(config.rotation);
    }
  }

  /**
   * Initialize the canvas for texture rendering
   */
  private initializeCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Enable text smoothing
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }

  /**
   * Create the main billboard mesh
   */
  private createBillboard(): void {
    const geometry = new THREE.PlaneGeometry(this.config.width, this.config.height);
    
    // Create texture from canvas
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;
    this.texture.anisotropy = 16;
    
    // Create futuristic material with enhanced properties
    this.material = new THREE.MeshPhysicalMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(this.config.colors.primary).multiplyScalar(0.2),
      emissiveMap: this.texture,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 0.8,
      transmission: 0.1,
      thickness: 0.5,
      ior: 1.5
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);
  }

  /**
   * Create advanced glow effect with energy pulses
   */
  private createGlow(): void {
    const glowGeometry = new THREE.PlaneGeometry(
      this.config.width * 1.15, 
      this.config.height * 1.15
    );
    
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(this.config.colors.glow || this.config.colors.primary) },
        intensity: { value: 0.4 },
        resolution: { value: new THREE.Vector2(this.config.width, this.config.height) }
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
        uniform vec3 color;
        uniform float intensity;
        uniform vec2 resolution;
        varying vec2 vUv;
        
        float noise(vec2 p) {
          return sin(p.x * 10.0) * sin(p.y * 10.0);
        }
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Multi-layered glow
          float glow1 = 1.0 - smoothstep(0.0, 0.5, dist);
          float glow2 = 1.0 - smoothstep(0.2, 0.8, dist);
          float glow3 = 1.0 - smoothstep(0.4, 1.0, dist);
          
          // Energy pulses
          float pulse1 = sin(time * 2.0) * 0.3 + 0.7;
          float pulse2 = sin(time * 3.0 + 1.57) * 0.2 + 0.8;
          float pulse3 = sin(time * 1.5 + 3.14) * 0.25 + 0.75;
          
          // Combine glows with different pulse rates
          float finalGlow = glow1 * pulse1 * 0.5 + glow2 * pulse2 * 0.3 + glow3 * pulse3 * 0.2;
          
          // Add edge energy effect
          float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
          edge *= 1.0 - abs(vUv.y - 0.5) * 2.0;
          edge = pow(edge, 3.0);
          
          finalGlow += edge * sin(time * 4.0) * 0.1;
          finalGlow *= intensity;
          
          // Add color variation
          vec3 finalColor = mix(color, vec3(1.0), finalGlow * 0.3);
          
          gl_FragColor = vec4(finalColor, finalGlow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.z = -0.02;
    this.group.add(this.glowMesh);
  }

  /**
   * Update the billboard texture with current content
   */
  private updateTexture(): void {
    const { ctx, canvas } = this;
    const { colors, enableGradient, gradientDirection } = this.config;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create background
    this.createBackground(colors, enableGradient, gradientDirection);
    
    // Add border effect
    this.createBorder();
    
    // Add primary text
    this.drawPrimaryText();
    
    // Add secondary text (price, etc.)
    if (this.content.secondaryText) {
      this.drawSecondaryText();
    }
    
    // Add decorative elements
    this.addDecorativeElements();
    
    // Update texture
    this.texture.needsUpdate = true;
  }

  /**
   * Create gradient or solid background
   */
  private createBackground(colors: any, enableGradient?: boolean, gradientDirection?: string): void {
    if (enableGradient && colors.secondary) {
      let gradient: CanvasGradient;
      
      switch (gradientDirection) {
        case 'vertical':
          gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
          break;
        case 'diagonal':
          gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
          break;
        default: // horizontal
          gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
      }
      
      gradient.addColorStop(0, colors.primary);
      gradient.addColorStop(1, colors.secondary);
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = colors.primary;
    }
    
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Create glowing border
   */
  private createBorder(): void {
    const borderWidth = 4;
    
    // Outer glow
    this.ctx.shadowColor = this.config.colors.glow || this.config.colors.text;
    this.ctx.shadowBlur = 20;
    this.ctx.strokeStyle = this.config.colors.text;
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeRect(borderWidth / 2, borderWidth / 2, 
                       this.canvas.width - borderWidth, this.canvas.height - borderWidth);
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  /**
   * Draw primary text (billboard title)
   */
  private drawPrimaryText(): void {
    const { ctx, canvas } = this;
    const fontSize = Math.min(canvas.width / this.content.primaryText.length * 1.2, 120);
    
    ctx.font = `bold ${fontSize}px 'Arial Black', Arial, sans-serif`;
    ctx.fillStyle = this.config.colors.text;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    
    // Add text glow
    ctx.shadowColor = this.config.colors.glow || this.config.colors.text;
    ctx.shadowBlur = 15;
    
    const textY = this.content.secondaryText ? canvas.height * 0.35 : canvas.height * 0.5;
    
    // Draw text stroke first, then fill
    ctx.strokeText(this.content.primaryText, canvas.width / 2, textY);
    ctx.fillText(this.content.primaryText, canvas.width / 2, textY);
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }

  /**
   * Draw secondary text (price, subtitle)
   */
  private drawSecondaryText(): void {
    const { ctx, canvas } = this;
    
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.fillStyle = this.config.colors.text;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Add subtle glow
    ctx.shadowColor = this.config.colors.text;
    ctx.shadowBlur = 10;
    
    const textY = canvas.height * 0.7;
    
    ctx.strokeText(this.content.secondaryText!, canvas.width / 2, textY);
    ctx.fillText(this.content.secondaryText!, canvas.width / 2, textY);
    
    // Add last update time if available
    if (this.content.lastUpdate) {
      ctx.font = '24px Arial, sans-serif';
      ctx.fillStyle = `${this.config.colors.text}88`; // Semi-transparent
      ctx.shadowBlur = 5;
      
      const updateText = `Updated: ${this.content.lastUpdate.toLocaleTimeString()}`;
      ctx.fillText(updateText, canvas.width / 2, canvas.height * 0.9);
    }
    
    ctx.shadowBlur = 0;
  }

  /**
   * Create metallic frame around billboard
   */
  private createFrame(): void {
    const frameThickness = 0.5;
    const frameDepth = 0.3;
    
    // Frame material
    const frameMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.config.colors.accent || '#333333'),
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: new THREE.Color(this.config.colors.glow || this.config.colors.primary).multiplyScalar(0.1)
    });
    
    // Create frame pieces
    const frameGroup = new THREE.Group();
    
    // Top frame
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(this.config.width + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    topFrame.position.y = this.config.height / 2 + frameThickness / 2;
    frameGroup.add(topFrame);
    
    // Bottom frame
    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(this.config.width + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    bottomFrame.position.y = -this.config.height / 2 - frameThickness / 2;
    frameGroup.add(bottomFrame);
    
    // Left frame
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, this.config.height, frameDepth),
      frameMaterial
    );
    leftFrame.position.x = -this.config.width / 2 - frameThickness / 2;
    frameGroup.add(leftFrame);
    
    // Right frame
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, this.config.height, frameDepth),
      frameMaterial
    );
    rightFrame.position.x = this.config.width / 2 + frameThickness / 2;
    frameGroup.add(rightFrame);
    
    this.frameMesh = frameGroup as any;
    this.group.add(frameGroup);
  }

  /**
   * Create holographic projection effect
   */
  private createHologramEffect(): void {
    const hologramGeometry = new THREE.PlaneGeometry(
      this.config.width * 0.98,
      this.config.height * 0.98
    );
    
    const hologramMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(this.config.colors.hologram || '#00ffff') },
        opacity: { value: 0.15 },
        scanlineSpeed: { value: 2.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Add wave distortion
          vec3 pos = position;
          pos.z += sin(position.y * 10.0 + time * 2.0) * 0.1;
          pos.z += cos(position.x * 8.0 + time * 1.5) * 0.05;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        uniform float scanlineSpeed;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        void main() {
          // Holographic scanlines
          float scanline = sin(vUv.y * 100.0 + time * scanlineSpeed) * 0.04 + 0.96;
          float scanline2 = sin(vUv.y * 50.0 - time * scanlineSpeed * 0.5) * 0.03 + 0.97;
          
          // Interference pattern
          float interference = sin(vUv.x * 200.0) * sin(vUv.y * 200.0) * 0.05 + 0.95;
          
          // Digital noise
          float noise = random(vUv + time * 0.1) * 0.02 + 0.98;
          
          // Edge fade
          float edgeFade = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
          edgeFade *= smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
          
          // Combine effects
          float alpha = opacity * scanline * scanline2 * interference * noise * edgeFade;
          
          // Add chromatic aberration
          vec3 finalColor = color;
          finalColor.r += sin(time * 3.0) * 0.1;
          finalColor.b -= sin(time * 2.0) * 0.1;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.hologramMesh = new THREE.Mesh(hologramGeometry, hologramMaterial);
    this.hologramMesh.position.z = 0.01;
    this.group.add(this.hologramMesh);
  }

  /**
   * Create animated scanlines effect
   */
  private createScanlines(): void {
    const scanlinesGeometry = new THREE.PlaneGeometry(
      this.config.width,
      this.config.height
    );
    
    const scanlinesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color('#ffffff') },
        speed: { value: 1.0 },
        intensity: { value: 0.05 }
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
        uniform vec3 color;
        uniform float speed;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
          // Moving scanlines
          float scanline1 = sin((vUv.y - time * speed * 0.1) * 400.0) * 0.5 + 0.5;
          float scanline2 = sin((vUv.y + time * speed * 0.05) * 200.0) * 0.5 + 0.5;
          
          // Combine scanlines
          float scanlines = scanline1 * 0.7 + scanline2 * 0.3;
          scanlines = pow(scanlines, 2.0);
          
          // Fade at edges
          float fade = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          
          gl_FragColor = vec4(color, scanlines * intensity * fade);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.scanlinesMesh = new THREE.Mesh(scanlinesGeometry, scanlinesMaterial);
    this.scanlinesMesh.position.z = 0.02;
    this.group.add(this.scanlinesMesh);
  }

  /**
   * Create floating particle effect
   */
  private createParticleEffect(): void {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random positions around billboard
      positions[i3] = (Math.random() - 0.5) * this.config.width * 1.5;
      positions[i3 + 1] = (Math.random() - 0.5) * this.config.height * 1.5;
      positions[i3 + 2] = (Math.random() - 0.5) * 2;
      
      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = Math.random() * 0.02 + 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
      
      sizes[i] = Math.random() * 0.3 + 0.1;
      lifetimes[i] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(this.config.colors.glow || this.config.colors.primary) },
        opacity: { value: 0.6 }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float size;
        attribute float lifetime;
        uniform float time;
        varying float vLifetime;
        varying float vSize;
        
        void main() {
          vLifetime = mod(lifetime + time * 0.1, 1.0);
          vSize = size;
          
          vec3 pos = position + velocity * vLifetime * 10.0;
          pos.y = mod(pos.y + 20.0, 40.0) - 20.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * 100.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying float vLifetime;
        varying float vSize;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= opacity * (1.0 - vLifetime);
          
          vec3 finalColor = color * (1.0 + vSize);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particleSystem = new THREE.Points(geometry, particleMaterial);
    this.group.add(this.particleSystem);
  }

  /**
   * Add decorative elements to make it look professional
   */
  private addDecorativeElements(): void {
    const { ctx, canvas } = this;
    
    // Add corner decorations
    ctx.strokeStyle = this.config.colors.text;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.config.colors.glow || this.config.colors.text;
    ctx.shadowBlur = 10;
    
    const cornerSize = 30;
    const margin = 20;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(margin, margin + cornerSize);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + cornerSize, margin);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(canvas.width - margin - cornerSize, margin);
    ctx.lineTo(canvas.width - margin, margin);
    ctx.lineTo(canvas.width - margin, margin + cornerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin - cornerSize);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(margin + cornerSize, canvas.height - margin);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(canvas.width - margin - cornerSize, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin - cornerSize);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }

  /**
   * Set up automatic content updates
   */
  public setUpdateCallback(callback: () => Promise<BillboardContent>): void {
    this.updateCallback = callback;
  }

  /**
   * Update billboard content
   */
  public updateContent(content: Partial<BillboardContent>): void {
    this.content = { ...this.content, ...content };
    
    // Format price if provided
    if (content.price !== undefined) {
      this.content.secondaryText = `$${content.price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
    
    this.content.lastUpdate = new Date();
    this.updateTexture();
  }

  /**
   * Update animation and fetch new data if needed
   */
  public update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.glitchTime += deltaTime;
    
    // Update glow animation
    if (this.glowMesh && this.glowMesh.material instanceof THREE.ShaderMaterial) {
      this.glowMesh.material.uniforms.time.value = this.animationTime;
    }
    
    // Update hologram effect
    if (this.hologramMesh && this.hologramMesh.material instanceof THREE.ShaderMaterial) {
      this.hologramMesh.material.uniforms.time.value = this.animationTime;
      
      // Occasional glitch effect
      if (this.config.glitchIntensity && Math.random() < this.config.glitchIntensity * deltaTime) {
        this.hologramMesh.material.uniforms.opacity.value = 0.3 + Math.random() * 0.2;
        setTimeout(() => {
          if (this.hologramMesh && this.hologramMesh.material instanceof THREE.ShaderMaterial) {
            this.hologramMesh.material.uniforms.opacity.value = 0.15;
          }
        }, 50 + Math.random() * 100);
      }
    }
    
    // Update scanlines
    if (this.scanlinesMesh && this.scanlinesMesh.material instanceof THREE.ShaderMaterial) {
      this.scanlinesMesh.material.uniforms.time.value = this.animationTime;
    }
    
    // Update particles
    if (this.particleSystem && this.particleSystem.material instanceof THREE.ShaderMaterial) {
      this.particleSystem.material.uniforms.time.value = this.animationTime;
      this.particleSystem.rotation.y = this.animationTime * 0.05;
    }
    
    // Fetch new data every 30 seconds
    if (this.updateCallback && this.animationTime % 30 < deltaTime) {
      this.updateCallback().then(newContent => {
        this.updateContent(newContent);
      }).catch(error => {
        console.warn('Failed to update billboard content:', error);
      });
    }
  }

  /**
   * Get the THREE.Group for adding to scene
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.texture.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
    
    if (this.glowMesh) {
      this.glowMesh.geometry.dispose();
      if (this.glowMesh.material instanceof THREE.ShaderMaterial) {
        this.glowMesh.material.dispose();
      }
    }
    
    if (this.hologramMesh) {
      this.hologramMesh.geometry.dispose();
      if (this.hologramMesh.material instanceof THREE.ShaderMaterial) {
        this.hologramMesh.material.dispose();
      }
    }
    
    if (this.scanlinesMesh) {
      this.scanlinesMesh.geometry.dispose();
      if (this.scanlinesMesh.material instanceof THREE.ShaderMaterial) {
        this.scanlinesMesh.material.dispose();
      }
    }
    
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      if (this.particleSystem.material instanceof THREE.ShaderMaterial) {
        this.particleSystem.material.dispose();
      }
    }
    
    if (this.frameMesh) {
      // Dispose frame group
      this.group.remove(this.frameMesh);
    }
    
    // Clean up canvas and context references
    this.ctx = null as any;
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null as any;
    
    // Clear update callback to prevent memory leaks
    this.updateCallback = undefined;
  }
}