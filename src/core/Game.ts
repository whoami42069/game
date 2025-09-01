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
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private stats: Stats;
  
  private loadingManager: LoadingManager;
  private audioManager: AudioManager;
  private inputManager: InputManager;
  private uiManager: UIManager;
  private postProcessingManager: PostProcessingManager | null = null;
  
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
  
  // Game stats
  private score: number = 0;
  private bossLevel: number = 1;
  private comboMultiplier: number = 1;
  private lastHitTime: number = 0;

  constructor(config: GameConfig) {
    this.canvas = config.canvas;
    this.loadingManager = config.loadingManager;
    this.audioManager = config.audioManager;
    this.inputManager = config.inputManager;
    this.uiManager = config.uiManager;
    
    this.clock = new THREE.Clock();
    this.stats = new Stats();
    
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initPostProcessing();
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
    this.renderer.physicallyCorrectLights = true;
    
    // Gamma correction for better colors
    this.renderer.gammaFactor = 2.2;
    
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

  private initVolumetricLighting(): void {
    this.volumetricLighting = new VolumetricLighting(
      this.scene,
      this.camera,
      this.renderer
    );
    
    console.log('🌅 AAA Volumetric lighting system initialized with god rays and atmospheric scattering');
  }

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
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Game controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.gameState === GameState.MENU) {
        this.startGame();
      } else if (e.key === 'Escape') {
        if (this.gameState === GameState.PLAYING) {
          this.pauseGame();
        } else if (this.gameState === GameState.PAUSED) {
          this.resumeGame();
        }
      } else if (e.key === 'r' && (this.gameState === GameState.GAME_OVER || this.gameState === GameState.VICTORY)) {
        this.restartGame();
      } else if (e.key === 'F3') {
        // Toggle stats display
        e.preventDefault();
        if (this.stats.dom) {
          this.stats.dom.style.display = this.stats.dom.style.display === 'none' ? 'block' : 'none';
        }
      }
    });
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.gameState === GameState.PLAYING) {
        this.pauseGame();
      }
    });
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
      this.postProcessingManager.setSize(width, height);
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
    
    // Create HUD
    this.createHUD();
    
    // Setup inventory hotkey usage listener
    this.setupInventoryListener();
    
    console.log('🎮 Game started!');
  }

  private createHUD(): void {
    const hudContainer = document.createElement('div');
    hudContainer.id = 'game-hud';
    hudContainer.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      z-index: 100;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    
    hudContainer.innerHTML = `
      <div style="margin-bottom: 10px;">
        <div>Health: <span id="player-health" style="color: #00ff00;">100</span></div>
        <div>Energy: <span id="player-energy" style="color: #00ffff;">100</span></div>
      </div>
      <div style="margin-bottom: 10px;">
        <div>Boss Level: <span id="boss-level" style="color: #ff00ff;">${this.bossLevel}</span></div>
        <div>Boss Health: <span id="boss-health" style="color: #ff4400;">100</span></div>
      </div>
      <div>
        <div>Score: <span id="score" style="color: #ffff00;">0</span></div>
        <div>Combo: <span id="combo" style="color: #ff00ff;">x1</span></div>
      </div>
    `;
    
    document.body.appendChild(hudContainer);
  }

  private updateHUD(): void {
    if (!this.player || !this.boss) return;
    
    const elements = {
      playerHealth: document.getElementById('player-health'),
      playerEnergy: document.getElementById('player-energy'),
      bossLevel: document.getElementById('boss-level'),
      bossHealth: document.getElementById('boss-health'),
      score: document.getElementById('score'),
      combo: document.getElementById('combo')
    };
    
    if (elements.playerHealth) elements.playerHealth.textContent = Math.round(this.player.health).toString();
    if (elements.playerEnergy) elements.playerEnergy.textContent = Math.round(this.player.energy).toString();
    if (elements.bossLevel) elements.bossLevel.textContent = this.bossLevel.toString();
    if (elements.bossHealth) elements.bossHealth.textContent = Math.round(this.boss.health).toString();
    if (elements.score) elements.score.textContent = Math.round(this.score).toString();
    if (elements.combo) elements.combo.textContent = `x${this.comboMultiplier}`;
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
    
    // Auto-collect items on boss defeat - no visual drops
    if (this.boss && this.inventory && this.gameUI) {
      const dropCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < dropCount; i++) {
        const itemData = ItemDrop.generateRandomDrop(1); // 100% chance
        if (itemData) {
          // Directly add to inventory without creating visual drops
          if (this.inventory.addItem(itemData)) {
            this.gameUI.showNotification(`+${itemData.name}`, `#${itemData.color.toString(16).padStart(6, '0')}`);
          }
        }
      }
      
      // Delay level announcement and evolution to prevent freezing
      setTimeout(() => {
        // Show level announcement
        this.showLevelAnnouncement(this.bossLevel);
        
        // Evolve boss after a small delay
        setTimeout(() => {
          if (this.boss) {
            this.boss.evolve();
          }
        }, 100);
      }, 50);
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
    
    // Remove HUD
    const hud = document.getElementById('game-hud');
    if (hud) hud.remove();
    
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
    
    this.renderer.dispose();
    console.log('⏹️ Game stopped');
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    this.stats.begin();
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();
    
    this.update(deltaTime, elapsedTime);
    this.render();
    
    this.stats.end();
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number, elapsedTime: number): void {
    // Update managers
    this.inputManager.update(deltaTime);
    this.audioManager.update(deltaTime);
    this.uiManager.update(deltaTime);
    
    // Update game entities only when playing
    if (this.gameState === GameState.PLAYING) {
      // Update arena
      if (this.arena) {
        this.arena.update(deltaTime);
      }
      
      // Update player with camera for camera-relative movement
      if (this.player && this.arena) {
        this.player.update(deltaTime, this.arena.getBounds(), this.camera);
        
        // Handle shooting
        const projectiles = this.player.shoot();
        if (projectiles) {
          this.projectiles.push(...projectiles);
        }
      }
      
      // Update boss
      if (this.boss && this.player && this.arena) {
        this.boss.update(deltaTime, this.player.position, this.arena.getBounds());
        
        // Boss attacks
        const bossProjectiles = this.boss.shoot();
        if (bossProjectiles) {
          this.projectiles.push(...bossProjectiles);
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
      
      // Update HUD
      this.updateHUD();
      
      // Update Game UI
      if (this.gameUI && this.player && this.inventory) {
        this.gameUI.updateHealth(this.player);
        this.gameUI.updateBossHealth(this.boss);
        this.gameUI.updateScore(this.score);
        this.gameUI.updateWave(this.bossLevel);
        this.gameUI.updateInventory(this.inventory);
      }
      
      // Update volumetric lighting system
      if (this.volumetricLighting) {
        const lightPosition = new THREE.Vector3(50, 100, 50); // Main sun light position
        this.volumetricLighting.update(deltaTime, lightPosition, this.camera.position);
      }
      
      // Update camera for Witcher-style third-person view
      if (this.player) {
        // Get player's rotation
        const playerRotation = this.player.mesh.rotation.y;
        
        // Camera stays behind the character based on their rotation
        const cameraDistance = 20; // Increased distance for better view
        const cameraHeight = 12;   // Slightly higher for better overview
        
        // Calculate camera position behind the character
        const cameraOffset = new THREE.Vector3(
          -Math.sin(playerRotation) * cameraDistance,
          cameraHeight,
          -Math.cos(playerRotation) * cameraDistance
        );
        
        const targetPosition = this.player.position.clone().add(cameraOffset);
        
        // Smooth camera movement
        this.camera.position.lerp(targetPosition, deltaTime * 6);
        
        // Look at the player with slight forward offset
        const lookTarget = this.player.position.clone();
        lookTarget.y += 2; // Look at player upper body
        // Add small forward offset in player's facing direction
        lookTarget.x += Math.sin(playerRotation) * 2;
        lookTarget.z += Math.cos(playerRotation) * 2;
        
        this.camera.lookAt(lookTarget);
      }
      
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

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const velocity = projectile.userData.velocity as THREE.Vector3;
      
      if (velocity) {
        projectile.position.add(velocity.clone().multiplyScalar(deltaTime));
        
        // Remove if out of bounds
        if (Math.abs(projectile.position.x) > 30 || 
            Math.abs(projectile.position.z) > 30 ||
            projectile.position.y < -5 || projectile.position.y > 30) {
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
    
    // Check projectile collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const owner = projectile.userData.owner;
      const damage = projectile.userData.damage || 10;
      
      if (owner === 'player') {
        // Check collision with boss
        const distance = projectile.position.distanceTo(this.boss.position);
        if (distance < 2) {
          // Use try-catch to prevent freezing on damage
          try {
            this.boss.takeDamage(damage);
            this.score += 100; // Fixed 100 points per hit
            this.comboMultiplier = Math.min(16, this.comboMultiplier + 1);
            this.lastHitTime = Date.now();
            
            // Small chance to auto-collect item on hit (0.5% chance) - no visual drops
            if (Math.random() < 0.005 && this.inventory && this.gameUI) {
              const itemData = ItemDrop.generateRandomDrop(1);
              if (itemData && this.inventory.addItem(itemData)) {
                this.gameUI.showNotification(`+${itemData.name}`, `#${itemData.color.toString(16).padStart(6, '0')}`);
              }
            }
            
            // Defer hit effect to prevent freezing
            const hitPos = projectile.position.clone();
            requestAnimationFrame(() => {
              this.createHitEffect(hitPos);
            });
          } catch (error) {
            console.error('Error processing player hit:', error);
          }
          
          // Remove projectile safely
          this.scene.remove(projectile);
          if (projectile.geometry) projectile.geometry.dispose();
          if (projectile.material) {
            if (Array.isArray(projectile.material)) {
              projectile.material.forEach(m => m.dispose());
            } else {
              (projectile.material as THREE.Material).dispose();
            }
          }
          this.projectiles.splice(i, 1);
        }
      } else if (owner === 'boss') {
        // Check collision with player
        const distance = projectile.position.distanceTo(this.player.position);
        if (distance < 1.5) {
          // Use try-catch to prevent freezing on damage
          try {
            this.player.takeDamage(damage);
            
            // Hit effect
            this.createHitEffect(projectile.position.clone());
          } catch (error) {
            console.error('Error processing boss hit:', error);
          }
          
          // Remove projectile safely
          this.scene.remove(projectile);
          if (projectile.geometry) projectile.geometry.dispose();
          if (projectile.material) {
            if (Array.isArray(projectile.material)) {
              projectile.material.forEach(m => m.dispose());
            } else {
              (projectile.material as THREE.Material).dispose();
            }
          }
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private showLevelAnnouncement(level: number): void {
    // Use requestAnimationFrame to prevent freezing
    requestAnimationFrame(() => {
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
      
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        announcement.style.transform = 'translate(-50%, -50%) scale(1)';
        announcement.style.opacity = '1';
        
        // Fade out
        setTimeout(() => {
          announcement.style.transform = 'translate(-50%, -50%) scale(0.8)';
          announcement.style.opacity = '0';
          setTimeout(() => announcement.remove(), 500);
        }, 2000);
      });
    });
  }

  private createHitEffect(position: THREE.Vector3): void {
    // Ultra-simple hit effect to prevent any freezing
    const geometry = new THREE.SphereGeometry(0.5, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const hitSphere = new THREE.Mesh(geometry, material);
    hitSphere.position.copy(position);
    this.scene.add(hitSphere);
    
    // Simple scale animation without complex particles
    let scale = 1;
    let opacity = 0.6;
    const animate = () => {
      scale += 0.15;
      opacity -= 0.04;
      
      if (opacity > 0) {
        hitSphere.scale.setScalar(scale);
        material.opacity = opacity;
        requestAnimationFrame(animate);
      } else {
        // Clean up
        this.scene.remove(hitSphere);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

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
    if (this.inventory.addItem(item)) {
      // Use requestAnimationFrame to prevent freezing
      requestAnimationFrame(() => {
        this.gameUI.showNotification(`+${item.name}`, `#${item.color.toString(16).padStart(6, '0')}`);
      });
    } else {
      requestAnimationFrame(() => {
        this.gameUI.showNotification('Inventory Full!', '#ff0000');
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
        requestAnimationFrame(animateSparks);
      } else {
        // Clean up safely
        if (this.scene.children.includes(shield)) {
          this.scene.remove(shield);
        }
        shieldGeometry.dispose();
        shieldMaterial.dispose();
      }
    };
    
    animateSparks();
  }

  // Getters for other systems to access core components
  public get gameScene(): THREE.Scene { return this.scene; }
  public get gameCamera(): THREE.Camera { return this.camera; }
  public get gameRenderer(): THREE.WebGLRenderer { return this.renderer; }
}