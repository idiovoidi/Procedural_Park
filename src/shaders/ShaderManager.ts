import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { InscryptionShader, type InscryptionShaderUniforms } from './InscryptionShader'

// Configuration interface for shader parameters
export interface ShaderConfig {
  enabled: boolean
  luminanceThreshold: number // 0.0 - 1.0
  colorSteps: number // 2 - 16
  intensity: number // 0.0 - 2.0
  darknessBias: number // 0.0 - 1.0
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

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera

    // Initialize default configuration
    this.config = {
      enabled: true,
      luminanceThreshold: 0.3,
      colorSteps: 8,
      intensity: 1.0,
      darknessBias: 0.4,
    }

    try {
      this.initializePostProcessing()
      this.setupWebGLContextHandlers()
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

  // Validate configuration parameters
  private validateConfig(config: Partial<ShaderConfig>): Partial<ShaderConfig> {
    const validated: Partial<ShaderConfig> = {}

    if (config.enabled !== undefined) {
      validated.enabled = Boolean(config.enabled)
    }

    if (config.luminanceThreshold !== undefined) {
      validated.luminanceThreshold = Math.max(0.0, Math.min(1.0, config.luminanceThreshold))
    }

    if (config.colorSteps !== undefined) {
      validated.colorSteps = Math.max(2, Math.min(16, Math.floor(config.colorSteps)))
    }

    if (config.intensity !== undefined) {
      validated.intensity = Math.max(0.0, Math.min(2.0, config.intensity))
    }

    if (config.darknessBias !== undefined) {
      validated.darknessBias = Math.max(0.0, Math.min(1.0, config.darknessBias))
    }

    return validated
  }

  // Update shader configuration with validation
  updateConfig(newConfig: Partial<ShaderConfig>): void {
    const validatedConfig = this.validateConfig(newConfig)
    this.config = { ...this.config, ...validatedConfig }
    this.updateUniforms(validatedConfig)

    // Enable/disable shader pass
    if (validatedConfig.enabled !== undefined) {
      this.inscryptionPass.enabled = validatedConfig.enabled
    }
  }

  // Enable or disable the shader effect
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    this.inscryptionPass.enabled = enabled
  }

  // Handle window resize
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
    const uniforms = this.inscryptionPass.uniforms as InscryptionShaderUniforms
    uniforms.resolution.value.set(width, height)
  }

  // Render the scene with post-processing and error handling
  render(deltaTime: number = 0): void {
    try {
      if (this.config.enabled && !this.hasShaderError && this.composer) {
        // Update time uniform for potential animated effects
        const uniforms = this.inscryptionPass.uniforms as InscryptionShaderUniforms
        uniforms.time.value += deltaTime

        this.composer.render()
      } else {
        // Fallback to standard rendering if disabled or error occurred
        this.renderer.render(this.scene, this.camera)
      }
    } catch (error) {
      console.error('Shader rendering error, falling back to standard rendering:', error)
      this.hasShaderError = true
      this.config.enabled = false
      
      // Fallback to standard rendering
      try {
        this.renderer.render(this.scene, this.camera)
      } catch (fallbackError) {
        console.error('Critical rendering error:', fallbackError)
      }
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

  // Dispose of resources with error handling
  dispose(): void {
    try {
      // Remove WebGL context event listeners
      if (this.contextLostHandler && this.contextRestoredHandler) {
        const canvas = this.renderer.domElement
        canvas.removeEventListener('webglcontextlost', this.contextLostHandler as EventListener)
        canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler as EventListener)
      }

      // Dispose of composer resources
      if (this.composer) {
        this.composer.dispose()
      }
    } catch (error) {
      console.error('Error during shader disposal:', error)
    }
  }
}
