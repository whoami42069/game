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