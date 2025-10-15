/**
 * Comprehensive error handling and fallback mechanisms for visual effects
 * Handles shader compilation failures, WebGL context loss/restore, and recovery strategies
 */

import * as THREE from 'three'

export interface ErrorReport {
  timestamp: number
  type: 'shader_compilation' | 'webgl_context' | 'render_target' | 'filter_application' | 'memory' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: any
  stack?: string
  recovered: boolean
  recoveryStrategy?: string
}

export interface FallbackConfig {
  enableShaderFallbacks: boolean
  enableContextRecovery: boolean
  enableGracefulDegradation: boolean
  maxRecoveryAttempts: number
  recoveryDelay: number
}

export class ErrorHandler {
  private renderer: THREE.WebGLRenderer
  private gl: WebGLRenderingContext | WebGL2RenderingContext
  private config: FallbackConfig
  private errorHistory: ErrorReport[] = []
  private recoveryAttempts: Map<string, number> = new Map()
  private contextLostCallbacks: (() => void)[] = []
  private contextRestoredCallbacks: (() => void)[] = []
  private isContextLost: boolean = false
  
  // Fallback shaders
  private fallbackVertexShader!: string
  private fallbackFragmentShader!: string
  
  // Error callbacks
  private onError?: (error: ErrorReport) => void
  private onRecovery?: (error: ErrorReport) => void

  constructor(
    renderer: THREE.WebGLRenderer,
    config: Partial<FallbackConfig> = {},
    onError?: (error: ErrorReport) => void,
    onRecovery?: (error: ErrorReport) => void
  ) {
    this.renderer = renderer
    this.gl = renderer.getContext()
    this.onError = onError
    this.onRecovery = onRecovery
    
    this.config = {
      enableShaderFallbacks: true,
      enableContextRecovery: true,
      enableGracefulDegradation: true,
      maxRecoveryAttempts: 3,
      recoveryDelay: 1000,
      ...config
    }
    
    this.initializeFallbackShaders()
    this.setupContextLossHandling()
    
    console.log('Error handler initialized with config:', this.config)
  }

