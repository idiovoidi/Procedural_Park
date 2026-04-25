import * as THREE from 'three'
import { clampAndUpdate } from '@core/utils'
import { ShaderFilterBase, FULLSCREEN_VERTEX_SHADER, createFilterFallbackTarget } from './filter-utils'

export interface ChromaticAberrationConfig {
  offset: number           // Aberration intensity (0.001 - 0.01)
  direction: [number, number] // Direction vector [x, y]
  radial: boolean         // Use radial aberration
  enabled: boolean        // Enable/disable the effect
}

export class ChromaticAberrationFilter extends ShaderFilterBase {
  protected config!: ChromaticAberrationConfig

  constructor(config: ChromaticAberrationConfig) {
    super(
      FULLSCREEN_VERTEX_SHADER,
      ChromaticAberrationFilter.getFragmentShader(),
      {
        tDiffuse: { value: null },
        uOffset: { value: config.offset },
        uDirection: { value: new THREE.Vector2(config.direction[0], config.direction[1]) },
        uRadial: { value: config.radial }
      }
    )
    this.config = { ...config }
  }

  private static getFragmentShader(): string {
    return `
      uniform sampler2D tDiffuse;
      uniform float uOffset;
      uniform vec2 uDirection;
      uniform bool uRadial;
      
      varying vec2 vUv;
      
      void main() {
        vec2 offset;
        
        if (uRadial) {
          // Radial chromatic aberration
          vec2 center = vec2(0.5, 0.5);
          float dist = length(vUv - center);
          vec2 direction = normalize(vUv - center);
          offset = direction * dist * uOffset;
        } else {
          // Linear chromatic aberration
          offset = uDirection * uOffset;
        }
        
        // Sample RGB channels with offset
        float r = texture2D(tDiffuse, vUv - offset).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv + offset).b;
        float a = texture2D(tDiffuse, vUv).a;
        
        gl_FragColor = vec4(r, g, b, a);
      }
    `
  }

  /**
   * Apply the chromatic aberration filter to a texture
   */
  public apply(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget?: THREE.WebGLRenderTarget
  ): THREE.WebGLRenderTarget {
    if (!this.config.enabled) {
      return createFilterFallbackTarget(
        renderer,
        this.camera,
        inputTexture,
        outputTarget,
        this.getOrCreateRenderTarget.bind(this)
      )
    }

    this.material.uniforms.tDiffuse.value = inputTexture
    const target = outputTarget || this.getOrCreateRenderTarget(renderer)

    return this.renderWithFallback(renderer, inputTexture, target, 'chromatic aberration filter')
  }

  /**
   * Set the aberration offset with validation
   */
  public set offset(value: number) {
    // Validate and clamp offset value
    clampAndUpdate(
      value,
      0.0,
      0.1,
      this.config,
      'offset',
      this.material.uniforms.uOffset,
      'Chromatic aberration offset'
    )
  }

  /**
   * Get the current direction vector
   */
  public get direction(): [number, number] {
    return [this.config.direction[0], this.config.direction[1]]
  }

  /**
   * Set the aberration direction with validation
   */
  public set direction(value: [number, number]) {
    // Validate direction vector
    if (!Array.isArray(value) || value.length !== 2) {
      throw new Error('Direction must be an array of two numbers [x, y]')
    }

    const [x, y] = value
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Direction components must be numbers')
    }

    // Normalize direction vector if it's not zero
    const length = Math.sqrt(x * x + y * y)
    if (length > 0) {
      this.config.direction = [x / length, y / length]
    } else {
      this.config.direction = [1.0, 0.0] // Default to horizontal
    }

    this.material.uniforms.uDirection.value.set(
      this.config.direction[0],
      this.config.direction[1]
    )
  }

  /**
   * Get the current radial mode state
   */
  public get radial(): boolean {
    return this.config.radial
  }

  /**
   * Set radial aberration mode
   */
  public setRadialMode(enabled: boolean): void {
    this.config.radial = enabled
    this.material.uniforms.uRadial.value = enabled
  }

  /**
   * Get the enabled state
   */
  public get enabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable or disable the chromatic aberration effect
   */
  public set enabled(value: boolean) {
    this.config.enabled = value
  }

  /**
   * Update all configuration parameters at once
   */
  public updateConfig(newConfig: Partial<ChromaticAberrationConfig>): void {
    const oldConfig = { ...this.config }
    
    try {
      // Apply new configuration with validation
      if (newConfig.offset !== undefined) {
        this.offset = newConfig.offset
      }
      
      if (newConfig.direction !== undefined) {
        this.direction = newConfig.direction
      }
      
      if (newConfig.radial !== undefined) {
        this.setRadialMode(newConfig.radial)
      }
      
      if (newConfig.enabled !== undefined) {
        this.enabled = newConfig.enabled
      }
      
    } catch (error) {
      console.error('Failed to update chromatic aberration config:', error)
      // Revert to old configuration
      this.config = oldConfig
      this.applyConfigToUniforms()
      throw error
    }
  }

  /**
   * Apply current configuration to shader uniforms
   */
  private applyConfigToUniforms(): void {
    this.material.uniforms.uOffset.value = this.config.offset
    this.material.uniforms.uDirection.value.set(
      this.config.direction[0], 
      this.config.direction[1]
    )
    this.material.uniforms.uRadial.value = this.config.radial
  }

  /**
   * Get current configuration
   */
  public getConfig(): ChromaticAberrationConfig {
    return { ...this.config }
  }



  /**
   * Log successful disposal
   */
  protected logDisposalSuccess(): void {
    console.log('ChromaticAberrationFilter disposed successfully')
  }
}