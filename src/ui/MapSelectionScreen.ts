import { SpaceArena } from '@/game/arenas/SpaceArena';
import { AsteroidFieldArena } from '@/game/arenas/AsteroidFieldArena';
import { NebulaZoneArena } from '@/game/arenas/NebulaZoneArena';
import { MonadEcosystemArena } from '@/game/arenas/MonadEcosystemArena';
import { Arena } from '@/game/Arena';
import * as THREE from 'three';

export interface ArenaOption {
  name: string;
  description: string;
  difficulty: string;
  color: string;
  preview: string;
  createArena: (scene: THREE.Scene) => Arena;
}

export class MapSelectionScreen {
  private container: HTMLDivElement | null = null;
  private selectedArenaIndex: number = 0;
  private onArenaSelected: ((arena: Arena) => void) | null = null;
  private onBackToMenu: (() => void) | null = null;

  private arenaOptions: ArenaOption[] = [
    {
      name: 'Monad Ecosystem',
      description: 'Peaceful practice arena in the Monad ecosystem - no enemies, just you',
      difficulty: 'Practice',
      color: '#bb86fc',
      preview: '🟣 Serene Monad space for target practice and exploration',
      createArena: (scene: THREE.Scene) => new MonadEcosystemArena(scene)
    },
    {
      name: 'Space Arena',
      description: 'Classic space battlefield with asteroids and cosmic debris',
      difficulty: 'Normal',
      color: '#00ffff',
      preview: '🌌 Cosmic space environment with floating asteroids',
      createArena: (scene: THREE.Scene) => new SpaceArena(scene)
    },
    {
      name: 'Asteroid Field',
      description: 'Navigate through dangerous moving asteroids and meteor showers',
      difficulty: 'Hard',
      color: '#ffaa44',
      preview: '☄️ Dense asteroid field with gravity wells and meteors',
      createArena: (scene: THREE.Scene) => new AsteroidFieldArena(scene)
    },
    {
      name: 'Nebula Zone',
      description: 'Fight in a mystical nebula with electrical storms and energy rifts',
      difficulty: 'Expert',
      color: '#ff44dd',
      preview: '⚡ Mysterious nebula with electrical discharges and ion storms',
      createArena: (scene: THREE.Scene) => new NebulaZoneArena(scene)
    }
  ];

  constructor() {
    this.createUI();
    this.setupEventListeners();
  }

