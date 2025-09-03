import { SpaceArena } from '@/game/arenas/SpaceArena';
import { AsteroidFieldArena } from '@/game/arenas/AsteroidFieldArena';
import { NebulaZoneArena } from '@/game/arenas/NebulaZoneArena';
import { MonadEcosystemArena } from '@/game/arenas/MonadEcosystemArena';
import { Arena } from '@/game/Arena';
import { getUIAudioManager, UIAudioManager } from '@/core/UIAudioManager';
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
  private uiAudioManager: UIAudioManager;

  private arenaOptions: ArenaOption[] = [
    {
      name: 'Monad Ecosystem',
      description: 'Peaceful practice arena in the Monad ecosystem - no enemies, just you',
      difficulty: 'Practice',
      color: '#8B5FBF',
      preview: '🟣 Serene Monad space for target practice and exploration',
      createArena: (scene: THREE.Scene) => new MonadEcosystemArena(scene)
    },
    {
      name: 'Space Arena',
      description: 'Classic space battlefield with asteroids and cosmic debris',
      difficulty: 'Normal',
      color: '#00D4FF',
      preview: '🌌 Cosmic space environment with floating asteroids',
      createArena: (scene: THREE.Scene) => new SpaceArena(scene)
    },
    {
      name: 'Asteroid Field',
      description: 'Navigate through dangerous moving asteroids and meteor showers',
      difficulty: 'Hard',
      color: '#FF6B35',
      preview: '☄️ Dense asteroid field with gravity wells and meteors',
      createArena: (scene: THREE.Scene) => new AsteroidFieldArena(scene)
    },
    {
      name: 'Nebula Zone',
      description: 'Fight in a mystical nebula with electrical storms and energy rifts',
      difficulty: 'Expert',
      color: '#E91E63',
      preview: '⚡ Mysterious nebula with electrical discharges and ion storms',
      createArena: (scene: THREE.Scene) => new NebulaZoneArena(scene)
    }
  ];

  constructor() {
    this.uiAudioManager = getUIAudioManager();
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
      background: radial-gradient(ellipse at center, rgba(26, 31, 46, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%);
      color: white;
      font-family: 'Orbitron', monospace;
      z-index: 1500;
      display: none;
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
    `;

    // Background effects
    const bgEffects = document.createElement('div');
    bgEffects.innerHTML = `
      <div class="arena-bg-layer particle-layer"></div>
      <div class="arena-bg-layer scan-lines"></div>
      <div class="arena-glow-orb orb-cyan"></div>
      <div class="arena-glow-orb orb-orange"></div>
      <div class="arena-holographic-overlay"></div>
    `;
    bgEffects.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;

    // Main container
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = `
      position: relative;
      z-index: 10;
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 2rem 6rem 2rem;
      box-sizing: border-box;
    `;

    // Title section
    const titleSection = document.createElement('div');
    titleSection.style.cssText = `
      text-align: center;
      margin-bottom: 2rem;
      animation: fadeInDown 1s ease-out;
    `;

    const title = document.createElement('h1');
    title.innerHTML = `SELECT <span style="color: #FF6B35;">ARENA</span>`;
    title.style.cssText = `
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 900;
      color: #00D4FF;
      text-shadow: 0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 20px #00D4FF, 0 0 40px rgba(0, 212, 255, 0.5);
      letter-spacing: 0.02em;
      margin-bottom: 0.5rem;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Choose Your Battlefield';
    subtitle.style.cssText = `
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.3rem;
      color: #8B5FBF;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      text-shadow: 0 0 10px rgba(139, 95, 191, 0.5);
    `;

    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);

    // Arena selection container
    const arenaContainer = document.createElement('div');
    arenaContainer.className = 'arena-grid';
    arenaContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto 3rem auto;
      padding: 0 1rem;
      flex: 1;
    `;

    // Create arena cards
    this.arenaOptions.forEach((option, index) => {
      const card = this.createArenaCard(option, index);
      arenaContainer.appendChild(card);
    });

    // Instructions bar
    const instructionsBar = document.createElement('div');
    instructionsBar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(26, 31, 46, 0.8);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(0, 212, 255, 0.2);
      padding: 1rem;
      display: flex;
      justify-content: center;
      gap: 3rem;
      font-family: 'Rajdhani', sans-serif;
      z-index: 100;
      animation: fadeInUp 1s ease-out 0.5s both;
    `;

    const controls = [
      { keys: '←/→', action: 'Navigate', color: '#00D4FF' },
      { keys: 'ENTER', action: 'Select', color: '#FFD700' },
      { keys: 'ESC', action: 'Back', color: '#FF6B35' }
    ];

    controls.forEach(control => {
      const controlItem = document.createElement('div');
      controlItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.8rem;
      `;
      controlItem.innerHTML = `
        <span style="
          font-family: 'JetBrains Mono', monospace;
          background: linear-gradient(135deg, ${control.color}33, ${control.color}22);
          border: 1px solid ${control.color}66;
          padding: 0.3rem 0.8rem;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          color: ${control.color};
        ">${control.keys}</span>
        <span style="
          color: #E8F4F8;
          font-size: 1rem;
          font-weight: 500;
        ">${control.action}</span>
      `;
      instructionsBar.appendChild(controlItem);
    });

    // Back button
    const backButton = document.createElement('button');
    backButton.innerHTML = `
      <span style="margin-right: 0.5rem;">←</span>
      <span>BACK TO MENU</span>
    `;
    backButton.style.cssText = `
      position: fixed;
      top: 2rem;
      left: 2rem;
      font-family: 'Rajdhani', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: #FF6B35;
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(255, 107, 53, 0.05));
      border: 2px solid #FF6B35;
      border-radius: 8px;
      padding: 0.8rem 1.5rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      backdrop-filter: blur(10px);
      z-index: 100;
      text-transform: uppercase;
      display: flex;
      align-items: center;
    `;
    backButton.addEventListener('mouseenter', () => {
      this.uiAudioManager.playSound('hover');
      backButton.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 107, 53, 0.1))';
      backButton.style.transform = 'translateX(-5px)';
      backButton.style.boxShadow = '0 5px 20px rgba(255, 107, 53, 0.3)';
    });
    backButton.addEventListener('mouseleave', () => {
      backButton.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(255, 107, 53, 0.05))';
      backButton.style.transform = 'translateX(0)';
      backButton.style.boxShadow = 'none';
    });
    backButton.addEventListener('click', () => {
      this.uiAudioManager.playSound('click');
      this.goBack();
    });

    // Scroll indicator (shows when content is scrollable)
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.innerHTML = `
      <div style="animation: bounce 2s infinite;">
        <span style="color: #00D4FF; font-size: 1.5rem;">↓</span>
      </div>
    `;
    scrollIndicator.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      text-align: center;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;

    mainContainer.appendChild(titleSection);
    mainContainer.appendChild(arenaContainer);

    this.container.appendChild(bgEffects);
    this.container.appendChild(mainContainer);
    this.container.appendChild(instructionsBar);
    this.container.appendChild(backButton);
    this.container.appendChild(scrollIndicator);
    document.body.appendChild(this.container);
    
    // Auto-hide scroll indicator when scrolled
    this.container.addEventListener('scroll', () => {
      if (this.container!.scrollTop > 50) {
        scrollIndicator.style.opacity = '0';
      } else if (this.container!.scrollHeight > this.container!.clientHeight) {
        scrollIndicator.style.opacity = '1';
      }
    });
    
    // Check if content is scrollable on load
    setTimeout(() => {
      if (this.container && this.container.scrollHeight <= this.container.clientHeight) {
        scrollIndicator.style.display = 'none';
      }
    }, 100);

    // Add comprehensive styles
    const style = document.createElement('style');
    style.textContent = `
      /* Custom scrollbar for arena selection */
      #map-selection-screen::-webkit-scrollbar {
        width: 12px;
      }
      
      #map-selection-screen::-webkit-scrollbar-track {
        background: rgba(26, 31, 46, 0.4);
        border-radius: 6px;
      }
      
      #map-selection-screen::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #00D4FF, #FF6B35);
        border-radius: 6px;
        border: 2px solid rgba(26, 31, 46, 0.6);
      }
      
      #map-selection-screen::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #00D4FF, #8B5FBF);
      }
      
      /* Firefox scrollbar */
      #map-selection-screen {
        scrollbar-width: thin;
        scrollbar-color: #00D4FF rgba(26, 31, 46, 0.4);
      }
      
      .arena-bg-layer {
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      .particle-layer {
        background-image: 
          radial-gradient(2px 2px at 20% 30%, rgba(0, 212, 255, 0.3), transparent),
          radial-gradient(2px 2px at 40% 70%, rgba(255, 107, 53, 0.2), transparent),
          radial-gradient(1px 1px at 90% 40%, rgba(139, 95, 191, 0.4), transparent);
        animation: float 20s ease-in-out infinite;
      }
      
      .scan-lines {
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 212, 255, 0.03) 2px,
          rgba(0, 212, 255, 0.03) 4px
        );
        animation: scan-vertical 8s linear infinite;
      }
      
      .arena-holographic-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        opacity: 0.1;
        mix-blend-mode: screen;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(0, 212, 255, 0.1) 50%,
          transparent 70%
        );
        animation: holographicScan 4s linear infinite;
      }
      
      .arena-glow-orb {
        position: absolute;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        filter: blur(100px);
        opacity: 0.3;
        pointer-events: none;
        animation: orbFloat 10s ease-in-out infinite;
      }
      
      .orb-cyan {
        background: radial-gradient(circle, #00D4FF, transparent);
        top: -200px;
        left: -200px;
      }
      
      .orb-orange {
        background: radial-gradient(circle, #FF6B35, transparent);
        bottom: -200px;
        right: -200px;
        animation-delay: 5s;
      }
      
      @keyframes float {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        33% { transform: translate(30px, -30px) rotate(120deg); }
        66% { transform: translate(-20px, 20px) rotate(240deg); }
      }
      
      @keyframes scan-vertical {
        0% { transform: translateY(0); }
        100% { transform: translateY(20px); }
      }
      
      @keyframes holographicScan {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      @keyframes orbFloat {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(50px, -50px) scale(1.1); }
      }
      
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(10px); }
      }
      
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes cardEntry {
        from {
          opacity: 0;
          transform: translateY(50px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes borderGlow {
        0%, 100% { 
          border-color: currentColor;
          box-shadow: 0 0 20px currentColor;
        }
        50% { 
          border-color: currentColor;
          box-shadow: 0 0 40px currentColor, 0 0 60px currentColor;
        }
      }
      
      .arena-card {
        animation: cardEntry 0.6s ease-out backwards;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      
      .arena-card:nth-child(1) { animation-delay: 0.1s; }
      .arena-card:nth-child(2) { animation-delay: 0.2s; }
      .arena-card:nth-child(3) { animation-delay: 0.3s; }
      .arena-card:nth-child(4) { animation-delay: 0.4s; }
      
      .arena-card:hover {
        transform: translateY(-10px) scale(1.03);
      }
      
      .arena-card.selected {
        animation: borderGlow 2s ease-in-out infinite;
      }
      
      .arena-preview-particles {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        border-radius: inherit;
      }
      
      .particle {
        position: absolute;
        background: currentColor;
        border-radius: 50%;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    this.updateSelection();
  }

  private createArenaCard(option: ArenaOption, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'arena-card';
    card.style.cssText = `
      min-height: 380px;
      background: rgba(26, 31, 46, 0.6);
      backdrop-filter: blur(15px);
      border: 2px solid ${option.color}66;
      border-radius: 12px;
      padding: 0;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    `;

    // Animated background gradient
    const animatedBg = document.createElement('div');
    animatedBg.style.cssText = `
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(45deg, ${option.color}, transparent, ${option.color});
      opacity: 0;
      z-index: -1;
      transition: opacity 0.3s ease;
      border-radius: inherit;
    `;

    // Preview section with animated particles
    const previewSection = document.createElement('div');
    previewSection.className = 'arena-preview';
    previewSection.style.cssText = `
      height: 150px;
      background: linear-gradient(135deg, ${option.color}22, ${option.color}11);
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid ${option.color}44;
    `;

    // Add animated particles to preview
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'arena-preview-particles';
    particlesContainer.style.color = option.color;
    
    // Create floating particles
    for (let i = 0; i < 5; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        width: ${2 + Math.random() * 4}px;
        height: ${2 + Math.random() * 4}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: ${0.3 + Math.random() * 0.7};
        animation: float ${10 + Math.random() * 10}s ease-in-out infinite;
        animation-delay: ${Math.random() * 5}s;
      `;
      particlesContainer.appendChild(particle);
    }
    previewSection.appendChild(particlesContainer);

    // Arena icon/preview
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 3rem;
      opacity: 0.8;
      text-shadow: 0 0 30px ${option.color};
    `;
    iconContainer.textContent = option.preview.split(' ')[0]; // Just the emoji
    previewSection.appendChild(iconContainer);

    // Difficulty badge
    const difficulty = document.createElement('div');
    difficulty.textContent = option.difficulty.toUpperCase();
    difficulty.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: linear-gradient(135deg, ${option.color}, ${option.color}88);
      color: #FFFFFF;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    `;
    previewSection.appendChild(difficulty);

    // Content section
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
    `;

    // Arena name
    const name = document.createElement('h3');
    name.textContent = option.name.toUpperCase();
    name.style.cssText = `
      font-family: 'Orbitron', monospace;
      font-size: 1.3rem;
      font-weight: 700;
      color: ${option.color};
      margin-bottom: 0.5rem;
      text-shadow: 0 0 10px ${option.color}66;
      letter-spacing: 0.05em;
    `;

    // Description
    const description = document.createElement('p');
    description.textContent = option.description;
    description.style.cssText = `
      font-family: 'Rajdhani', sans-serif;
      color: #E8F4F8;
      line-height: 1.5;
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
      flex: 1;
      opacity: 0.9;
    `;

    // Features list
    const features = document.createElement('div');
    features.style.cssText = `
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    `;
    
    const featureItems = this.getArenaFeatures(option.name);
    featureItems.forEach(feature => {
      const featureTag = document.createElement('span');
      featureTag.textContent = feature;
      featureTag.style.cssText = `
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: ${option.color};
        background: ${option.color}22;
        border: 1px solid ${option.color}44;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
      `;
      features.appendChild(featureTag);
    });

    // Select button
    const selectButton = document.createElement('button');
    selectButton.textContent = 'ENTER ARENA';
    selectButton.style.cssText = `
      background: linear-gradient(135deg, ${option.color}33, ${option.color}22);
      border: 2px solid ${option.color};
      color: #E8F4F8;
      text-align: center;
      padding: 1rem;
      font-family: 'Rajdhani', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      text-transform: uppercase;
      border-radius: 6px;
      position: relative;
      overflow: hidden;
    `;

    // Hover effect for button
    const buttonHoverEffect = document.createElement('div');
    buttonHoverEffect.style.cssText = `
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, ${option.color}44, transparent);
      transition: left 0.6s ease;
      pointer-events: none;
    `;
    selectButton.appendChild(buttonHoverEffect);

    content.appendChild(name);
    content.appendChild(description);
    content.appendChild(features);
    content.appendChild(selectButton);

    card.appendChild(animatedBg);
    card.appendChild(previewSection);
    card.appendChild(content);

    // Enhanced event listeners
    card.addEventListener('mouseenter', () => {
      this.uiAudioManager.playSound('hover');
      this.selectedArenaIndex = index;
      this.updateSelection();
      card.style.transform = 'translateY(-10px) scale(1.02)';
      card.style.borderColor = option.color;
      card.style.boxShadow = `
        0 15px 40px rgba(0, 0, 0, 0.5),
        0 0 30px ${option.color}44,
        inset 0 1px 0 rgba(255, 255, 255, 0.2)
      `;
      animatedBg.style.opacity = '0.1';
      buttonHoverEffect.style.left = '100%';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
      card.style.borderColor = `${option.color}66`;
      card.style.boxShadow = `
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1)
      `;
      animatedBg.style.opacity = '0';
      buttonHoverEffect.style.left = '-100%';
    });

    card.addEventListener('click', () => {
      this.uiAudioManager.playSound('click');
      this.selectArena(index);
    });

    return card;
  }

  private getArenaFeatures(arenaName: string): string[] {
    const features: { [key: string]: string[] } = {
      'Monad Ecosystem': ['No Enemies', 'Training Mode', 'Infinite Time'],
      'Space Arena': ['Asteroids', 'Balanced', 'Classic Mode'],
      'Asteroid Field': ['Moving Hazards', 'Gravity Wells', 'High Difficulty'],
      'Nebula Zone': ['Ion Storms', 'Energy Rifts', 'Expert Only']
    };
    return features[arenaName] || [];
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

    // Play success sound for arena selection
    this.uiAudioManager.playSound('success');

    const option = this.arenaOptions[index];
    // We need to pass a scene to create the arena, but we'll let the game handle that
    // For now, we'll pass the arena creation function
    const dummyScene = new THREE.Scene(); // This will be replaced by the actual game scene
    const arena = option.createArena(dummyScene);
    
    // Add a small delay for the sound effect
    setTimeout(() => {
      this.hide();
      this.onArenaSelected(arena);
    }, 200);
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