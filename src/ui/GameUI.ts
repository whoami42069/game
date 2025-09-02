import { Player } from '@/game/Player';
import { SimpleBoss } from '@/game/SimpleBoss';
import { Inventory } from '@/game/Inventory';
// import { ItemType } from '@/game/ItemDrop'; // Unused import

export class GameUI {
  private container: HTMLDivElement;
  private healthBar!: HTMLDivElement;
  private energyBar!: HTMLDivElement;
  private weaponLevelElement!: HTMLDivElement;
  private bossHealthBar!: HTMLDivElement;
  private scoreElement!: HTMLDivElement;
  private waveElement!: HTMLDivElement;
  private comboElement!: HTMLDivElement;
  private inventoryElement!: HTMLDivElement;
  private notificationElement!: HTMLDivElement;
  private notificationTimeout: number | null = null;

  constructor() {
    // Remove any existing game UI first
    const existingUI = document.getElementById('game-ui');
    if (existingUI) {
      existingUI.remove();
    }
    
    this.injectStyles();
    this.container = document.createElement('div');
    this.container.id = 'game-ui';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      font-family: 'Orbitron', 'Courier New', monospace;
      color: #00ffff;
      animation: uiFadeIn 1s ease-out;
    `;
    
    this.createHealthBars();
    this.createScoreDisplay();
    this.createInventoryDisplay();
    this.createNotificationDisplay();
    
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    // Check if styles already exist
    if (document.getElementById('game-ui-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'game-ui-styles';
    style.textContent = `
      :root {
        --space-cyan: #00d4ff;
        --space-purple: #6c5ce7;
        --space-pink: #fd79a8;
        --space-blue: #0984e3;
        --neon-green: #00ff88;
        --neon-orange: #ff7675;
        --plasma-yellow: #fdcb6e;
        --hologram-white: rgba(255, 255, 255, 0.9);
        --deep-space: rgba(10, 15, 25, 0.95);
        --nebula-dark: rgba(25, 15, 35, 0.85);
        --void-black: rgba(0, 0, 0, 0.9);
        --glass-light: rgba(255, 255, 255, 0.1);
        --glass-border: rgba(255, 255, 255, 0.2);
      }
      @keyframes uiFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes healthPulse {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      @keyframes energyFlow {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
      
      @keyframes weaponGlow {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes bossBarPulse {
        0%, 100% { 
          box-shadow: 
            0 0 40px rgba(253, 121, 168, 0.6),
            inset 0 0 30px rgba(0, 0, 0, 0.8);
        }
        50% { 
          box-shadow: 
            0 0 60px rgba(253, 121, 168, 0.9),
            inset 0 0 40px rgba(0, 0, 0, 0.9);
        }
      }
      
      @keyframes bossHealthShimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
      
      @keyframes scoreFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      
      @keyframes wavePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      @keyframes notificationPop {
        0% { transform: translate(-50%, -50%) scale(0.8); }
        50% { transform: translate(-50%, -50%) scale(1.1); }
        100% { transform: translate(-50%, -50%) scale(1); }
      }
      
      #inventory-slot-1:hover,
      #inventory-slot-2:hover,
      #inventory-slot-3:hover,
      #inventory-slot-4:hover,
      #inventory-slot-5:hover {
        transform: translateY(-8px) scale(1.15);
        border-color: var(--neon-green);
        box-shadow: 
          0 8px 35px rgba(0, 255, 136, 0.6),
          inset 0 0 20px rgba(0, 255, 136, 0.1);
        background: 
          linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 0, 0, 0.3));
      }
      
      #inventory-slot-1:active,
      #inventory-slot-2:active,
      #inventory-slot-3:active,
      #inventory-slot-4:active,
      #inventory-slot-5:active {
        transform: translateY(-2px) scale(1.05);
      }
      
