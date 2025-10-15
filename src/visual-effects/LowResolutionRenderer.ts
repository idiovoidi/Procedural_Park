import * as THREE from 'three'

export interface LowResConfig {
  width: number // Low-res width (default: 480)
  height: number // Low-res height (default: 270)
  upscaleWidth: number // Target display width
  upscaleHeight: number // Target display height
}

export class LowResolutionRenderer {
  private lowResTarget: THREE.WebGLRenderTarget
  private displayMaterial: THREE.ShaderMaterial
  private displayMesh: THREE.Mesh
  private displayScene: THREE.Scene
  private displayCamera: THREE.OrthographicCamera
  private config: LowResConfig
  private renderer: THREE.WebGLRenderer
  private gameScene: THREE.Scene
  private gameCamera: THREE.Camera

  constructor(
    renderer: THREE.WebGLRenderer,
    gameScene: THREE.Scene,
    gameCamera: THREE.Camera,
    config: LowResConfig
  ) {
    this.renderer = renderer
    this.gameScene = gameScene
    this.gameCamera = gameCamera
    this.config = { ...config }

    // Create low-resolution render target with point filtering
    this.lowResTarget = new THREE.WebGLRenderTarget(config.width, config.height, {
      minFilter: THREE.NearestFilter, // Point filtering for sharp pixels
      magFilter: THREE.NearestFilter, // Point filtering for upscaling
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    })

    // Create display scene and camera for final render
    this.displayScene = new THREE.Scene()
    this.displayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // Create shader material for displaying the low-res texture
    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.lowResTarget.texture },
        resolution: { value: new THREE.Vector2(config.upscaleWidth, config.upscaleHeight) },
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
        uniform vec2 resolution;
        varying vec2 vUv;
        
