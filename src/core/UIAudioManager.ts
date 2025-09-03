/**
 * UIAudioManager - Handles all UI sound effects and micro-interactions
 */
export class UIAudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private masterVolume: number = 0.3;
  private enabled: boolean = true;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.masterVolume;
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.enabled = false;
    }
  }

  /**
   * Play a simple UI sound effect
   */
  public playSound(type: 'hover' | 'click' | 'success' | 'error' | 'transition'): void {
    if (!this.enabled || !this.audioContext || !this.gainNode) return;

    // Resume context if suspended (required for some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    oscillator.connect(envelope);
    envelope.connect(this.gainNode);

    const now = this.audioContext.currentTime;

    switch (type) {
      case 'hover':
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.type = 'sine';
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(0.1, now + 0.01);
        envelope.gain.linearRampToValueAtTime(0, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'click':
        oscillator.frequency.setValueAtTime(1200, now);
        oscillator.type = 'square';
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(0.2, now + 0.01);
        envelope.gain.linearRampToValueAtTime(0, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;

      case 'success':
        // Play a pleasant chord
        const frequencies = [440, 554, 659]; // A major chord
        frequencies.forEach((freq, index) => {
          const osc = this.audioContext!.createOscillator();
          const env = this.audioContext!.createGain();
          osc.connect(env);
          env.connect(this.gainNode!);
          osc.frequency.setValueAtTime(freq, now);
          osc.type = 'sine';
          env.gain.setValueAtTime(0, now);
          env.gain.linearRampToValueAtTime(0.15, now + 0.05);
          env.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now + index * 0.05);
          osc.stop(now + 0.5);
        });
        return;

      case 'error':
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.type = 'sawtooth';
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(0.3, now + 0.01);
        envelope.gain.linearRampToValueAtTime(0, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'transition':
        // Sweep effect
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(1600, now + 0.2);
        oscillator.type = 'sine';
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(0.2, now + 0.02);
        envelope.gain.linearRampToValueAtTime(0, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
    }
  }

  /**
   * Set master volume
   */
  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.masterVolume;
    }
  }

  /**
   * Toggle sound on/off
   */
  public toggle(): void {
    this.enabled = !this.enabled;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Singleton instance
let uiAudioManagerInstance: UIAudioManager | null = null;

export function getUIAudioManager(): UIAudioManager {
  if (!uiAudioManagerInstance) {
    uiAudioManagerInstance = new UIAudioManager();
  }
  return uiAudioManagerInstance;
}