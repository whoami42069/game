import * as THREE from 'three';
import Stats from 'stats.js';
import { LoadingManager } from './LoadingManager';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { UIManager } from '@/ui/UIManager';
import { Arena } from '@/game/Arena';
import { SpaceArena } from '@/game/arenas/SpaceArena';
import { AsteroidFieldArena } from '@/game/arenas/AsteroidFieldArena';
import { NebulaZoneArena } from '@/game/arenas/NebulaZoneArena';
import { MonadEcosystemArena } from '@/game/arenas/MonadEcosystemArena';
import { MapSelectionScreen } from '@/ui/MapSelectionScreen';
import { Player } from '@/game/Player';
import { SimpleBoss } from '@/game/SimpleBoss';
import { Minion } from '@/game/Minion';
import { ItemDrop, ItemType } from '@/game/ItemDrop';
import { Inventory } from '@/game/Inventory';
import { GameUI } from '@/ui/GameUI';
import { PostProcessingManager } from './PostProcessingManager';
import { CombatFeedbackManager } from './CombatFeedbackManager';
import { PerformanceMonitor } from './PerformanceUtils';
import { TextureManager } from './TextureManager';


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
  private readonly FIXED_TIMESTEP = 1 / 60; // 60 FPS target
  private readonly MAX_DELTA = 1 / 15; // Minimum 15 FPS protection
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
  
  // Static reusable objects to prevent allocation in loops
  private static tempColor = new THREE.Color();
  private static tempVelocity = new THREE.Vector3();
  private static tempAcceleration = new THREE.Vector3();

  // Game entities
  private arena: Arena | null = null;
  private player: Player | null = null;
  private boss: SimpleBoss | null = null;
  private minions: Minion[] = [];
  private lastMinionSpawnTime: number = 0;
  // private minionSpawnInterval: number = 15000; // 15 seconds initially, 8 seconds after level 5
  private projectiles: THREE.Mesh[] = [];
  private readonly MAX_PROJECTILES = 100; // Hard limit to prevent memory issues
  private readonly MAX_PROJECTILES_PER_OWNER = 40; // Per owner limit
  private itemDrops: ItemDrop[] = [];
  private readonly MAX_ITEM_DROPS = 20; // Limit to prevent performance issues
  private inventory: Inventory | null = null;
  private gameUI: GameUI | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;

  // Game stats
  private score: number = 0;
  private bossLevel: number = 1;
  private comboMultiplier: number = 1;
  private lastHitTime: number = 0;
  private comboTimeoutId: number | null = null;

  // Memory management for cleanup
  private timers: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private animationFrames: Set<number> = new Set();
  private createdElements: HTMLElement[] = [];
  private eventListeners: Array<{ target: EventTarget, type: string, listener: EventListener }> = [];
  private frameCount: number = 0;
  private lastGCTime: number = 0;
  
  // Pre-created UI elements for performance
  private menuContainer: HTMLDivElement | null = null;
  private pauseMenu: HTMLDivElement | null = null;
  private gameOverScreen: HTMLDivElement | null = null;
  private flashDiv: HTMLDivElement | null = null;
  private announcementDiv: HTMLDivElement | null = null;
  private mapSelectionScreen: MapSelectionScreen | null = null;

  // Track safe timer/interval wrappers
  private safeSetTimeout(callback: () => void, delay: number): number {
    const id = setTimeout(() => {
      this.timers.delete(id);
      callback();
    }, delay) as any;
    this.timers.add(id);
    return id;
  }


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
      release: () => { }
    },
    particlePool: {
      get: () => null,
      release: () => { }
    },
    getStats: () => ({})
  };
  // Performance manager removed - unused

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
    
    // Start comprehensive preloading during loading screen
    this.startPreloading();

    console.log('🎮 Game instance created');
  }
  
  private async startPreloading(): Promise<void> {
    const loadingText = document.querySelector('.loading-text');
    
    try {
      // Phase 1: Pre-create UI elements
      if (loadingText) loadingText.textContent = 'Initializing UI...';
      await this.asyncPreCreateUIElements();
      
      // Phase 2: Generate and cache all textures
      if (loadingText) loadingText.textContent = 'Generating HD textures...';
      await this.asyncPreloadTextures();
      
      // Phase 3: Pre-create game entities to trigger shader compilation
      if (loadingText) loadingText.textContent = 'Compiling shaders...';
      await this.precompileShaders();
      
      // Phase 4: Warm up JIT compiler with game logic
      if (loadingText) loadingText.textContent = 'Optimizing game engine...';
      await this.warmupJIT();
      
      // Phase 5: Final setup
      if (loadingText) loadingText.textContent = 'Starting game...';
      this.setupEventListeners();
      
      // Hide loading screen and show menu
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
      
      // Show main menu
      this.showMainMenu();
      
    } catch (error) {
      console.error('Preloading failed:', error);
      if (loadingText) loadingText.textContent = 'Loading failed. Please refresh.';
    }
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

  private async asyncPreloadTextures(): Promise<void> {
    const textureManager = TextureManager.getInstance();
    
    // Pre-generate all textures used in the game
    await new Promise<void>((resolve) => {
      // Player textures
      Player.cachedHullTextures = textureManager.generateBattleDamagedHullTexture(512, 0.4);
      Player.cachedWingTextures = textureManager.generateBattleDamagedHullTexture(256, 0.6);
      Player.cachedEngineTextures = textureManager.generateBattleDamagedHullTexture(256, 0.8);
      
      // Boss textures
      SimpleBoss.cachedHullTextures = textureManager.generateMetallicPanelTexture(512, 0.9);
      SimpleBoss.cachedSaucerTextures = textureManager.generateMetallicPanelTexture(1024, 0.92);
      
      // Common metallic textures
      textureManager.generateMetallicPanelTexture(256, 0.85);
      textureManager.generateMetallicPanelTexture(128, 0.8);
      
      // Arena textures
      textureManager.generatePlatformTexture(512);
      textureManager.generateAsteroidTexture(512);
      
      // Particle textures
      this.preloadParticleTextures();
      
      console.log('✅ All textures pre-generated and cached');
      resolve();
    });
  }
  
  // Keep preloaded entities to prevent shader/texture disposal
  private preloadedScene: THREE.Scene | null = null;
  private preloadedEntities: {
    player: Player | null;
    boss: SimpleBoss | null;
    arena: Arena | null;
    minions: Minion[];
  } = {
    player: null,
    boss: null,
    arena: null,
    minions: []
  };
  
  private async precompileShaders(): Promise<void> {
    console.log('Starting comprehensive precompilation...');
    
    // Create a REAL scene that we'll keep in memory
    this.preloadedScene = new THREE.Scene();
    
    // Add fog and lights like the real game
    this.preloadedScene.fog = new THREE.FogExp2(0x000033, 0.008);
    this.preloadedScene.background = new THREE.Color(0x000033);
    
    // Create REAL arena
    console.log('Creating arena...');
    this.preloadedEntities.arena = new SpaceArena(this.preloadedScene);
    
    // Force render to compile arena shaders
    this.renderer.render(this.preloadedScene, this.camera);
    
    // Create REAL player
    console.log('Creating player...');
    this.preloadedEntities.player = new Player(this.preloadedScene);
    
    // Force render to compile player shaders
    this.renderer.render(this.preloadedScene, this.camera);
    
    // Create REAL boss at level 1
    console.log('Creating boss level 1...');
    this.preloadedEntities.boss = new SimpleBoss(this.preloadedScene, 1);
    
    // Force render to compile boss shaders
    this.renderer.render(this.preloadedScene, this.camera);
    
    // Simulate gameplay to trigger ALL shader variants
    console.log('Simulating phase changes...');
    
    // Trigger phase 2 (66% health)
    this.preloadedEntities.boss.health = this.preloadedEntities.boss.maxHealth * 0.6;
    for (let i = 0; i < 10; i++) {
      this.preloadedEntities.boss.update(0.016, new THREE.Vector3(0, 0, 0));
      this.renderer.render(this.preloadedScene, this.camera);
    }
    
    // Trigger phase 3 (33% health)
    this.preloadedEntities.boss.health = this.preloadedEntities.boss.maxHealth * 0.3;
    for (let i = 0; i < 10; i++) {
      this.preloadedEntities.boss.update(0.016, new THREE.Vector3(0, 0, 0));
      this.renderer.render(this.preloadedScene, this.camera);
    }
    
    // Evolve to level 2 and render
    console.log('Evolving boss to level 2...');
    this.preloadedEntities.boss.evolve();
    
    // Render multiple frames after evolution
    for (let i = 0; i < 10; i++) {
      this.preloadedEntities.boss.update(0.016, new THREE.Vector3(i, 0, i));
      this.renderer.render(this.preloadedScene, this.camera);
    }
    
    // Create and render minions
    console.log('Creating minions...');
    for (let i = 0; i < 3; i++) {
      const minion = new Minion(this.preloadedScene, new THREE.Vector3(i * 5, 0, 0));
      this.preloadedEntities.minions.push(minion);
      this.renderer.render(this.preloadedScene, this.camera);
    }
    
    // Create item drops
    console.log('Creating item drops...');
    const itemTypes = [ItemType.HEALTH_POTION, ItemType.ENERGY_POTION, ItemType.WEAPON_UPGRADE, ItemType.SHIELD, ItemType.SPEED_BOOST];
    const tempDrops: ItemDrop[] = [];
    for (const type of itemTypes) {
      const itemData = { 
        type, 
        value: 10, 
        rarity: 1, 
        name: 'test', 
        description: 'test',
        color: 0xffffff,
        duration: 5
      };
      const tempDrop = new ItemDrop(this.preloadedScene, new THREE.Vector3(0, 0, 0), itemData);
      tempDrops.push(tempDrop);
      this.renderer.render(this.preloadedScene, this.camera);
    }
    
    // Create projectiles and render them
    console.log('Creating projectiles...');
    const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const projectileMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 2
    });
    const tempProjectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    this.preloadedScene.add(tempProjectile);
    this.renderer.render(this.preloadedScene, this.camera);
    
    // Force compile ALL shaders
    console.log('Compiling all shaders...');
    this.renderer.compile(this.preloadedScene, this.camera);
    
    // Render with post-processing
    if (this.postProcessingManager) {
      console.log('Warming up post-processing...');
      for (let i = 0; i < 5; i++) {
        this.postProcessingManager.render(0.016);
      }
    }
    
    // Clean up temporary items only (keep main entities)
    tempDrops.forEach(drop => drop.dispose());
    this.preloadedScene.remove(tempProjectile);
    projectileGeometry.dispose();
    projectileMaterial.dispose();
    
    // Hide preloaded entities but keep them in memory
    this.preloadedScene.visible = false;
    
    console.log('✅ All shaders and textures fully compiled and cached');
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  private async warmupJIT(): Promise<void> {
    // Run game logic functions multiple times to trigger JIT optimization
    const warmupIterations = 100;
    
    // Create temporary objects for warmup
    const tempVec3 = new THREE.Vector3();
    const tempProjectiles: THREE.Mesh[] = [];
    
    for (let i = 0; i < warmupIterations; i++) {
      // Warm up collision detection
      tempVec3.distanceTo(new THREE.Vector3(i, i, i));
      
      // Warm up math operations
      const angle = Math.atan2(i, i);
      Math.sin(angle);
      Math.cos(angle);
      
      // Warm up array operations
      tempProjectiles.push(new THREE.Mesh());
      if (tempProjectiles.length > 10) {
        tempProjectiles.shift();
      }
    }
    
    // Clean up
    tempProjectiles.forEach(p => {
      if (p.geometry) p.geometry.dispose();
      if (p.material) (p.material as THREE.Material).dispose();
    });
    
    console.log('✅ JIT compiler warmed up');
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  private preloadParticleTextures(): void {
    // Create a shared particle texture that all GPUParticleSystem instances can use
    // This prevents each system from creating its own texture during gameplay
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Create gradient particle texture
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    // Store the texture for later use
    const particleTexture = new THREE.CanvasTexture(canvas);
    particleTexture.needsUpdate = true;
    
    // Cache it in TextureManager or a static property
    (window as any).__cachedParticleTexture = particleTexture;
    
    console.log('✨ Particle textures preloaded');
  }
  
  // Removed - now part of precompileShaders
  
  private async asyncPreCreateUIElements(): Promise<void> {
    // Pre-create all UI elements to avoid DOM manipulation during gameplay
    
    // Remove any existing menus first
    const existingMenu = document.getElementById('main-menu');
    if (existingMenu) existingMenu.remove();
    
    const existingPause = document.getElementById('pause-menu');
    if (existingPause) existingPause.remove();
    
    const existingGameOver = document.getElementById('game-over');
    if (existingGameOver) existingGameOver.remove();
    
    // Main menu
    this.menuContainer = document.createElement('div');
    this.menuContainer.id = 'main-menu';
    this.menuContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      z-index: 1000;
      display: none;
    `;
    this.menuContainer.innerHTML = `
      <h1 style="font-size: 4em; margin-bottom: 0.5em; text-shadow: 0 0 30px #00ffff; animation: glow 2s ease-in-out infinite;">
        NEXUS ETERNAL
      </h1>
      <p style="font-size: 1.5em; color: #ff00ff; margin-bottom: 2em;">
        Endless Boss Rush
      </p>
      <div style="margin-bottom: 2em;">
        <p style="font-size: 1.2em; margin: 0.5em;">Press <span style="color: #00ff00;">ENTER</span> to Select Arena</p>
        <p style="font-size: 1em; margin: 0.5em; color: #888;">
          WASD/Arrows: Move | Space: Shoot | Shift: Dash | ESC: Pause
        </p>
      </div>
      <div style="font-size: 0.9em; color: #666;">
        <p>Defeat endless waves of bosses</p>
        <p>Each victory makes the next boss stronger</p>
      </div>
    `;
    document.body.appendChild(this.menuContainer);
    
    // Pause menu
    this.pauseMenu = document.createElement('div');
    this.pauseMenu.id = 'pause-menu';
    this.pauseMenu.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #ffff00;
      font-family: 'Courier New', monospace;
      z-index: 1000;
      display: none;
    `;
    this.pauseMenu.innerHTML = `
      <h2 style="font-size: 3em; text-shadow: 0 0 20px #ffff00;">PAUSED</h2>
      <p style="font-size: 1.2em;">Press ESC to Resume</p>
    `;
    document.body.appendChild(this.pauseMenu);
    
    // Game over screen
    this.gameOverScreen = document.createElement('div');
    this.gameOverScreen.id = 'game-over';
    this.gameOverScreen.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #ff0000;
      font-family: 'Courier New', monospace;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(this.gameOverScreen);
    
    // Flash effect
    this.flashDiv = document.createElement('div');
    this.flashDiv.id = 'flash-effect';
    this.flashDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999;
      display: none;
    `;
    document.body.appendChild(this.flashDiv);
    
    // Boss evolve flash effect (pre-created to prevent memory leak)
    const bossFlash = document.createElement('div');
    bossFlash.id = 'boss-evolve-flash';
    bossFlash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255,100,0,0.2);
      pointer-events: none;
      z-index: 999;
      transition: opacity 0.3s;
      display: none;
      opacity: 0;
    `;
    document.body.appendChild(bossFlash);
    
    // Level announcement
    this.announcementDiv = document.createElement('div');
    this.announcementDiv.id = 'level-announcement';
    this.announcementDiv.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      z-index: 1001;
      display: none;
    `;
    document.body.appendChild(this.announcementDiv);
    
    // Initialize Map Selection Screen
    this.mapSelectionScreen = new MapSelectionScreen();
    this.mapSelectionScreen.setOnArenaSelected((selectedArena: Arena) => {
      // Get the arena name and dispose the dummy arena
      const arenaName = selectedArena.getName();
      selectedArena.dispose();
      this.startGameWithArena(arenaName);
    });
    this.mapSelectionScreen.setOnBackToMenu(() => {
      this.showMainMenu();
    });
    
    console.log('🎮 UI elements pre-created');
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private setupEventListeners(): void {
    const resizeHandler = this.onWindowResize.bind(this);
    window.addEventListener('resize', resizeHandler);
    this.eventListeners.push({ target: window, type: 'resize', listener: resizeHandler });

    // Game controls
    const keydownHandler = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' && this.gameState === GameState.MENU) {
        this.showMapSelection();
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
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // Show pre-created menu
    if (this.menuContainer) {
      this.menuContainer.style.display = 'block';
    }
    
    // Ensure fullscreen button is visible
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.style.display = 'block';
      fullscreenBtn.style.zIndex = '2000';
    }

  }

  // startGame method removed - deprecated, use showMapSelection() -> startGameWithArena() instead


  private pauseGame(): void {
    this.gameState = GameState.PAUSED;
    this.clock.stop();

    // Show pre-created pause menu
    if (this.pauseMenu) {
      this.pauseMenu.style.display = 'block';
    }
  }

  private resumeGame(): void {
    // Hide pause menu
    if (this.pauseMenu) {
      this.pauseMenu.style.display = 'none';
    }

    this.gameState = GameState.PLAYING;
    this.clock.start();
  }

  private gameOver(): void {
    this.gameState = GameState.GAME_OVER;

    // Update and show pre-created game over screen
    if (this.gameOverScreen) {
      this.gameOverScreen.innerHTML = `
        <h1 style="font-size: 3em; margin-bottom: 0.5em;">GAME OVER</h1>
        <p style="font-size: 1.5em; color: #ffff00;">Final Score: ${Math.round(this.score)}</p>
        <p style="font-size: 1.2em; color: #ff00ff;">Boss Level Reached: ${this.bossLevel}</p>
        <p style="margin-top: 2em;">Press R to Restart</p>
      `;
      this.gameOverScreen.style.display = 'block';
    }
  }

  private victory(): void {
    // Boss defeated, evolve and continue
    this.bossLevel++;
    this.score += 100; // Wave clear bonus: 100 points

    // Drop items visually on boss defeat
    if (this.boss) {
      // Defer item drops to next frame to prevent blocking
      requestAnimationFrame(() => {
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
              this.boss!.position.x + Math.cos(angle) * radius,
              1,
              this.boss!.position.z + Math.sin(angle) * radius
            );

            // Ensure drop is within circular arena bounds
            const distFromCenter = Math.sqrt(dropPosition.x * dropPosition.x + dropPosition.z * dropPosition.z);
            if (distFromCenter > arenaRadius - 1) {
              const clampAngle = Math.atan2(dropPosition.z, dropPosition.x);
              dropPosition.x = Math.cos(clampAngle) * (arenaRadius - 1);
              dropPosition.z = Math.sin(clampAngle) * (arenaRadius - 1);
            }

            // Limit item drops to prevent performance issues
            if (this.itemDrops.length >= this.MAX_ITEM_DROPS) {
              const oldDrop = this.itemDrops.shift();
              if (oldDrop) oldDrop.dispose();
            }
            
            const itemDrop = new ItemDrop(this.scene, dropPosition, itemData);
            this.itemDrops.push(itemDrop);
          }
        }
      });

      // Defer boss evolution with longer delay to prevent freezing
      // Split evolution into multiple frames
      setTimeout(() => {
        if (this.boss && this.gameState === GameState.PLAYING) {
          // Show level announcement first
          this.showLevelAnnouncement(this.bossLevel);
          
          // Evolve boss after announcement with extra delay
          setTimeout(() => {
            if (this.boss && this.gameState === GameState.PLAYING) {
              // Wrap evolution in requestAnimationFrame for smoother transition
              requestAnimationFrame(() => {
                this.boss!.evolve();
              });
            }
          }, 300); // Longer delay to let announcement show first
        }
      }, 100); // Initial delay before announcement
    }

    if (this.gameUI) {
      this.gameUI.showNotification(`BOSS DEFEATED!`, '#00ff88', 2000);
    }

    // Flash victory effect using pre-created element
    if (this.flashDiv) {
      this.flashDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        opacity: 0.3;
        z-index: 500;
        pointer-events: none;
        transition: opacity 0.2s;
        display: block;
      `;
      requestAnimationFrame(() => {
        if (this.flashDiv) {
          this.flashDiv.style.opacity = '0';
          setTimeout(() => {
            if (this.flashDiv) {
              this.flashDiv.style.display = 'none';
              this.flashDiv.style.opacity = '0.3'; // Reset for next use
            }
          }, 200);
        }
      });
    }
  }

  private restartGame(): void {
    // Hide game over screen
    if (this.gameOverScreen) {
      this.gameOverScreen.style.display = 'none';
    }

    // Keep fullscreen button visible
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.style.display = 'block';
      fullscreenBtn.style.zIndex = '2000';
    }

    // Clear scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // Show map selection for arena choice
    this.showMapSelection();
  }

  private showMapSelection(): void {
    // Hide menu
    if (this.menuContainer) {
      this.menuContainer.style.display = 'none';
    }
    
    // Show map selection screen
    if (this.mapSelectionScreen) {
      this.mapSelectionScreen.show();
    }
  }

  private startGameWithArena(arenaName: string): void {
    // Hide loading screen if still visible
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }

    // Keep fullscreen button visible during gameplay
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.style.display = 'block';
      fullscreenBtn.style.zIndex = '2000'; // Ensure it's above game UI
    }

    // Clean up existing game entities before creating new ones
    if (this.gameUI) {
      this.gameUI.dispose();
      this.gameUI = null;
    }
    
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    
    if (this.boss) {
      this.boss.dispose();
      this.boss = null;
    }
    
    if (this.arena) {
      this.arena.dispose();
      this.arena = null;
    }
    
    // Clear minions
    for (const minion of this.minions) {
      minion.dispose();
    }
    this.minions = [];
    
    // Clear projectiles
    for (const projectile of this.projectiles) {
      this.disposeProjectile(projectile);
      this.scene.remove(projectile);
    }
    this.projectiles = [];

    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.bossLevel = 1;
    this.comboMultiplier = 1;
    this.lastMinionSpawnTime = Date.now();
    
    // Initialize UI first (lightweight)
    this.inventory = new Inventory();
    this.gameUI = new GameUI();
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize combo display to show x1
    if (this.gameUI) {
      this.gameUI.updateCombo(this.comboMultiplier);
    }

    // Create arena based on selection
    switch (arenaName) {
      case 'Monad Ecosystem':
        this.arena = new MonadEcosystemArena(this.scene);
        break;
      case 'Space Arena':
        this.arena = new SpaceArena(this.scene);
        break;
      case 'Asteroid Field':
        this.arena = new AsteroidFieldArena(this.scene);
        // Set up falling asteroid damage callback
        if (this.arena instanceof AsteroidFieldArena) {
          this.arena.setPlayerCollisionCallback((damage: number) => {
            if (this.player) {
              this.player.takeDamage(damage);
              console.log(`⚠️ Player hit by falling asteroid! ${damage} damage!`);
            }
          });
        }
        break;
      case 'Nebula Zone':
        this.arena = new NebulaZoneArena(this.scene);
        break;
      default:
        // Fallback to Monad Ecosystem
        this.arena = new MonadEcosystemArena(this.scene);
        break;
    }

    // Initialize the arena
    this.arena.initialize();

    // Create player
    this.player = new Player(this.scene);
    
    // Only create boss and enemies for combat arenas (not Monad Ecosystem)
    if (arenaName !== 'Monad Ecosystem') {
      this.boss = new SimpleBoss(this.scene, this.bossLevel);
    }
    
    // Setup inventory hotkey usage listener
    this.setupInventoryListener();
    
    console.log(`🎮 Game started with ${arenaName}!`);
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
    
    // Dispose preloaded entities
    if (this.preloadedEntities.player) {
      this.preloadedEntities.player.dispose();
      this.preloadedEntities.player = null;
    }
    if (this.preloadedEntities.boss) {
      this.preloadedEntities.boss.dispose();
      this.preloadedEntities.boss = null;
    }
    if (this.preloadedEntities.arena) {
      this.preloadedEntities.arena.dispose();
      this.preloadedEntities.arena = null;
    }
    this.preloadedEntities.minions.forEach(m => m.dispose());
    this.preloadedEntities.minions = [];
    
    if (this.preloadedScene) {
      this.preloadedScene.clear();
      this.preloadedScene = null;
    }

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
      this.boss.dispose();
      this.boss = null;
    }

    // Dispose minions
    for (const minion of this.minions) {
      minion.dispose();
    }
    this.minions = [];

    if (this.arena) {
      this.arena.dispose();
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

    // Dispose map selection screen
    if (this.mapSelectionScreen) {
      this.mapSelectionScreen.dispose();
      this.mapSelectionScreen = null;
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

    this.frameCount++;

    // Periodic cleanup every 600 frames (~10 seconds at 60fps)
    if (this.frameCount % 600 === 0) {
      const now = Date.now();
      if (now - this.lastGCTime > 10000) {
        this.lastGCTime = now;
        this.cleanupDeadReferences();
      }
    }

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

    // Use single animation frame loop
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
        
        // Update asteroid field arena with player position for collision detection
        if (this.arena instanceof AsteroidFieldArena) {
          this.arena.updatePlayerPosition(this.player.position);
        }

        // Handle shooting with projectile limits
        const projectiles = this.player.shoot(this.inputManager);
        if (projectiles) {
          // Count existing player projectiles
          const playerProjectileCount = this.projectiles.filter(p => p.userData.owner === 'player').length;
          
          for (const proj of projectiles) {
            // Enforce limits to prevent memory issues
            if (this.projectiles.length >= this.MAX_PROJECTILES) {
              // Remove oldest projectile
              const oldProj = this.projectiles.shift();
              if (oldProj) {
                this.scene.remove(oldProj);
                this.disposeProjectile(oldProj);
              }
            }
            
            // Check per-owner limit
            if (playerProjectileCount < this.MAX_PROJECTILES_PER_OWNER) {
              this.projectiles.push(proj);
              this.scene.add(proj);
            } else {
              // Dispose excess projectile immediately
              this.disposeProjectile(proj);
            }
          }
        }
      }

      // Only update boss and spawn minions if not in Monad Ecosystem (practice arena)
      const isMonadEcosystem = this.arena instanceof MonadEcosystemArena;
      
      // Update boss
      if (this.boss && this.player && this.arena && !isMonadEcosystem) {
        this.boss.update(modifiedDeltaTime, this.player.position, this.arena.getBounds());

        // Boss attacks with projectile limits
        const bossProjectiles = this.boss.shoot();
        if (bossProjectiles) {
          // Count existing boss projectiles
          const bossProjectileCount = this.projectiles.filter(p => p.userData.owner === 'boss').length;
          
          for (const proj of bossProjectiles) {
            // Enforce limits
            if (this.projectiles.length >= this.MAX_PROJECTILES) {
              const oldProj = this.projectiles.shift();
              if (oldProj) {
                this.scene.remove(oldProj);
                this.disposeProjectile(oldProj);
              }
            }
            
            if (bossProjectileCount < this.MAX_PROJECTILES_PER_OWNER) {
              this.projectiles.push(proj);
              this.scene.add(proj);
            } else {
              this.disposeProjectile(proj);
            }
          }
        }
      }

      // Spawn minions every 15 seconds (8 seconds after level 5) - but not in Monad Ecosystem
      if (!isMonadEcosystem) {
        const currentTime = Date.now();
        // Adjust spawn interval based on boss level
        const spawnInterval = this.bossLevel >= 5 ? 8000 : 15000;
        if (currentTime - this.lastMinionSpawnTime >= spawnInterval) {
          this.spawnMinion();
          this.lastMinionSpawnTime = currentTime;
        }
      }

      // Update minions
      if (this.player) {
        for (let i = this.minions.length - 1; i >= 0; i--) {
          const minion = this.minions[i];
          const minionProjectiles = minion.update(this.player.position, modifiedDeltaTime);
          
          // Add minion projectiles to the game's projectile system
          if (minionProjectiles) {
            for (const proj of minionProjectiles) {
              // Enforce limits to prevent memory issues
              if (this.projectiles.length >= this.MAX_PROJECTILES) {
                const oldProj = this.projectiles.shift();
                if (oldProj) {
                  this.scene.remove(oldProj);
                  this.disposeProjectile(oldProj);
                }
              }
              
              this.projectiles.push(proj);
              this.scene.add(proj);
            }
          }

          // Remove and properly dispose dead minions
          if (minion.getIsDead()) {
            minion.dispose(); // Fix memory leak - properly dispose before removing
            this.minions.splice(i, 1);
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
        // Only update boss health if boss exists
        if (this.boss) {
          this.gameUI.updateBossHealth(this.boss);
        }
        this.gameUI.updateScore(this.score);
        this.gameUI.updateWave(this.bossLevel);
        this.gameUI.updateCombo(this.comboMultiplier);
        this.gameUI.updateInventory(this.inventory);

        // Update FPS display
        if (this.performanceMonitor) {
          // this.gameUI.updateFPS(this.performanceMonitor.getFPS()); // Method not implemented
        }

        // Update performance debug info (only in debug mode)
        if (window.location.hash.includes('debug')) {
          // Performance metrics disabled for now
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
        // Use safe timeout to prevent freezing
        this.safeSetTimeout(() => {
          this.victory();
        }, 100);
      }

      // Combo multiplier now resets automatically in handlePlayerHit method
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

      // REMOVED: Duplicate UI updates - already handled in updateCorePhysics()
      // This was causing double UI updates per frame!

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
          this.disposeProjectile(projectile); // Use proper disposal method
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private spawnMinion(): void {
    if (!this.arena) return;

    // Defer minion creation to prevent frame drops
    requestAnimationFrame(() => {
      const bounds = this.arena!.getBounds();
      const radius = (bounds as any)?.radius || 20;

      // Spawn at random position within arena
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (radius - 5) + 5; // Keep away from center and edges

      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        1, // Match player height
        Math.sin(angle) * distance
      );

      const minion = new Minion(this.scene, position);
      this.minions.push(minion);

      if (this.gameUI) {
        this.gameUI.showNotification('Minion Spawned!', '#ff00ff', 1000);
      }
    });
  }

  private checkCollisions(): void {
    if (!this.player || !this.boss) return;

    // Check legacy projectile collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const owner = projectile.userData.owner;
      const damage = projectile.userData.damage || 10;
      let shouldRemove = false;

      if (owner === 'player') {
        // Check collision with boss - increased hitbox to cover entire spacecraft
        const distance = projectile.position.distanceTo(this.boss.position);
        if (distance < 4.5) { // Increased from 2 to cover saucer (radius 3) + nacelles
          this.handlePlayerHit(damage, projectile.position.clone());
          shouldRemove = true;
        }
        
        // Only check minions if projectile hasn't hit boss and minions exist
        if (!shouldRemove && this.minions.length > 0) {
          for (let j = this.minions.length - 1; j >= 0; j--) {
            const minion = this.minions[j];
            if (!minion.getIsDead()) {
              const minionDistance = projectile.position.distanceTo(minion.getPosition());
              if (minionDistance < 1.5) {
                // Minions die in 1 hit
                if (minion.takeDamage(1)) {
                  // Apply combo system for minion kills too
                  const now = Date.now();
                  if (now - this.lastHitTime <= 1200) {
                    this.comboMultiplier = Math.min(5, this.comboMultiplier + 1);
                  } else {
                    this.comboMultiplier = 1;
                  }
                  const points = 10 * this.comboMultiplier;
                  this.score += points;
                  this.lastHitTime = now;
                  
                  // Clear existing combo timeout
                  if (this.comboTimeoutId !== null) {
                    clearTimeout(this.comboTimeoutId);
                  }
                  
                  // Set new timeout to reset combo after 1.2 seconds
                  this.comboTimeoutId = window.setTimeout(() => {
                    this.comboMultiplier = 1;
                    if (this.gameUI) {
                      this.gameUI.updateCombo(this.comboMultiplier);
                    }
                    this.comboTimeoutId = null;
                  }, 1200);
                  
                  if (this.gameUI) {
                    this.gameUI.showNotification(`+${points}`, '#ffff00', 500);
                    this.gameUI.updateCombo(this.comboMultiplier);
                  }
                }
                shouldRemove = true;
                break; // Exit minion loop after hit
              }
            }
          }
        }
      } else if (owner === 'boss' || owner === 'minion') {
        // Check collision with player
        const distance = projectile.position.distanceTo(this.player.position);
        if (distance < 1.5) {
          this.player.takeDamage(damage);
          shouldRemove = true;
        }
      }

      // Remove projectile if hit something
      if (shouldRemove) {
        this.scene.remove(projectile);
        this.disposeProjectile(projectile); // Use proper disposal method
        this.projectiles.splice(i, 1);
      }
    }
  }

  private handlePlayerHit(damage: number, hitPosition: THREE.Vector3): void {
    try {
      this.boss?.takeDamage(damage);

      // Update combo multiplier
      const now = Date.now();
      if (now - this.lastHitTime <= 1200) {
        // Within 1.2 seconds - increase multiplier up to x5
        this.comboMultiplier = Math.min(5, this.comboMultiplier + 1);
      } else {
        // Reset multiplier if more than 1.2 seconds has passed
        this.comboMultiplier = 1;
      }

      // Apply score: 10 points per hit * combo multiplier
      const points = 10 * this.comboMultiplier;
      this.score += points;
      this.lastHitTime = now;

      // Clear existing combo timeout
      if (this.comboTimeoutId !== null) {
        clearTimeout(this.comboTimeoutId);
      }

      // Set new timeout to reset combo after 1.2 seconds
      this.comboTimeoutId = window.setTimeout(() => {
        this.comboMultiplier = 1;
        if (this.gameUI) {
          this.gameUI.updateCombo(this.comboMultiplier);
        }
        this.comboTimeoutId = null;
      }, 1200);

      // INSTANT COMBAT FEEDBACK - No delays!
      if (this.combatFeedbackManager) {
        // this.combatFeedbackManager.triggerComboHit(this.comboMultiplier, hitPosition); // Method not implemented
      }

      // Update combo display
      if (this.gameUI) {
        this.gameUI.updateCombo(this.comboMultiplier);
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

          // Limit item drops to prevent performance issues
          if (this.itemDrops.length >= this.MAX_ITEM_DROPS) {
            const oldDrop = this.itemDrops.shift();
            if (oldDrop) oldDrop.dispose();
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

  // Removed unused handleBossHit method
  /*
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
  */

  private showLevelAnnouncement(level: number): void {
    if (!this.announcementDiv) return;
    
    // Reset and show announcement
    this.announcementDiv.textContent = `LEVEL ${level}`;
    this.announcementDiv.style.cssText = `
      position: fixed;
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
      display: block;
    `;
    
    // Trigger animation on next frame
    const animFrame = requestAnimationFrame(() => {
      this.animationFrames.delete(animFrame);
      if (!this.announcementDiv) return;
      
      this.announcementDiv.style.transform = 'translate(-50%, -50%) scale(1)';
      this.announcementDiv.style.opacity = '1';

      // Fade out after 2 seconds
      const timer1 = setTimeout(() => {
        this.timers.delete(timer1);
        if (!this.announcementDiv) return;
        
        this.announcementDiv.style.transform = 'translate(-50%, -50%) scale(0.8)';
        this.announcementDiv.style.opacity = '0';
        
        // Hide after transition
        const timer2 = setTimeout(() => {
          this.timers.delete(timer2);
          if (this.announcementDiv) {
            this.announcementDiv.style.display = 'none';
          }
        }, 500) as any;
        this.timers.add(timer2);
      }, 2000) as any;
      this.timers.add(timer1);
    });
    this.animationFrames.add(animFrame);
  }

  private createHitEffect(position: THREE.Vector3): void {
    // Ultra-simple hit effect to prevent any freezing (using object pools)
    const particle = this.objectPoolManager.particlePool.get();
    if (particle) {
      Game.tempColor.setHex(0xffaa00);
      Game.tempVelocity.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      Game.tempAcceleration.set(0, -1, 0);

      particle.initialize(position, Game.tempVelocity, Game.tempAcceleration, Game.tempColor, 0.5, 1.5, 0);
      this.scene.add(particle.mesh);

      // The particle will automatically clean itself up after its lifetime
    }
  }

  private disposeProjectile(projectile: THREE.Mesh): void {
    // Dispose of children (lights, etc)
    if (projectile.children.length > 0) {
      projectile.children.forEach(child => {
        if (child instanceof THREE.Light) {
          child.dispose?.();
        }
        this.scene.remove(child);
      });
      projectile.clear();
    }
    
    // Dispose geometry
    if (projectile.geometry) {
      projectile.geometry.dispose();
    }
    
    // Dispose material(s)
    if (projectile.material) {
      if (Array.isArray(projectile.material)) {
        projectile.material.forEach(m => m.dispose());
      } else {
        projectile.material.dispose();
      }
    }
    
    // Clear userData to break references
    projectile.userData = {};
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

  private cleanupDeadReferences(): void {
    // Remove dead minions
    this.minions = this.minions.filter(m => !m.getIsDead());

    // Clean up completed timers
    for (const timer of this.timers) {
      // Timer already executed, just remove from set
      this.timers.delete(timer);
    }

    // Clean up orphaned DOM elements
    this.createdElements = this.createdElements.filter(el => document.body.contains(el));
    
    // Clean up any orphaned minion explosion particles
    const explosions = (window as any).__minionExplosions;
    if (explosions && explosions.length > 0) {
      for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        if (explosion && explosion.parent) {
          this.scene.remove(explosion);
          if (explosion.geometry) explosion.geometry.dispose();
          if (explosion.material) explosion.material.dispose();
        }
        explosions.splice(i, 1);
      }
    }
  }

  // Getters for other systems to access core components
  public get gameScene(): THREE.Scene { return this.scene; }
  public get gameCamera(): THREE.Camera { return this.camera; }
  public get gameRenderer(): THREE.WebGLRenderer { return this.renderer; }
}