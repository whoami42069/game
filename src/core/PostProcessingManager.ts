import * as THREE from 'three';
import { 
  EffectComposer,
  RenderPass,
  BloomEffect,
  EffectPass,
  SMAAEffect,
  SMAAPreset
} from 'postprocessing';

export class PostProcessingManager {
  private composer: EffectComposer | null = null;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private bloomEffect: BloomEffect | null = null;
  private smaaEffect: SMAAEffect | null = null;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.initialize();
  }

  private initialize(): void {
    try {
      // Create composer
      this.composer = new EffectComposer(this.renderer);
      
      // Add render pass
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // Create effects
      this.bloomEffect = new BloomEffect({
        intensity: 1.5,
        luminanceThreshold: 0.6,
        luminanceSmoothing: 0.3,
        kernelSize: 4
      });
      
      // SMAA anti-aliasing
      this.smaaEffect = new SMAAEffect({
        preset: SMAAPreset.HIGH
      });
      
      // Add effects pass
      const effectPass = new EffectPass(
        this.camera,
        this.bloomEffect,
        this.smaaEffect
      );
      effectPass.renderToScreen = true;
      this.composer.addPass(effectPass);
      
      console.log('✨ Post-processing initialized with Bloom and SMAA');
    } catch (error) {
      console.warn('Post-processing initialization failed, falling back to standard rendering:', error);
      this.composer = null;
    }
  }

  public render(deltaTime: number): void {
    if (this.composer) {
      this.composer.render(deltaTime);
    } else {
      // Fallback to standard rendering
      this.renderer.render(this.scene, this.camera);
    }
  }

  public resize(width: number, height: number): void {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  public dispose(): void {
    if (this.composer) {
      this.composer.dispose();
    }
  }

  // Simple methods to toggle effects
  public setBloomIntensity(intensity: number): void {
    if (this.bloomEffect) {
      this.bloomEffect.intensity = intensity;
    }
  }

  public toggleBloom(enabled: boolean): void {
    if (this.bloomEffect) {
      this.bloomEffect.blendMode.opacity.value = enabled ? 1 : 0;
    }
  }
}