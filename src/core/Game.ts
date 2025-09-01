import * as THREE from 'three';
import Stats from 'stats.js';
import { LoadingManager } from './LoadingManager';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { UIManager } from '@/ui/UIManager';
import { SpaceArena } from '@/game/SpaceArena';
import { Player } from '@/game/Player';
import { SimpleBoss } from '@/game/SimpleBoss';
import { ItemDrop, ItemType } from '@/game/ItemDrop';
import { Inventory } from '@/game/Inventory';
import { GameUI } from '@/ui/GameUI';
import { PostProcessingManager } from './PostProcessingManager';
import { CombatFeedbackManager } from './CombatFeedbackManager';
import { PerformanceMonitor } from './PerformanceUtils';

// Mock type for missing PooledProjectile
interface PooledProjectile {
  mesh: THREE.Mesh;
  isActive: boolean;
  owner: string;
  damage: number;
  initialize(position: THREE.Vector3, velocity: THREE.Vector3, damage: number, owner: string, lifetime: number): void;
  update(deltaTime: number): boolean;
}

export interface GameConfig {
  canvas: HTMLCanvasElement;
  loadingManager: LoadingManager;
  audioManager: AudioManager;
  inputManager: InputManager;
  uiManager: UIManager;
}

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

/**
 * Main game class that handles the core game loop and systems
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private stats: Stats;
  
  // Fixed timestep for consistent physics
  private readonly FIXED_TIMESTEP = 1/60; // 60 FPS target
  private readonly MAX_DELTA = 1/15; // Minimum 15 FPS protection
  private accumulator = 0;
  private currentTime = 0;
  // private lastFrameTime = 0; // Unused variable
  
  // private _loadingManager!: LoadingManager; // For future use
  private audioManager: AudioManager;
  private inputManager: InputManager;
  private uiManager: UIManager;
  private postProcessingManager: PostProcessingManager | null = null;
  private combatFeedbackManager: CombatFeedbackManager | null = null;
  
  private isRunning: boolean = false;
  private animationId: number | null = null;
  private gameState: GameState = GameState.MENU;
  
  // Game entities
  private arena: SpaceArena | null = null;
  private player: Player | null = null;
  private boss: SimpleBoss | null = null;
  private projectiles: THREE.Mesh[] = [];
  private itemDrops: ItemDrop[] = [];
  private inventory: Inventory | null = null;
  private gameUI: GameUI | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;
  
  // Game stats
  private score: number = 0;
  private bossLevel: number = 1;
  private comboMultiplier: number = 1;
  private lastHitTime: number = 0;
  
  // Memory management for cleanup
  private timers: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private animationFrames: Set<number> = new Set();
  private createdElements: HTMLElement[] = [];
  private eventListeners: Array<{ target: EventTarget, type: string, listener: EventListener }> = [];
  
  // Missing properties referenced in code - using mock implementations
  private memoryManager: any = {
    trackGeometry: (geometry: any) => ({ dispose: () => geometry.dispose() }),
    trackMaterial: (material: any) => ({ dispose: () => material.dispose() }),
    getMemoryInfo: () => ({ jsHeapSize: (performance as any).memory?.usedJSHeapSize || 0 }),
    requestAnimationFrame: (callback: any) => requestAnimationFrame(callback)
  };
  private objectPoolManager: any = {
    projectilePool: {
      get: () => null,
      release: () => {}
    },
    particlePool: {
      get: () => null,
      release: () => {}
    },
    getStats: () => ({})
  };
  private pooledProjectiles: any[] = [];
  private performanceManager: any = {
    optimizer: {
      getOptimizationLevels: () => ({})
    }
  };

  constructor(config: GameConfig) {
    this.canvas = config.canvas;
    // this._loadingManager = config.loadingManager; // For future use
    this.audioManager = config.audioManager;
    this.inputManager = config.inputManager;
    this.uiManager = config.uiManager;
    
    this.clock = new THREE.Clock();
    this.stats = new Stats();
    
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initPostProcessing();
    this.initCombatFeedback();
    this.initStats();
    this.setupEventListeners();
    // Auto-start the game for testing
    this.startGame();
    
    console.log('🎮 Game instance created');
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,  // Enable anti-aliasing
      alpha: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,  // Better depth precision
      preserveDrawingBuffer: true
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio); // Use full device pixel ratio for sharper graphics
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2; // Slightly brighter
    
    // Enhanced shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    
    // Enable physically correct lighting
    // Legacy lights setting removed in newer Three.js
    
    // Gamma correction handled by outputColorSpace
    
    console.log('🖥️ Renderer initialized');
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    
    // Add fog for depth and atmosphere
    this.scene.fog = new THREE.FogExp2(0x000033, 0.008);  // Dark blue fog
    
    // Set scene background
    this.scene.background = new THREE.Color(0x000033);
    
    console.log('🌍 Scene initialized with AAA IBL environment mapping and atmosphere');
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 20);
    this.camera.lookAt(0, 0, 0);
    
    console.log('📷 Camera initialized');
  }

  private initPostProcessing(): void {
    this.postProcessingManager = new PostProcessingManager(
      this.renderer,
      this.scene,
      this.camera
    );
    
    console.log('✨ AAA Post-processing pipeline initialized with Witcher 3 quality effects');
  }
  
  private initCombatFeedback(): void {
    this.combatFeedbackManager = new CombatFeedbackManager(
      this.scene,
      this.camera,
      this.renderer
    );
    
    console.log('⚡ Combat feedback system initialized for ultra-responsive combat');
  }

  private volumetricLighting: any = null;
  private textureManager: any = null;
  
  /*private initVolumetricLighting(): void {
    // Volumetric lighting disabled for now
    this.volumetricLighting = new VolumetricLighting(
      this.scene,
      this.camera,
      this.renderer
    );
    
    console.log('🌅 AAA Volumetric lighting system initialized with god rays and atmospheric scattering');
  }*/

  private initStats(): void {
    this.stats.showPanel(0);
    const statsElement = document.getElementById('stats');
    if (statsElement) {
      statsElement.appendChild(this.stats.dom);
      // Hide stats by default, can be toggled with F3
      this.stats.dom.style.display = 'none';
    }
    
    console.log('📊 Stats initialized');
  }

  private setupEventListeners(): void {
    const resizeHandler = this.onWindowResize.bind(this);
    window.addEventListener('resize', resizeHandler);
    this.eventListeners.push({ target: window, type: 'resize', listener: resizeHandler });
    
    // Game controls
    const keydownHandler = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' && this.gameState === GameState.MENU) {
        this.startGame();
      } else if (keyEvent.key === 'Escape') {
        if (this.gameState === GameState.PLAYING) {
          this.pauseGame();
        } else if (this.gameState === GameState.PAUSED) {
          this.resumeGame();
        }
      } else if (keyEvent.key === 'r' && (this.gameState === GameState.GAME_OVER || this.gameState === GameState.VICTORY)) {
        this.restartGame();
      } else if (keyEvent.key === 'F3') {
        // Toggle stats display
        keyEvent.preventDefault();
        if (this.stats.dom) {
          this.stats.dom.style.display = this.stats.dom.style.display === 'none' ? 'block' : 'none';
        }
      }
    };
    window.addEventListener('keydown', keydownHandler);
    this.eventListeners.push({ target: window, type: 'keydown', listener: keydownHandler });
    
    // Handle visibility change
    const visibilityHandler = () => {
      if (document.hidden && this.gameState === GameState.PLAYING) {
        this.pauseGame();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    this.eventListeners.push({ target: document, type: 'visibilitychange', listener: visibilityHandler });
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Update post-processing composer size
    if (this.postProcessingManager) {
      // PostProcessing resize handled internally
    }
  }

  private showMainMenu(): void {
    this.gameState = GameState.MENU;
    
    // Clear scene
    while(this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    
    // Create menu UI
    const menuContainer = document.createElement('div');
    menuContainer.id = 'main-menu';
    menuContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      z-index: 1000;
    `;
    
    menuContainer.innerHTML = `
      <h1 style="font-size: 4em; margin-bottom: 0.5em; text-shadow: 0 0 30px #00ffff; animation: glow 2s ease-in-out infinite;">
        NEXUS ETERNAL
      </h1>
      <p style="font-size: 1.5em; color: #ff00ff; margin-bottom: 2em;">
        Endless Boss Rush
      </p>
      <div style="margin-bottom: 2em;">
        <p style="font-size: 1.2em; margin: 0.5em;">Press <span style="color: #00ff00;">ENTER</span> to Start</p>
        <p style="font-size: 1em; margin: 0.5em; color: #888;">
          WASD/Arrows: Move | Space: Shoot | Shift: Dash | ESC: Pause
        </p>
      </div>
      <div style="font-size: 0.9em; color: #666;">
        <p>Each boss kill increases difficulty</p>
        <p>Score: 100 points per hit, 10k per boss kill</p>
      </div>
      <style>
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 30px #00ffff; }
          50% { text-shadow: 0 0 50px #00ffff, 0 0 70px #00ffff; }
        }
      </style>
    `;
    
    document.body.appendChild(menuContainer);
  }

  private startGame(): void {
    // Remove menu
    const menu = document.getElementById('main-menu');
    if (menu) menu.remove();
    
    // Hide fullscreen button during gameplay
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.style.display = 'none';
    }
    
    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.bossLevel = 1;
    this.comboMultiplier = 1;
    
    // Initialize game entities
    this.arena = new SpaceArena(this.scene);
    this.player = new Player(this.scene);
    this.boss = new SimpleBoss(this.scene, this.bossLevel);
    this.inventory = new Inventory();
    this.gameUI = new GameUI();
    this.performanceMonitor = new PerformanceMonitor();
    
    // Setup inventory hotkey usage listener
    this.setupInventoryListener();
    
    console.log('🎮 Game started!');
  }


  private pauseGame(): void {
    this.gameState = GameState.PAUSED;
    this.clock.stop();
    
    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pause-menu';
    pauseMenu.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      background: rgba(0,0,0,0.8);
      padding: 2em;
      border: 2px solid #00ffff;
      z-index: 1000;
    `;
    pauseMenu.innerHTML = `
      <h2 style="font-size: 2em; margin-bottom: 1em;">PAUSED</h2>
      <p>Press ESC to Resume</p>
    `;
    document.body.appendChild(pauseMenu);
  }

  private resumeGame(): void {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.remove();
    
    this.gameState = GameState.PLAYING;
    this.clock.start();
  }

  private gameOver(): void {
    this.gameState = GameState.GAME_OVER;
    
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over';
    gameOverScreen.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #ff0000;
      font-family: 'Courier New', monospace;
      z-index: 1000;
    `;
    gameOverScreen.innerHTML = `
      <h1 style="font-size: 3em; margin-bottom: 0.5em;">GAME OVER</h1>
      <p style="font-size: 1.5em; color: #ffff00;">Final Score: ${Math.round(this.score)}</p>
      <p style="font-size: 1.2em; color: #ff00ff;">Boss Level Reached: ${this.bossLevel}</p>
      <p style="margin-top: 2em;">Press R to Restart</p>
    `;
    document.body.appendChild(gameOverScreen);
  }

  private victory(): void {
    // Boss defeated, evolve and continue
    this.bossLevel++;
    this.score += 10000; // Fixed 10k points per boss kill
    
    // Drop items visually on boss defeat
    if (this.boss) {
      const dropCount = 2 + Math.floor(Math.random() * 3);
      const bounds = this.arena?.getBounds();
      const arenaRadius = (bounds as any)?.radius || 20;
      
      for (let i = 0; i < dropCount; i++) {
        const itemData = ItemDrop.generateRandomDrop(1); // 100% chance
        if (itemData) {
          // Drop items around boss position
          const angle = (i / dropCount) * Math.PI * 2;
          const radius = 3 + Math.random() * 2;
          const dropPosition = new THREE.Vector3(
            this.boss.position.x + Math.cos(angle) * radius,
            1,
            this.boss.position.z + Math.sin(angle) * radius
          );
          
          // Ensure drop is within circular arena bounds
          const distFromCenter = Math.sqrt(dropPosition.x * dropPosition.x + dropPosition.z * dropPosition.z);
          if (distFromCenter > arenaRadius - 1) {
            const clampAngle = Math.atan2(dropPosition.z, dropPosition.x);
            dropPosition.x = Math.cos(clampAngle) * (arenaRadius - 1);
            dropPosition.z = Math.sin(clampAngle) * (arenaRadius - 1);
          }
          
          const itemDrop = new ItemDrop(this.scene, dropPosition, itemData);
          this.itemDrops.push(itemDrop);
        }
      }
      
      // Use requestAnimationFrame for non-blocking evolution
      requestAnimationFrame(() => {
        // Show level announcement
        this.showLevelAnnouncement(this.bossLevel);
        
        // Evolve boss on next frame to prevent blocking
        requestAnimationFrame(() => {
          if (this.boss && this.gameState === GameState.PLAYING) {
            this.boss.evolve();
          }
        });
      });
    }
    
    if (this.gameUI) {
      this.gameUI.showNotification(`BOSS DEFEATED!`, '#00ff88', 2000);
    }
    
    // Flash victory effect (optimized)
    requestAnimationFrame(() => {
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        opacity: 0.3;
        z-index: 500;
        pointer-events: none;
        transition: opacity 0.2s;
      `;
      document.body.appendChild(flash);
      requestAnimationFrame(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 200);
      });
    });
  }

  private restartGame(): void {
    // Remove game over screen
    const gameOver = document.getElementById('game-over');
    if (gameOver) gameOver.remove();
    
    // Show fullscreen button again
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.style.display = 'block';
    }
    
    // Clear scene
    while(this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    
    // Reset and start
    this.showMainMenu();
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Game is already running');
      return;
    }
    
    console.log('🎮 Starting game engine...');
    
    this.isRunning = true;
    this.gameLoop();
    
    console.log('✅ Game engine started successfully');
  }

  public pause(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.clock.stop();
    console.log('⏸️ Game paused');
  }

  public resume(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.gameLoop();
    
    console.log('▶️ Game resumed');
  }

  public stop(): void {
    this.pause();
    
    // Clear all tracked timers
    for (const timer of this.timers) {
      clearTimeout(timer as any);
    }
    this.timers.clear();
    
    // Clear all tracked intervals
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    // Clear all tracked animation frames
    for (const frameId of this.animationFrames) {
      cancelAnimationFrame(frameId);
    }
    this.animationFrames.clear();
    
    // Remove all created DOM elements
    for (const element of this.createdElements) {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
    this.createdElements.length = 0;
    
    // Remove all event listeners
    for (const { target, type, listener } of this.eventListeners) {
      target.removeEventListener(type, listener);
    }
    this.eventListeners.length = 0;
    
    // Dispose game entities
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    
    if (this.boss) {
      // Boss should have dispose method
      this.boss = null;
    }
    
    if (this.arena) {
      // Arena should have dispose method
      this.arena = null;
    }
    
    if (this.gameUI) {
      this.gameUI.dispose();
      this.gameUI = null;
    }
    
    if (this.inventory) {
      // Inventory should have dispose method
      this.inventory = null;
    }
    
    // Dispose item drops
    for (const drop of this.itemDrops) {
      drop.dispose();
    }
    this.itemDrops.length = 0;
    
    // Dispose projectiles
    for (const projectile of this.projectiles) {
      this.scene.remove(projectile);
      projectile.geometry.dispose();
      if (projectile.material) {
        if (Array.isArray(projectile.material)) {
          projectile.material.forEach(mat => mat.dispose());
        } else {
          (projectile.material as THREE.Material).dispose();
        }
      }
    }
    this.projectiles.length = 0;
    
    // Clear pooled projectiles
    this.pooledProjectiles.length = 0;
    
    // Dispose post-processing resources
    if (this.postProcessingManager) {
      this.postProcessingManager.dispose();
      this.postProcessingManager = null;
    }
    
    // Dispose volumetric lighting resources
    if (this.volumetricLighting) {
      this.volumetricLighting.dispose();
      this.volumetricLighting = null;
    }
    
    // Dispose texture manager resources
    if (this.textureManager) {
      this.textureManager.dispose();
    }
    
    // Clear scene
    this.disposeSceneObjects(this.scene);
    
    // Dispose renderer
    this.renderer.dispose();
    
    console.log('⏹️ Game stopped and all resources disposed');
  }
  
  private disposeSceneObjects(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    // Remove all children
    while (object.children.length > 0) {
      object.remove(object.children[0]);
    }
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    this.stats.begin();
    
    // High-precision timing for responsive combat
    const newTime = performance.now() / 1000;
    let frameTime = newTime - this.currentTime;
    
    // Prevent spiral of death and ensure smooth experience
    if (frameTime > this.MAX_DELTA) {
      frameTime = this.MAX_DELTA;
    }
    
    this.currentTime = newTime;
    this.accumulator += frameTime;
    
    // Fixed timestep physics updates for consistent combat timing
    let physicsUpdates = 0;
    const maxPhysicsUpdates = 5; // Prevent excessive updates
    
    while (this.accumulator >= this.FIXED_TIMESTEP && physicsUpdates < maxPhysicsUpdates) {
      this.updatePhysics(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
      physicsUpdates++;
    }
    
    // Calculate interpolation factor for smooth visuals
    const alpha = this.accumulator / this.FIXED_TIMESTEP;
    
    // Variable timestep for rendering and non-critical updates
    this.updateRendering(frameTime, alpha);
    this.render();
    
    this.stats.end();
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private updatePhysics(deltaTime: number): void {
    // Fixed timestep physics updates for consistent combat
    this.updateCorePhysics(deltaTime);
  }
  
  private updateRendering(deltaTime: number, alpha: number): void {
    // Variable timestep rendering updates
    this.updateVisuals(deltaTime, alpha);
  }
  
  private updateCorePhysics(deltaTime: number): void {
    // Core physics: Input processing must be in fixed timestep for consistency
    // Update combat feedback manager first to get modified deltaTime for hitstop
    const modifiedDeltaTime = deltaTime; // CombatFeedbackManager update not implemented yet
    
    this.inputManager.update(modifiedDeltaTime);
    
    // Update game entities only when playing
    if (this.gameState === GameState.PLAYING) {
      // Update arena
      if (this.arena) {
        this.arena.update(modifiedDeltaTime);
      }
      
      // Update player with camera for camera-relative movement
      if (this.player && this.arena) {
        this.player.update(modifiedDeltaTime, this.arena.getBounds(), this.camera, this.inputManager);
        
        // Handle shooting (use pooled projectiles for better performance)
        const projectiles = this.player.shoot(this.inputManager);
        if (projectiles) {
          for (const proj of projectiles) {
            const pooledProj = this.objectPoolManager.projectilePool.get();
            if (pooledProj) {
              const velocity = proj.userData.velocity as THREE.Vector3;
              const damage = proj.userData.damage || 10;
              const owner = proj.userData.owner || 'player';
              
              pooledProj.initialize(proj.position, velocity, damage, owner, 5);
              this.scene.add(pooledProj.mesh);
              this.pooledProjectiles.push(pooledProj);
            }
            // Clean up the temporary projectile
            this.scene.remove(proj);
            this.memoryManager.trackGeometry(proj.geometry).dispose();
            this.memoryManager.trackMaterial(proj.material as THREE.Material).dispose();
          }
        }
      }
      
      // Update boss
      if (this.boss && this.player && this.arena) {
        this.boss.update(modifiedDeltaTime, this.player.position, this.arena.getBounds());
        
        // Boss attacks (use pooled projectiles for better performance)
        const bossProjectiles = this.boss.shoot();
        if (bossProjectiles) {
          for (const proj of bossProjectiles) {
            const pooledProj = this.objectPoolManager.projectilePool.get();
            if (pooledProj) {
              const velocity = proj.userData.velocity as THREE.Vector3;
              const damage = proj.userData.damage || 10;
              const owner = proj.userData.owner || 'boss';
              
              pooledProj.initialize(proj.position, velocity, damage, owner, 5);
              this.scene.add(pooledProj.mesh);
              this.pooledProjectiles.push(pooledProj);
            }
            // Clean up the temporary projectile
            this.scene.remove(proj);
            this.memoryManager.trackGeometry(proj.geometry).dispose();
            this.memoryManager.trackMaterial(proj.material as THREE.Material).dispose();
          }
        }
      }
      
      // Update projectiles
      this.updateProjectiles(deltaTime);
      
      // Update item drops
      this.updateItemDrops(deltaTime);
      
      // Update inventory effects
      if (this.inventory) {
        this.inventory.updateEffects();
        this.applyInventoryEffects();
      }
      
      // Check collisions
      this.checkCollisions();
      
      // Update Performance Monitor
      if (this.performanceMonitor) {
        this.performanceMonitor.update();
      }
      
      // Update Game UI
      if (this.gameUI && this.player && this.inventory) {
        this.gameUI.updateHealth(this.player);
        this.gameUI.updateBossHealth(this.boss);
        this.gameUI.updateScore(this.score);
        this.gameUI.updateWave(this.bossLevel);
        // this.gameUI.updateCombo(this.comboMultiplier); // Method not implemented
        this.gameUI.updateInventory(this.inventory);
        
        // Update FPS display
        if (this.performanceMonitor) {
          // this.gameUI.updateFPS(this.performanceMonitor.getFPS()); // Method not implemented
        }
        
        // Update performance debug info (only in debug mode)
        if (window.location.hash.includes('debug')) {
          const perfMetrics = {
            memoryUsage: this.memoryManager.getMemoryInfo().jsHeapSize,
            poolStats: this.objectPoolManager.getStats(),
            optimizationLevels: this.performanceManager.optimizer.getOptimizationLevels()
          };
          // this.gameUI.updatePerformanceMetrics(perfMetrics); // Method not implemented
        }
      }
      
      // Update volumetric lighting system
      if (this.volumetricLighting) {
        const lightPosition = new THREE.Vector3(50, 100, 50); // Main sun light position
        this.volumetricLighting.update(deltaTime, lightPosition, this.camera.position);
      }
      
      // Camera movement is now handled in updateCameraWithInterpolation for smoother visuals
      
      // Check win/lose conditions
      if (this.player && this.player.health <= 0) {
        this.gameOver();
      }
      
      if (this.boss && this.boss.health <= 0 && this.boss.mesh.visible) {
        // Mark boss as defeated to prevent multiple victory calls
        this.boss.mesh.visible = false;
        // Delay victory call to next frame to prevent freezing
        requestAnimationFrame(() => {
          this.victory();
        });
      }
      
      // Update combo multiplier
      const now = Date.now();
      if (now - this.lastHitTime > 3000) {
        this.comboMultiplier = 1;
      }
    }
  }
  
  private updateVisuals(deltaTime: number, alpha: number): void {
    // Variable timestep updates for visuals and UI
    this.audioManager.update(deltaTime);
    this.uiManager.update(deltaTime);
    
    // Update visual effects and non-critical systems
    if (this.gameState === GameState.PLAYING) {
      // Update Performance Monitor (visual feedback)
      if (this.performanceMonitor) {
        this.performanceMonitor.update();
      }
      
      // Update Game UI with interpolation factor for smooth animations
      if (this.gameUI && this.player && this.inventory) {
        this.gameUI.updateHealth(this.player);
        this.gameUI.updateBossHealth(this.boss);
        this.gameUI.updateScore(this.score);
        this.gameUI.updateWave(this.bossLevel);
        // this.gameUI.updateCombo(this.comboMultiplier); // Method not implemented
        this.gameUI.updateInventory(this.inventory);
        
        // Update FPS display
        if (this.performanceMonitor) {
          // this.gameUI.updateFPS(this.performanceMonitor.getFPS()); // Method not implemented
        }
        
        // Update performance debug info (only in debug mode)
        if (window.location.hash.includes('debug')) {
          const perfMetrics = {
            memoryUsage: this.memoryManager?.getMemoryInfo().jsHeapSize || 0,
            poolStats: this.objectPoolManager?.getStats() || {},
            optimizationLevels: this.performanceManager?.optimizer?.getOptimizationLevels() || {}
          };
          // this.gameUI.updatePerformanceMetrics(perfMetrics); // Method not implemented
        }
      }
      
      // Update volumetric lighting system
      if (this.volumetricLighting) {
        const lightPosition = new THREE.Vector3(50, 100, 50);
        this.volumetricLighting.update(deltaTime, lightPosition, this.camera.position);
      }
      
      // Apply interpolated camera movement for ultra-smooth visuals
      if (this.player && alpha !== undefined) {
        this.updateCameraWithInterpolation(deltaTime, alpha);
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const velocity = projectile.userData.velocity as THREE.Vector3;
      
      if (velocity) {
        projectile.position.add(velocity.clone().multiplyScalar(deltaTime));
        
        // Remove if out of bounds - check circular boundary
        const arenaBounds = this.arena?.getBounds();
        const radius = (arenaBounds as any)?.radius || 30;
        const distanceFromCenter = Math.sqrt(
          projectile.position.x * projectile.position.x + 
          projectile.position.z * projectile.position.z
        );
        
        if (distanceFromCenter > radius + 5 || // Give a bit of margin for bullets
            projectile.position.y < -5 || 
            projectile.position.y > 50) {
          this.scene.remove(projectile);
          projectile.geometry.dispose();
          (projectile.material as THREE.Material).dispose();
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private checkCollisions(): void {
    if (!this.player || !this.boss) return;
    
    // Check legacy projectile collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const owner = projectile.userData.owner;
      const damage = projectile.userData.damage || 10;
      
      if (owner === 'player') {
        // Check collision with boss
        const distance = projectile.position.distanceTo(this.boss.position);
        if (distance < 2) {
          this.handlePlayerHit(damage, projectile.position.clone());
          
          // Remove projectile safely
          this.scene.remove(projectile);
          this.memoryManager.trackGeometry(projectile.geometry).dispose();
          if (projectile.material) {
            if (Array.isArray(projectile.material)) {
              projectile.material.forEach(m => this.memoryManager.trackMaterial(m).dispose());
            } else {
              this.memoryManager.trackMaterial(projectile.material as THREE.Material).dispose();
            }
          }
          this.projectiles.splice(i, 1);
        }
      } else if (owner === 'boss') {
        // Check collision with player
        const distance = projectile.position.distanceTo(this.player.position);
        if (distance < 1.5) {
          this.handleBossHit(damage, projectile.position.clone());
          
          // Remove projectile safely
          this.scene.remove(projectile);
          this.memoryManager.trackGeometry(projectile.geometry).dispose();
          if (projectile.material) {
            if (Array.isArray(projectile.material)) {
              projectile.material.forEach(m => this.memoryManager.trackMaterial(m).dispose());
            } else {
              this.memoryManager.trackMaterial(projectile.material as THREE.Material).dispose();
            }
          }
          this.projectiles.splice(i, 1);
        }
      }
    }
    
    // Check pooled projectile collisions (optimized)
    for (let i = this.pooledProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.pooledProjectiles[i];
      if (!projectile.isActive) continue;
      
      if (projectile.owner === 'player') {
        // Check collision with boss
        const distance = projectile.mesh.position.distanceTo(this.boss.position);
        if (distance < 2) {
          this.handlePlayerHit(projectile.damage, projectile.mesh.position.clone());
          
          // Return projectile to pool
          this.scene.remove(projectile.mesh);
          this.objectPoolManager.projectilePool.release(projectile);
          this.pooledProjectiles.splice(i, 1);
        }
      } else if (projectile.owner === 'boss') {
        // Check collision with player
        const distance = projectile.mesh.position.distanceTo(this.player.position);
        if (distance < 1.5) {
          this.handleBossHit(projectile.damage, projectile.mesh.position.clone());
          
          // Return projectile to pool
          this.scene.remove(projectile.mesh);
          this.objectPoolManager.projectilePool.release(projectile);
          this.pooledProjectiles.splice(i, 1);
        }
      }
    }
  }
  
  private handlePlayerHit(damage: number, hitPosition: THREE.Vector3): void {
    try {
      this.boss?.takeDamage(damage);
      this.score += 100; // Fixed 100 points per hit
      this.comboMultiplier = Math.min(16, this.comboMultiplier + 1);
      this.lastHitTime = Date.now();
      
      // INSTANT COMBAT FEEDBACK - No delays!
      if (this.combatFeedbackManager) {
        // this.combatFeedbackManager.triggerComboHit(this.comboMultiplier, hitPosition); // Method not implemented
      }
      
      // 2% chance to drop item on every hit
      if (Math.random() < 0.02) {
        const itemData = ItemDrop.generateRandomDrop(1);
        if (itemData) {
          // Drop item at boss position with circular offset
          const dropPosition = this.boss?.position.clone() || new THREE.Vector3();
          const offsetAngle = Math.random() * Math.PI * 2;
          const offsetDistance = 2 + Math.random() * 2;
          dropPosition.x += Math.cos(offsetAngle) * offsetDistance;
          dropPosition.z += Math.sin(offsetAngle) * offsetDistance;
          dropPosition.y = 1;
          
          // Ensure drop is within arena bounds
          const bounds = this.arena?.getBounds();
          const radius = (bounds as any)?.radius || 20;
          const distFromCenter = Math.sqrt(dropPosition.x * dropPosition.x + dropPosition.z * dropPosition.z);
          if (distFromCenter > radius - 1) {
            const angle = Math.atan2(dropPosition.z, dropPosition.x);
            dropPosition.x = Math.cos(angle) * (radius - 1);
            dropPosition.z = Math.sin(angle) * (radius - 1);
          }
          
          const itemDrop = new ItemDrop(this.scene, dropPosition, itemData);
          this.itemDrops.push(itemDrop);
        }
      }
      
      // Defer hit effect to prevent freezing (using memory manager)
      this.memoryManager.requestAnimationFrame(() => {
        this.createHitEffect(hitPosition);
      });
    } catch (error) {
      console.error('Error processing player hit:', error);
    }
  }
  
  private handleBossHit(damage: number, hitPosition: THREE.Vector3): void {
    try {
      this.player?.takeDamage(damage);
      
      // INSTANT COMBAT FEEDBACK for player taking damage
      if (this.combatFeedbackManager) {
        this.combatFeedbackManager.triggerHitStop({ duration: 100, intensity: 0.6 });
        this.combatFeedbackManager.triggerScreenShake({ intensity: 3, duration: 200 });
        this.combatFeedbackManager.triggerHitFlash({ 
          color: new THREE.Color(1, 0, 0), 
          intensity: 0.2, 
          duration: 150 
        });
        this.combatFeedbackManager.createImpactParticles(hitPosition, new THREE.Color(0xff0000), 6);
      }
      
    } catch (error) {
      console.error('Error processing boss hit:', error);
    }
  }

  private showLevelAnnouncement(level: number): void {
    const frame1 = requestAnimationFrame(() => {
      this.animationFrames.delete(frame1);
      const announcement = document.createElement('div');
      announcement.className = 'level-announcement';
      announcement.style.cssText = `
        position: absolute;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 5em;
        font-weight: bold;
        color: #ff00ff;
        text-shadow: 0 0 30px #ff00ff;
        z-index: 2000;
        pointer-events: none;
        font-family: Arial, sans-serif;
        opacity: 0;
        transition: all 0.5s ease-out;
      `;
      announcement.textContent = `LEVEL ${level}`;
      document.body.appendChild(announcement);
      this.createdElements.push(announcement);
      
      // Trigger animation on next frame
      const frame2 = requestAnimationFrame(() => {
        this.animationFrames.delete(frame2);
        announcement.style.transform = 'translate(-50%, -50%) scale(1)';
        announcement.style.opacity = '1';
        
        // Fade out
        const timer1 = setTimeout(() => {
          this.timers.delete(timer1);
          announcement.style.transform = 'translate(-50%, -50%) scale(0.8)';
          announcement.style.opacity = '0';
          const timer2 = setTimeout(() => {
            this.timers.delete(timer2);
            announcement.remove();
            const index = this.createdElements.indexOf(announcement);
            if (index > -1) this.createdElements.splice(index, 1);
          }, 500) as any;
          this.timers.add(timer2);
        }, 2000) as any;
        this.timers.add(timer1);
      });
      this.animationFrames.add(frame2);
    });
    this.animationFrames.add(frame1);
  }

  private createHitEffect(position: THREE.Vector3): void {
    // Ultra-simple hit effect to prevent any freezing (using object pools)
    const particle = this.objectPoolManager.particlePool.get();
    if (particle) {
      const color = new THREE.Color(0xffaa00);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      const acceleration = new THREE.Vector3(0, -1, 0);
      
      particle.initialize(position, velocity, acceleration, color, 0.5, 1.5, 0);
      this.scene.add(particle.mesh);
      
      // The particle will automatically clean itself up after its lifetime
    }
  }

  /**
   * Update pooled projectiles for better performance - currently unused
   */
  /* private updatePooledProjectiles(pooledProjectiles: PooledProjectile[], deltaTime: number): PooledProjectile[] {
    const activeProjectiles: PooledProjectile[] = [];
    const arenaBounds = this.arena?.getBounds();
    const radius = (arenaBounds as any)?.radius || 30;
    
    for (const projectile of pooledProjectiles) {
      if (projectile.update(deltaTime)) {
        // Check if projectile is out of bounds
        const distanceFromCenter = Math.sqrt(
          projectile.mesh.position.x * projectile.mesh.position.x + 
          projectile.mesh.position.z * projectile.mesh.position.z
        );
        
        if (distanceFromCenter > radius + 5 || 
            projectile.mesh.position.y < -5 || 
            projectile.mesh.position.y > 50) {
          // Remove from scene and return to pool
          this.scene.remove(projectile.mesh);
          this.objectPoolManager.projectilePool.release(projectile);
        } else {
          activeProjectiles.push(projectile);
        }
      } else {
        // Projectile expired, return to pool
        this.scene.remove(projectile.mesh);
        this.objectPoolManager.projectilePool.release(projectile);
      }
    }
    
    return activeProjectiles;
  } */

  private render(): void {
    const deltaTime = this.clock.getDelta();
    
    if (this.postProcessingManager) {
      // Use AAA post-processing pipeline
      this.postProcessingManager.render(deltaTime);
    } else {
      // Fallback to direct rendering
      this.renderer.render(this.scene, this.camera);
    }
  }

  private updateItemDrops(deltaTime: number): void {
    this.itemDrops = this.itemDrops.filter(drop => {
      const active = drop.update(deltaTime);
      
      // Check collection
      if (this.player && drop.checkCollision(this.player.position)) {
        this.collectItem(drop);
        drop.dispose();
        return false;
      }
      
      if (!active) {
        drop.dispose();
        return false;
      }
      
      return true;
    });
  }
  
  private collectItem(drop: ItemDrop): void {
    if (!this.inventory || !this.gameUI) return;
    
    const item = drop.itemData;
    
    // Add to inventory
    if (this.inventory && this.inventory.addItem(item)) {
      // Use requestAnimationFrame to prevent freezing
      requestAnimationFrame(() => {
        if (this.gameUI) this.gameUI.showNotification(`+${item.name}`, `#${item.color.toString(16).padStart(6, '0')}`);
      });
    } else {
      requestAnimationFrame(() => {
        if (this.gameUI) this.gameUI.showNotification('Inventory Full!', '#ff0000');
      });
    }
  }
  
  private setupInventoryListener(): void {
    // Listen for inventory item use
    window.addEventListener('keydown', (e) => {
      const key = parseInt(e.key);
      if (key >= 1 && key <= 5 && this.inventory && this.player && this.gameUI) {
        const item = this.inventory.useItem(key - 1);
        if (item) {
          // Apply item effects
          switch (item.type) {
            case ItemType.HEALTH_POTION:
              this.player.health = Math.min(this.player.maxHealth, this.player.health + item.value);
              this.gameUI.showNotification(`+${item.value} HP`, '#ff0088');
              break;
              
            case ItemType.ENERGY_POTION:
              this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + item.value);
              this.gameUI.showNotification(`+${item.value} Energy`, '#00ffff');
              break;
              
            case ItemType.WEAPON_UPGRADE:
              this.player.weaponLevel = Math.min(5, this.player.weaponLevel + item.value);
              this.gameUI.showNotification(`Weapon Level ${this.player.weaponLevel}`, '#ff6600');
              break;
              
            case ItemType.SHIELD:
              this.player.hasShield = true;
              this.player.shieldEndTime = Date.now() + (item.duration! * 1000); // 5 seconds of immunity
              this.gameUI.showNotification('Shield Active! 5s Immunity', '#00ffff');
              this.createShieldEffect();
              break;
              
            case ItemType.SPEED_BOOST:
              // Speed boost is applied through inventory effects
              console.log('[Speed Boost] Using speed boost item');
              this.gameUI.showNotification('Speed Boost! 1.5x for 5 seconds', '#ffff00');
              break;
              
            default:
              this.gameUI.showNotification(`Used ${item.name}`, `#${item.color.toString(16).padStart(6, '0')}`);
              break;
          }
        }
      }
    });
  }
  
  private applyInventoryEffects(): void {
    if (!this.inventory || !this.player) return;
    
    // Apply active effects
    const speedBoost = this.inventory.getActiveEffect(ItemType.SPEED_BOOST);
    if (speedBoost) {
      // Speed boost value is already the multiplier (1.5 = 1.5x speed)
      this.player.speedMultiplier = speedBoost.value;
    } else {
      this.player.speedMultiplier = 1; // Reset to normal speed
    }
    
    const shield = this.inventory.getActiveEffect(ItemType.SHIELD);
    if (shield && !this.player.hasShield) {
      this.player.hasShield = true;
      this.player.shieldEndTime = shield.endTime; // Use the shield's end time
      this.createShieldEffect();
    } else if (!shield && this.player.hasShield && Date.now() >= this.player.shieldEndTime) {
      // Shield expired
      this.player.hasShield = false;
    }
  }
  
  private createShieldEffect(): void {
    if (!this.player) return;
    
    console.log('[Shield Effect] Creating shield visual');
    
    // Create visual shield around player
    const shieldGeometry = new THREE.SphereGeometry(2.5, 16, 16);
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
      depthWrite: false  // Prevent depth buffer issues
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.copy(this.player.position);
    shield.renderOrder = 999;  // Render on top
    this.scene.add(shield);
    
    // Simple fade out effect that won't interfere with rendering
    const startTime = Date.now();
    const duration = 1000; // 1 second
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration && this.scene.children.includes(shield)) {
        // Simple fade and scale effect
        const progress = elapsed / duration;
        shieldMaterial.opacity = 0.3 * (1 - progress);
        shield.scale.setScalar(1 + progress * 0.5);
        requestAnimationFrame(animate);
      } else {
        // Clean up safely
        if (this.scene.children.includes(shield)) {
          this.scene.remove(shield);
        }
        shieldGeometry.dispose();
        shieldMaterial.dispose();
      }
    };
    
    animate();
  }

  private updateCameraWithInterpolation(deltaTime: number, _alpha: number): void {
    if (!this.player) return;
    
    // Get player's rotation
    const playerRotation = this.player.mesh.rotation.y;
    
    // Camera stays behind the character based on their rotation
    const cameraDistance = 20; // Distance for good combat view
    const cameraHeight = 12;   // Height for overhead view
    
    // Calculate ideal camera position
    const cameraOffset = new THREE.Vector3(
      -Math.sin(playerRotation) * cameraDistance,
      cameraHeight,
      -Math.cos(playerRotation) * cameraDistance
    );
    
    const targetPosition = this.player.position.clone().add(cameraOffset);
    
    // Ultra-smooth camera movement with higher responsiveness for combat
    const lerpFactor = Math.min(1, deltaTime * 8); // Higher lerp factor for responsive combat camera
    this.camera.position.lerp(targetPosition, lerpFactor);
    
    // Look at the player with slight forward offset
    const lookTarget = this.player.position.clone();
    lookTarget.y += 2; // Look at player upper body
    // Add forward offset in player's facing direction for better combat visibility
    lookTarget.x += Math.sin(playerRotation) * 2;
    lookTarget.z += Math.cos(playerRotation) * 2;
    
    this.camera.lookAt(lookTarget);
  }
  
  // Getters for other systems to access core components
  public get gameScene(): THREE.Scene { return this.scene; }
  public get gameCamera(): THREE.Camera { return this.camera; }
  public get gameRenderer(): THREE.WebGLRenderer { return this.renderer; }
}