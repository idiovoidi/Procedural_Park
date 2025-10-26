import * as THREE from 'three'
import { clamp } from '../utils'
import { BaseVisualEffect } from './BaseVisualEffect'

export interface FilmGrainConfig {
  intensity: number       // Grain strength (0.0 - 1.0)
  animated: boolean       // Enable time-based animation
  speed: number          // Animation speed multiplier
  enabled: boolean       // Enable/disable the effect
}

export class FilmGrainFilter extends BaseVisualEffect {
  protected material: THREE.ShaderMaterial
  protected config: FilmGrainConfig
  protected renderTarget: THREE.WebGLRenderTarget | null = null
  protected scene: THREE.Scene
  protected camera: THREE.OrthographicCamera
  protected quad: THREE.Mesh
  private time: number = 0
  private targetIntensity: number
  private currentIntensity: number
  private _intensityTransitionSpeed: number = 5.0 // Transitions per second

  constructor(config: FilmGrainConfig) {
    super()
    this.config = { ...config }
    
    // Initialize intensity values for smooth transitions
    this.targetIntensity = this.config.intensity
    this.currentIntensity = this.config.intensity
    
    // Create orthographic camera for fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    // Create scene for the filter
    this.scene = new THREE.Scene()
    
    // Create shader material for film grain
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uIntensity: { value: this.currentIntensity },
        uTime: { value: 0.0 }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader()
    })
    
    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2)
    this.quad = new THREE.Mesh(geometry, this.material)
    this.scene.add(this.quad)
  }

  /**
   * Get the vertex shader for the film grain filter
   */
  private getVertexShader(): string {
    return `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
  }

  /**
   * Get the optimized fragment shader with pseudo-random noise generation
   */
  private getFragmentShader(): string {
    return `
      uniform sampler2D tDiffuse;
      uniform float uIntensity;
      uniform float uTime;
      
      varying vec2 vUv;
      
      // Optimized pseudo-random function for better performance
      float rand(vec2 co) {
        // Use a more efficient hash function
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        
        // Early exit if intensity is zero for performance
        if (uIntensity <= 0.0) {
          gl_FragColor = color;
          return;
        }
        
        // Generate noise with time variation for animation
        vec2 noiseCoord = vUv + vec2(uTime * 0.1, uTime * 0.07);
        float noise = rand(noiseCoord) - 0.5;
        
        // Apply smooth intensity scaling
        float grain = noise * uIntensity;
        
        // Apply grain to all RGB channels with slight variation per channel
        // This creates more realistic film grain
        color.r += grain * 1.0;
        color.g += grain * 0.95;
        color.b += grain * 0.9;
        
        // Clamp to valid color range
        color.rgb = clamp(color.rgb, 0.0, 1.0);
        
        gl_FragColor = color;
      }
    `
  }

  /**
   * Apply the film grain filter to a texture
   */
  public apply(
    renderer: THREE.WebGLRenderer, 
    inputTexture: THREE.Texture, 
    outputTarget?: THREE.WebGLRenderTarget
  ): THREE.WebGLRenderTarget {
    // Performance optimization: skip if disabled or intensity is effectively zero
    if (!this.config.enabled || this.currentIntensity <= 0.001) {
      // If disabled or no visible effect, just pass through the input
      if (outputTarget) {
        // Copy input to output
        this.copyTexture(renderer, inputTexture, outputTarget)
        return outputTarget
      } else {
        // Create a new render target and copy input
        const target = this.createRenderTarget(renderer)
        this.copyTexture(renderer, inputTexture, target)
        return target
      }
    }

    // Set input texture
    this.material.uniforms.tDiffuse.value = inputTexture
    
    // Ensure uniforms are up to date
    this.material.uniforms.uTime.value = this.time
    this.material.uniforms.uIntensity.value = this.currentIntensity

    // Create or use provided render target
    const target = outputTarget || this.createRenderTarget(renderer)
    
    // Store current render target
    const currentTarget = renderer.getRenderTarget()
    
    try {
      // Render to target
      renderer.setRenderTarget(target)
      renderer.render(this.scene, this.camera)
      
      // Restore previous render target
      renderer.setRenderTarget(currentTarget)
      
      return target
    } catch (error) {
      console.error('Failed to apply film grain filter:', error)
      
      // Restore render target and fallback
      renderer.setRenderTarget(currentTarget)
      
      // Fallback: copy input to output
      if (outputTarget) {
        this.copyTexture(renderer, inputTexture, outputTarget)
        return outputTarget
      } else {
        const fallbackTarget = this.createRenderTarget(renderer)
        this.copyTexture(renderer, inputTexture, fallbackTarget)
        return fallbackTarget
      }
    }
  }

  /**
   * Copy texture to render target (fallback when filter is disabled or fails)
   */
  private copyTexture(
    renderer: THREE.WebGLRenderer, 
    inputTexture: THREE.Texture, 
    outputTarget: THREE.WebGLRenderTarget
  ): void {
    // Create a simple copy material
    const copyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: inputTexture }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `
    })

    const copyScene = new THREE.Scene()
    const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial)
    copyScene.add(copyQuad)

    const currentTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(outputTarget)
    renderer.render(copyScene, this.camera)
    renderer.setRenderTarget(currentTarget)

    // Cleanup
    copyMaterial.dispose()
    copyQuad.geometry.dispose()
  }

  /**
   * Create a render target with appropriate settings
   */
  private createRenderTarget(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const size = renderer.getSize(new THREE.Vector2())
    
    return new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false
    })
  }

  /**
   * Get the current intensity value
   */
  public get intensity(): number {
    return this.config.intensity
  }

  /**
   * Set intensity immediately without smooth transition
   */
  public setIntensityImmediate(value: number): void {
    // Validate and clamp intensity value
    const clampedValue = clamp(value, 0.0, 1.0, 'Film grain intensity')

    this.config.intensity = clampedValue
    this.targetIntensity = clampedValue
    this.currentIntensity = clampedValue
    this.material.uniforms.uIntensity.value = clampedValue
  }

  /**
   * Set the grain intensity with validation and smooth transitions
   */
  public set intensity(value: number) {
    // Validate and clamp intensity value
    const clampedValue = clamp(value, 0.0, 1.0, 'Film grain intensity')

    this.config.intensity = clampedValue
    this.targetIntensity = clampedValue
  }

  /**
   * Get the enabled state
   */
  public get enabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable or disable the film grain effect
   */
  public set enabled(value: boolean) {
    this.config.enabled = value
  }

  /**
   * Get the animated state
   */
  public get animated(): boolean {
    return this.config.animated
  }

  /**
   * Enable or disable grain animation
   */
  public setAnimated(enabled: boolean): void {
    this.config.animated = enabled
  }

  /**
   * Get the animation speed
   */
  public get speed(): number {
    return this.config.speed
  }

  /**
   * Set the animation speed with validation
   */
  public set speed(value: number) {
    // Validate speed value (allow negative for reverse animation)
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error('Animation speed must be a finite number')
    }
    
    this.config.speed = value
  }

  /**
   * Get the current intensity transition speed
   */
  public get intensityTransitionSpeed(): number {
    return this._intensityTransitionSpeed
  }

  /**
   * Set the intensity transition speed (transitions per second)
   */
  public set intensityTransitionSpeed(value: number) {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) {
      throw new Error('Intensity transition speed must be a positive finite number')
    }
    
    this._intensityTransitionSpeed = value
  }

  /**
   * Get the current actual intensity (may differ from target during transitions)
   */
  public get currentIntensityValue(): number {
    return this.currentIntensity
  }

  /**
   * Check if intensity is currently transitioning
   */
  public get isTransitioning(): boolean {
    return Math.abs(this.currentIntensity - this.targetIntensity) > 0.001
  }

  /**
   * Update current configuration
   */
  public updateConfig(newConfig: Partial<FilmGrainConfig>): void {
    const oldConfig = { ...this.config }
    
    try {
      // Apply new configuration with validation
      if (newConfig.intensity !== undefined) {
        this.intensity = newConfig.intensity
      }
      
      if (newConfig.animated !== undefined) {
        this.setAnimated(newConfig.animated)
      }
      
      if (newConfig.speed !== undefined) {
        this.speed = newConfig.speed
      }
      
      if (newConfig.enabled !== undefined) {
        this.enabled = newConfig.enabled
      }
      
    } catch (error) {
      console.error('Failed to update film grain config:', error)
      // Revert to old configuration
      this.config = oldConfig
      this.applyConfigToUniforms()
      throw error
    }
  }

  /**
   * Update time for animated grain movement and smooth intensity transitions
   * Should be called in the render loop for realistic grain animation
   */
  public updateTime(deltaTime: number): void {
    // Update time for animation if enabled
    if (this.config.animated) {
      // Update time with configurable speed
      this.time += deltaTime * this.config.speed
      
      // Update shader uniform
      this.material.uniforms.uTime.value = this.time
    }
    
    // Handle smooth intensity transitions
    if (Math.abs(this.currentIntensity - this.targetIntensity) > 0.001) {
      const intensityDelta = this.targetIntensity - this.currentIntensity
      const maxChange = this._intensityTransitionSpeed * deltaTime
      
      if (Math.abs(intensityDelta) <= maxChange) {
        // Close enough, snap to target
        this.currentIntensity = this.targetIntensity
      } else {
        // Move towards target
        this.currentIntensity += Math.sign(intensityDelta) * maxChange
      }
      
      // Update shader uniform
      this.material.uniforms.uIntensity.value = this.currentIntensity
    }
  }

  /**
   * Get current time value
   */
  public get currentTime(): number {
    return this.time
  }

  /**
   * Reset time to zero (useful for consistent grain patterns)
   */
  public resetTime(): void {
    this.time = 0
    this.material.uniforms.uTime.value = this.time
  }

  /**
   * Apply current configuration to shader uniforms
   */
  private applyConfigToUniforms(): void {
    this.material.uniforms.uIntensity.value = this.currentIntensity
    this.material.uniforms.uTime.value = this.time
  }

  /**
   * Get current configuration
   */
  public getConfig(): FilmGrainConfig {
    return { ...this.config }
  }

  /**
   * Log successful disposal
   */
  protected logDisposalSuccess(): void {
    console.log('FilmGrainFilter disposed successfully')
  }
}