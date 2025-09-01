import * as THREE from 'three';

/**
 * Generic object pool for efficient memory management
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  public get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  public release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.pool.push(obj);
    }
  }

  public clear(): void {
    this.pool.length = 0;
  }

  public get size(): number {
    return this.pool.length;
  }
}

/**
 * Specialized pools for common game objects
 */
export class GameObjectPools {
  private static instance: GameObjectPools;
  
  // Geometry pools
  public sphereGeometryPool: ObjectPool<THREE.SphereGeometry>;
  public capsuleGeometryPool: ObjectPool<THREE.CapsuleGeometry>;
  public ringGeometryPool: ObjectPool<THREE.RingGeometry>;
  
  // Material pools
  public basicMaterialPool: ObjectPool<THREE.MeshBasicMaterial>;
  public physicalMaterialPool: ObjectPool<THREE.MeshPhysicalMaterial>;
  public pointMaterialPool: ObjectPool<THREE.PointsMaterial>;
  
  // Projectile pool
  public projectilePool: ObjectPool<THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>;
  
  // Particle pools
  public particlePool: ObjectPool<THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>;
  public effectPool: ObjectPool<THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>;

  private constructor() {
    // Geometry pools
    this.sphereGeometryPool = new ObjectPool(
      () => new THREE.SphereGeometry(0.3, 8, 8),
      undefined,
      20
    );
    
    this.capsuleGeometryPool = new ObjectPool(
      () => new THREE.CapsuleGeometry(0.1, 1, 4, 8),
      undefined,
      10
    );
    
    this.ringGeometryPool = new ObjectPool(
      () => new THREE.RingGeometry(0.5, 2, 32),
      undefined,
      5
    );

    // Material pools with reset functions
    this.basicMaterialPool = new ObjectPool(
      () => new THREE.MeshBasicMaterial({ transparent: true }),
      (material) => {
        material.color.setHex(0xffffff);
        material.opacity = 1;
        material.visible = true;
        // MeshBasicMaterial doesn't have emissive property
      },
      50
    );

    this.physicalMaterialPool = new ObjectPool(
      () => new THREE.MeshPhysicalMaterial({ transparent: true }),
      (material) => {
        material.color.setHex(0xffffff);
        material.opacity = 1;
        material.visible = true;
        // MeshBasicMaterial doesn't have emissive property
        material.emissiveIntensity = 0;
        material.metalness = 0.5;
        material.roughness = 0.5;
      },
      20
    );

    this.pointMaterialPool = new ObjectPool(
      () => new THREE.PointsMaterial({ transparent: true, vertexColors: true }),
      (material) => {
        material.size = 1;
        material.opacity = 1;
        material.visible = true;
        material.color.setHex(0xffffff);
      },
      30
    );

    // Projectile pool
    this.projectilePool = new ObjectPool<THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>(
      () => {
        const geometry = this.capsuleGeometryPool.get();
        const material = this.basicMaterialPool.get();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { pooled: true };
        return mesh;
      },
      (projectile) => {
        projectile.position.set(0, 0, 0);
        projectile.rotation.set(0, 0, 0);
        projectile.scale.set(1, 1, 1);
        projectile.visible = true;
        projectile.userData = { pooled: true };
        // Remove any attached lights
        projectile.children.forEach(child => {
          if (child instanceof THREE.Light) {
            projectile.remove(child);
          }
        });
      },
      100
    );

    // Particle effect pool
    this.particlePool = new ObjectPool<THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>(
      () => {
        const geometry = new THREE.SphereGeometry(0.1, 4, 4);
        const material = this.basicMaterialPool.get();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { pooled: true };
        return mesh;
      },
      (particle) => {
        particle.position.set(0, 0, 0);
        particle.rotation.set(0, 0, 0);
        particle.scale.set(1, 1, 1);
        particle.visible = true;
        particle.userData = { pooled: true };
      },
      200
    );

    // Effect pool for larger effects
    this.effectPool = new ObjectPool<THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>(
      () => {
        const geometry = this.sphereGeometryPool.get();
        const material = this.basicMaterialPool.get();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { pooled: true };
        return mesh;
      },
      (effect) => {
        effect.position.set(0, 0, 0);
        effect.rotation.set(0, 0, 0);
        effect.scale.set(1, 1, 1);
        effect.visible = true;
        effect.userData = { pooled: true };
      },
      50
    );
  }

  public static getInstance(): GameObjectPools {
    if (!GameObjectPools.instance) {
      GameObjectPools.instance = new GameObjectPools();
    }
    return GameObjectPools.instance;
  }

  /**
   * Release a projectile back to the pool
   */
  public releaseProjectile(projectile: THREE.Mesh, scene: THREE.Scene): void {
    if (projectile.userData.pooled) {
      scene.remove(projectile);
      this.projectilePool.release(projectile);
    } else {
      // Fallback for non-pooled objects
      scene.remove(projectile);
      if (projectile.geometry && typeof projectile.geometry.dispose === 'function') {
        projectile.geometry.dispose();
      }
      if (projectile.material && typeof (projectile.material as THREE.Material).dispose === 'function') {
        (projectile.material as THREE.Material).dispose();
      }
    }
  }

