/**
 * Manages all UI elements and screens in the game
 */
export class UIManager {
  private currentScreen: string | null = null;
  private screens: Map<string, HTMLElement> = new Map();

  constructor() {
    console.log('🖼️ UIManager created');
  }

  public async initialize(): Promise<void> {
    console.log('🖼️ UIManager initialized');
  }

  public update(_deltaTime: number): void {
    // Update UI animations, transitions, etc.
  }

  public showScreen(screenId: string): void {
    // Hide current screen
    if (this.currentScreen) {
      this.hideScreen(this.currentScreen);
    }

    // Show new screen
    const screen = this.screens.get(screenId);
    if (screen) {
      screen.style.display = 'block';
      this.currentScreen = screenId;
    }
  }

  public hideScreen(screenId: string): void {
    const screen = this.screens.get(screenId);
    if (screen) {
      screen.style.display = 'none';
      if (this.currentScreen === screenId) {
        this.currentScreen = null;
      }
    }
  }

  public registerScreen(screenId: string, element: HTMLElement): void {
    this.screens.set(screenId, element);
    element.style.display = 'none'; // Hidden by default
  }

  public getCurrentScreen(): string | null {
    return this.currentScreen;
  }
}