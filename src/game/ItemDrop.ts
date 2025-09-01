import * as THREE from 'three';

export enum ItemType {
  HEALTH_POTION = 'health_potion',
  ENERGY_POTION = 'energy_potion',
  WEAPON_UPGRADE = 'weapon_upgrade',
  SHIELD = 'shield',
  SPEED_BOOST = 'speed_boost'
}

export interface ItemData {
  type: ItemType;
  value: number;
  duration?: number;
  name: string;
  color: number;
  icon?: string;
}

export class ItemDrop {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public itemData: ItemData;
  private scene: THREE.Scene;
  private time: number = 0;
  private collected: boolean = false;
  private lifetime: number = 30; // Disappears after 30 seconds if not collected

  constructor(scene: THREE.Scene, position: THREE.Vector3, itemData: ItemData) {
    this.scene = scene;
    this.position = position.clone();
    this.itemData = itemData;
    this.mesh = new THREE.Group();
    
    this.createModel();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  private createModel(): void {
    // Create floating item container
    const containerGeometry = new THREE.OctahedronGeometry(0.5, 0);
    const containerMaterial = new THREE.MeshPhysicalMaterial({
      color: this.itemData.color,
      emissive: this.itemData.color,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8
    });
    const container = new THREE.Mesh(containerGeometry, containerMaterial);
    
    // Add inner glow sphere
    const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.itemData.color,
      transparent: true,
      opacity: 0.6
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Add point light for item glow
    const light = new THREE.PointLight(this.itemData.color, 2, 5);
    
    // Add outer ring
    const ringGeometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.itemData.color,
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    
    this.mesh.add(container);
    this.mesh.add(glow);
    this.mesh.add(light);
    this.mesh.add(ring);
  }

  public update(deltaTime: number): boolean {
    if (this.collected) return false;
    
    this.time += deltaTime;
    
    // Check lifetime
    if (this.time > this.lifetime) {
      this.dispose();
      return false;
    }
    
    // Floating animation
    this.mesh.position.y = this.position.y + Math.sin(this.time * 3) * 0.3;
    this.mesh.rotation.y += deltaTime * 2;
    
    // Pulse effect
    const scale = 1 + Math.sin(this.time * 5) * 0.1;
    this.mesh.scale.set(scale, scale, scale);
    
    // Fade out when about to disappear
    if (this.time > this.lifetime - 3) {
      const alpha = (this.lifetime - this.time) / 3;
      this.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.Material;
          if ('opacity' in material) {
            material.opacity = alpha * 0.8;
          }
        }
      });
    }
    
    return true;
  }

  public checkCollision(playerPosition: THREE.Vector3, radius: number = 3.5): boolean {
    if (this.collected) return false;
    
    // Check horizontal distance only (ignore Y axis for better pickup)
    const itemPos = this.mesh.position;
    const dx = itemPos.x - playerPosition.x;
    const dz = itemPos.z - playerPosition.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    
    // Also check if item is reasonably close in height
    const heightDiff = Math.abs(itemPos.y - playerPosition.y);
    
    if (horizontalDistance < radius && heightDiff < 5) {
      this.collected = true;
      return true;
    }
    return false;
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }

  public static generateRandomDrop(chance: number = 0.01): ItemData | null {
    if (Math.random() > chance) return null;
    
    const drops: ItemData[] = [
      {
        type: ItemType.HEALTH_POTION,
        value: 5,
        name: 'Health Potion',
        color: 0xff0088,
        icon: '❤️'
      },
      {
        type: ItemType.ENERGY_POTION,
        value: 40,
        name: 'Energy Cell',
        color: 0x00ffff,
        icon: '⚡'
      },
      {
        type: ItemType.WEAPON_UPGRADE,
        value: 1,
        name: 'Weapon Core',
        color: 0xff8800,
        icon: '🔫'
      },
      {
        type: ItemType.SHIELD,
        value: 1,
        duration: 5,  // 5 seconds of complete immunity
        name: 'Shield Generator',
        color: 0x0088ff,
        icon: '🛡️'
      },
      {
        type: ItemType.SPEED_BOOST,
        value: 1.5,
        duration: 5,  // 5 seconds as requested
        name: 'Speed Module',
        color: 0x88ff00,
        icon: '⚡'
      }
    ];
    
    // 60% chance for health potion, 40% for others
    if (Math.random() < 0.6) {
      return drops[0];
    } else {
      return drops[Math.floor(Math.random() * (drops.length - 1)) + 1];
    }
  }
}