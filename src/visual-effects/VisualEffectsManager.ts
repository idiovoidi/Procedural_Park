import * as THREE from 'three'
import { LowResolutionRenderer, type LowResConfig } from './LowResolutionRenderer'
import { ChromaticAberrationFilter, type ChromaticAberrationConfig } from './ChromaticAberrationFilter'
import { FilmGrainFilter, type FilmGrainConfig } from './FilmGrainFilter'
import { CRTFilter, type CRTConfig } from './CRTFilter'
import { PerformanceMonitor, type PerformanceMetrics, type PerformanceThresholds, type QualityLevel } from './PerformanceMonitor'

export interface EffectsConfig {
  lowRes: LowResConfig & { enabled: boolean }
  chromatic: ChromaticAberrationConfig & { enabled: boolean }
  crt: CRTConfig & { enabled: boolean }
  grain: FilmGrainConfig & { enabled: boolean }
  // Note: Vignette will be added when VignetteFilter is implemented
}

/**
 * Centralized manager for all visual effects including CRT
 * Implements proper filter ordering for optimal visual quality
 * Manages filter array and updates for the complete Inscryption aesthetic
 */
export class VisualEffectsManager {
  private renderer: THREE.WebGLRenderer
  private gameScene: THREE.Scene
  private gameCamera: THREE.Camera
  private config: EffectsConfig
  
  // Core components
  private lowResRenderer: LowResolutionRenderer | null = null
  private chromaticAberrationFilter: ChromaticAberrationFilter | null = null
  private crtFilter: CRTFilter | null = null
  private filmGrainFilter: FilmGrainFilter | null = null
  
  // Filter pipeline management
  private filters: Array<{
    name: string
    filter: ChromaticAberrationFilter | CRTFilter | FilmGrainFilter
    enabled: boolean
    order: number
  }> = []
  
  // Render targets for filter chain
  private renderTargets: THREE.WebGLRenderTarget[] = []
  private currentTargetIndex: number = 0
  
  // Performance monitoring
  private performanceMonitor: PerformanceMonitor
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private averageFPS: number = 60

  constructor(
    renderer: THREE.WebGLRenderer,
    gameScene: THREE.Scene,
    gameCamera: THREE.Camera,
    config: EffectsConfig,
    performanceThresholds?: Partial<PerformanceThresholds>
  ) {
    this.renderer = renderer
    this.gameScene = gameScene
    this.gameCamera = gameCamera
    this.config = { ...config }
    
    // Initialize performance monitor with automatic quality adjustment
    this.performanceMonitor = new PerformanceMonitor(
      performanceThresholds,
      (qualityLevel) => this.handleQualityChange(qualityLevel),
      (metrics) => this.handlePerformanceWarning(metrics)
    )
    
    this.initializeEffects()
    this.setupFilterPipeline()
    this.createRenderTargets()
  }

  /**
   * Initialize all visual effects based on configuration
   */
  private initializeEffects(): void {
    try {
      // Initialize low-resolution renderer
      if (this.config.lowRes.enabled) {
        this.lowResRenderer = new LowResolutionRenderer(
          this.renderer,
          this.gameScene,
          this.gameCamera,
          this.config.lowRes
        )
        this.lowResRenderer.initialize()
      }

      // Initialize chromatic aberration filter
      if (this.config.chromatic.enabled) {
        this.chromaticAberrationFilter = new ChromaticAberrationFilter(this.config.chromatic)
      }

      // Initialize CRT filter
      if (this.config.crt.enabled) {
        this.crtFilter = new CRTFilter(this.config.crt)
      }

      // Initialize film grain filter
      if (this.config.grain.enabled) {
        this.filmGrainFilter = new FilmGrainFilter(this.config.grain)
      }

      console.log('Visual effects initialized successfully')
    } catch (error) {
      console.error('Failed to initialize visual effects:', error)
      throw error
    }
  }

