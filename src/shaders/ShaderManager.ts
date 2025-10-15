import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { InscryptionShader, type InscryptionShaderUniforms } from './InscryptionShader'
import { INSCRYPTION_SHADER_DEFAULTS, validateShaderConfig } from './InscryptionShaderConfig'
import { ShaderPerformanceMonitor, type PerformanceCallbacks, type PerformanceMetrics } from './ShaderPerformanceMonitor'

// Configuration interface for shader parameters
export interface ShaderConfig {
  enabled: boolean
  luminanceThreshold: number // 0.0 - 1.0
  colorSteps: number // 2 - 16
  intensity: number // 0.0 - 2.0
  darknessBias: number // 0.0 - 1.0
}

// Extended callbacks for performance monitoring
export interface ShaderManagerCallbacks {
  onPerformanceAdjustment?: (config: ShaderConfig, reason: string) => void
  onPerformanceWarning?: (message: string, metrics: PerformanceMetrics) => void
}

// Main shader manager class
export class ShaderManager {
  private composer!: EffectComposer
  private renderPass!: RenderPass
  private inscryptionPass!: ShaderPass
  private config: ShaderConfig
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.Camera
  private hasShaderError: boolean = false
  private contextLostHandler?: (event: Event) => void
  private contextRestoredHandler?: (event: Event) => void
  private performanceMonitor: ShaderPerformanceMonitor
  private callbacks: ShaderManagerCallbacks
  private autoPerformanceAdjustment: boolean = true

  constructor(
    renderer: THREE.WebGLRenderer, 
    scene: THREE.Scene, 
    camera: THREE.Camera,
    callbacks: ShaderManagerCallbacks = {}
  ) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.callbacks = callbacks

    // Initialize default configuration using Inscryption-tuned defaults
    this.config = { ...INSCRYPTION_SHADER_DEFAULTS }

    // Initialize performance monitor
    const performanceCallbacks: PerformanceCallbacks = {
      onQualityAdjustment: (newConfig, reason) => {
        if (this.autoPerformanceAdjustment) {
          console.log(`Auto-adjusting shader quality: ${reason}`)
          this.updateConfig(newConfig)
          this.callbacks.onPerformanceAdjustment?.(newConfig, reason)
        }
      },
      onPerformanceWarning: (message, metrics) => {
        console.warn(`Shader performance warning: ${message}`)
        this.callbacks.onPerformanceWarning?.(message, metrics)
      }
    }
    
    this.performanceMonitor = new ShaderPerformanceMonitor(performanceCallbacks)

