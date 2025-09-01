import * as THREE from 'three';

/**
 * Manages procedural texture generation and caching for the game
 */
export class TextureManager {
  private static instance: TextureManager;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private canvasCache: Map<string, HTMLCanvasElement> = new Map();

  private constructor() {}

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  /**
   * Generate platform texture with hexagonal pattern
   */
  public generatePlatformTexture(size: number = 512): {
    diffuse: THREE.Texture,
    normal: THREE.Texture,
    roughness: THREE.Texture,
    metalness: THREE.Texture
  } {
    const key = `platform_${size}`;
    
    // Check cache
    if (this.textureCache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.textureCache.get(`${key}_diffuse`)!,
        normal: this.textureCache.get(`${key}_normal`)!,
        roughness: this.textureCache.get(`${key}_roughness`)!,
        metalness: this.textureCache.get(`${key}_metalness`)!
      };
    }

    // Diffuse texture
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const diffuseCtx = diffuseCanvas.getContext('2d')!;
    
    // Create hexagonal pattern
    const gradient = diffuseCtx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#0f3460');
    gradient.addColorStop(1, '#16213e');
    diffuseCtx.fillStyle = gradient;
    diffuseCtx.fillRect(0, 0, size, size);
    
    // Add hexagonal grid lines
    diffuseCtx.strokeStyle = '#00ffff';
    diffuseCtx.lineWidth = 2;
    diffuseCtx.globalAlpha = 0.3;
    
    const hexSize = size / 8;
    for (let y = 0; y < size; y += hexSize) {
      for (let x = 0; x < size; x += hexSize) {
        diffuseCtx.strokeRect(x, y, hexSize, hexSize);
      }
    }
    