  private createUI(): void {
    // Remove any existing map selection screen
    const existing = document.getElementById('map-selection-screen');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'map-selection-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #000033, #001122);
      color: white;
      font-family: 'Courier New', monospace;
      z-index: 1500;
      display: none;
      overflow: auto;
      padding: 2rem;
      box-sizing: border-box;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'SELECT ARENA';
    title.style.cssText = `
      text-align: center;
      font-size: 3em;
      color: #00ffff;
      text-shadow: 0 0 20px #00ffff;
      margin-bottom: 2rem;
      animation: glow 2s ease-in-out infinite;
    `;

    // Arena selection container
    const arenaContainer = document.createElement('div');
    arenaContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto 2rem auto;
      flex-wrap: wrap;
    `;

    // Create arena cards
    this.arenaOptions.forEach((option, index) => {
      const card = this.createArenaCard(option, index);
      arenaContainer.appendChild(card);
    });

    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      text-align: center;
      font-size: 1.2em;
      color: #cccccc;
      max-width: 800px;
      margin: 0 auto 2rem auto;
      line-height: 1.6;
    `;
    instructions.innerHTML = `
      <p style="margin-bottom: 1rem;">
        <span style="color: #00ff00;">←/→</span> Navigate | 
        <span style="color: #00ff00;">ENTER</span> Select Arena | 
        <span style="color: #ff0000;">ESC</span> Back to Menu
      </p>
      <p style="font-size: 0.9em; color: #888888;">
        Choose your battlefield wisely! Each arena offers unique challenges and environmental hazards.
      </p>
    `;

    // Back button
    const backButton = document.createElement('div');
    backButton.textContent = '◀ Back to Menu';
    backButton.style.cssText = `
      position: absolute;
      top: 2rem;
      left: 2rem;
      font-size: 1.2em;
      color: #ff6666;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border: 2px solid #ff6666;
      border-radius: 5px;
      transition: all 0.3s;
    `;
    backButton.addEventListener('mouseenter', () => {
      backButton.style.background = '#ff6666';
      backButton.style.color = '#000';
    });
    backButton.addEventListener('mouseleave', () => {
      backButton.style.background = 'transparent';
      backButton.style.color = '#ff6666';
    });
    backButton.addEventListener('click', () => {
      this.goBack();
    });

    this.container.appendChild(title);
    this.container.appendChild(arenaContainer);
    this.container.appendChild(instructions);
    this.container.appendChild(backButton);
    document.body.appendChild(this.container);

    // Add glow animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes glow {
        0% { text-shadow: 0 0 20px #00ffff; }
        50% { text-shadow: 0 0 30px #00ffff, 0 0 40px #00ffff; }
        100% { text-shadow: 0 0 20px #00ffff; }
      }
      .arena-card {
        transition: all 0.3s ease;
      }
      .arena-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 10px 30px rgba(0, 255, 255, 0.3);
      }
      .arena-card.selected {
        transform: translateY(-5px) scale(1.05);
        box-shadow: 0 15px 40px rgba(0, 255, 255, 0.5);
      }
    `;
    document.head.appendChild(style);

    this.updateSelection();
  }

  private createArenaCard(option: ArenaOption, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'arena-card';
    card.style.cssText = `
      width: 280px;
      min-height: 350px;
      background: linear-gradient(145deg, #1a1a2e, #16213e);
      border: 3px solid ${option.color};
      border-radius: 15px;
      padding: 1.5rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    `;

    // Preview background effect
    const bgEffect = document.createElement('div');
    bgEffect.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(180deg, ${option.color}22, transparent);
      pointer-events: none;
    `;

    // Arena name
    const name = document.createElement('h2');
    name.textContent = option.name;
    name.style.cssText = `
      color: ${option.color};
      font-size: 1.5em;
      margin-bottom: 1rem;
      text-shadow: 0 0 10px ${option.color};
    `;

    // Difficulty badge
    const difficulty = document.createElement('div');
    difficulty.textContent = option.difficulty;
    difficulty.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: ${option.color};
      color: #000;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: bold;
    `;

    // Preview
    const preview = document.createElement('div');
    preview.textContent = option.preview;
    preview.style.cssText = `
      font-size: 0.9em;
      color: #cccccc;
      margin-bottom: 1rem;
      line-height: 1.4;
    `;

    // Description
    const description = document.createElement('p');
    description.textContent = option.description;
    description.style.cssText = `
      color: #aaaaaa;
      line-height: 1.5;
      margin-bottom: 1.5rem;
      font-size: 0.9em;
    `;

    // Select button
    const selectButton = document.createElement('div');
    selectButton.textContent = 'SELECT ARENA';
    selectButton.style.cssText = `
      position: absolute;
      bottom: 1rem;
      left: 1.5rem;
      right: 1.5rem;
      background: transparent;
      border: 2px solid ${option.color};
      color: ${option.color};
      text-align: center;
      padding: 0.8rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    `;

    card.appendChild(bgEffect);
    card.appendChild(name);
    card.appendChild(difficulty);
    card.appendChild(preview);
    card.appendChild(description);
    card.appendChild(selectButton);

    // Event listeners
    card.addEventListener('mouseenter', () => {
      this.selectedArenaIndex = index;
      this.updateSelection();
    });

    card.addEventListener('click', () => {
      this.selectArena(index);
    });

    return card;
  }

  private updateSelection(): void {
    if (!this.container) return;

    const cards = this.container.querySelectorAll('.arena-card');
    cards.forEach((card, index) => {
      const htmlCard = card as HTMLElement;
      if (index === this.selectedArenaIndex) {
        htmlCard.classList.add('selected');
        const button = htmlCard.querySelector('div:last-child') as HTMLElement;
        if (button) {
          const option = this.arenaOptions[index];
          button.style.background = option.color;
          button.style.color = '#000';
        }
      } else {
        htmlCard.classList.remove('selected');
        const button = htmlCard.querySelector('div:last-child') as HTMLElement;
        if (button) {
          const option = this.arenaOptions[index];
          button.style.background = 'transparent';
          button.style.color = option.color;
        }
      }
    });
  }

  private setupEventListeners(): void {
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.isVisible()) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          this.selectedArenaIndex = (this.selectedArenaIndex - 1 + this.arenaOptions.length) % this.arenaOptions.length;
          this.updateSelection();
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          this.selectedArenaIndex = (this.selectedArenaIndex + 1) % this.arenaOptions.length;
          this.updateSelection();
          break;

        case 'Enter':
          e.preventDefault();
          this.selectArena(this.selectedArenaIndex);
          break;

        case 'Escape':
          e.preventDefault();
          this.goBack();
          break;
      }
    };

    document.addEventListener('keydown', keyHandler);
  }

  private selectArena(index: number): void {
    if (!this.onArenaSelected) return;

    const option = this.arenaOptions[index];
    // We need to pass a scene to create the arena, but we'll let the game handle that
    // For now, we'll pass the arena creation function
    const dummyScene = new THREE.Scene(); // This will be replaced by the actual game scene
    const arena = option.createArena(dummyScene);
    
    this.hide();
    this.onArenaSelected(arena);
  }

  private goBack(): void {
    this.hide();
    if (this.onBackToMenu) {
      this.onBackToMenu();
    }
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  public isVisible(): boolean {
    return this.container ? this.container.style.display !== 'none' : false;
  }

  public setOnArenaSelected(callback: (arena: Arena) => void): void {
    this.onArenaSelected = callback;
  }

  public setOnBackToMenu(callback: () => void): void {
    this.onBackToMenu = callback;
  }

  public dispose(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.onArenaSelected = null;
    this.onBackToMenu = null;
  }
}