    try {
      this.initializePostProcessing()
      this.setupWebGLContextHandlers()
      this.performanceMonitor.startMonitoring()
    } catch (error) {
      console.error('Failed to initialize shader system:', error)
      this.hasShaderError = true
      this.config.enabled = false
    }
  }



  // Initialize post-processing pipeline with error handling
  private initializePostProcessing(): void {
    try {
      // Create effect composer
      this.composer = new EffectComposer(this.renderer)

      // Create render pass (renders the scene)
      this.renderPass = new RenderPass(this.scene, this.camera)
      this.composer.addPass(this.renderPass)

      // Create Inscryption shader pass with error handling
      this.inscryptionPass = new ShaderPass(InscryptionShader)
      this.updateUniforms(this.config)
      this.composer.addPass(this.inscryptionPass)

      // Set initial size
      const size = this.renderer.getSize(new THREE.Vector2())
      this.setSize(size.x, size.y)

      console.log('Inscryption shader initialized successfully')
    } catch (error) {
      console.error('Shader compilation failed:', error)
      throw error
    }
  }

  // Setup WebGL context loss/restore handlers
  private setupWebGLContextHandlers(): void {
    const canvas = this.renderer.domElement

    this.contextLostHandler = (event: Event) => {
      event.preventDefault()
      console.warn('WebGL context lost, shader will be restored when context is recovered')
      this.hasShaderError = true
    }

    this.contextRestoredHandler = (_event: Event) => {
      console.log('WebGL context restored, reinitializing shader')
      try {
        this.initializePostProcessing()
        this.hasShaderError = false
        console.log('Shader successfully restored after context recovery')
      } catch (error) {
        console.error('Failed to restore shader after context recovery:', error)
        this.hasShaderError = true
        this.config.enabled = false
      }
    }

    canvas.addEventListener('webglcontextlost', this.contextLostHandler as EventListener)
    canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler as EventListener)
  }

  // Update shader uniforms
  private updateUniforms(config: Partial<ShaderConfig>): void {
    const uniforms = this.inscryptionPass.uniforms as InscryptionShaderUniforms

    if (config.luminanceThreshold !== undefined) {
      uniforms.luminanceThreshold.value = config.luminanceThreshold
    }
    if (config.colorSteps !== undefined) {
      uniforms.colorSteps.value = config.colorSteps
    }
    if (config.intensity !== undefined) {
      uniforms.intensity.value = config.intensity
    }
    if (config.darknessBias !== undefined) {
      uniforms.darknessBias.value = config.darknessBias
    }
  }

  // Validate configuration parameters using centralized validation
  private validateConfig(config: Partial<ShaderConfig>): Partial<ShaderConfig> {
    const fullConfig = validateShaderConfig({ ...this.config, ...config })
    
    // Return only the changed properties
    const validated: Partial<ShaderConfig> = {}
    
    if (config.enabled !== undefined) {
      validated.enabled = fullConfig.enabled
    }
    if (config.luminanceThreshold !== undefined) {
      validated.luminanceThreshold = fullConfig.luminanceThreshold
    }
    if (config.colorSteps !== undefined) {
      validated.colorSteps = fullConfig.colorSteps
    }
    if (config.intensity !== undefined) {
      validated.intensity = fullConfig.intensity
    }
    if (config.darknessBias !== undefined) {
      validated.darknessBias = fullConfig.darknessBias
    }

    return validated
  }

  // Update shader configuration with validation and error handling
  updateConfig(newConfig: Partial<ShaderConfig>): void {
    try {
      const validatedConfig = this.validateConfig(newConfig)
      this.config = { ...this.config, ...validatedConfig }
      
      // Update uniforms with error handling
      this.updateUniformsSafely(validatedConfig)

      // Enable/disable shader pass
      if (validatedConfig.enabled !== undefined) {
        this.setEnabledSafely(validatedConfig.enabled)
      }
      
    } catch (error) {
      console.error('Failed to update shader configuration:', error)
      
      // Revert to last known good configuration
      try {
        this.updateUniformsSafely(this.config)
        console.log('Reverted to previous shader configuration')
      } catch (revertError) {
        console.error('Failed to revert shader configuration:', revertError)
        this.handleConfigurationError(error as Error)
      }
    }
  }

  // Safely update uniforms with error handling
  private updateUniformsSafely(config: Partial<ShaderConfig>): void {
    try {
      if (!this.inscryptionPass || !this.inscryptionPass.uniforms) {
        throw new Error('Shader pass or uniforms not initialized')
      }
      
      this.updateUniforms(config)
    } catch (error) {
      console.error('Failed to update shader uniforms:', error)
      throw error
    }
  }

  // Safely enable/disable shader with error handling
  private setEnabledSafely(enabled: boolean): void {
    try {
      if (!this.inscryptionPass) {
        throw new Error('Shader pass not initialized')
      }
      
      this.inscryptionPass.enabled = enabled
    } catch (error) {
      console.error('Failed to set shader enabled state:', error)
      this.hasShaderError = true
      this.config.enabled = false
    }
  }

  // Handle configuration errors
  private handleConfigurationError(error: Error): void {
    console.error('Configuration error, disabling shader:', error.message)
    this.hasShaderError = true
    this.config.enabled = false
    
    // Notify callbacks about configuration failure
    const fallbackMetrics: PerformanceMetrics = {
      averageFPS: 0,
      frameTime: 0,
      memoryUsage: 0,
      lastUpdateTime: performance.now()
    }
    this.callbacks.onPerformanceWarning?.(
      `Shader configuration failed: ${error.message}`,
      this.performanceMonitor.getCurrentMetrics() || fallbackMetrics
    )
  }

  // Enable or disable the shader effect
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    this.inscryptionPass.enabled = enabled
  }

  // Handle window resize with error handling
  setSize(width: number, height: number): void {
    try {
      if (!this.composer) {
        console.warn('Cannot resize: composer not initialized')
        return
      }
      
      // Validate dimensions
      if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
        throw new Error(`Invalid dimensions: ${width}x${height}`)
      }
      
      this.composer.setSize(width, height)
      
      // Update resolution uniform safely
      if (this.inscryptionPass && this.inscryptionPass.uniforms) {
        const uniforms = this.inscryptionPass.uniforms as InscryptionShaderUniforms
        if (uniforms.resolution && uniforms.resolution.value) {
          uniforms.resolution.value.set(width, height)
        }
      }
      
    } catch (error) {
      console.error('Failed to resize shader system:', error)
      
      // Don't disable shader for resize errors, just log the issue
      console.warn('Shader resize failed, continuing with previous size')
    }
  }

  // Render the scene with post-processing and comprehensive error handling
  render(deltaTime: number = 0): void {
    try {
      if (this.config.enabled && !this.hasShaderError && this.composer) {

        
        // Update time uniform for potential animated effects
        const uniforms = this.inscryptionPass.uniforms as InscryptionShaderUniforms
        uniforms.time.value += deltaTime

        this.composer.render()
        
        // Record frame for performance monitoring
        this.performanceMonitor.recordFrame()
      } else {
        // Fallback to standard rendering if disabled or error occurred
        this.renderFallback()
      }
    } catch (error) {
      console.error('Shader rendering error, falling back to standard rendering:', error)
      this.hasShaderError = true
      this.config.enabled = false
      this.renderFallback()
    }
  }

  // Safe fallback rendering
  private renderFallback(): void {
    try {
      this.renderer.render(this.scene, this.camera)
    } catch (fallbackError) {
      console.error('Critical rendering error:', fallbackError)
    }
  }



  // Get current configuration
  getConfig(): ShaderConfig {
    return { ...this.config }
  }

  // Check if shader system has errors
  hasErrors(): boolean {
    return this.hasShaderError
  }

  // Attempt to recover from shader errors
  recoverFromError(): boolean {
    try {
      this.initializePostProcessing()
      this.hasShaderError = false
      this.config.enabled = true
      console.log('Successfully recovered from shader error')
      return true
    } catch (error) {
      console.error('Failed to recover from shader error:', error)
      return false
    }
  }

  // Performance monitoring methods
  public getPerformanceMetrics(): PerformanceMetrics | null {
    return this.performanceMonitor.getCurrentMetrics()
  }

  public getPerformanceReport(): string {
    return this.performanceMonitor.getPerformanceReport()
  }

  public setAutoPerformanceAdjustment(enabled: boolean): void {
    this.autoPerformanceAdjustment = enabled
    if (enabled) {
      this.performanceMonitor.startMonitoring()
    } else {
      this.performanceMonitor.stopMonitoring()
    }
  }

  public isAutoPerformanceAdjustmentEnabled(): boolean {
    return this.autoPerformanceAdjustment
  }

  public getCurrentQualityLevel(): string {
    return this.performanceMonitor.getCurrentQualityLevel()
  }



  // Dispose of resources with comprehensive error handling
  dispose(): void {
    console.log('Disposing shader manager resources...')
    
    // Track disposal errors but continue cleanup
    const errors: Error[] = []
    
    // Dispose performance monitor
    try {
      if (this.performanceMonitor) {
        this.performanceMonitor.dispose()
      }
    } catch (error) {
      errors.push(new Error(`Performance monitor disposal failed: ${error}`))
    }

    // Remove WebGL context event listeners
    try {
      if (this.contextLostHandler && this.contextRestoredHandler) {
        const canvas = this.renderer?.domElement
        if (canvas) {
          canvas.removeEventListener('webglcontextlost', this.contextLostHandler as EventListener)
          canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler as EventListener)
        }
        this.contextLostHandler = undefined
        this.contextRestoredHandler = undefined
      }
    } catch (error) {
      errors.push(new Error(`Event listener removal failed: ${error}`))
    }

    // Dispose of composer resources
    try {
      if (this.composer) {
        this.composer.dispose()
        this.composer = undefined as any
      }
    } catch (error) {
      errors.push(new Error(`Composer disposal failed: ${error}`))
    }

    // Clear references
    try {
      this.renderPass = undefined as any
      this.inscryptionPass = undefined as any
      this.hasShaderError = true
      this.config.enabled = false
    } catch (error) {
      errors.push(new Error(`Reference cleanup failed: ${error}`))
    }

    // Report any errors that occurred during disposal
    if (errors.length > 0) {
      console.error('Errors occurred during shader disposal:')
      errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error.message}`)
      })
    } else {
      console.log('Shader manager disposed successfully')
    }
  }
}