    // Add some tech details
    diffuseCtx.globalAlpha = 0.2;
    diffuseCtx.fillStyle = '#00ffff';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 2 + Math.random() * 4;
      diffuseCtx.beginPath();
      diffuseCtx.arc(x, y, radius, 0, Math.PI * 2);
      diffuseCtx.fill();
    }
    
    const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    
    // Normal map
    const normalCanvas = this.generateNormalMap(size, 0.5);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    
    // Roughness map
    const roughnessCanvas = this.generateNoiseTexture(size, 0.1, 0.3);
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    
    // Metalness map
    const metalnessCanvas = this.generateNoiseTexture(size, 0.8, 1.0);
    const metalnessTexture = new THREE.CanvasTexture(metalnessCanvas);
    metalnessTexture.wrapS = THREE.RepeatWrapping;
    metalnessTexture.wrapT = THREE.RepeatWrapping;
    
    // Cache textures
    this.textureCache.set(`${key}_diffuse`, diffuseTexture);
    this.textureCache.set(`${key}_normal`, normalTexture);
    this.textureCache.set(`${key}_roughness`, roughnessTexture);
    this.textureCache.set(`${key}_metalness`, metalnessTexture);
    
    return {
      diffuse: diffuseTexture,
      normal: normalTexture,
      roughness: roughnessTexture,
      metalness: metalnessTexture
    };
  }

  /**
   * Generate asteroid texture
   */
  public generateAsteroidTexture(size: number = 256): {
    diffuse: THREE.Texture,
    normal: THREE.Texture,
    roughness: THREE.Texture,
    metalness: THREE.Texture
  } {
    const key = `asteroid_${size}`;
    
    // Check cache
    if (this.textureCache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.textureCache.get(`${key}_diffuse`)!,
        normal: this.textureCache.get(`${key}_normal`)!,
        roughness: this.textureCache.get(`${key}_roughness`)!,
        metalness: this.textureCache.get(`${key}_metalness`)!
      };
    }

    // Diffuse texture - rocky surface
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const diffuseCtx = diffuseCanvas.getContext('2d')!;
    
    // Base rock color
    diffuseCtx.fillStyle = '#3a3a3a';
    diffuseCtx.fillRect(0, 0, size, size);
    
    // Add noise for texture
    const imageData = diffuseCtx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 40 - 20;
      data[i] += noise;     // R
      data[i + 1] += noise; // G
      data[i + 2] += noise; // B
    }
    
    diffuseCtx.putImageData(imageData, 0, 0);
    
    // Add some craters
    diffuseCtx.globalAlpha = 0.3;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 5 + Math.random() * 15;
      
      const gradient = diffuseCtx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, '#000000');
      gradient.addColorStop(1, 'transparent');
      
      diffuseCtx.fillStyle = gradient;
      diffuseCtx.beginPath();
      diffuseCtx.arc(x, y, radius, 0, Math.PI * 2);
      diffuseCtx.fill();
    }
    
    const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
    
    // Generate other maps
    const normalTexture = new THREE.CanvasTexture(this.generateNormalMap(size, 1.0));
    const roughnessTexture = new THREE.CanvasTexture(this.generateNoiseTexture(size, 0.7, 1.0));
    const metalnessTexture = new THREE.CanvasTexture(this.generateNoiseTexture(size, 0.0, 0.2));
    
    // Cache textures
    this.textureCache.set(`${key}_diffuse`, diffuseTexture);
    this.textureCache.set(`${key}_normal`, normalTexture);
    this.textureCache.set(`${key}_roughness`, roughnessTexture);
    this.textureCache.set(`${key}_metalness`, metalnessTexture);
    
    return {
      diffuse: diffuseTexture,
      normal: normalTexture,
      roughness: roughnessTexture,
      metalness: metalnessTexture
    };
  }

  /**
   * Generate metal hull texture for spaceship
   */
  public generateMetalHullTexture(size: number = 256): {
    diffuse: THREE.Texture,
    normal: THREE.Texture,
    roughness: THREE.Texture,
    metalness: THREE.Texture
  } {
    const key = `metal_hull_${size}`;
    
    // Check cache
    if (this.textureCache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.textureCache.get(`${key}_diffuse`)!,
        normal: this.textureCache.get(`${key}_normal`)!,
        roughness: this.textureCache.get(`${key}_roughness`)!,
        metalness: this.textureCache.get(`${key}_metalness`)!
      };
    }

    // Diffuse texture - metallic surface with panel lines
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const diffuseCtx = diffuseCanvas.getContext('2d')!;
    
    // Base metal color
    const gradient = diffuseCtx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2a3f5f');
    gradient.addColorStop(0.5, '#1e3a5f');
    gradient.addColorStop(1, '#162447');
    diffuseCtx.fillStyle = gradient;
    diffuseCtx.fillRect(0, 0, size, size);
    
    // Add panel lines
    diffuseCtx.strokeStyle = '#0a1929';
    diffuseCtx.lineWidth = 2;
    
    // Horizontal lines
    for (let y = 0; y < size; y += size / 4) {
      diffuseCtx.beginPath();
      diffuseCtx.moveTo(0, y);
      diffuseCtx.lineTo(size, y);
      diffuseCtx.stroke();
    }
    
    // Vertical lines
    for (let x = 0; x < size; x += size / 6) {
      diffuseCtx.beginPath();
      diffuseCtx.moveTo(x, 0);
      diffuseCtx.lineTo(x, size);
      diffuseCtx.stroke();
    }
    
    // Add some rivets
    diffuseCtx.fillStyle = '#1a1a1a';
    for (let y = 0; y < size; y += size / 4) {
      for (let x = 0; x < size; x += size / 8) {
        diffuseCtx.beginPath();
        diffuseCtx.arc(x, y, 2, 0, Math.PI * 2);
        diffuseCtx.fill();
      }
    }
    
    const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    
    // Generate other maps
    const normalTexture = new THREE.CanvasTexture(this.generateNormalMap(size, 0.3));
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    
    const roughnessTexture = new THREE.CanvasTexture(this.generateNoiseTexture(size, 0.05, 0.2));
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    
    const metalnessTexture = new THREE.CanvasTexture(this.generateNoiseTexture(size, 0.9, 1.0));
    metalnessTexture.wrapS = THREE.RepeatWrapping;
    metalnessTexture.wrapT = THREE.RepeatWrapping;
    
    // Cache textures
    this.textureCache.set(`${key}_diffuse`, diffuseTexture);
    this.textureCache.set(`${key}_normal`, normalTexture);
    this.textureCache.set(`${key}_roughness`, roughnessTexture);
    this.textureCache.set(`${key}_metalness`, metalnessTexture);
    
    return {
      diffuse: diffuseTexture,
      normal: normalTexture,
      roughness: roughnessTexture,
      metalness: metalnessTexture
    };
  }

  /**
   * Generate a normal map from noise
   */
  private generateNormalMap(size: number, intensity: number = 1.0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Create height map first
    const heightMap: number[][] = [];
    for (let y = 0; y < size; y++) {
      heightMap[y] = [];
      for (let x = 0; x < size; x++) {
        // Simple noise function
        const noise1 = Math.sin(x * 0.1) * Math.cos(y * 0.1);
        const noise2 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
        heightMap[y][x] = (noise1 + noise2 * 0.5) * intensity;
      }
    }
    
    // Convert height map to normal map
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        
        // Calculate normal from height differences
        const left = x > 0 ? heightMap[y][x - 1] : heightMap[y][x];
        const right = x < size - 1 ? heightMap[y][x + 1] : heightMap[y][x];
        const top = y > 0 ? heightMap[y - 1][x] : heightMap[y][x];
        const bottom = y < size - 1 ? heightMap[y + 1][x] : heightMap[y][x];
        
        // Normal vector components
        const nx = (left - right) * 2.0;
        const ny = (top - bottom) * 2.0;
        const nz = 1.0;
        
        // Normalize
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
        
        // Convert to RGB (0-255 range)
        data[idx] = ((nx / length) + 1.0) * 127.5;     // R
        data[idx + 1] = ((ny / length) + 1.0) * 127.5; // G
        data[idx + 2] = ((nz / length) + 1.0) * 127.5; // B
        data[idx + 3] = 255;                           // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Generate a noise texture for roughness/metalness
   */
  private generateNoiseTexture(size: number, minValue: number, maxValue: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const value = minValue + Math.random() * (maxValue - minValue);
      const grayValue = Math.floor(value * 255);
      data[i] = grayValue;     // R
      data[i + 1] = grayValue; // G
      data[i + 2] = grayValue; // B
      data[i + 3] = 255;       // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Generate battle-damaged hull texture with weathering and scratches
   */
  public generateBattleDamagedHullTexture(size: number = 512, damageLevel: number = 0.4): {
    diffuse: THREE.Texture,
    normal: THREE.Texture,
    roughness: THREE.Texture,
    metalness: THREE.Texture,
    ao: THREE.Texture,
    emissive: THREE.Texture
  } {
    const key = `battle_hull_${size}_${damageLevel}`;
    
    // Check cache
    if (this.textureCache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.textureCache.get(`${key}_diffuse`)!,
        normal: this.textureCache.get(`${key}_normal`)!,
        roughness: this.textureCache.get(`${key}_roughness`)!,
        metalness: this.textureCache.get(`${key}_metalness`)!,
        ao: this.textureCache.get(`${key}_ao`)!,
        emissive: this.textureCache.get(`${key}_emissive`)!
      };
    }

    // Enhanced diffuse with battle damage
    const diffuseCanvas = this.createBattleDamagedDiffuse(size, damageLevel);
    const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    diffuseTexture.generateMipmaps = true;
    
    // Enhanced normal map with deep scratches
    const normalCanvas = this.createBattleDamagedNormal(size, damageLevel);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.generateMipmaps = true;
    
    // Variable roughness (scratched areas are rougher)
    const roughnessCanvas = this.createBattleDamagedRoughness(size, damageLevel);
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    
    // Metalness variation (exposed metal vs paint)
    const metalnessCanvas = this.createBattleDamagedMetalness(size, damageLevel);
    const metalnessTexture = new THREE.CanvasTexture(metalnessCanvas);
    metalnessTexture.wrapS = THREE.RepeatWrapping;
    metalnessTexture.wrapT = THREE.RepeatWrapping;
    
    // Ambient occlusion for depth
    const aoCanvas = this.createAmbientOcclusionMap(size);
    const aoTexture = new THREE.CanvasTexture(aoCanvas);
    aoTexture.wrapS = THREE.RepeatWrapping;
    aoTexture.wrapT = THREE.RepeatWrapping;
    
    // Emissive map for glowing elements
    const emissiveCanvas = this.createEmissiveMap(size);
    const emissiveTexture = new THREE.CanvasTexture(emissiveCanvas);
    emissiveTexture.wrapS = THREE.RepeatWrapping;
    emissiveTexture.wrapT = THREE.RepeatWrapping;

    // Cache textures
    this.textureCache.set(`${key}_diffuse`, diffuseTexture);
    this.textureCache.set(`${key}_normal`, normalTexture);
    this.textureCache.set(`${key}_roughness`, roughnessTexture);
    this.textureCache.set(`${key}_metalness`, metalnessTexture);
    this.textureCache.set(`${key}_ao`, aoTexture);
    this.textureCache.set(`${key}_emissive`, emissiveTexture);
    
    return {
      diffuse: diffuseTexture,
      normal: normalTexture,
      roughness: roughnessTexture,
      metalness: metalnessTexture,
      ao: aoTexture,
      emissive: emissiveTexture
    };
  }
  
  private createBattleDamagedDiffuse(size: number, damageLevel: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Base metal color with gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2a3f5f');
    gradient.addColorStop(0.3, '#1e3a5f');
    gradient.addColorStop(0.7, '#162447');
    gradient.addColorStop(1, '#0f1c2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Add panel lines with weathering
    ctx.strokeStyle = '#0a1929';
    ctx.lineWidth = 3;
    
    // Horizontal panels
    for (let y = 0; y < size; y += size / 8) {
      ctx.globalAlpha = 0.8 + Math.random() * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (Math.random() - 0.5) * 5);
      ctx.stroke();
    }
    
    // Vertical panels with variation
    for (let x = 0; x < size; x += size / 12) {
      ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, size);
      ctx.stroke();
    }
    
    // Add battle damage - scratches
    ctx.globalAlpha = 1;
    const scratchCount = Math.floor(damageLevel * 30);
    for (let i = 0; i < scratchCount; i++) {
      const x1 = Math.random() * size;
      const y1 = Math.random() * size;
      const length = 20 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;
      
      ctx.strokeStyle = Math.random() > 0.5 ? '#1a1a1a' : '#8B4513';
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Add bullet holes
    const holeCount = Math.floor(damageLevel * 15);
    for (let i = 0; i < holeCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 3 + Math.random() * 8;
      
      const holeGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      holeGradient.addColorStop(0, '#000000');
      holeGradient.addColorStop(0.5, '#1a1a1a');
      holeGradient.addColorStop(1, '#2a3f5f');
      
      ctx.fillStyle = holeGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Heat discoloration around edges
    const heatGradient = ctx.createRadialGradient(size/2, size/2, size/4, size/2, size/2, size/2);
    heatGradient.addColorStop(0, 'rgba(0,0,0,0)');
    heatGradient.addColorStop(0.7, 'rgba(139,69,19,0.1)');
    heatGradient.addColorStop(1, 'rgba(139,69,19,0.3)');
    ctx.fillStyle = heatGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Rust streaks
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < damageLevel * 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size / 2;
      const streakLength = 30 + Math.random() * 100;
      
      const rustGradient = ctx.createLinearGradient(x, y, x, y + streakLength);
      rustGradient.addColorStop(0, 'rgba(139,69,19,0.5)');
      rustGradient.addColorStop(1, 'rgba(139,69,19,0)');
      
      ctx.fillStyle = rustGradient;
      ctx.fillRect(x - 2, y, 4, streakLength);
    }
    
    // Warning markings
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#FF4500';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    
    // Add some warning stripes
    for (let i = 0; i < 3; i++) {
      const x = size * 0.1 + i * size * 0.3;
      const y = size * 0.8;
      ctx.fillRect(x, y, 20, 5);
      ctx.strokeRect(x, y, 20, 5);
    }
    
    return canvas;
  }
  
  private createBattleDamagedNormal(size: number, damageLevel: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Create detailed height map
    const heightMap: number[][] = [];
    for (let y = 0; y < size; y++) {
      heightMap[y] = [];
      for (let x = 0; x < size; x++) {
        // Base surface detail
        const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
        const noise2 = Math.sin(x * 0.1) * Math.cos(y * 0.1);
        const noise3 = Math.sin(x * 0.2) * Math.cos(y * 0.2);
        
        let height = (noise1 + noise2 * 0.5 + noise3 * 0.25) * 1.5;
        
        // Add damage depth variations
        const damageNoise = Math.random() < damageLevel * 0.1 ? -Math.random() * 2 : 0;
        height += damageNoise;
        
        heightMap[y][x] = height;
      }
    }
    
    // Add deep scratches to height map
    const scratchCount = Math.floor(damageLevel * 20);
    for (let i = 0; i < scratchCount; i++) {
      const x1 = Math.floor(Math.random() * size);
      const y1 = Math.floor(Math.random() * size);
      const length = 20 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;
      
      for (let t = 0; t < length; t++) {
        const x = Math.floor(x1 + Math.cos(angle) * t);
        const y = Math.floor(y1 + Math.sin(angle) * t);
        if (x >= 0 && x < size && y >= 0 && y < size) {
          heightMap[y][x] -= 1 + Math.random();
        }
      }
    }
    
    // Convert height map to normal map
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        
        // Calculate normal from height differences
        const left = x > 0 ? heightMap[y][x - 1] : heightMap[y][x];
        const right = x < size - 1 ? heightMap[y][x + 1] : heightMap[y][x];
        const top = y > 0 ? heightMap[y - 1][x] : heightMap[y][x];
        const bottom = y < size - 1 ? heightMap[y + 1][x] : heightMap[y][x];
        
        // Normal vector components
        const nx = (left - right) * 2.0;
        const ny = (top - bottom) * 2.0;
        const nz = 1.0;
        
        // Normalize
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
        
        // Convert to RGB (0-255 range)
        data[idx] = ((nx / length) + 1.0) * 127.5;
        data[idx + 1] = ((ny / length) + 1.0) * 127.5;
        data[idx + 2] = ((nz / length) + 1.0) * 127.5;
        data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
  
  private createBattleDamagedRoughness(size: number, damageLevel: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Base roughness
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, size, size);
    
    // Smoother areas (less damaged)
    const smoothAreas = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < smoothAreas; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 30 + Math.random() * 50;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(1, '#333333');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Rough damaged areas
    const roughAreas = Math.floor(damageLevel * 20);
    for (let i = 0; i < roughAreas; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 10 + Math.random() * 30;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, '#cccccc');
      gradient.addColorStop(1, '#333333');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add noise
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
  
  private createBattleDamagedMetalness(size: number, damageLevel: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // High metalness base
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0, 0, size, size);
    
    // Non-metallic paint areas
    const paintAreas = 10 - Math.floor(damageLevel * 5);
    for (let i = 0; i < paintAreas; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 20 + Math.random() * 40;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, '#666666');
      gradient.addColorStop(1, '#e6e6e6');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Exposed metal (high metalness) in damaged areas
    const exposedAreas = Math.floor(damageLevel * 15);
    for (let i = 0; i < exposedAreas; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 5 + Math.random() * 20;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas;
  }
  
  private createAmbientOcclusionMap(size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Base AO
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, size, size);
    
    // Panel line shadows
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 4;
    
    for (let y = 0; y < size; y += size / 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    
    for (let x = 0; x < size; x += size / 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    
    // Corner darkening
    const cornerGradient = ctx.createRadialGradient(size/2, size/2, size/4, size/2, size/2, size/1.5);
    cornerGradient.addColorStop(0, 'rgba(255,255,255,0)');
    cornerGradient.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    cornerGradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = cornerGradient;
    ctx.fillRect(0, 0, size, size);
    
    return canvas;
  }
  
  private createEmissiveMap(size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Black base (no emission)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    // Add glowing elements - energy lines
    ctx.strokeStyle = '#004466';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    
    // Energy conduits
    for (let i = 0; i < 3; i++) {
      const y = size * 0.3 + i * size * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    
    // Power nodes
    ctx.fillStyle = '#006699';
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 3 + Math.random() * 5;
      
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glowGradient.addColorStop(0, '#00aaff');
      glowGradient.addColorStop(0.5, '#004466');
      glowGradient.addColorStop(1, '#000000');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas;
  }

  /**
   * Generate crystalline material textures for boss
   */
  public generateCrystallineTexture(size: number = 256, corruptionLevel: number = 1.0): {
    diffuse: THREE.Texture,
    normal: THREE.Texture,
    roughness: THREE.Texture,
    metalness: THREE.Texture,
    emissive: THREE.Texture
  } {
    const key = `crystalline_${size}_${corruptionLevel}`;
    
    if (this.textureCache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.textureCache.get(`${key}_diffuse`)!,
        normal: this.textureCache.get(`${key}_normal`)!,
        roughness: this.textureCache.get(`${key}_roughness`)!,
        metalness: this.textureCache.get(`${key}_metalness`)!,
        emissive: this.textureCache.get(`${key}_emissive`)!
      };
    }

    // Crystalline diffuse
    const diffuseCanvas = this.createCrystallineDiffuse(size, corruptionLevel);
    const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
    
    // Crystal facet normals
    const normalCanvas = this.createCrystallineNormal(size);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    
    // Very smooth crystal surface
    const roughnessCanvas = this.generateNoiseTexture(size, 0.05, 0.15);
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
    
    // Slight metallic sheen
    const metalnessCanvas = this.generateNoiseTexture(size, 0.1, 0.3);
    const metalnessTexture = new THREE.CanvasTexture(metalnessCanvas);
    
    // Glowing corruption veins
    const emissiveCanvas = this.createCrystallineEmissive(size, corruptionLevel);
    const emissiveTexture = new THREE.CanvasTexture(emissiveCanvas);
    
    // Cache textures
    this.textureCache.set(`${key}_diffuse`, diffuseTexture);
    this.textureCache.set(`${key}_normal`, normalTexture);
    this.textureCache.set(`${key}_roughness`, roughnessTexture);
    this.textureCache.set(`${key}_metalness`, metalnessTexture);
    this.textureCache.set(`${key}_emissive`, emissiveTexture);
    
    return {
      diffuse: diffuseTexture,
      normal: normalTexture,
      roughness: roughnessTexture,
      metalness: metalnessTexture,
      emissive: emissiveTexture
    };
  }
  
  private createCrystallineDiffuse(size: number, corruptionLevel: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Dark purple crystalline base
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#4a0080');
    gradient.addColorStop(0.3, '#660099');
    gradient.addColorStop(0.7, '#8800cc');
    gradient.addColorStop(1, '#aa00ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Voronoi-like crystal facets
    const facetCount = 20;
    const points: { x: number, y: number, color: string }[] = [];
    
    for (let i = 0; i < facetCount; i++) {
      points.push({
        x: Math.random() * size,
        y: Math.random() * size,
        color: `hsl(${280 + Math.random() * 40}, ${70 + Math.random() * 30}%, ${20 + Math.random() * 30}%)`
      });
    }
    
    // Draw facets
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        let closest = 0;
        let minDist = Infinity;
        
        for (let i = 0; i < points.length; i++) {
          const dist = Math.sqrt((x - points[i].x) ** 2 + (y - points[i].y) ** 2);
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        }
        
        ctx.fillStyle = points[closest].color;
        ctx.fillRect(x, y, 4, 4);
      }
    }
    
    // Corruption veins
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 * corruptionLevel;
    
    for (let i = 0; i < corruptionLevel * 10; i++) {
      ctx.beginPath();
      const startX = Math.random() * size;
      const startY = Math.random() * size;
      ctx.moveTo(startX, startY);
      
      for (let j = 0; j < 5; j++) {
        const nextX = startX + (Math.random() - 0.5) * 100;
        const nextY = startY + (Math.random() - 0.5) * 100;
        ctx.lineTo(nextX, nextY);
      }
      
      ctx.stroke();
    }
    
    return canvas;
  }
  
  private createCrystallineNormal(size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Create faceted height map
    const heightMap: number[][] = [];
    const facetSize = size / 8;
    
    for (let y = 0; y < size; y++) {
      heightMap[y] = [];
      for (let x = 0; x < size; x++) {
        // Faceted surface
        const facetX = Math.floor(x / facetSize);
        const facetY = Math.floor(y / facetSize);
        const facetHeight = Math.sin(facetX * 1.5) * Math.cos(facetY * 1.5);
        
        // Add sharp edges
        const edgeX = (x % facetSize) / facetSize;
        const edgeY = (y % facetSize) / facetSize;
        const edgeFactor = Math.min(edgeX, 1 - edgeX, edgeY, 1 - edgeY);
        
        heightMap[y][x] = facetHeight * (1 - edgeFactor * 0.5) * 2;
      }
    }
    
    // Convert to normal map
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        
        const left = x > 0 ? heightMap[y][x - 1] : heightMap[y][x];
        const right = x < size - 1 ? heightMap[y][x + 1] : heightMap[y][x];
        const top = y > 0 ? heightMap[y - 1][x] : heightMap[y][x];
        const bottom = y < size - 1 ? heightMap[y + 1][x] : heightMap[y][x];
        
        const nx = (left - right) * 3.0;
        const ny = (top - bottom) * 3.0;
        const nz = 1.0;
        
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
        
        data[idx] = ((nx / length) + 1.0) * 127.5;
        data[idx + 1] = ((ny / length) + 1.0) * 127.5;
        data[idx + 2] = ((nz / length) + 1.0) * 127.5;
        data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
  
  private createCrystallineEmissive(size: number, corruptionLevel: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Black base
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    // Glowing corruption veins
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00ff';
    
    for (let i = 0; i < corruptionLevel * 15; i++) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.7;
      ctx.beginPath();
      
      const startX = Math.random() * size;
      const startY = Math.random() * size;
      ctx.moveTo(startX, startY);
      
      // Lightning-like pattern
      let currentX = startX;
      let currentY = startY;
      
      for (let j = 0; j < 8; j++) {
        currentX += (Math.random() - 0.5) * 40;
        currentY += (Math.random() - 0.5) * 40;
        ctx.lineTo(currentX, currentY);
      }
      
      ctx.stroke();
    }
    
    // Pulsing energy cores
    ctx.fillStyle = '#ff00aa';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff00aa';
    
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 5 + Math.random() * 10;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#ff00ff');
      gradient.addColorStop(0.7, '#aa00aa');
      gradient.addColorStop(1, '#000000');
      
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas;
  }

  /**
   * Dispose all cached textures
   */
  public dispose(): void {
    this.textureCache.forEach(texture => {
      texture.dispose();
    });
    this.textureCache.clear();
    this.canvasCache.clear();
  }
}