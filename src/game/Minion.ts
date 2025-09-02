import * as THREE from 'three';

export class Minion {
    public mesh: THREE.Group;
    private scene: THREE.Scene;
    private health: number = 1;
    private isDead: boolean = false;
    private fireRate: number = 4000; // Fire every 4 seconds
    private lastFireTime: number = 0;
    private projectileSpeed: number = 7; // Reduced from 10 for slower bullets
    private spawnTime: number;
    private spawnProtectionDuration: number = 2000; // 2 seconds spawn protection
    private dropChance: number = 0.05; // 5% drop chance
    private bodyMaterial!: THREE.MeshPhysicalMaterial;
    private position: THREE.Vector3;
    private core!: THREE.Mesh;
    private rings: THREE.Mesh[] = [];
    private particleSystem: THREE.Points | null = null;
    private activeAnimations: Set<number> = new Set();

    constructor(scene: THREE.Scene, position: THREE.Vector3) {
        this.scene = scene;
        this.position = position.clone();
        this.spawnTime = Date.now();
        this.mesh = new THREE.Group();
        
        this.createMinionMesh();
        this.createParticleEffects();
    }

    private createMinionMesh(): void {
        // Create main body (crystalline dodecahedron)
        const geometry = new THREE.DodecahedronGeometry(0.8, 0);
        
        // Create material with neon purple/violet theme
        this.bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0.6, 0.2, 0.8),
            emissive: new THREE.Color(0.8, 0.3, 1),
            emissiveIntensity: 2,
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            transmission: 0.3,
            ior: 1.5
        });
        
        const body = new THREE.Mesh(geometry, this.bodyMaterial);
        this.mesh.add(body);
        
        // Add energy core (inner glow)
        const coreGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(1, 0.5, 1),
            transparent: true,
            opacity: 0.7
        });
        this.core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.mesh.add(this.core);
        
        // Add floating energy rings
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.TorusGeometry(1.5 + i * 0.3, 0.05, 8, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0.8, 0.2, 1),
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.y = (i - 1) * 0.4;
            this.rings.push(ring);
            this.mesh.add(ring);
        }
        
        this.mesh.position.copy(this.position);
        this.mesh.position.y = this.position.y; // Use the position's Y value
        
        // Spawn animation
        this.mesh.scale.set(0, 0, 0);
        const duration = 500;
        const startTime = Date.now();
        let animId: number;
        
        const animateSpawn = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const scale = progress;
            this.mesh.scale.set(scale, scale, scale);
            
            if (progress < 1) {
                animId = requestAnimationFrame(animateSpawn);
                this.activeAnimations.add(animId);
            } else {
                this.activeAnimations.delete(animId);
            }
        };
        animateSpawn();
        
        this.scene.add(this.mesh);
    }

    private createParticleEffects(): void {
        // Create ambient particle effect around minion
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Random positions in a sphere around the minion
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = 1.5 + Math.random() * 0.5;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Purple colors
            colors[i3] = 1;
            colors[i3 + 1] = 0;
            colors[i3 + 2] = 1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.mesh.add(this.particleSystem);
    }

    public update(playerPosition: THREE.Vector3, _deltaTime: number): THREE.Mesh[] | null {
        if (this.isDead) return null;
        
        const currentTime = Date.now();
        const canShoot = currentTime - this.spawnTime > this.spawnProtectionDuration;
        
        // Keep minion at player height with small floating animation
        this.mesh.position.y = this.position.y + Math.sin(currentTime * 0.002) * 0.2;
        this.mesh.rotation.y += 0.01;
        
        // Animate rings
        this.rings.forEach((ring, i) => {
            ring.rotation.y += 0.02 * (i + 1);
            ring.rotation.x = Math.sin(currentTime * 0.001 + i) * 0.1;
        });
        
        // Animate particles
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.005;
        }
        
        // Look at player
        const direction = playerPosition.clone().sub(this.mesh.position);
        direction.y = 0;
        if (direction.length() > 0) {
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;
        }
        
        // Shoot at player if spawn protection is over
        let projectiles: THREE.Mesh[] | null = null;
        if (canShoot && currentTime - this.lastFireTime > this.fireRate) {
            projectiles = this.shoot(playerPosition);
            this.lastFireTime = currentTime;
        }
        
        // Visual indication of spawn protection
        if (!canShoot) {
            const protectionProgress = (currentTime - this.spawnTime) / this.spawnProtectionDuration;
            this.bodyMaterial.emissiveIntensity = 2 + Math.sin(protectionProgress * Math.PI * 4) * 2;
        } else {
            this.bodyMaterial.emissiveIntensity = 2;
        }
        
        return projectiles;
    }

    private shoot(targetPosition: THREE.Vector3): THREE.Mesh[] {
        const projectiles: THREE.Mesh[] = [];
        
        // Create neon purple projectile
        const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.9
        });
        
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.position.copy(this.mesh.position);
        projectile.position.y = this.mesh.position.y;
        
        // Calculate direction
        const direction = targetPosition.clone().sub(projectile.position).normalize();
        
        // Store projectile data - matching game's projectile system
        projectile.userData = {
            velocity: direction.multiplyScalar(this.projectileSpeed),
            damage: 5,
            owner: 'minion'
        };
        
        projectiles.push(projectile);
        
        // Create muzzle flash
        this.createMuzzleFlash(projectile.position);
        
        return projectiles;
    }

    private createMuzzleFlash(position: THREE.Vector3): void {
        const flashGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(1, 0.5, 1),
            transparent: true,
            opacity: 0.8
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Animate and destroy
        const startTime = Date.now();
        const duration = 200;
        let animId: number;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                flash.scale.setScalar(1 + progress * 2);
                flashMaterial.opacity = 0.8 * (1 - progress);
                animId = requestAnimationFrame(animate);
                this.activeAnimations.add(animId);
            } else {
                this.scene.remove(flash);
                flashGeometry.dispose();
                flashMaterial.dispose();
                if (animId) this.activeAnimations.delete(animId);
            }
        };
        animate();
    }

    // Removed updateProjectiles - projectiles now handled by Game.ts

    public takeDamage(damage: number): boolean {
        if (this.isDead) return false;
        
        this.health -= damage;
        
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        // Hit effect
        this.createHitEffect();
        return false;
    }

    private createHitEffect(): void {
        // Flash the minion
        const originalEmissive = this.bodyMaterial.emissiveIntensity;
        this.bodyMaterial.emissiveIntensity = 10;
        
        setTimeout(() => {
            if (this.bodyMaterial) {
                this.bodyMaterial.emissiveIntensity = originalEmissive;
            }
        }, 100);
    }

    private die(): void {
        this.isDead = true;
        
        // Death explosion effect
        this.createDeathExplosion();
        
        // Check for drops
        if (Math.random() < this.dropChance) {
            this.dropItem();
        }
        
        // Projectiles now handled by Game.ts
        
        // Death animation then dispose
        const startTime = Date.now();
        const duration = 300;
        let animId: number;
        
        const animateDeath = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const scale = 1 - progress;
            
            this.mesh.scale.set(scale, scale, scale);
            
            if (progress < 1) {
                animId = requestAnimationFrame(animateDeath);
                this.activeAnimations.add(animId);
            } else {
                if (animId) this.activeAnimations.delete(animId);
                this.dispose();
            }
        };
        animateDeath();
    }

    private createDeathExplosion(): void {
        // Create explosion particles
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            positions[i3] = 0;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = 0;
            
            // Random velocities
            velocities[i3] = (Math.random() - 0.5) * 10;
            velocities[i3 + 1] = Math.random() * 10;
            velocities[i3 + 2] = (Math.random() - 0.5) * 10;
            
            // Purple colors
            colors[i3] = 1;
            colors[i3 + 1] = 0;
            colors[i3 + 2] = 1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const explosion = new THREE.Points(geometry, material);
        explosion.position.copy(this.mesh.position);
        this.scene.add(explosion);
        
        // Store reference for cleanup
        (window as any).__minionExplosions = (window as any).__minionExplosions || [];
        (window as any).__minionExplosions.push(explosion);
        
        // Animate explosion and ensure cleanup
        const startTime = Date.now();
        const duration = 600; // Shorter duration
        let animId: number;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Update positions
            const positions = geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                positions[i3] += velocities[i3] * 0.016;
                positions[i3 + 1] += velocities[i3 + 1] * 0.016;
                positions[i3 + 2] += velocities[i3 + 2] * 0.016;
                
                // Apply gravity
                velocities[i3 + 1] -= 0.3;
            }
            geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            material.opacity = 1 - progress;
            
            if (progress < 1) {
                animId = requestAnimationFrame(animate);
                this.activeAnimations.add(animId);
            } else {
                // Ensure cleanup
                if (this.scene.children.includes(explosion)) {
                    this.scene.remove(explosion);
                }
                geometry.dispose();
                material.dispose();
                if (animId) this.activeAnimations.delete(animId);
                
                // Remove from global tracking
                const explosions = (window as any).__minionExplosions;
                if (explosions) {
                    const index = explosions.indexOf(explosion);
                    if (index > -1) explosions.splice(index, 1);
                }
            }
        };
        animate();
    }

    private dropItem(): void {
        // Import ItemDrop and create random drop
        import('./ItemDrop').then(({ ItemDrop }) => {
            const itemData = ItemDrop.generateRandomDrop(1); // 100% chance since we already rolled
            if (itemData) {
                const dropPosition = this.mesh.position.clone();
                dropPosition.y = 1;
                const itemDrop = new ItemDrop(this.scene, dropPosition, itemData);
                // The Game class will handle the drop collection
                (window as any).gameItemDrops = (window as any).gameItemDrops || [];
                (window as any).gameItemDrops.push(itemDrop);
            }
        });
    }

    // Removed checkProjectileCollision - projectiles now handled by Game.ts

    public dispose(): void {
        // Cancel all running animations
        this.activeAnimations.forEach(id => cancelAnimationFrame(id));
        this.activeAnimations.clear();
        
        // Remove mesh from scene
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        
        // Dispose geometries and materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        (child.material as THREE.Material).dispose();
                    }
                }
            }
        });
        
        // Clean up particle system
        if (this.particleSystem) {
            this.particleSystem.geometry.dispose();
            (this.particleSystem.material as THREE.Material).dispose();
        }
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position;
    }

    public getIsDead(): boolean {
        return this.isDead;
    }
}