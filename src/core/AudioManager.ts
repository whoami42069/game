import { Howl, Howler } from 'howler';

export interface AudioConfig {
  masterVolume?: number;
  musicVolume?: number;
  sfxVolume?: number;
}

/**
 * Manages all audio in the game including music and sound effects
 */
export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private masterVolume: number = 1.0;
  private musicVolume: number = 0.7;
  private sfxVolume: number = 0.8;
  private currentMusic: Howl | null = null;

  constructor(config: AudioConfig = {}) {
    this.masterVolume = config.masterVolume ?? 1.0;
    this.musicVolume = config.musicVolume ?? 0.7;
    this.sfxVolume = config.sfxVolume ?? 0.8;
    
    console.log('🔊 AudioManager created');
  }

  public async initialize(): Promise<void> {
    // Set initial volume
    Howler.volume(this.masterVolume);
    
    console.log('🔊 AudioManager initialized');
  }

  public update(_deltaTime: number): void {
    // Update audio system if needed
  }

  public loadSound(key: string, src: string | string[], options: any = {}): Howl {
    if (this.sounds.has(key)) {
      return this.sounds.get(key)!;
    }

    const sound = new Howl({
      src,
      ...options
    });

    this.sounds.set(key, sound);
    return sound;
  }

  public playSound(key: string, volume?: number): number | null {
    const sound = this.sounds.get(key);
    if (!sound) {
      console.warn(`Sound '${key}' not found`);
      return null;
    }

    if (volume !== undefined) {
      sound.volume(volume * this.sfxVolume * this.masterVolume);
    }

    return sound.play();
  }

  public playMusic(key: string, loop: boolean = true): void {
    // Stop current music
    if (this.currentMusic) {
      this.currentMusic.stop();
    }

    const music = this.sounds.get(key);
    if (!music) {
      console.warn(`Music '${key}' not found`);
      return;
    }

    music.loop(loop);
    music.volume(this.musicVolume * this.masterVolume);
    music.play();
    
    this.currentMusic = music;
  }

  public stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume(this.musicVolume * this.masterVolume);
    }
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public getMasterVolume(): number { return this.masterVolume; }
  public getMusicVolume(): number { return this.musicVolume; }
  public getSfxVolume(): number { return this.sfxVolume; }
}