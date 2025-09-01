export interface KeyState {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

export interface MouseState {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  buttons: Map<number, KeyState>;
}

/**
 * Manages all input including keyboard, mouse, and gamepad
 */
export class InputManager {
  private keys: Map<string, KeyState> = new Map();
  private mouseState: MouseState;
  private previousMouseState: MouseState;

  constructor() {
    this.mouseState = this.createEmptyMouseState();
    this.previousMouseState = this.createEmptyMouseState();
    
    console.log('🎮 InputManager created');
  }

  public async initialize(): Promise<void> {
    this.setupEventListeners();
    console.log('🎮 InputManager initialized');
  }

  private createEmptyMouseState(): MouseState {
    return {
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: 0,
      buttons: new Map()
    };
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    // Mouse events
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Prevent default behavior for game controls
    document.addEventListener('keydown', (e) => {
      // Prevent default for common game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.code;
    const currentState = this.keys.get(key);
    
    if (!currentState || !currentState.pressed) {
      this.keys.set(key, {
        pressed: true,
        justPressed: true,
        justReleased: false
      });
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const key = event.code;
    this.keys.set(key, {
      pressed: false,
      justPressed: false,
      justReleased: true
    });
  }

  private onMouseMove(event: MouseEvent): void {
    this.previousMouseState.x = this.mouseState.x;
    this.previousMouseState.y = this.mouseState.y;
    
    this.mouseState.x = event.clientX;
    this.mouseState.y = event.clientY;
    this.mouseState.deltaX = this.mouseState.x - this.previousMouseState.x;
    this.mouseState.deltaY = this.mouseState.y - this.previousMouseState.y;
  }

  private onMouseDown(event: MouseEvent): void {
    const button = event.button;
    const currentState = this.mouseState.buttons.get(button);
    
    if (!currentState || !currentState.pressed) {
      this.mouseState.buttons.set(button, {
        pressed: true,
        justPressed: true,
        justReleased: false
      });
    }
  }

  private onMouseUp(event: MouseEvent): void {
    const button = event.button;
    this.mouseState.buttons.set(button, {
      pressed: false,
      justPressed: false,
      justReleased: true
    });
  }

  public update(_deltaTime: number): void {
    // Reset just pressed/released flags
    for (const [key, state] of this.keys.entries()) {
      if (state.justPressed) {
        state.justPressed = false;
      }
      if (state.justReleased) {
        this.keys.delete(key);
      }
    }

    // Reset mouse button states
    for (const [button, state] of this.mouseState.buttons.entries()) {
      if (state.justPressed) {
        state.justPressed = false;
      }
      if (state.justReleased) {
        this.mouseState.buttons.delete(button);
      }
    }

    // Reset mouse delta
    this.mouseState.deltaX = 0;
    this.mouseState.deltaY = 0;
  }

  // Keyboard input methods
  public isKeyPressed(key: string): boolean {
    return this.keys.get(key)?.pressed ?? false;
  }

  public isKeyJustPressed(key: string): boolean {
    return this.keys.get(key)?.justPressed ?? false;
  }

  public isKeyJustReleased(key: string): boolean {
    return this.keys.get(key)?.justReleased ?? false;
  }

  // Check if a key was pressed recently (within the last X milliseconds)
  public wasKeyPressedRecently(key: string, _timeWindow: number = 100): boolean {
    // For now, we'll just check if the key is currently pressed
    // In a more complete implementation, we'd track key press timestamps
    return this.isKeyPressed(key) || this.isKeyJustPressed(key);
  }

  // Mouse input methods
  public getMousePosition(): { x: number; y: number } {
    return { x: this.mouseState.x, y: this.mouseState.y };
  }

  public getMouseDelta(): { x: number; y: number } {
    return { x: this.mouseState.deltaX, y: this.mouseState.deltaY };
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.mouseState.buttons.get(button)?.pressed ?? false;
  }

  public isMouseButtonJustPressed(button: number): boolean {
    return this.mouseState.buttons.get(button)?.justPressed ?? false;
  }

  public isMouseButtonJustReleased(button: number): boolean {
    return this.mouseState.buttons.get(button)?.justReleased ?? false;
  }
}