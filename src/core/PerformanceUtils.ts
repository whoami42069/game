import * as THREE from 'three';

// Geometry caching system
export class GeometryCache {
  private static cache = new Map<string, THREE.BufferGeometry>();

  static get(key: string): THREE.BufferGeometry | undefined {
    return this.cache.get(key);
  }

  static set(key: string, geometry: THREE.BufferGeometry): void {
    this.cache.set(key, geometry);
  }

  static getOrCreate(key: string, creator: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geometry = this.cache.get(key);
    if (!geometry) {
      geometry = creator();
      this.cache.set(key, geometry);
    }
    return geometry;
  }

  static clear(): void {
    this.cache.forEach(geometry => geometry.dispose());
    this.cache.clear();
  }
}

// Material caching system
export class MaterialCache {
  private static cache = new Map<string, THREE.Material>();

  static get(key: string): THREE.Material | undefined {
    return this.cache.get(key);
  }

  static set(key: string, material: THREE.Material): void {
    this.cache.set(key, material);
  }

  static getOrCreate(key: string, creator: () => THREE.Material): THREE.Material {
    let material = this.cache.get(key);
    if (!material) {
      material = creator();
      this.cache.set(key, material);
    }
    return material;
  }

  static clear(): void {
    this.cache.forEach(material => material.dispose());
    this.cache.clear();
  }
}

// LOD Manager for level of detail
export class LODManager {
  private lodGroups: THREE.LOD[] = [];

  addLOD(lod: THREE.LOD): void {
    this.lodGroups.push(lod);
  }

  update(camera: THREE.Camera): void {
    this.lodGroups.forEach(lod => {
      lod.update(camera);
    });
  }

  clear(): void {
    this.lodGroups = [];
  }
}

// Instanced rendering helper
export class InstancedRenderer {
  private mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private count: number = 0;
  private maxCount: number;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, maxCount: number) {
    this.maxCount = maxCount;
    this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  setInstance(index: number, position: THREE.Vector3, rotation?: THREE.Euler, scale?: THREE.Vector3): void {
    this.dummy.position.copy(position);
    if (rotation) this.dummy.rotation.copy(rotation);
    if (scale) this.dummy.scale.copy(scale);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
  }

  updateCount(count: number): void {
    this.count = Math.min(count, this.maxCount);
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getMesh(): THREE.InstancedMesh {
    return this.mesh;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    } else if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(m => m.dispose());
    }
  }
}

// Performance monitor
export class PerformanceMonitor {
  private fps: number = 60;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private updateInterval: number = 500; // Update every 500ms
  
  public averageFPS: number = 60;
  public minFPS: number = 60;
  public maxFPS: number = 60;
  
  private fpsHistory: number[] = [];
  private historySize: number = 60;

  update(): void {
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    if (deltaTime >= this.updateInterval) {
      this.fps = (this.frameCount * 1000) / deltaTime;
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Update history
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.historySize) {
        this.fpsHistory.shift();
      }

      // Calculate stats
      if (this.fpsHistory.length > 0) {
        this.averageFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        this.minFPS = Math.min(...this.fpsHistory);
        this.maxFPS = Math.max(...this.fpsHistory);
      }
    }
  }

  getFPS(): number {
    return this.fps;
  }

  getQualityLevel(): 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL' {
    if (this.averageFPS >= 55) return 'HIGH';
    if (this.averageFPS >= 45) return 'MEDIUM';
    if (this.averageFPS >= 30) return 'LOW';
    return 'MINIMAL';
  }

  reset(): void {
    this.fpsHistory = [];
    this.frameCount = 0;
    this.lastTime = performance.now();
  }
}

// Object pool for reusable objects
export class ObjectPool<T extends THREE.Object3D> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn());
    }
  }

  acquire(): T | null {
    let obj = this.available.pop();
    
    if (!obj && this.inUse.size < this.maxSize) {
      obj = this.createFn();
    }
    
    if (obj) {
      this.inUse.add(obj);
      return obj;
    }
    
    return null;
  }

  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.resetFn(obj);
      this.available.push(obj);
    }
  }

  clear(): void {
    this.available.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj);
    });
    this.inUse.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj);
    });
    this.available = [];
    this.inUse.clear();
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}