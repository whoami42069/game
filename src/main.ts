import { Game } from '@/core/Game';
import { LoadingManager } from '@/core/LoadingManager';
import { AudioManager } from '@/core/AudioManager';
import { InputManager } from '@/core/InputManager';
import { UIManager } from '@/ui/UIManager';

/**
 * Main entry point for Nexus Eternal
 * Initializes all core systems and starts the game
 */
class NexusEternal {
  private game: Game | null = null;
  private loadingManager: LoadingManager;
  private audioManager: AudioManager;
  private inputManager: InputManager;
  private uiManager: UIManager;

  constructor() {
    console.log('🚀 Initializing Nexus Eternal...');
    
    // Initialize core managers
    this.loadingManager = new LoadingManager();
    this.audioManager = new AudioManager();
    this.inputManager = new InputManager();
    this.uiManager = new UIManager();
    
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Show loading screen
      this.showLoadingScreen();
      
      // Initialize core systems
      await this.initializeSystems();
      
      // Create and start the game
      this.game = new Game({
        canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
        loadingManager: this.loadingManager,
        audioManager: this.audioManager,
        inputManager: this.inputManager,
        uiManager: this.uiManager
      });
      
      // Start the game (Game.ts handles loading screen now)
      await this.game.start();
      
      console.log('✅ Nexus Eternal initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Nexus Eternal:', error);
      this.showError(error as Error);
    }
  }

  private async initializeSystems(): Promise<void> {
    const systems = [
      { name: 'Audio Manager', init: () => this.audioManager.initialize() },
      { name: 'Input Manager', init: () => this.inputManager.initialize() },
      { name: 'UI Manager', init: () => this.uiManager.initialize() },
      { name: 'Loading Manager', init: () => this.loadingManager.initialize() }
    ];

    for (let i = 0; i < systems.length; i++) {
      const system = systems[i];
      this.updateLoadingProgress((i / systems.length) * 100, `Initializing ${system.name}...`);
      
      try {
        await system.init();
        console.log(`✅ ${system.name} initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${system.name}:`, error);
        throw error;
      }
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  private showLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
    }
  }

  // hideLoadingScreen method removed - loading screen is managed by Game.ts

  private updateLoadingProgress(percentage: number, text: string): void {
    const progressBar = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    if (loadingText) {
      loadingText.textContent = text;
    }
  }

  private showError(error: Error): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <div class="loading-title" style="color: #ff4444;">ERROR</div>
        <div class="loading-text" style="color: #ff4444; white-space: pre-wrap; max-width: 80%; text-align: center;">
          Failed to initialize Nexus Eternal:
          
          ${error.message}
          
          Please check the console for more details.
        </div>
      `;
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new NexusEternal();
});

// Handle fullscreen toggle
document.addEventListener('DOMContentLoaded', () => {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Could not enter fullscreen:', err);
        });
      } else {
        document.exitFullscreen().catch(err => {
          console.warn('Could not exit fullscreen:', err);
        });
      }
    });
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  // Game will handle resize through its own event system
});

// Prevent context menu on right-click (for game controls)
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});