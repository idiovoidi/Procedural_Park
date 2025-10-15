/**
 * Performance optimization utilities for visual effects
 * Handles shader profiling, memory management, and device capability detection
 */

import * as THREE from 'three'

export interface DeviceCapabilities {
  maxTextureSize: number
  maxRenderBufferSize: number
  maxVertexTextureImageUnits: number
  maxFragmentTextureImageUnits: number
  maxVaryingVectors: number
  supportsFloatTextures: boolean
  supportsHalfFloatTextures: boolean
  supportsDepthTextures: boolean
  webglVersion: number
  renderer: string
  vendor: string
  isLowEndDevice: boolean
  isMobileDevice: boolean
}

export interface ShaderProfile {
  name: string
  compilationTime: number
  executionTime: number
  memoryUsage: number
  complexity: 'low' | 'medium' | 'high'
  supported: boolean
}

export interface MemoryUsage {
  textures: number
  geometries: number
  materials: number
  total: number
  jsHeapUsed?: number
  jsHeapTotal?: number
}

export class PerformanceOptimizer {
  private renderer: THREE.WebGLRenderer
  private gl: WebGLRenderingContext | WebGL2RenderingContext
  private deviceCapabilities: DeviceCapabilities
  private shaderProfiles: Map<string, ShaderProfile> = new Map()
  private memoryTracker: Map<string, number> = new Map()
  
  // Performance thresholds
  private readonly MOBILE_MAX_TEXTURE_SIZE = 2048
  private readonly LOW_END_MAX_TEXTURE_SIZE = 1024
  private readonly HIGH_COMPLEXITY_THRESHOLD = 50 // ms
  private readonly MEMORY_WARNING_THRESHOLD = 100 * 1024 * 1024 // 100MB

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.gl = renderer.getContext()
    this.deviceCapabilities = this.detectDeviceCapabilities()
    