  /**
   * Initialize fallback shaders for emergency use
   */
  private initializeFallbackShaders(): void {
    // Simple pass-through vertex shader
    this.fallbackVertexShader = `
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
    
    // Simple pass-through fragment shader
    this.fallbackFragmentShader = `
      precision mediump float;
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      
      void main() {
        gl_FragColor = texture2D(tDiffuse, vUv);
      }
    `
  }

  /**
   * Setup WebGL context loss and restore handling
   */
  private setupContextLossHandling(): void {
    if (!this.config.enableContextRecovery) {
      return
    }
    
    const canvas = this.renderer.domElement
    
    canvas.addEventListener('webglcontextlost', (event) => {
      console.warn('WebGL context lost')
      event.preventDefault()
      this.isContextLost = true
      
      this.reportError({
        type: 'webgl_context',
        severity: 'critical',
        message: 'WebGL context lost',
        details: { reason: (event as any).statusMessage || 'Unknown' }
      })
      
      // Notify callbacks
      this.contextLostCallbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Error in context lost callback:', error)
        }
      })
    })
    
    canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored')
      this.isContextLost = false
      
      // Attempt to recover
      this.attemptContextRecovery()
      
      // Notify callbacks
      this.contextRestoredCallbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Error in context restored callback:', error)
        }
      })
    })
  }

  /**
   * Attempt to recover from WebGL context loss
   */
  private async attemptContextRecovery(): Promise<void> {
    const recoveryKey = 'webgl_context_recovery'
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0
    
    if (attempts >= this.config.maxRecoveryAttempts) {
      console.error('Max context recovery attempts reached')
      return
    }
    
    this.recoveryAttempts.set(recoveryKey, attempts + 1)
    
    try {
      // Wait before attempting recovery
      await new Promise(resolve => setTimeout(resolve, this.config.recoveryDelay))
      
      // Force renderer to recreate resources
      this.renderer.dispose()
      
      // The renderer should automatically recreate resources on next render
      console.log('WebGL context recovery initiated')
      
      this.reportRecovery({
        type: 'webgl_context',
        severity: 'critical',
        message: 'WebGL context recovered successfully',
        recoveryStrategy: 'renderer_disposal_and_recreation'
      })
      
    } catch (error) {
      console.error('Failed to recover from WebGL context loss:', error)
      
      this.reportError({
        type: 'webgl_context',
        severity: 'critical',
        message: 'Failed to recover from WebGL context loss',
        details: error
      })
    }
  }

  /**
   * Handle shader compilation errors with fallback strategies
   */
  public handleShaderError(
    shaderName: string,
    vertexShader: string,
    fragmentShader: string,
    error: any
  ): THREE.ShaderMaterial | null {
    this.reportError({
      type: 'shader_compilation',
      severity: 'high',
      message: `Shader compilation failed for ${shaderName}`,
      details: { error: error.toString(), vertexShader, fragmentShader }
    })
    
    if (!this.config.enableShaderFallbacks) {
      return null
    }
    
    const recoveryKey = `shader_${shaderName}`
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0
    
    if (attempts >= this.config.maxRecoveryAttempts) {
      console.error(`Max shader recovery attempts reached for ${shaderName}`)
      return null
    }
    
    this.recoveryAttempts.set(recoveryKey, attempts + 1)
    
    try {
      // Strategy 1: Try with simplified shader
      const simplifiedMaterial = this.createSimplifiedShader(shaderName, vertexShader, fragmentShader)
      if (simplifiedMaterial) {
        this.reportRecovery({
          type: 'shader_compilation',
          severity: 'high',
          message: `Shader recovered with simplified version: ${shaderName}`,
          recoveryStrategy: 'simplified_shader'
        })
        return simplifiedMaterial
      }
      
      // Strategy 2: Use fallback shader
      const fallbackMaterial = this.createFallbackShader(shaderName)
      if (fallbackMaterial) {
        this.reportRecovery({
          type: 'shader_compilation',
          severity: 'high',
          message: `Shader recovered with fallback: ${shaderName}`,
          recoveryStrategy: 'fallback_shader'
        })
        return fallbackMaterial
      }
      
    } catch (recoveryError) {
      console.error(`Shader recovery failed for ${shaderName}:`, recoveryError)
    }
    
    return null
  }

  /**
   * Create a simplified version of a shader by removing complex operations
   */
  private createSimplifiedShader(
    shaderName: string,
    vertexShader: string,
    fragmentShader: string
  ): THREE.ShaderMaterial | null {
    try {
      // Remove complex operations that might cause compilation issues
      let simplifiedFragment = fragmentShader
        .replace(/sin\s*\(/g, '0.5 * (') // Replace sin with constant
        .replace(/cos\s*\(/g, '0.5 * (') // Replace cos with constant
        .replace(/pow\s*\([^,]+,\s*[^)]+\)/g, '1.0') // Replace pow with constant
        .replace(/exp\s*\(/g, '1.0 + (') // Replace exp with linear approximation
        .replace(/log\s*\(/g, '0.0 + (') // Replace log with linear approximation
        .replace(/for\s*\([^}]+\}/g, '') // Remove for loops
        .replace(/while\s*\([^}]+\}/g, '') // Remove while loops
      
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: simplifiedFragment,
        uniforms: {}
      })
      
      // Test compilation
      const testGeometry = new THREE.PlaneGeometry(1, 1)
      const testMesh = new THREE.Mesh(testGeometry, material)
      const testScene = new THREE.Scene()
      const testCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      testScene.add(testMesh)
      
      // Try to render to test compilation
      const testTarget = new THREE.WebGLRenderTarget(1, 1)
      this.renderer.setRenderTarget(testTarget)
      this.renderer.render(testScene, testCamera)
      this.renderer.setRenderTarget(null)
      
      // Cleanup test objects
      testGeometry.dispose()
      testTarget.dispose()
      
      return material
      
    } catch (error) {
      console.warn(`Simplified shader creation failed for ${shaderName}:`, error)
      return null
    }
  }

  /**
   * Create a fallback shader that simply passes through the input
   */
  private createFallbackShader(shaderName: string): THREE.ShaderMaterial | null {
    try {
      const material = new THREE.ShaderMaterial({
        vertexShader: this.fallbackVertexShader,
        fragmentShader: this.fallbackFragmentShader,
        uniforms: {
          tDiffuse: { value: null }
        }
      })
      
      console.log(`Created fallback shader for ${shaderName}`)
      return material
      
    } catch (error) {
      console.error(`Fallback shader creation failed for ${shaderName}:`, error)
      return null
    }
  }

  /**
   * Handle render target creation errors
   */
  public handleRenderTargetError(
    width: number,
    height: number,
    options: THREE.RenderTargetOptions,
    error: any
  ): THREE.WebGLRenderTarget | null {
    this.reportError({
      type: 'render_target',
      severity: 'medium',
      message: 'Render target creation failed',
      details: { width, height, options, error: error.toString() }
    })
    
    const recoveryKey = `render_target_${width}x${height}`
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0
    
    if (attempts >= this.config.maxRecoveryAttempts) {
      console.error(`Max render target recovery attempts reached for ${width}x${height}`)
      return null
    }
    
    this.recoveryAttempts.set(recoveryKey, attempts + 1)
    
    try {
      // Strategy 1: Try with reduced size
      const reducedWidth = Math.max(256, Math.floor(width / 2))
      const reducedHeight = Math.max(256, Math.floor(height / 2))
      
      const reducedTarget = new THREE.WebGLRenderTarget(reducedWidth, reducedHeight, {
        ...options,
        type: THREE.UnsignedByteType, // Use safer type
        format: THREE.RGBAFormat // Use standard format
      })
      
      this.reportRecovery({
        type: 'render_target',
        severity: 'medium',
        message: `Render target recovered with reduced size: ${reducedWidth}x${reducedHeight}`,
        recoveryStrategy: 'reduced_size'
      })
      
      return reducedTarget
      
    } catch (recoveryError) {
      console.error('Render target recovery failed:', recoveryError)
      
      try {
        // Strategy 2: Minimal render target
        const minimalTarget = new THREE.WebGLRenderTarget(256, 256, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          generateMipmaps: false
        })
        
        this.reportRecovery({
          type: 'render_target',
          severity: 'medium',
          message: 'Render target recovered with minimal settings',
          recoveryStrategy: 'minimal_settings'
        })
        
        return minimalTarget
        
      } catch (minimalError) {
        console.error('Minimal render target creation failed:', minimalError)
        return null
      }
    }
  }

  /**
   * Handle memory-related errors
   */
  public handleMemoryError(operation: string, error: any): boolean {
    this.reportError({
      type: 'memory',
      severity: 'high',
      message: `Memory error during ${operation}`,
      details: { operation, error: error.toString() }
    })
    
    if (!this.config.enableGracefulDegradation) {
      return false
    }
    
    try {
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc()
      }
      
      // Clear Three.js caches
      THREE.Cache.clear()
      
      // Suggest memory cleanup
      console.warn('Memory error detected - consider reducing texture sizes or effect complexity')
      
      this.reportRecovery({
        type: 'memory',
        severity: 'high',
        message: 'Memory cleanup attempted',
        recoveryStrategy: 'cache_clear_and_gc'
      })
      
      return true
      
    } catch (cleanupError) {
      console.error('Memory cleanup failed:', cleanupError)
      return false
    }
  }

  /**
   * Report an error
   */
  private reportError(errorInfo: Omit<ErrorReport, 'timestamp' | 'recovered'>): void {
    const error: ErrorReport = {
      ...errorInfo,
      timestamp: Date.now(),
      recovered: false
    }
    
    this.errorHistory.push(error)
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift()
    }
    
    console.error(`Visual Effects Error [${error.severity}]:`, error.message, error.details)
    
    if (this.onError) {
      this.onError(error)
    }
  }

  /**
   * Report a successful recovery
   */
  private reportRecovery(errorInfo: Omit<ErrorReport, 'timestamp' | 'recovered'>): void {
    const recovery: ErrorReport = {
      ...errorInfo,
      timestamp: Date.now(),
      recovered: true
    }
    
    this.errorHistory.push(recovery)
    
    console.log(`Visual Effects Recovery [${recovery.severity}]:`, recovery.message)
    
    if (this.onRecovery) {
      this.onRecovery(recovery)
    }
  }

  /**
   * Add context lost callback
   */
  public onContextLost(callback: () => void): void {
    this.contextLostCallbacks.push(callback)
  }

  /**
   * Add context restored callback
   */
  public onContextRestored(callback: () => void): void {
    this.contextRestoredCallbacks.push(callback)
  }

  /**
   * Check if WebGL context is currently lost
   */
  public isWebGLContextLost(): boolean {
    return this.isContextLost || this.gl.isContextLost()
  }

  /**
   * Get error history
   */
  public getErrorHistory(): ErrorReport[] {
    return [...this.errorHistory]
  }

  /**
   * Get recent errors (last 10)
   */
  public getRecentErrors(): ErrorReport[] {
    return this.errorHistory.slice(-10)
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number
    errorsByType: Record<string, number>
    errorsBySeverity: Record<string, number>
    recoveryRate: number
  } {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      recoveryRate: 0
    }
    
    let recoveredCount = 0
    
    for (const error of this.errorHistory) {
      // Count by type
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1
      
      // Count by severity
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1
      
      // Count recoveries
      if (error.recovered) {
        recoveredCount++
      }
    }
    
    stats.recoveryRate = stats.totalErrors > 0 ? recoveredCount / stats.totalErrors : 0
    
    return stats
  }

  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorHistory = []
    this.recoveryAttempts.clear()
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  } {
    const recentErrors = this.getRecentErrors()
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical' && !e.recovered)
    const highErrors = recentErrors.filter(e => e.severity === 'high' && !e.recovered)
    
    const issues: string[] = []
    const recommendations: string[] = []
    
    if (this.isWebGLContextLost()) {
      issues.push('WebGL context is lost')
      recommendations.push('Refresh the page or restart the application')
    }
    
    if (criticalErrors.length > 0) {
      issues.push(`${criticalErrors.length} critical errors in recent history`)
      recommendations.push('Check browser console for detailed error information')
    }
    
    if (highErrors.length > 2) {
      issues.push(`${highErrors.length} high-severity errors detected`)
      recommendations.push('Consider reducing visual effect complexity')
    }
    
    const status = criticalErrors.length > 0 ? 'critical' : 
                  (highErrors.length > 2 || issues.length > 0) ? 'warning' : 'healthy'
    
    return { status, issues, recommendations }
  }

  /**
   * Dispose of the error handler
   */
  public dispose(): void {
    this.errorHistory = []
    this.recoveryAttempts.clear()
    this.contextLostCallbacks = []
    this.contextRestoredCallbacks = []
    this.onError = undefined
    this.onRecovery = undefined
  }
}