  /**
   * Release a particle back to the pool
   */
  public releaseParticle(particle: THREE.Mesh, scene: THREE.Scene): void {
    if (particle.userData.pooled) {
      scene.remove(particle);
      this.particlePool.release(particle);
    } else {
      // Fallback for non-pooled objects
      scene.remove(particle);
      if (particle.geometry && typeof particle.geometry.dispose === 'function') {
        particle.geometry.dispose();
      }
      if (particle.material && typeof (particle.material as THREE.Material).dispose === 'function') {
        (particle.material as THREE.Material).dispose();
      }
    }
  }

  /**
   * Release an effect back to the pool
   */
  public releaseEffect(effect: THREE.Mesh, scene: THREE.Scene): void {
    if (effect.userData.pooled) {
      scene.remove(effect);
      this.effectPool.release(effect);
    } else {
      // Fallback for non-pooled objects
      scene.remove(effect);
      if (effect.geometry && typeof effect.geometry.dispose === 'function') {
        effect.geometry.dispose();
      }
      if (effect.material && typeof (effect.material as THREE.Material).dispose === 'function') {
        (effect.material as THREE.Material).dispose();
      }
    }
  }

  /**
   * Clear all pools and dispose resources
   */
  public dispose(): void {
    this.sphereGeometryPool.clear();
    this.capsuleGeometryPool.clear();
    this.ringGeometryPool.clear();
    this.basicMaterialPool.clear();
    this.physicalMaterialPool.clear();
    this.pointMaterialPool.clear();
    this.projectilePool.clear();
    this.particlePool.clear();
    this.effectPool.clear();
  }
}

/**
 * Cached geometry manager for commonly used geometries
 */
export class GeometryCache {
  private static instance: GeometryCache;
  private cache = new Map<string, THREE.BufferGeometry>();

  private constructor() {}

  public static getInstance(): GeometryCache {
    if (!GeometryCache.instance) {
      GeometryCache.instance = new GeometryCache();
    }
    return GeometryCache.instance;
  }

  public getSphere(radius: number, widthSegments: number = 8, heightSegments: number = 6): THREE.SphereGeometry {
    const key = `sphere_${radius}_${widthSegments}_${heightSegments}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.SphereGeometry(radius, widthSegments, heightSegments));
    }
    return this.cache.get(key) as THREE.SphereGeometry;
  }

  public getCapsule(radius: number, length: number, capSubdivisions: number = 4, radialSegments: number = 8): THREE.CapsuleGeometry {
    const key = `capsule_${radius}_${length}_${capSubdivisions}_${radialSegments}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.CapsuleGeometry(radius, length, capSubdivisions, radialSegments));
    }
    return this.cache.get(key) as THREE.CapsuleGeometry;
  }

  public getRing(innerRadius: number, outerRadius: number, thetaSegments: number = 32): THREE.RingGeometry {
    const key = `ring_${innerRadius}_${outerRadius}_${thetaSegments}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments));
    }
    return this.cache.get(key) as THREE.RingGeometry;
  }

  public getCone(radius: number, height: number, radialSegments: number = 8): THREE.ConeGeometry {
    const key = `cone_${radius}_${height}_${radialSegments}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.ConeGeometry(radius, height, radialSegments));
    }
    return this.cache.get(key) as THREE.ConeGeometry;
  }

  public getPlane(width: number, height: number, widthSegments: number = 1, heightSegments: number = 1): THREE.PlaneGeometry {
    const key = `plane_${width}_${height}_${widthSegments}_${heightSegments}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.PlaneGeometry(width, height, widthSegments, heightSegments));
    }
    return this.cache.get(key) as THREE.PlaneGeometry;
  }

  public getTorus(radius: number, tube: number, radialSegments: number = 8, tubularSegments: number = 6): THREE.TorusGeometry {
    const key = `torus_${radius}_${tube}_${radialSegments}_${tubularSegments}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments));
    }
    return this.cache.get(key) as THREE.TorusGeometry;
  }

  public dispose(): void {
    this.cache.forEach(geometry => geometry.dispose());
    this.cache.clear();
  }
}

/**
 * Material cache for commonly used materials
 */
export class MaterialCache {
  private static instance: MaterialCache;
  private cache = new Map<string, THREE.Material>();

  private constructor() {}

  public static getInstance(): MaterialCache {
    if (!MaterialCache.instance) {
      MaterialCache.instance = new MaterialCache();
    }
    return MaterialCache.instance;
  }

  public getBasicMaterial(color: number, options: Partial<THREE.MeshBasicMaterialParameters> = {}): THREE.MeshBasicMaterial {
    const key = `basic_${color}_${JSON.stringify(options)}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.MeshBasicMaterial({ color, ...options }));
    }
    return this.cache.get(key) as THREE.MeshBasicMaterial;
  }

  public getPhysicalMaterial(color: number, options: Partial<THREE.MeshPhysicalMaterialParameters> = {}): THREE.MeshPhysicalMaterial {
    const key = `physical_${color}_${JSON.stringify(options)}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.MeshPhysicalMaterial({ color, ...options }));
    }
    return this.cache.get(key) as THREE.MeshPhysicalMaterial;
  }

  public dispose(): void {
    this.cache.forEach(material => material.dispose());
    this.cache.clear();
  }
}