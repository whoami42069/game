import * as THREE from 'three';

export interface BillboardConfig {
  url: string;
  title: string;
  position: THREE.Vector3;
}

export class MonadBillboardSystem {
  private scene: THREE.Scene;
  private iframeElements: HTMLIFrameElement[] = [];
  private camera: THREE.Camera | null = null;
  private isActive: boolean = false;
  private iframeContainer: HTMLDivElement | null = null;

  private billboardConfigs: BillboardConfig[] = [
    {
      url: 'https://testnet.monad.xyz/',
      title: 'Monad Testnet',
      position: new THREE.Vector3(-60, 10, 0)  // Left side
    },
    {
      url: 'https://www.kuru.io/discover?marketType=trending&timeInterval=5m',
      title: 'Kuru Exchange',
      position: new THREE.Vector3(60, 10, 0)   // Right side
    },
    {
      url: 'https://www.coingecko.com/',
      title: 'CoinGecko',
      position: new THREE.Vector3(0, 10, -60)  // Back
    },
    {
      url: 'https://www.testnet.narrative.xyz/',
      title: 'Narrative Testnet',
      position: new THREE.Vector3(0, 10, 60)   // Front
    },
    {
      url: 'https://kizzy.io/',
      title: 'Kizzy',
      position: new THREE.Vector3(-42, 10, -42) // Back-left diagonal
    },
    {
      url: 'https://testnet-preview.monorail.xyz/',
      title: 'Monorail Preview',
      position: new THREE.Vector3(42, 10, 42)   // Front-right diagonal
    }
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public initialize(camera: THREE.Camera): void {
    if (this.isActive) return;
    
    this.camera = camera;
    this.createIframeContainer();
    this.createFloatingWebsites();
    this.isActive = true;
    
    console.log('✅ Monad Billboard System initialized');
  }

  private createIframeContainer(): void {
    this.iframeContainer = document.createElement('div');
    this.iframeContainer.id = 'monad-websites-container';
    this.iframeContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
    document.body.appendChild(this.iframeContainer);
  }

  private createFloatingWebsites(): void {
    this.billboardConfigs.forEach((config, index) => {
      // Create iframe for each website
      const iframeWrapper = document.createElement('div');
      iframeWrapper.style.cssText = `
        position: absolute;
        width: 500px;
        height: 350px;
        display: none;
        pointer-events: auto;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 0 30px rgba(187, 134, 252, 0.5);
        border: 2px solid #bb86fc;
        background: #1a1a2e;
      `;
      
      // Create title bar
      const titleBar = document.createElement('div');
      titleBar.style.cssText = `
        background: linear-gradient(90deg, #6a1b9a, #4a148c);
        color: white;
        padding: 8px 12px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: default;
        user-select: none;
        border-bottom: 2px solid #bb86fc;
      `;
      
      const titleText = document.createElement('span');
      titleText.textContent = config.title;
      titleBar.appendChild(titleText);
      
      // Add open in new tab button
      const openButton = document.createElement('button');
      openButton.textContent = '🔗';
      openButton.title = 'Open in new tab';
      openButton.style.cssText = `
        background: #bb86fc;
        border: none;
        color: white;
        width: 25px;
        height: 20px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 5px;
      `;
      openButton.onclick = () => {
        window.open(config.url, '_blank');
      };
      titleBar.appendChild(openButton);
      
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = config.url;
      iframe.style.cssText = `
        width: 100%;
        height: calc(100% - 40px);
        border: none;
        background: white;
      `;
      // Allow scrolling and interactions
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
      iframe.setAttribute('loading', 'eager');
      
      iframeWrapper.appendChild(titleBar);
      iframeWrapper.appendChild(iframe);
      
      // Store reference with fixed position data
      iframeWrapper.dataset.index = index.toString();
      iframeWrapper.dataset.position = JSON.stringify(config.position);
      iframeWrapper.dataset.fixed = 'true';
      
      this.iframeElements.push(iframe);
      if (this.iframeContainer) {
        this.iframeContainer.appendChild(iframeWrapper);
      }
    });
  }


  private updateWebsitePositions(): void {
    if (!this.camera || !this.iframeContainer) return;

    const wrappers = this.iframeContainer.querySelectorAll('div[data-position]');
    wrappers.forEach((wrapper, index) => {
      const element = wrapper as HTMLElement;
      const positionData = element.dataset.position;
      if (!positionData) return;

      const position = JSON.parse(positionData);
      const worldPos = new THREE.Vector3(position.x, position.y, position.z);
      
      // Calculate angle to face center
      const angleToCenter = Math.atan2(position.z, position.x);
      
      // Project 3D position to screen coordinates
      const vector = worldPos.clone();
      vector.project(this.camera!);

      // Check if position is in front of camera
      if (vector.z > 1 || vector.z < -1) {
        element.style.display = 'none';
        return;
      }

      // Convert to screen coordinates
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-vector.y * 0.5 + 0.5) * canvas.clientHeight;

      // Calculate distance for visibility
      const distance = worldPos.distanceTo(this.camera!.position);
      
      if (distance < 100) {
        element.style.display = 'block';
        
        // Fixed size, slight scaling based on distance
        const scale = Math.max(0.6, Math.min(1, 40 / distance));
        const baseWidth = 500;
        const baseHeight = 350;
        const width = baseWidth * scale;
        const height = baseHeight * scale;
        
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        
        // Calculate rotation to face center (approximate 2D rotation)
        const cameraAngle = Math.atan2(this.camera!.position.z, this.camera!.position.x);
        const relativeAngle = angleToCenter - cameraAngle;
        const perspectiveSkew = Math.sin(relativeAngle) * 15; // Subtle skew effect
        
        // Fixed position on screen based on 3D position
        element.style.left = `${x - width / 2}px`;
        element.style.top = `${y - height / 2}px`;
        element.style.transform = `perspective(1000px) rotateY(${perspectiveSkew}deg)`;
        
        // Adjust opacity based on distance
        element.style.opacity = Math.min(1, Math.max(0.8, 60 / distance)).toString();
        
        // Set z-index based on distance (closer = higher)
        element.style.zIndex = Math.floor(1000 - distance).toString();
      } else {
        element.style.display = 'none';
      }
    });
  }

  public update(deltaTime: number, time: number): void {
    if (!this.isActive) return;
    
    // Update website positions to follow 3D space
    this.updateWebsitePositions();
  }

  public dispose(): void {
    // Remove iframes and container
    if (this.iframeContainer) {
      this.iframeContainer.remove();
      this.iframeContainer = null;
    }
    
    this.iframeElements = [];
    this.camera = null;
    this.isActive = false;
    
    console.log('✅ Monad Billboard System disposed');
  }
}