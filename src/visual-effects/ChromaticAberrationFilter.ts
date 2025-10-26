import * as THREE from 'three'
import { clampAndUpdate } from '../utils'
import { BaseVisualEffect } from './BaseVisualEffect'

export interface ChromaticAberrationConfig {
  offset: number           // Aberration intensity (0.001 - 0.01)
  direction: [number, number] // Direction vector [x, y]
  radial: boolean         // Use radial aberration
  enabled: boolean        // Enable/disable the effect
}

export class ChromaticAberrationFilter extends BaseVisualEffect {
  protected material: THREE.ShaderMaterial
  protected config: ChromaticAberrationConfig
  protected renderTarget: THREE.WebGLRenderTarget | null = null
  protected scene: THREE.Scene
  protected camera: THREE.OrthographicCamera
  protected quad: THREE.Mesh

  constructor(config: ChromaticAberrationConfig) {
    super()
    this.config = { ...config }
    
    // Create orthographic camera for fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    // Create scene for the filter
    this.scene = new THREE.Scene()
    
    // Create shader material with linear aberration as default
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uOffset: { value: this.config.offset },
        uDirection: { value: new THREE.Vector2(this.config.direction[0], this.config.direction[1]) },
        uRadial: { value: this.config.radial }
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
   * Get the vertex shader for the chromatic aberration filter
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
   * Get the fragment shader that handles both linear and radial aberration
   */
  private getFragmentShader(): string {
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
      // If disabled, just pass through the input
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
      console.error('Failed to apply chromatic aberration filter:', error)
      
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