  /**
   * Setup filter pipeline with proper ordering for optimal visual quality
   * Order: Chromatic Aberration -> CRT -> Film Grain
   * This order ensures that:
   * 1. Chromatic aberration affects the base image
   * 2. CRT effects simulate the monitor display
   * 3. Film grain adds final texture on top
   */
  private setupFilterPipeline(): void {
    this.filters = []

    // Add filters in optimal order
    if (this.chromaticAberrationFilter) {
      this.filters.push({
        name: 'chromatic',
        filter: this.chromaticAberrationFilter,
        enabled: this.config.chromatic.enabled,
        order: 1
      })
    }

    if (this.crtFilter) {
      this.filters.push({
        name: 'crt',
        filter: this.crtFilter,
        enabled: this.config.crt.enabled,
        order: 2
      })
    }

    if (this.filmGrainFilter) {
      this.filters.push({
        name: 'grain',
        filter: this.filmGrainFilter,
        enabled: this.config.grain.enabled,
        order: 3
      })
    }

    // Sort filters by order to ensure consistent application
    this.filters.sort((a, b) => a.order - b.order)

    console.log(`Filter pipeline setup with ${this.filters.length} filters`)
  }

  /**
   * Create render targets for filter chain processing
   */
  private createRenderTargets(): void {
    const size = this.renderer.getSize(new THREE.Vector2())
    
    // Create two render targets for ping-pong rendering
    for (let i = 0; i < 2; i++) {
      const renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false
      })
      this.renderTargets.push(renderTarget)
    }
  }

  /**
   * Get the next render target for ping-pong rendering
   */
  private getNextRenderTarget(): THREE.WebGLRenderTarget {
    this.currentTargetIndex = (this.currentTargetIndex + 1) % this.renderTargets.length
    return this.renderTargets[this.currentTargetIndex]
  }

  /**
   * Get the current render target
   */
  private getCurrentRenderTarget(): THREE.WebGLRenderTarget {
    return this.renderTargets[this.currentTargetIndex]
  }

  /**
   * Main render method that combines low-res rendering with complete filter pipeline
   * Ensures proper render order and texture management
   */
  public render(): void {
    // Start performance monitoring
    this.performanceMonitor.startFrame()

    try {
      // Step 1: Render scene with or without low-resolution processing
      let currentTexture: THREE.Texture

      if (this.lowResRenderer && this.config.lowRes.enabled) {
        // Use integrated low-resolution rendering with filter pipeline
        this.performanceMonitor.startEffectTiming('lowRes')
        currentTexture = this.renderWithLowResolution()
        this.performanceMonitor.endEffectTiming('lowRes')
      } else {
        // Render scene directly to texture for filter processing
        currentTexture = this.renderSceneToTexture()
      }

      // Step 2: Apply filter pipeline if any filters are enabled
      const enabledFilters = this.filters.filter(f => f.enabled)
      
      if (enabledFilters.length > 0) {
        currentTexture = this.applyFilterPipeline(currentTexture, enabledFilters)
        
        // Render final filtered result to screen
        this.renderTextureToScreen(currentTexture)
      } else if (this.lowResRenderer && this.config.lowRes.enabled) {
        // Low-res enabled but no filters - let low-res renderer handle final display
        // The texture is already rendered by renderWithLowResolution()
      } else {
        // No effects enabled - render final texture to screen
        this.renderTextureToScreen(currentTexture)
      }

    } catch (error) {
      console.error('Failed to render visual effects:', error)
      this.handleRenderError(error)
    } finally {
      // End performance monitoring
      this.performanceMonitor.endFrame()
    }
  }

  /**
   * Render with low-resolution processing integrated into the filter pipeline
   * Combines low-res rendering with complete filter pipeline including CRT
   */
  private renderWithLowResolution(): THREE.Texture {
    if (!this.lowResRenderer) {
      throw new Error('Low-resolution renderer not initialized')
    }

    try {
      // Get the low-resolution render target from the renderer
      const lowResTexture = this.getLowResolutionTexture()
      
      return lowResTexture
    } catch (error) {
      console.error('Failed to render with low-resolution:', error)
      
      // Fallback to direct scene rendering
      console.warn('Falling back to direct scene rendering')
      return this.renderSceneToTexture()
    }
  }

  /**
   * Get the low-resolution texture by rendering the scene to the low-res target
   * This method properly integrates the low-res renderer with the filter pipeline
   */
  private getLowResolutionTexture(): THREE.Texture {
    if (!this.lowResRenderer) {
      throw new Error('Low-resolution renderer not available')
    }

    // Create a render target for the low-resolution rendering
    const lowResTarget = new THREE.WebGLRenderTarget(
      this.config.lowRes.width,
      this.config.lowRes.height,
      {
        minFilter: THREE.NearestFilter, // Point filtering for sharp pixels
        magFilter: THREE.NearestFilter, // Point filtering for upscaling
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false
      }
    )

    // Store current render target and size
    const originalTarget = this.renderer.getRenderTarget()
    const originalSize = this.renderer.getSize(new THREE.Vector2())

    try {
      // Render scene to low-resolution target
      this.renderer.setRenderTarget(lowResTarget)
      this.renderer.setSize(this.config.lowRes.width, this.config.lowRes.height, false)
      this.renderer.render(this.gameScene, this.gameCamera)

      // Restore original render target and size
      this.renderer.setRenderTarget(originalTarget)
      this.renderer.setSize(originalSize.x, originalSize.y, false)

      return lowResTarget.texture
    } catch (error) {
      // Ensure we restore the render state even on error
      this.renderer.setRenderTarget(originalTarget)
      this.renderer.setSize(originalSize.x, originalSize.y, false)
      
      // Dispose the render target on error
      lowResTarget.dispose()
      
      throw error
    }
  }

  /**
   * Render the game scene to a texture for filter processing
   */
  private renderSceneToTexture(): THREE.Texture {
    const renderTarget = this.getNextRenderTarget()
    
    // Store current render target
    const currentTarget = this.renderer.getRenderTarget()
    
    // Render scene to texture
    this.renderer.setRenderTarget(renderTarget)
    this.renderer.render(this.gameScene, this.gameCamera)
    
    // Restore previous render target
    this.renderer.setRenderTarget(currentTarget)
    
    return renderTarget.texture
  }

  /**
   * Apply the complete filter pipeline to a texture with comprehensive error handling
   */
  private applyFilterPipeline(
    inputTexture: THREE.Texture,
    enabledFilters: Array<{
      name: string
      filter: ChromaticAberrationFilter | CRTFilter | FilmGrainFilter
      enabled: boolean
      order: number
    }>
  ): THREE.Texture {
    let currentTexture = inputTexture
    const failedFilters: string[] = []
    
    for (let i = 0; i < enabledFilters.length; i++) {
      const filterInfo = enabledFilters[i]
      const isLastFilter = i === enabledFilters.length - 1
      
      try {
        // Start timing for this specific effect
        this.performanceMonitor.startEffectTiming(filterInfo.name)
        
        // Get output target for filter chain
        const outputTarget = isLastFilter ? undefined : this.getNextRenderTarget()
        
        // Apply filter with error handling
        const resultTarget = this.applyFilterWithErrorHandling(
          filterInfo,
          currentTexture,
          outputTarget
        )
        
        // End timing for this effect
        this.performanceMonitor.endEffectTiming(filterInfo.name)
        
        if (resultTarget) {
          currentTexture = resultTarget.texture
        } else {
          // Filter failed, continue with current texture
          failedFilters.push(filterInfo.name)
        }
        
      } catch (error) {
        console.error(`Critical error applying ${filterInfo.name} filter:`, error)
        failedFilters.push(filterInfo.name)
        
        // End timing even on error
        this.performanceMonitor.endEffectTiming(filterInfo.name)
        
        // Continue with current texture on filter failure
      }
    }
    
    // Log failed filters for debugging
    if (failedFilters.length > 0) {
      console.warn(`The following filters failed to apply: ${failedFilters.join(', ')}`)
    }
    
    return currentTexture
  }

  /**
   * Apply a single filter with comprehensive error handling and fallback mechanisms
   */
  private applyFilterWithErrorHandling(
    filterInfo: {
      name: string
      filter: ChromaticAberrationFilter | CRTFilter | FilmGrainFilter
      enabled: boolean
      order: number
    },
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget | undefined
  ): THREE.WebGLRenderTarget | null {
    try {
      // Validate filter state before applying
      if (!filterInfo.filter) {
        throw new Error(`Filter ${filterInfo.name} is not initialized`)
      }

      // Apply the filter
      const resultTarget = filterInfo.filter.apply(this.renderer, inputTexture, outputTarget)
      
      // Validate result
      if (!resultTarget || !resultTarget.texture) {
        throw new Error(`Filter ${filterInfo.name} returned invalid result`)
      }

      return resultTarget
      
    } catch (error) {
      console.error(`Failed to apply ${filterInfo.name} filter:`, error)
      
      // Attempt recovery strategies
      return this.attemptFilterRecovery(filterInfo, inputTexture, outputTarget, error)
    }
  }

  /**
   * Attempt to recover from filter application failures
   */
  private attemptFilterRecovery(
    filterInfo: {
      name: string
      filter: ChromaticAberrationFilter | CRTFilter | FilmGrainFilter
      enabled: boolean
      order: number
    },
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget | undefined,
    originalError: any
  ): THREE.WebGLRenderTarget | null {
    console.warn(`Attempting recovery for ${filterInfo.name} filter...`)

    try {
      // Strategy 1: Try to recreate the filter
      this.recreateFilter(filterInfo.name)
      
      // Retry filter application once
      if (filterInfo.filter) {
        const resultTarget = filterInfo.filter.apply(this.renderer, inputTexture, outputTarget)
        
        if (resultTarget && resultTarget.texture) {
          console.log(`Successfully recovered ${filterInfo.name} filter`)
          return resultTarget
        }
      }
      
    } catch (recoveryError) {
      console.error(`Recovery attempt failed for ${filterInfo.name}:`, recoveryError)
    }

    // Strategy 2: Pass through input texture (graceful degradation)
    console.warn(`Using graceful degradation for ${filterInfo.name} filter`)
    
    if (outputTarget) {
      // Copy input texture to output target
      try {
        this.copyTextureToTarget(inputTexture, outputTarget)
        return outputTarget
      } catch (copyError) {
        console.error(`Failed to copy texture during recovery:`, copyError)
      }
    }

    // Final fallback: return null to indicate filter failure
    return null
  }

  /**
   * Recreate a failed filter
   */
  private recreateFilter(filterName: string): void {
    switch (filterName) {
      case 'chromatic':
        if (this.chromaticAberrationFilter) {
          this.chromaticAberrationFilter.dispose()
        }
        this.chromaticAberrationFilter = new ChromaticAberrationFilter(this.config.chromatic)
        break
        
      case 'crt':
        if (this.crtFilter) {
          this.crtFilter.dispose()
        }
        this.crtFilter = new CRTFilter(this.config.crt)
        break
        
      case 'grain':
        if (this.filmGrainFilter) {
          this.filmGrainFilter.dispose()
        }
        this.filmGrainFilter = new FilmGrainFilter(this.config.grain)
        break
        
      default:
        console.warn(`Unknown filter name for recreation: ${filterName}`)
    }
    
    // Rebuild filter pipeline to include the recreated filter
    this.setupFilterPipeline()
  }

  /**
   * Copy texture to a render target for fallback scenarios
   */
  private copyTextureToTarget(inputTexture: THREE.Texture, outputTarget: THREE.WebGLRenderTarget): void {
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
    const copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial)
    copyScene.add(copyQuad)

    const currentTarget = this.renderer.getRenderTarget()
    
    try {
      this.renderer.setRenderTarget(outputTarget)
      this.renderer.render(copyScene, copyCamera)
    } finally {
      this.renderer.setRenderTarget(currentTarget)
      
      // Cleanup
      copyMaterial.dispose()
      copyQuad.geometry.dispose()
    }
  }

  /**
   * Render a texture to the screen
   */
  private renderTextureToScreen(texture: THREE.Texture): void {
    // Create a simple copy material to render texture to screen
    const copyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture }
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
    const copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial)
    copyScene.add(copyQuad)

    // Render to screen (null render target)
    this.renderer.setRenderTarget(null)
    this.renderer.render(copyScene, copyCamera)

    // Cleanup
    copyMaterial.dispose()
    copyQuad.geometry.dispose()
  }

  /**
   * Handle render errors with appropriate fallback strategies
   */
  private handleRenderError(error: any): void {
    console.warn('Attempting to recover from render error...', error)

    try {
      // Fallback: render scene directly without effects
      this.renderer.setRenderTarget(null)
      this.renderer.render(this.gameScene, this.gameCamera)
      
      console.log('Successfully recovered with direct rendering')
    } catch (fallbackError) {
      console.error('Critical error: Failed to fallback to direct rendering:', fallbackError)
    }
  }

  /**
   * Update performance metrics for monitoring
   */
  private updatePerformanceMetrics(startTime: number): void {
    const frameTime = performance.now() - startTime
    this.lastFrameTime = frameTime
    this.frameCount++

    // Update average FPS every 60 frames
    if (this.frameCount % 60 === 0) {
      this.averageFPS = 1000 / frameTime
    }
  }

  /**
   * Update time for animated effects (film grain, CRT noise/flicker)
   */
  public updateTime(deltaTime: number): void {
    // Update film grain animation
    if (this.filmGrainFilter && this.config.grain.enabled) {
      this.filmGrainFilter.updateTime(deltaTime)
    }

    // Update CRT animation (noise and flicker)
    if (this.crtFilter && this.config.crt.enabled) {
      this.crtFilter.updateTime(deltaTime)
    }
  }

  /**
   * Add a game object to the rendering pipeline
   * This method ensures objects are added to the correct scene
   */
  public addGameObject(displayObject: THREE.Object3D): void {
    try {
      if (this.lowResRenderer && this.config.lowRes.enabled) {
        // Add to the low-res renderer's game scene
        this.lowResRenderer.getGameScene().add(displayObject)
      } else {
        // Add to the main game scene
        this.gameScene.add(displayObject)
      }
    } catch (error) {
      console.error('Failed to add game object:', error)
    }
  }

  /**
   * Remove a game object from the rendering pipeline
   */
  public removeGameObject(displayObject: THREE.Object3D): void {
    try {
      if (this.lowResRenderer && this.config.lowRes.enabled) {
        // Remove from the low-res renderer's game scene
        this.lowResRenderer.getGameScene().remove(displayObject)
      } else {
        // Remove from the main game scene
        this.gameScene.remove(displayObject)
      }
    } catch (error) {
      console.error('Failed to remove game object:', error)
    }
  }

  /**
   * Update configuration with real-time parameter changes
   * Implements EffectsConfig interface with all effect parameters including CRT
   */
  public updateConfig(newConfig: Partial<EffectsConfig>): void {
    const oldConfig = JSON.parse(JSON.stringify(this.config)) // Deep copy for rollback
    
    try {
      // Update low-resolution renderer configuration
      if (newConfig.lowRes !== undefined) {
        this.updateLowResConfig(newConfig.lowRes)
      }

      // Update chromatic aberration configuration
      if (newConfig.chromatic !== undefined) {
        this.updateChromaticConfig(newConfig.chromatic)
      }

      // Update CRT configuration
      if (newConfig.crt !== undefined) {
        this.updateCRTConfig(newConfig.crt)
      }

      // Update film grain configuration
      if (newConfig.grain !== undefined) {
        this.updateGrainConfig(newConfig.grain)
      }

      // Rebuild filter pipeline if any effects were enabled/disabled
      this.rebuildFilterPipelineIfNeeded(oldConfig, this.config)

      console.log('Visual effects configuration updated successfully')
    } catch (error) {
      console.error('Failed to update visual effects configuration:', error)
      
      // Rollback to old configuration
      this.config = oldConfig
      this.rebuildFilterPipelineIfNeeded(this.config, oldConfig)
      
      throw error
    }
  }

  /**
   * Update low-resolution renderer configuration
   */
  private updateLowResConfig(newLowResConfig: Partial<EffectsConfig['lowRes']>): void {
    const wasEnabled = this.config.lowRes.enabled
    
    // Update configuration
    this.config.lowRes = { ...this.config.lowRes, ...newLowResConfig }
    
    // Handle enable/disable state changes
    if (newLowResConfig.enabled !== undefined) {
      if (newLowResConfig.enabled && !wasEnabled) {
        // Enable low-res rendering
        if (!this.lowResRenderer) {
          this.lowResRenderer = new LowResolutionRenderer(
            this.renderer,
            this.gameScene,
            this.gameCamera,
            this.config.lowRes
          )
          this.lowResRenderer.initialize()
        }
      } else if (!newLowResConfig.enabled && wasEnabled) {
        // Disable low-res rendering
        if (this.lowResRenderer) {
          this.lowResRenderer.dispose()
          this.lowResRenderer = null
        }
      }
    }
    
    // Update existing low-res renderer parameters
    if (this.lowResRenderer && this.config.lowRes.enabled) {
      // Extract only the LowResConfig properties (excluding 'enabled')
      const { enabled, ...lowResParams } = this.config.lowRes
      
      // Check if any parameters other than 'enabled' were changed
      const hasParameterChanges = Object.keys(newLowResConfig).some(key => key !== 'enabled')
      
      if (hasParameterChanges) {
        this.lowResRenderer.updateResolution(lowResParams)
      }
    }
  }

  /**
   * Update chromatic aberration configuration
   */
  private updateChromaticConfig(newChromaticConfig: Partial<EffectsConfig['chromatic']>): void {
    const wasEnabled = this.config.chromatic.enabled
    
    // Update configuration
    this.config.chromatic = { ...this.config.chromatic, ...newChromaticConfig }
    
    // Handle enable/disable state changes
    if (newChromaticConfig.enabled !== undefined) {
      if (newChromaticConfig.enabled && !wasEnabled) {
        // Enable chromatic aberration
        if (!this.chromaticAberrationFilter) {
          this.chromaticAberrationFilter = new ChromaticAberrationFilter(this.config.chromatic)
        }
      } else if (!newChromaticConfig.enabled && wasEnabled) {
        // Disable chromatic aberration
        if (this.chromaticAberrationFilter) {
          this.chromaticAberrationFilter.dispose()
          this.chromaticAberrationFilter = null
        }
      }
    }
    
    // Update existing filter parameters
    if (this.chromaticAberrationFilter && this.config.chromatic.enabled) {
      // Extract only the ChromaticAberrationConfig properties (excluding 'enabled')
      const { enabled, ...chromaticParams } = this.config.chromatic
      
      // Check if any parameters other than 'enabled' were changed
      const hasParameterChanges = Object.keys(newChromaticConfig).some(key => key !== 'enabled')
      
      if (hasParameterChanges) {
        this.chromaticAberrationFilter.updateConfig(chromaticParams)
      }
    }
  }

  /**
   * Update CRT configuration
   */
  private updateCRTConfig(newCRTConfig: Partial<EffectsConfig['crt']>): void {
    const wasEnabled = this.config.crt.enabled
    
    // Update configuration
    this.config.crt = { ...this.config.crt, ...newCRTConfig }
    
    // Handle enable/disable state changes
    if (newCRTConfig.enabled !== undefined) {
      if (newCRTConfig.enabled && !wasEnabled) {
        // Enable CRT filter
        if (!this.crtFilter) {
          this.crtFilter = new CRTFilter(this.config.crt)
        }
      } else if (!newCRTConfig.enabled && wasEnabled) {
        // Disable CRT filter
        if (this.crtFilter) {
          this.crtFilter.dispose()
          this.crtFilter = null
        }
      }
    }
    
    // Update existing filter parameters
    if (this.crtFilter && this.config.crt.enabled) {
      // Extract only the CRTConfig properties (excluding 'enabled')
      const { enabled, ...crtParams } = this.config.crt
      
      // Check if any parameters other than 'enabled' were changed
      const hasParameterChanges = Object.keys(newCRTConfig).some(key => key !== 'enabled')
      
      if (hasParameterChanges) {
        this.crtFilter.updateConfig(crtParams)
      }
    }
  }

  /**
   * Update film grain configuration
   */
  private updateGrainConfig(newGrainConfig: Partial<EffectsConfig['grain']>): void {
    const wasEnabled = this.config.grain.enabled
    
    // Update configuration
    this.config.grain = { ...this.config.grain, ...newGrainConfig }
    
    // Handle enable/disable state changes
    if (newGrainConfig.enabled !== undefined) {
      if (newGrainConfig.enabled && !wasEnabled) {
        // Enable film grain
        if (!this.filmGrainFilter) {
          this.filmGrainFilter = new FilmGrainFilter(this.config.grain)
        }
      } else if (!newGrainConfig.enabled && wasEnabled) {
        // Disable film grain
        if (this.filmGrainFilter) {
          this.filmGrainFilter.dispose()
          this.filmGrainFilter = null
        }
      }
    }
    
    // Update existing filter parameters
    if (this.filmGrainFilter && this.config.grain.enabled) {
      // Extract only the FilmGrainConfig properties (excluding 'enabled')
      const { enabled, ...grainParams } = this.config.grain
      
      // Check if any parameters other than 'enabled' were changed
      const hasParameterChanges = Object.keys(newGrainConfig).some(key => key !== 'enabled')
      
      if (hasParameterChanges) {
        this.filmGrainFilter.updateConfig(grainParams)
      }
    }
  }

  /**
   * Rebuild filter pipeline if effects were enabled or disabled
   */
  private rebuildFilterPipelineIfNeeded(oldConfig: EffectsConfig, newConfig: EffectsConfig): void {
    const needsRebuild = 
      oldConfig.chromatic.enabled !== newConfig.chromatic.enabled ||
      oldConfig.crt.enabled !== newConfig.crt.enabled ||
      oldConfig.grain.enabled !== newConfig.grain.enabled

    if (needsRebuild) {
      this.setupFilterPipeline()
      console.log('Filter pipeline rebuilt due to effect enable/disable changes')
    }
  }

  /**
   * Toggle individual effect enable/disable functionality
   */
  public toggleEffect(effectName: keyof EffectsConfig, enabled: boolean): void {
    try {
      switch (effectName) {
        case 'lowRes':
          this.updateConfig({ lowRes: { ...this.config.lowRes, enabled } })
          break
        case 'chromatic':
          this.updateConfig({ chromatic: { ...this.config.chromatic, enabled } })
          break
        case 'crt':
          this.updateConfig({ crt: { ...this.config.crt, enabled } })
          break
        case 'grain':
          this.updateConfig({ grain: { ...this.config.grain, enabled } })
          break
        default:
          console.warn(`Unknown effect name: ${effectName}`)
      }
    } catch (error) {
      console.error(`Failed to toggle ${effectName} effect:`, error)
      throw error
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): EffectsConfig {
    return JSON.parse(JSON.stringify(this.config)) // Deep copy
  }

  /**
   * Get configuration for a specific effect
   */
  public getEffectConfig<T extends keyof EffectsConfig>(effectName: T): EffectsConfig[T] {
    return JSON.parse(JSON.stringify(this.config[effectName])) // Deep copy
  }

  /**
   * Check if a specific effect is enabled
   */
  public isEffectEnabled(effectName: keyof EffectsConfig): boolean {
    return this.config[effectName].enabled
  }

  /**
   * Get list of all available effects
   */
  public getAvailableEffects(): Array<{
    name: keyof EffectsConfig
    enabled: boolean
    description: string
  }> {
    return [
      {
        name: 'lowRes',
        enabled: this.config.lowRes.enabled,
        description: 'Low-resolution rendering with pixelation'
      },
      {
        name: 'chromatic',
        enabled: this.config.chromatic.enabled,
        description: 'Chromatic aberration for lens distortion'
      },
      {
        name: 'crt',
        enabled: this.config.crt.enabled,
        description: 'CRT monitor simulation with scanlines and curvature'
      },
      {
        name: 'grain',
        enabled: this.config.grain.enabled,
        description: 'Film grain and noise for texture'
      }
    ]
  }

  /**
   * Reset configuration to default values
   */
  public resetToDefaults(): void {
    const defaultConfig: EffectsConfig = {
      lowRes: {
        enabled: true,
        width: 480,
        height: 270,
        upscaleWidth: 1920,
        upscaleHeight: 1080
      },
      chromatic: {
        enabled: false,
        offset: 0.002,
        direction: [1.0, 0.0],
        radial: false
      },
      crt: {
        enabled: false,
        scanlines: {
          enabled: true,
          intensity: 0.3,
          spacing: 2.0,
          thickness: 0.5
        },
        curvature: {
          enabled: true,
          amount: 0.02,
          corners: 0.3
        },
        phosphor: {
          enabled: true,
          intensity: 0.2,
          persistence: 1.5
        },
        noise: {
          enabled: false,
          intensity: 0.02,
          speed: 1.0
        },
        flicker: {
          enabled: false,
          intensity: 0.05,
          frequency: 2.0
        }
      },
      grain: {
        enabled: true,
        intensity: 0.05,
        animated: true,
        speed: 1.0
      }
    }

    this.updateConfig(defaultConfig)
    console.log('Visual effects configuration reset to defaults')
  }

  /**
   * Validate configuration parameters
   */
  public validateConfig(config: Partial<EffectsConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate low-res configuration
    if (config.lowRes) {
      if (config.lowRes.width !== undefined && (config.lowRes.width <= 0 || config.lowRes.width > 2048)) {
        errors.push('Low-res width must be between 1 and 2048')
      }
      if (config.lowRes.height !== undefined && (config.lowRes.height <= 0 || config.lowRes.height > 2048)) {
        errors.push('Low-res height must be between 1 and 2048')
      }
      if (config.lowRes.upscaleWidth !== undefined && (config.lowRes.upscaleWidth <= 0 || config.lowRes.upscaleWidth > 8192)) {
        errors.push('Upscale width must be between 1 and 8192')
      }
      if (config.lowRes.upscaleHeight !== undefined && (config.lowRes.upscaleHeight <= 0 || config.lowRes.upscaleHeight > 8192)) {
        errors.push('Upscale height must be between 1 and 8192')
      }
    }

    // Validate chromatic aberration configuration
    if (config.chromatic) {
      if (config.chromatic.offset !== undefined && (config.chromatic.offset < 0 || config.chromatic.offset > 0.1)) {
        errors.push('Chromatic aberration offset must be between 0 and 0.1')
      }
      if (config.chromatic.direction !== undefined) {
        if (!Array.isArray(config.chromatic.direction) || config.chromatic.direction.length !== 2) {
          errors.push('Chromatic aberration direction must be an array of two numbers')
        }
      }
    }

    // Validate film grain configuration
    if (config.grain) {
      if (config.grain.intensity !== undefined && (config.grain.intensity < 0 || config.grain.intensity > 1)) {
        errors.push('Film grain intensity must be between 0 and 1')
      }
      if (config.grain.speed !== undefined && !isFinite(config.grain.speed)) {
        errors.push('Film grain speed must be a finite number')
      }
    }

    // Validate CRT configuration
    if (config.crt) {
      if (config.crt.scanlines) {
        if (config.crt.scanlines.intensity !== undefined && (config.crt.scanlines.intensity < 0 || config.crt.scanlines.intensity > 1)) {
          errors.push('CRT scanline intensity must be between 0 and 1')
        }
        if (config.crt.scanlines.spacing !== undefined && (config.crt.scanlines.spacing < 1 || config.crt.scanlines.spacing > 4)) {
          errors.push('CRT scanline spacing must be between 1 and 4')
        }
      }
      if (config.crt.curvature) {
        if (config.crt.curvature.amount !== undefined && (config.crt.curvature.amount < 0 || config.crt.curvature.amount > 0.1)) {
          errors.push('CRT curvature amount must be between 0 and 0.1')
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    lastFrameTime: number
    averageFPS: number
    frameCount: number
    enabledFilters: string[]
    lowResEnabled: boolean
  } {
    return {
      lastFrameTime: this.lastFrameTime,
      averageFPS: this.averageFPS,
      frameCount: this.frameCount,
      enabledFilters: this.filters.filter(f => f.enabled).map(f => f.name),
      lowResEnabled: this.config.lowRes.enabled
    }
  }

  /**
   * Get filter pipeline information for debugging
   */
  public getFilterPipelineInfo(): Array<{
    name: string
    enabled: boolean
    order: number
  }> {
    return this.filters.map(f => ({
      name: f.name,
      enabled: f.enabled,
      order: f.order
    }))
  }

  /**
   * Recreate render targets when renderer size changes
   */
  public handleResize(): void {
    try {
      // Dispose old render targets
      this.renderTargets.forEach(target => target.dispose())
      this.renderTargets = []
      
      // Create new render targets with updated size
      this.createRenderTargets()
      
      // Update low-res renderer if enabled
      if (this.lowResRenderer && this.config.lowRes.enabled) {
        const size = this.renderer.getSize(new THREE.Vector2())
        this.lowResRenderer.updateResolution({
          upscaleWidth: size.x,
          upscaleHeight: size.y
        })
      }
      
      console.log('Visual effects manager resized successfully')
    } catch (error) {
      console.error('Failed to handle resize:', error)
    }
  }

  /**
   * Clean up all resources
   */
  public dispose(): void {
    try {
      // Dispose low-resolution renderer
      if (this.lowResRenderer) {
        this.lowResRenderer.dispose()
        this.lowResRenderer = null
      }

      // Dispose filters
      if (this.chromaticAberrationFilter) {
        this.chromaticAberrationFilter.dispose()
        this.chromaticAberrationFilter = null
      }

      if (this.crtFilter) {
        this.crtFilter.dispose()
        this.crtFilter = null
      }

      if (this.filmGrainFilter) {
        this.filmGrainFilter.dispose()
        this.filmGrainFilter = null
      }

      // Dispose render targets
      this.renderTargets.forEach(target => target.dispose())
      this.renderTargets = []

      // Clear filter pipeline
      this.filters = []

      console.log('VisualEffectsManager disposed successfully')
    } catch (error) {
      console.error('Error during VisualEffectsManager disposal:', error)
    }
  }
}