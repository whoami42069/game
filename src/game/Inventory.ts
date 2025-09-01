import { ItemData, ItemType } from './ItemDrop';

export interface InventorySlot {
  item: ItemData | null;
  quantity: number;
  hotkey: number;
}

export class Inventory {
  private slots: InventorySlot[] = [];
  private maxSlots: number = 5;
  private activeEffects: Map<ItemType, { value: number, endTime: number }> = new Map();
  
  constructor() {
    // Initialize inventory slots
    for (let i = 0; i < this.maxSlots; i++) {
      this.slots.push({
        item: null,
        quantity: 0,
        hotkey: i + 1
      });
    }
    
    // Hotkeys are handled in Game.ts to avoid double triggering
  }

  public addItem(item: ItemData): boolean {
    // Check if item already exists in inventory
    const existingSlot = this.slots.find(slot => 
      slot.item && slot.item.type === item.type
    );
    
    if (existingSlot) {
      // Stack the item
      existingSlot.quantity++;
      return true;
    }
    
    // Find empty slot
    const emptySlot = this.slots.find(slot => !slot.item);
    if (emptySlot) {
      emptySlot.item = item;
      emptySlot.quantity = 1;
      return true;
    }
    
    // Inventory full
    return false;
  }

  public useItem(slotIndex: number): ItemData | null {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) return null;
    
    const slot = this.slots[slotIndex];
    if (!slot.item || slot.quantity === 0) return null;
    
    const item = slot.item;
    slot.quantity--;
    
    if (slot.quantity === 0) {
      slot.item = null;
    }
    
    // Apply item effects if it has a duration
    if (item.duration) {
      this.activeEffects.set(item.type, {
        value: item.value,
        endTime: Date.now() + item.duration * 1000
      });
    }
    
    return item;
  }

  public updateEffects(): void {
    const now = Date.now();
    const expiredEffects: ItemType[] = [];
    
    this.activeEffects.forEach((effect, type) => {
      if (now > effect.endTime) {
        expiredEffects.push(type);
      }
    });
    
    expiredEffects.forEach(type => this.activeEffects.delete(type));
  }

  public getActiveEffect(type: ItemType): { value: number, endTime: number } | null {
    const effect = this.activeEffects.get(type);
    if (effect && Date.now() <= effect.endTime) {
      return effect;
    }
    return null;
  }

  public getSlots(): InventorySlot[] {
    return this.slots;
  }

  public getItemCount(type: ItemType): number {
    const slot = this.slots.find(s => s.item && s.item.type === type);
    return slot ? slot.quantity : 0;
  }
}