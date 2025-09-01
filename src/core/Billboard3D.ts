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
  };
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  enableGradient?: boolean;
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
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
  private config: BillboardConfig;
  private content: BillboardContent;
  private animationTime: number = 0;
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
    
    // Create professional material with proper lighting
    this.material = new THREE.MeshPhysicalMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(this.config.colors.primary).multiplyScalar(0.1),
      emissiveMap: this.texture,
      metalness: 0.1,
      roughness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      envMapIntensity: 0.5
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);
  }

  /**
   * Create glow effect around the billboard
   */
  private createGlow(): void {
    const glowGeometry = new THREE.PlaneGeometry(
      this.config.width * 1.1, 
      this.config.height * 1.1
    );
    
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(this.config.colors.glow || this.config.colors.primary) },
        intensity: { value: 0.3 }
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
        varying vec2 vUv;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float glow = 1.0 - smoothstep(0.0, 0.7, dist);
          
          // Pulsing effect
          float pulse = sin(time * 2.0) * 0.2 + 0.8;
          glow *= pulse * intensity;
          
          gl_FragColor = vec4(color, glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.z = -0.01; // Slightly behind the main billboard
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
    
    // Update glow animation
    if (this.glowMesh && this.glowMesh.material instanceof THREE.ShaderMaterial) {
      this.glowMesh.material.uniforms.time.value = this.animationTime;
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