        void main() {
          // Sample with point filtering to maintain sharp pixels
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,
    })

    // Create fullscreen quad for displaying the upscaled texture
    const geometry = new THREE.PlaneGeometry(2, 2)
    this.displayMesh = new THREE.Mesh(geometry, this.displayMaterial)
    this.displayScene.add(this.displayMesh)
  }

  /**
   * Render the game scene to the low-resolution target and display upscaled
   */
  public render(): void {
    try {
      // Ensure render target is valid
      if (!this.lowResTarget) {
        throw new Error('Render target is invalid or destroyed')
      }

      // Store original renderer size
      const originalSize = this.renderer.getSize(new THREE.Vector2())
      const originalRenderTarget = this.renderer.getRenderTarget()

      // Set low-resolution render target
      this.renderer.setRenderTarget(this.lowResTarget)
      this.renderer.setSize(this.config.width, this.config.height, false)

      // Render game scene to low-res target
      this.renderer.render(this.gameScene, this.gameCamera)

      // Restore original render target and size
      this.renderer.setRenderTarget(originalRenderTarget)
      this.renderer.setSize(originalSize.x, originalSize.y, false)

      // Render the upscaled display
      this.renderer.render(this.displayScene, this.displayCamera)
    } catch (error) {
      console.error('Failed to render to low-resolution target:', error)
      this.handleRenderError(error)
    }
  }

  /**
   * Handle render errors with appropriate fallback strategies
   */
  private handleRenderError(_error: any): void {
    console.warn('Attempting to recover from render error...')

    try {
      // Try to recreate the render target
      this.recreateRenderTarget()

      // Retry rendering once
      const originalSize = this.renderer.getSize(new THREE.Vector2())
      const originalRenderTarget = this.renderer.getRenderTarget()

      this.renderer.setRenderTarget(this.lowResTarget)
      this.renderer.setSize(this.config.width, this.config.height, false)
      this.renderer.render(this.gameScene, this.gameCamera)

      this.renderer.setRenderTarget(originalRenderTarget)
      this.renderer.setSize(originalSize.x, originalSize.y, false)
      this.renderer.render(this.displayScene, this.displayCamera)

      console.log('Successfully recovered from render error')
    } catch (recoveryError) {
      console.error('Failed to recover from render error:', recoveryError)

      // Final fallback: disable low-res rendering and render directly
      this.fallbackToDirectRendering()
    }
  }

  /**
   * Fallback to direct rendering when low-res rendering fails
   */
  private fallbackToDirectRendering(): void {
    console.warn('Falling back to direct rendering due to low-res render failure')

    try {
      // Simply render the game scene directly without low-res processing
      this.renderer.render(this.gameScene, this.gameCamera)
    } catch (fallbackError) {
      console.error('Critical error: Failed to fallback to direct rendering:', fallbackError)
    }
  }

  /**
   * Initialize the low-res rendering pipeline
   */
  public initialize(): void {
    try {
      // Validate that all components are properly initialized
      if (!this.lowResTarget || !this.displayMaterial || !this.displayMesh) {
        throw new Error('Low-resolution renderer components not properly initialized')
      }

      console.log('Low-resolution renderer initialized successfully')
    } catch (error) {
      console.error('Failed to initialize low-resolution renderer:', error)
      throw error
    }
  }

  /**
   * Check if the renderer is in a valid state
   */
  public isValid(): boolean {
    return !!(
      this.lowResTarget &&
      this.displayMaterial &&
      this.displayMesh &&
      this.displayScene &&
      this.displayCamera
    )
  }

  /**
   * Update resolution configuration at runtime
   */
  public updateResolution(newConfig: Partial<LowResConfig>): void {
    const oldConfig = { ...this.config }

    // Create temporary config for validation
    const tempConfig = { ...this.config, ...newConfig }

    try {
      // Validate new configuration before applying
      this.validateConfig(tempConfig)

      // Apply validated configuration
      this.config = tempConfig

      // Handle aspect ratio preservation during upscaling
      this.preserveAspectRatio(newConfig)

      // Create new render target if low-res dimensions changed
      if (this.shouldRecreateTexture(newConfig, oldConfig)) {
        this.recreateRenderTarget()
      }

      // Update display sprite size if upscale dimensions changed
      if (this.shouldUpdateDisplaySize(newConfig)) {
        this.updateDisplaySpriteSize()
      }
    } catch (error) {
      console.error('Failed to update resolution:', error)
      // Revert to old configuration
      this.config = oldConfig
      throw error
    }
  }

  /**
   * Handle aspect ratio preservation during upscaling
   */
  private preserveAspectRatio(newConfig: Partial<LowResConfig>): void {
    const lowResAspectRatio = this.config.width / this.config.height

    // If only upscale width is provided, calculate height to preserve aspect ratio
    if (newConfig.upscaleWidth !== undefined && newConfig.upscaleHeight === undefined) {
      this.config.upscaleHeight = this.config.upscaleWidth / lowResAspectRatio
    }
    // If only upscale height is provided, calculate width to preserve aspect ratio
    else if (newConfig.upscaleHeight !== undefined && newConfig.upscaleWidth === undefined) {
      this.config.upscaleWidth = this.config.upscaleHeight * lowResAspectRatio
    }
    // If low-res dimensions changed, update upscale dimensions to maintain current scale
    else if (
      (newConfig.width !== undefined || newConfig.height !== undefined) &&
      newConfig.upscaleWidth === undefined &&
      newConfig.upscaleHeight === undefined
    ) {
      const currentScale =
        this.config.upscaleWidth / (this.config.width || newConfig.width || this.config.width)
      this.config.upscaleWidth = this.config.width * currentScale
      this.config.upscaleHeight = this.config.height * currentScale
    }
  }

  /**
   * Check if render target needs to be recreated
   */
  private shouldRecreateTexture(
    newConfig: Partial<LowResConfig>,
    oldConfig: LowResConfig
  ): boolean {
    return (
      (newConfig.width !== undefined && newConfig.width !== oldConfig.width) ||
      (newConfig.height !== undefined && newConfig.height !== oldConfig.height)
    )
  }

  /**
   * Check if display size needs to be updated
   */
  private shouldUpdateDisplaySize(newConfig: Partial<LowResConfig>): boolean {
    return (
      newConfig.upscaleWidth !== undefined ||
      newConfig.upscaleHeight !== undefined ||
      newConfig.width !== undefined ||
      newConfig.height !== undefined
    )
  }

  /**
   * Recreate the render target with new dimensions
   */
  private recreateRenderTarget(): void {
    // Dispose old render target
    if (this.lowResTarget) {
      this.lowResTarget.dispose()
    }

    // Create new render target with point filtering
    this.lowResTarget = new THREE.WebGLRenderTarget(this.config.width, this.config.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    })

    // Update display material texture
    this.displayMaterial.uniforms.tDiffuse.value = this.lowResTarget.texture
  }

  /**
   * Update display resolution uniform
   */
  private updateDisplaySpriteSize(): void {
    this.displayMaterial.uniforms.resolution.value.set(
      this.config.upscaleWidth,
      this.config.upscaleHeight
    )
  }

  /**
   * Update the game scene and camera references
   */
  public updateGameScene(scene: THREE.Scene, camera: THREE.Camera): void {
    this.gameScene = scene
    this.gameCamera = camera
  }

  /**
   * Get the current game scene
   */
  public getGameScene(): THREE.Scene {
    return this.gameScene
  }

  /**
   * Get the current game camera
   */
  public getGameCamera(): THREE.Camera {
    return this.gameCamera
  }

  /**
   * Get current configuration
   */
  public getConfig(): LowResConfig {
    return { ...this.config }
  }

  /**
   * Validate configuration parameters with comprehensive checks
   */
  private validateConfig(config: LowResConfig): void {
    // Check for positive dimensions
    if (config.width <= 0 || config.height <= 0) {
      throw new Error('Low-resolution dimensions must be positive')
    }
    if (config.upscaleWidth <= 0 || config.upscaleHeight <= 0) {
      throw new Error('Upscale dimensions must be positive')
    }

    // Check for reasonable dimension limits
    if (config.width > 2048 || config.height > 2048) {
      throw new Error('Low-resolution dimensions too large (max 2048x2048)')
    }
    if (config.upscaleWidth > 8192 || config.upscaleHeight > 8192) {
      throw new Error('Upscale dimensions too large (max 8192x8192)')
    }

    // Check for minimum dimensions to ensure usability
    if (config.width < 64 || config.height < 64) {
      throw new Error('Low-resolution dimensions too small (min 64x64)')
    }

    // Validate aspect ratio consistency (warn if extreme)
    const lowResAspectRatio = config.width / config.height
    const upscaleAspectRatio = config.upscaleWidth / config.upscaleHeight
    const aspectRatioDifference = Math.abs(lowResAspectRatio - upscaleAspectRatio)

    if (aspectRatioDifference > 0.1) {
      console.warn(
        'Aspect ratio mismatch between low-res and upscale dimensions may cause distortion'
      )
    }

    // Check for integer dimensions (recommended for pixel-perfect rendering)
    if (!Number.isInteger(config.width) || !Number.isInteger(config.height)) {
      console.warn('Non-integer low-resolution dimensions may cause rendering artifacts')
    }
  }

  /**
   * Replace standard rendering with render-to-texture pipeline
   */
  public enableLowResRendering(): void {
    try {
      this.initialize()
      console.log('Low-resolution rendering enabled')
    } catch (error) {
      console.error('Failed to enable low-resolution rendering:', error)
      throw error
    }
  }

  /**
   * Disable low-res rendering and return to standard rendering
   */
  public disableLowResRendering(): void {
    try {
      console.log('Low-resolution rendering disabled - will render directly')
    } catch (error) {
      console.error('Failed to disable low-resolution rendering:', error)
    }
  }

  /**
   * Render directly without low-res processing (for when disabled)
   */
  public renderDirect(): void {
    try {
      this.renderer.render(this.gameScene, this.gameCamera)
    } catch (error) {
      console.error('Failed to render directly:', error)
    }
  }

  /**
   * Get rendering statistics for debugging
   */
  public getStats(): {
    lowResWidth: number
    lowResHeight: number
    upscaleWidth: number
    upscaleHeight: number
    pixelRatio: number
    isValid: boolean
    sceneObjects: number
  } {
    return {
      lowResWidth: this.config.width,
      lowResHeight: this.config.height,
      upscaleWidth: this.config.upscaleWidth,
      upscaleHeight: this.config.upscaleHeight,
      pixelRatio: this.config.upscaleWidth / this.config.width,
      isValid: this.isValid(),
      sceneObjects: this.gameScene.children.length,
    }
  }

  /**
   * Clean up resources with proper error handling
   */
  public dispose(): void {
    try {
      // Dispose render target
      if (this.lowResTarget) {
        this.lowResTarget.dispose()
      }

      // Dispose display material
      if (this.displayMaterial) {
        this.displayMaterial.dispose()
      }

      // Dispose display mesh geometry
      if (this.displayMesh && this.displayMesh.geometry) {
        this.displayMesh.geometry.dispose()
      }

      // Clear scene references
      if (this.displayScene) {
        this.displayScene.clear()
      }

      console.log('Low-resolution renderer disposed successfully')
    } catch (error) {
      console.error('Error during low-resolution renderer disposal:', error)
    }
  }
}
