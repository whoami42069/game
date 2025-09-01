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
  private inventoryElement!: HTMLDivElement;
  private notificationElement!: HTMLDivElement;
  private notificationTimeout: number | null = null;

  constructor() {
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
      font-family: 'Courier New', monospace;
      color: #00ffff;
    `;
    
    this.createHealthBars();
    this.createScoreDisplay();
    this.createInventoryDisplay();
    this.createNotificationDisplay();
    
    document.body.appendChild(this.container);
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
      width: 300px;
      height: 20px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid #00ffff;
      margin-bottom: 10px;
      position: relative;
    `;
    
    this.healthBar = document.createElement('div');
    this.healthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #ff0088, #ff00ff);
      transition: width 0.3s ease;
    `;
    
    const healthText = document.createElement('div');
    healthText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
    `;
    healthText.textContent = 'HEALTH';
    
    healthContainer.appendChild(this.healthBar);
    healthContainer.appendChild(healthText);
    
    // Energy
    const energyContainer = document.createElement('div');
    energyContainer.style.cssText = `
      width: 300px;
      height: 20px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid #00ffff;
      position: relative;
    `;
    
    this.energyBar = document.createElement('div');
    this.energyBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #00ffff, #00ff88);
      transition: width 0.3s ease;
    `;
    
    const energyText = document.createElement('div');
    energyText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
    `;
    energyText.textContent = 'ENERGY';
    
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
      text-shadow: 0 0 10px #ff6600;
    `;
    this.weaponLevelElement.textContent = 'WEAPON LVL: 1';
    playerBars.appendChild(this.weaponLevelElement);
    
    // Boss health bar
    const bossContainer = document.createElement('div');
    bossContainer.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      height: 30px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid #ff0088;
      pointer-events: none;
    `;
    
    this.bossHealthBar = document.createElement('div');
    this.bossHealthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #ff0000, #ff8800);
      transition: width 0.3s ease;
    `;
    
    const bossText = document.createElement('div');
    bossText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
    `;
    bossText.textContent = 'NEXUS CORE';
    
    bossContainer.appendChild(this.bossHealthBar);
    bossContainer.appendChild(bossText);
    
    this.container.appendChild(playerBars);
    this.container.appendChild(bossContainer);
  }

  private createScoreDisplay(): void {
    const scoreContainer = document.createElement('div');
    scoreContainer.style.cssText = `
      position: absolute;
      top: 60px;
      right: 20px;
      text-align: right;
      pointer-events: none;
    `;
    
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      text-shadow: 0 0 10px #00ffff;
      margin-bottom: 10px;
    `;
    this.scoreElement.textContent = 'SCORE: 0';
    
    this.waveElement = document.createElement('div');
    this.waveElement.style.cssText = `
      font-size: 18px;
      color: #ff00ff;
      text-shadow: 0 0 10px #ff00ff;
    `;
    this.waveElement.textContent = 'WAVE: 1';
    
    scoreContainer.appendChild(this.scoreElement);
    scoreContainer.appendChild(this.waveElement);
    this.container.appendChild(scoreContainer);
  }

  private createInventoryDisplay(): void {
    this.inventoryElement = document.createElement('div');
    this.inventoryElement.style.cssText = `
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      pointer-events: none;
    `;
    
    // Create 5 inventory slots
    for (let i = 1; i <= 5; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #00ffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
      `;
      
      const hotkey = document.createElement('div');
      hotkey.style.cssText = `
        position: absolute;
        top: 2px;
        left: 4px;
        font-size: 10px;
        color: #888;
      `;
      hotkey.textContent = `${i}`;
      
      const icon = document.createElement('div');
      icon.style.cssText = `
        font-size: 24px;
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
      text-shadow: 0 0 10px currentColor;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      text-align: center;
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
  }

  public updateScore(score: number): void {
    this.scoreElement.textContent = `SCORE: ${score.toLocaleString()}`;
  }

  public updateWave(wave: number): void {
    this.waveElement.textContent = `WAVE: ${wave}`;
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
        slotElement.style.borderColor = `#${slot.item.color.toString(16).padStart(6, '0')}`;
      } else {
        iconElement.textContent = '';
        quantityElement.textContent = '';
        slotElement.style.borderColor = '#00ffff';
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