    console.log('Performance Optimizer initialized:', {
      webglVersion: this.deviceCapabilities.webglVersion,
      maxTextureSize: this.deviceCapabilities.maxTextureSize,
      isLowEndDevice: this.deviceCapabilities.isLowEndDevice,
      isMobileDevice: this.deviceCapabilities.isMobileDevice
    })
  }

  /**
   * Detect device capabilities for optimization decisions
   */
  private detectDeviceCapabilities(): DeviceCapabilities {
    const gl = this.gl
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    
    // Detect WebGL version
    const webglVersion = gl instanceof WebGL2RenderingContext ? 2 : 1
    
    // Get renderer and vendor info
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown'
    
    // Detect mobile devices
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Detect low-end devices based on various factors
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
    
    const isLowEndDevice = 
      isMobileDevice ||
      maxTextureSize <= this.LOW_END_MAX_TEXTURE_SIZE ||
      renderer.toLowerCase().includes('intel') ||
      renderer.toLowerCase().includes('software') ||
      navigator.hardwareConcurrency <= 2

    return {
      maxTextureSize,
      maxRenderBufferSize,
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxFragmentTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      supportsFloatTextures: !!gl.getExtension('OES_texture_float'),
      supportsHalfFloatTextures: !!gl.getExtension('OES_texture_half_float'),
      supportsDepthTextures: !!gl.getExtension('WEBGL_depth_texture'),
      webglVersion,
      renderer: renderer.toString(),
      vendor: vendor.toString(),
      isLowEndDevice,
      isMobileDevice
    }
  }

  /**
   * Profile shader compilation and execution time
   */
  public profileShader(
    name: string,
    vertexShader: string,
    fragmentShader: string,
    uniforms: { [key: string]: any } = {}
  ): ShaderProfile {
    const startTime = performance.now()
    
    try {
      // Create test material
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms
      })
      
      // Create test geometry and mesh
      const geometry = new THREE.PlaneGeometry(2, 2)
      const mesh = new THREE.Mesh(geometry, material)
      
      // Create test scene and camera
      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      scene.add(mesh)
      
      // Create small render target for testing
      const renderTarget = new THREE.WebGLRenderTarget(256, 256)
      
      const compilationTime = performance.now() - startTime
      
      // Test execution time
      const executionStartTime = performance.now()
      
      // Render multiple times to get average execution time
      const iterations = 10
      for (let i = 0; i < iterations; i++) {
        this.renderer.setRenderTarget(renderTarget)
        this.renderer.render(scene, camera)
      }
      
      const executionTime = (performance.now() - executionStartTime) / iterations
      
      // Estimate memory usage
      const memoryUsage = this.estimateShaderMemoryUsage(material)
      
      // Determine complexity
      const complexity = this.determineShaderComplexity(fragmentShader, executionTime)
      
      // Clean up
      this.renderer.setRenderTarget(null)
      material.dispose()
      geometry.dispose()
      renderTarget.dispose()
      
      const profile: ShaderProfile = {
        name,
        compilationTime,
        executionTime,
        memoryUsage,
        complexity,
        supported: true
      }
      
      this.shaderProfiles.set(name, profile)
      
      console.log(`Shader profile for ${name}:`, {
        compilationTime: compilationTime.toFixed(2) + 'ms',
        executionTime: executionTime.toFixed(2) + 'ms',
        complexity,
        memoryUsage: (memoryUsage / 1024).toFixed(1) + 'KB'
      })
      
      return profile
      
    } catch (error) {
      console.error(`Failed to profile shader ${name}:`, error)
      
      const profile: ShaderProfile = {
        name,
        compilationTime: 0,
        executionTime: 0,
        memoryUsage: 0,
        complexity: 'high',
        supported: false
      }
      
      this.shaderProfiles.set(name, profile)
      return profile
    }
  }

  /**
   * Estimate shader memory usage
   */
  private estimateShaderMemoryUsage(material: THREE.ShaderMaterial): number {
    // Base memory for shader program
    let memoryUsage = 1024 // Base shader program overhead
    
    // Add memory for uniforms
    const uniforms = material.uniforms
    for (const key in uniforms) {
      const uniform = uniforms[key]
      if (uniform.value instanceof THREE.Texture) {
        // Texture memory (rough estimate)
        const texture = uniform.value
        memoryUsage += texture.image ? texture.image.width * texture.image.height * 4 : 1024
      } else if (uniform.value instanceof THREE.Vector2) {
        memoryUsage += 8
      } else if (uniform.value instanceof THREE.Vector3) {
        memoryUsage += 12
      } else if (uniform.value instanceof THREE.Vector4) {
        memoryUsage += 16
      } else if (typeof uniform.value === 'number') {
        memoryUsage += 4
      }
    }
    
    return memoryUsage
  }

  /**
   * Determine shader complexity based on source code and execution time
   */
  private determineShaderComplexity(fragmentShader: string, executionTime: number): 'low' | 'medium' | 'high' {
    // Count expensive operations
    const expensiveOps = [
      'sin', 'cos', 'tan', 'pow', 'exp', 'log', 'sqrt',
      'texture2D', 'texture', 'for', 'while', 'if'
    ]
    
    let complexityScore = 0
    
    for (const op of expensiveOps) {
      const matches = fragmentShader.match(new RegExp(op, 'g'))
      if (matches) {
        complexityScore += matches.length
      }
    }
    
    // Factor in execution time
    if (executionTime > this.HIGH_COMPLEXITY_THRESHOLD) {
      complexityScore += 10
    }
    
    if (complexityScore < 5) {
      return 'low'
    } else if (complexityScore < 15) {
      return 'medium'
    } else {
      return 'high'
    }
  }

  /**
   * Get optimized texture size based on device capabilities
   */
  public getOptimizedTextureSize(requestedWidth: number, requestedHeight: number): { width: number; height: number } {
    const maxSize = this.deviceCapabilities.maxTextureSize
    
    // Apply device-specific limits
    let maxAllowedSize = maxSize
    
    if (this.deviceCapabilities.isLowEndDevice) {
      maxAllowedSize = Math.min(maxAllowedSize, this.LOW_END_MAX_TEXTURE_SIZE)
    } else if (this.deviceCapabilities.isMobileDevice) {
      maxAllowedSize = Math.min(maxAllowedSize, this.MOBILE_MAX_TEXTURE_SIZE)
    }
    
    // Ensure power of 2 for better performance
    const width = Math.min(this.nearestPowerOfTwo(requestedWidth), maxAllowedSize)
    const height = Math.min(this.nearestPowerOfTwo(requestedHeight), maxAllowedSize)
    
    return { width, height }
  }

  /**
   * Find nearest power of 2
   */
  private nearestPowerOfTwo(value: number): number {
    return Math.pow(2, Math.round(Math.log(value) / Math.log(2)))
  }

  /**
   * Check if effect should be enabled based on device capabilities
   */
  public shouldEnableEffect(effectName: string, complexity: 'low' | 'medium' | 'high'): boolean {
    const profile = this.shaderProfiles.get(effectName)
    
    // If shader is not supported, disable effect
    if (profile && !profile.supported) {
      return false
    }
    
    // Disable high complexity effects on low-end devices
    if (this.deviceCapabilities.isLowEndDevice && complexity === 'high') {
      return false
    }
    
    // Disable medium complexity effects on very low-end devices
    if (this.deviceCapabilities.isLowEndDevice && 
        this.deviceCapabilities.maxTextureSize <= 512 && 
        complexity === 'medium') {
      return false
    }
    
    return true
  }

  /**
   * Get current memory usage
   */
  public getMemoryUsage(): MemoryUsage {
    const info = this.renderer.info
    
    const memoryUsage: MemoryUsage = {
      textures: info.memory.textures * 1024, // Rough estimate
      geometries: info.memory.geometries * 512, // Rough estimate
      materials: info.programs?.length || 0 * 256, // Rough estimate
      total: 0
    }
    
    memoryUsage.total = memoryUsage.textures + memoryUsage.geometries + memoryUsage.materials
    
    // Add JS heap usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      memoryUsage.jsHeapUsed = memInfo.usedJSHeapSize
      memoryUsage.jsHeapTotal = memInfo.totalJSHeapSize
    }
    
    return memoryUsage
  }

  /**
   * Optimize render target format based on device capabilities
   */
  public getOptimizedRenderTargetOptions(
    width: number,
    height: number,
    needsAlpha: boolean = true,
    needsDepth: boolean = false
  ): THREE.RenderTargetOptions {
    const options: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false
    }
    
    // Choose format based on device capabilities and needs
    if (needsAlpha) {
      options.format = THREE.RGBAFormat
    } else {
      options.format = THREE.RGBFormat
    }
    
    // Choose type based on device capabilities
    if (this.deviceCapabilities.supportsHalfFloatTextures && !this.deviceCapabilities.isLowEndDevice) {
      options.type = THREE.HalfFloatType
    } else {
      options.type = THREE.UnsignedByteType
    }
    
    // Add depth buffer if needed and supported
    if (needsDepth && this.deviceCapabilities.supportsDepthTextures) {
      options.depthBuffer = true
      options.stencilBuffer = false
    }
    
    return options
  }

  /**
   * Create optimized render target
   */
  public createOptimizedRenderTarget(
    width: number,
    height: number,
    needsAlpha: boolean = true,
    needsDepth: boolean = false
  ): THREE.WebGLRenderTarget {
    const optimizedSize = this.getOptimizedTextureSize(width, height)
    const options = this.getOptimizedRenderTargetOptions(
      optimizedSize.width,
      optimizedSize.height,
      needsAlpha,
      needsDepth
    )
    
    return new THREE.WebGLRenderTarget(optimizedSize.width, optimizedSize.height, options)
  }

  /**
   * Check if memory usage is too high
   */
  public isMemoryUsageHigh(): boolean {
    const usage = this.getMemoryUsage()
    return usage.total > this.MEMORY_WARNING_THRESHOLD
  }

  /**
   * Get device capabilities
   */
  public getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities }
  }

  /**
   * Get shader profile
   */
  public getShaderProfile(name: string): ShaderProfile | undefined {
    return this.shaderProfiles.get(name)
  }

  /**
   * Get all shader profiles
   */
  public getAllShaderProfiles(): Map<string, ShaderProfile> {
    return new Map(this.shaderProfiles)
  }

  /**
   * Clear shader profiles
   */
  public clearShaderProfiles(): void {
    this.shaderProfiles.clear()
  }

  /**
   * Get performance recommendations
   */
  public getPerformanceRecommendations(): string[] {
    const recommendations: string[] = []
    const capabilities = this.deviceCapabilities
    
    if (capabilities.isLowEndDevice) {
      recommendations.push('Consider reducing texture resolution for better performance')
      recommendations.push('Disable high-complexity effects like CRT phosphor glow')
      recommendations.push('Use lower film grain intensity')
    }
    
    if (capabilities.isMobileDevice) {
      recommendations.push('Enable low-resolution rendering for better battery life')
      recommendations.push('Consider disabling chromatic aberration on mobile')
    }
    
    if (capabilities.maxTextureSize <= 1024) {
      recommendations.push('Use very low resolution settings (320x180 or lower)')
      recommendations.push('Disable all optional effects')
    }
    
    if (this.isMemoryUsageHigh()) {
      recommendations.push('Memory usage is high - consider reducing effect complexity')
      recommendations.push('Dispose unused render targets and textures')
    }
    
    return recommendations
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.shaderProfiles.clear()
    this.memoryTracker.clear()
  }
}