      @keyframes circuitFlow {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      @keyframes dataGlow {
        from { 
          text-shadow: 
            0 0 10px var(--space-cyan),
            0 0 20px var(--space-cyan),
            0 0 30px rgba(0, 212, 255, 0.5);
        }
        to { 
          text-shadow: 
            0 0 15px var(--space-cyan),
            0 0 30px var(--space-cyan),
            0 0 45px rgba(0, 212, 255, 0.8);
        }
      }
      
      .circuit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: 
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 8px,
            rgba(0, 212, 255, 0.1) 8px,
            rgba(0, 212, 255, 0.1) 9px
          ),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 8px,
            rgba(0, 212, 255, 0.05) 8px,
            rgba(0, 212, 255, 0.05) 9px
          );
        animation: circuitFlow 4s linear infinite;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  private createHealthBars(): void {
    // Player health bar
    const playerBars = document.createElement('div');
    playerBars.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      pointer-events: none;
    `;
    
    // Health
    const healthContainer = document.createElement('div');
    healthContainer.style.cssText = `
      width: 320px;
      height: 35px;
      background: 
        linear-gradient(135deg, var(--deep-space), var(--nebula-dark)),
        radial-gradient(ellipse at center, rgba(0, 212, 255, 0.1), transparent);
      clip-path: polygon(15px 0%, 100% 0%, calc(100% - 15px) 100%, 0% 100%);
      border: 2px solid transparent;
      border-image: linear-gradient(90deg, var(--space-cyan), var(--space-purple), var(--space-cyan)) 1;
      margin-bottom: 15px;
      position: relative;
      box-shadow: 
        0 0 25px rgba(0, 212, 255, 0.4),
        inset 0 0 20px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 var(--glass-border);
      transition: all 0.3s ease;
      overflow: hidden;
    `;
    
    this.healthBar = document.createElement('div');
    this.healthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #ff0088, #ff00ff, #ff0088);
      transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 
        0 0 10px rgba(255, 0, 136, 0.6),
        inset 0 0 5px rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
      background-size: 200% 100%;
      animation: healthPulse 3s ease-in-out infinite;
    `;
    
    const healthText = document.createElement('div');
    healthText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 20px;
      transform: translateY(-50%);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--hologram-white);
      text-shadow: 
        0 0 5px currentColor,
        0 0 10px currentColor,
        0 1px 0 rgba(0, 0, 0, 0.8);
      font-family: 'Orbitron', 'Courier New', monospace;
      z-index: 2;
    `;
    healthText.textContent = 'HEALTH';
    
    // Add circuit overlay
    const healthCircuit = document.createElement('div');
    healthCircuit.className = 'circuit-overlay';
    healthContainer.appendChild(healthCircuit);
    
    healthContainer.appendChild(this.healthBar);
    healthContainer.appendChild(healthText);
    
    // Energy
    const energyContainer = document.createElement('div');
    energyContainer.style.cssText = `
      width: 320px;
      height: 35px;
      background: 
        linear-gradient(135deg, var(--deep-space), var(--nebula-dark)),
        radial-gradient(ellipse at center, rgba(0, 255, 136, 0.1), transparent);
      clip-path: polygon(15px 0%, 100% 0%, calc(100% - 15px) 100%, 0% 100%);
      border: 2px solid transparent;
      border-image: linear-gradient(90deg, var(--neon-green), var(--space-cyan), var(--neon-green)) 1;
      position: relative;
      box-shadow: 
        0 0 25px rgba(0, 255, 136, 0.4),
        inset 0 0 20px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 var(--glass-border);
      transition: all 0.3s ease;
      overflow: hidden;
    `;
    
    this.energyBar = document.createElement('div');
    this.energyBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #00ffff, #00ff88, #00ffff);
      transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 
        0 0 10px rgba(0, 255, 255, 0.6),
        inset 0 0 5px rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
      background-size: 200% 100%;
      animation: energyFlow 2s linear infinite;
    `;
    
    const energyText = document.createElement('div');
    energyText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 20px;
      transform: translateY(-50%);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--hologram-white);
      text-shadow: 
        0 0 5px currentColor,
        0 0 10px currentColor,
        0 1px 0 rgba(0, 0, 0, 0.8);
      font-family: 'Orbitron', 'Courier New', monospace;
      z-index: 2;
    `;
    energyText.textContent = 'ENERGY';
    
    // Add circuit overlay
    const energyCircuit = document.createElement('div');
    energyCircuit.className = 'circuit-overlay';
    energyContainer.appendChild(energyCircuit);
    
    energyContainer.appendChild(this.energyBar);
    energyContainer.appendChild(energyText);
    
    playerBars.appendChild(healthContainer);
    playerBars.appendChild(energyContainer);
    
    // Weapon Level Display
    this.weaponLevelElement = document.createElement('div');
    this.weaponLevelElement.style.cssText = `
      margin-top: 10px;
      font-size: 16px;
      font-weight: bold;
      color: #ff6600;
      text-shadow: 
        0 0 10px #ff6600,
        0 0 20px rgba(255, 102, 0, 0.5);
      animation: weaponGlow 2s ease-in-out infinite;
      letter-spacing: 2px;
      text-transform: uppercase;
    `;
    this.weaponLevelElement.textContent = 'WEAPON LVL: 1';
    playerBars.appendChild(this.weaponLevelElement);
    
    // Boss health bar
    const bossContainer = document.createElement('div');
    bossContainer.style.cssText = `
      position: absolute;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 45px;
      clip-path: polygon(
        30px 0%, 
        calc(100% - 30px) 0%, 
        100% 15px, 
        100% calc(100% - 15px), 
        calc(100% - 30px) 100%, 
        30px 100%, 
        0% calc(100% - 15px), 
        0% 15px
      );
      background: 
        linear-gradient(135deg, var(--void-black), var(--nebula-dark)),
        radial-gradient(ellipse at center, rgba(253, 121, 168, 0.2), transparent);
      border: 3px solid transparent;
      border-image: 
        linear-gradient(90deg, 
          var(--space-pink), 
          var(--plasma-yellow), 
          var(--neon-orange),
          var(--plasma-yellow),
          var(--space-pink)
        ) 1;
      pointer-events: none;
      box-shadow: 
        0 0 40px rgba(253, 121, 168, 0.6),
        inset 0 0 30px rgba(0, 0, 0, 0.8),
        0 5px 20px rgba(0, 0, 0, 0.5);
      animation: bossBarPulse 3s ease-in-out infinite;
    `;
    
    this.bossHealthBar = document.createElement('div');
    this.bossHealthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: 
        linear-gradient(90deg,
          #ff1744 0%,
          #ff5722 20%,
          #ff9800 40%,
          #ffc107 60%,
          #ff9800 80%,
          #ff1744 100%
        ),
        repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(255, 255, 255, 0.1) 10px,
          rgba(255, 255, 255, 0.1) 20px
        );
      background-size: 200% 100%, 40px 40px;
      transition: width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 
        0 0 25px rgba(255, 87, 34, 0.8),
        inset 0 0 20px rgba(255, 255, 255, 0.2),
        inset 0 -3px 0 rgba(0, 0, 0, 0.4);
      animation: bossHealthShimmer 2s linear infinite;
      position: relative;
    `;
    
    const bossText = document.createElement('div');
    bossText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 3px;
      color: var(--hologram-white);
      text-shadow: 
        0 0 10px var(--space-pink),
        0 0 20px var(--space-pink),
        0 0 30px rgba(253, 121, 168, 0.5);
      font-family: 'Orbitron', monospace;
      text-transform: uppercase;
      z-index: 2;
    `;
    bossText.textContent = 'NEXUS CORE';
    bossText.id = 'boss-name-text';  // Add ID for easy updates
    
    bossContainer.appendChild(this.bossHealthBar);
    bossContainer.appendChild(bossText);
    
    this.container.appendChild(playerBars);
    this.container.appendChild(bossContainer);
  }

  private createScoreDisplay(): void {
    const scoreContainer = document.createElement('div');
    scoreContainer.style.cssText = `
      position: absolute;
      top: 30px;
      right: 30px;
      text-align: right;
      pointer-events: none;
      background: 
        linear-gradient(135deg, var(--deep-space), var(--nebula-dark));
      clip-path: polygon(
        15px 0%, 
        calc(100% - 15px) 0%, 
        100% 15px, 
        100% calc(100% - 15px), 
        calc(100% - 15px) 100%, 
        15px 100%, 
        0% calc(100% - 15px), 
        0% 15px
      );
      border: 2px solid var(--space-cyan);
      padding: 15px 20px;
      min-width: 180px;
      box-shadow: 
        0 0 30px rgba(0, 212, 255, 0.4),
        inset 0 0 20px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 var(--glass-border);
      backdrop-filter: blur(10px);
    `;
    
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.cssText = `
      font-size: 22px;
      font-weight: 900;
      color: var(--space-cyan);
      text-shadow: 
        0 0 10px currentColor,
        0 0 20px currentColor,
        0 0 30px rgba(0, 212, 255, 0.5);
      font-family: 'Orbitron', monospace;
      letter-spacing: 2px;
      margin-bottom: 8px;
      animation: scoreFloat 3s ease-in-out infinite;
    `;
    this.scoreElement.textContent = 'SCORE: 0';
    
    this.waveElement = document.createElement('div');
    this.waveElement.style.cssText = `
      font-size: 16px;
      color: var(--space-purple);
      text-shadow: 
        0 0 8px currentColor,
        0 0 16px rgba(108, 92, 231, 0.5);
      font-family: 'Orbitron', monospace;
      letter-spacing: 1px;
      animation: wavePulse 2s ease-in-out infinite;
      position: relative;
    `;
    this.waveElement.textContent = 'WAVE: 1';
    
    this.comboElement = document.createElement('div');
    this.comboElement.style.cssText = `
      font-size: 20px;
      color: var(--plasma-yellow);
      text-shadow: 
        0 0 8px currentColor,
        0 0 16px rgba(253, 203, 110, 0.7);
      font-family: 'Orbitron', monospace;
      letter-spacing: 1px;
      margin-top: 8px;
      font-weight: bold;
      transition: all 0.2s ease;
    `;
    this.comboElement.textContent = '';
    
    scoreContainer.appendChild(this.scoreElement);
    scoreContainer.appendChild(this.waveElement);
    scoreContainer.appendChild(this.comboElement);
    this.container.appendChild(scoreContainer);
  }

  private createInventoryDisplay(): void {
    this.inventoryElement = document.createElement('div');
    this.inventoryElement.style.cssText = `
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      padding: 15px;
      pointer-events: none;
      background: 
        linear-gradient(135deg, var(--deep-space), var(--nebula-dark));
      clip-path: polygon(
        25px 0%, 
        calc(100% - 25px) 0%, 
        100% 25px, 
        100% calc(100% - 25px), 
        calc(100% - 25px) 100%, 
        25px 100%, 
        0% calc(100% - 25px), 
        0% 25px
      );
      border: 2px solid var(--neon-green);
      box-shadow: 
        0 0 35px rgba(0, 255, 136, 0.3),
        inset 0 0 25px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(15px);
    `;
    
    // Create 5 inventory slots
    for (let i = 1; i <= 5; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width: 50px;
        height: 50px;
        background: 
          linear-gradient(135deg, var(--glass-light), rgba(0, 0, 0, 0.3));
        clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
        border: 2px solid var(--space-cyan);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        box-shadow: 
          0 0 20px rgba(0, 212, 255, 0.2),
          inset 0 0 15px rgba(0, 0, 0, 0.5);
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        cursor: pointer;
      `;
      
      const hotkey = document.createElement('div');
      hotkey.style.cssText = `
        position: absolute;
        top: 3px;
        left: 6px;
        font-size: 10px;
        color: var(--glass-border);
        font-weight: 700;
        font-family: 'Orbitron', monospace;
      `;
      hotkey.textContent = `${i}`;
      
      const icon = document.createElement('div');
      icon.style.cssText = `
        font-size: 20px;
        filter: drop-shadow(0 0 5px currentColor);
      `;
      icon.id = `slot-icon-${i}`;
      
      const quantity = document.createElement('div');
      quantity.style.cssText = `
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 12px;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
      `;
      quantity.id = `slot-quantity-${i}`;
      
      slot.appendChild(hotkey);
      slot.appendChild(icon);
      slot.appendChild(quantity);
      slot.id = `inventory-slot-${i}`;
      
      this.inventoryElement.appendChild(slot);
    }
    
    this.container.appendChild(this.inventoryElement);
  }

  private createNotificationDisplay(): void {
    this.notificationElement = document.createElement('div');
    this.notificationElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 18px;
      font-weight: bold;
      text-shadow: 
        0 0 10px currentColor,
        0 0 20px currentColor,
        0 0 30px currentColor;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      pointer-events: none;
      text-align: center;
      letter-spacing: 2px;
      text-transform: uppercase;
      animation: notificationPop 0.5s ease-out;
    `;
    
    this.container.appendChild(this.notificationElement);
  }

  public updateHealth(player: Player): void {
    const healthPercent = (player.health / player.maxHealth) * 100;
    this.healthBar.style.width = `${healthPercent}%`;
    
    const energyPercent = (player.energy / player.maxEnergy) * 100;
    this.energyBar.style.width = `${energyPercent}%`;
    
    // Update weapon level display
    this.weaponLevelElement.textContent = `WEAPON LVL: ${player.weaponLevel} (${player.weaponLevel * 10} DMG)`;
  }

  public updateBossHealth(boss: SimpleBoss | null): void {
    if (!boss) {
      this.bossHealthBar.parentElement!.style.display = 'none';
      return;
    }
    
    this.bossHealthBar.parentElement!.style.display = 'block';
    const healthPercent = (boss.health / boss.maxHealth) * 100;
    this.bossHealthBar.style.width = `${healthPercent}%`;
    
    // Update boss name with level
    const bossNameText = document.getElementById('boss-name-text');
    if (bossNameText) {
      bossNameText.textContent = `NEXUS CORE L${boss.level}`;
    }
  }

  public updateScore(score: number): void {
    this.scoreElement.textContent = `SCORE: ${score.toLocaleString()}`;
  }

  public updateWave(wave: number): void {
    this.waveElement.textContent = `▶ WAVE: ${wave}`;
  }

  public updateCombo(multiplier: number): void {
    if (multiplier > 1) {
      this.comboElement.textContent = `COMBO x${multiplier}`;
      this.comboElement.style.opacity = '1';
      this.comboElement.style.transform = 'scale(1.1)';
      setTimeout(() => {
        this.comboElement.style.transform = 'scale(1)';
      }, 100);
    } else {
      // Show x1 briefly when combo resets
      this.comboElement.textContent = 'COMBO x1';
      this.comboElement.style.opacity = '0.5';
      this.comboElement.style.transform = 'scale(0.9)';
      
      // Fade out after a short delay
      setTimeout(() => {
        this.comboElement.style.opacity = '0';
        setTimeout(() => {
          this.comboElement.textContent = '';
        }, 200);
      }, 300);
    }
  }

  public updateInventory(inventory: Inventory): void {
    const slots = inventory.getSlots();
    
    slots.forEach((slot, index) => {
      const iconElement = document.getElementById(`slot-icon-${index + 1}`);
      const quantityElement = document.getElementById(`slot-quantity-${index + 1}`);
      const slotElement = document.getElementById(`inventory-slot-${index + 1}`);
      
      if (!iconElement || !quantityElement || !slotElement) return;
      
      if (slot.item && slot.quantity > 0) {
        iconElement.textContent = slot.item.icon || '📦';
        quantityElement.textContent = slot.quantity > 1 ? `${slot.quantity}` : '';
        const itemColor = `#${slot.item.color.toString(16).padStart(6, '0')}`;
        slotElement.style.borderColor = itemColor;
        slotElement.style.boxShadow = `
          0 0 25px ${itemColor}66,
          inset 0 0 15px rgba(0, 0, 0, 0.5)
        `;
      } else {
        iconElement.textContent = '';
        quantityElement.textContent = '';
        slotElement.style.borderColor = 'var(--space-cyan)';
        slotElement.style.boxShadow = `
          0 0 20px rgba(0, 212, 255, 0.2),
          inset 0 0 15px rgba(0, 0, 0, 0.5)
        `;
      }
    });
  }

  public showNotification(text: string, color: string = '#00ffff', duration: number = 2000): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    this.notificationElement.textContent = text;
    this.notificationElement.style.color = color;
    this.notificationElement.style.opacity = '1';
    
    this.notificationTimeout = window.setTimeout(() => {
      this.notificationElement.style.opacity = '0';
      this.notificationTimeout = null;
    }, duration);
  }

  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}