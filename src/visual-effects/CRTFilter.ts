import * as THREE from 'three'
import { clampAndUpdate } from '../utils'
import { BaseVisualEffect } from './BaseVisualEffect'

export interface CRTConfig {
  scanlines: {
    enabled: boolean      // Enable scanline effect
    intensity: number     // Scanline darkness (0.0 - 1.0)
    spacing: number       // Lines per pixel (1.0 - 4.0)
    thickness: number     // Line thickness (0.1 - 1.0)
  }
  curvature: {
    enabled: boolean      // Enable screen curvature
    amount: number        // Curvature intensity (0.0 - 0.1)
    corners: number       // Corner darkening (0.0 - 1.0)
  }
  phosphor: {
    enabled: boolean      // Enable phosphor glow
    intensity: number     // Glow strength (0.0 - 1.0)
    persistence: number   // Glow decay time (0.1 - 2.0)
  }
  noise: {
    enabled: boolean      // Enable CRT noise
    intensity: number     // Static strength (0.0 - 0.1)
    speed: number         // Noise animation speed (0.1 - 2.0)
  }
  flicker: {
    enabled: boolean      // Enable brightness flicker
    intensity: number     // Flicker amount (0.0 - 0.1)
    frequency: number     // Flicker rate (0.1 - 5.0)
  }
  enabled: boolean        // Enable/disable the entire effect
}

export class CRTFilter extends BaseVisualEffect {
  protected material: THREE.ShaderMaterial
  protected config: CRTConfig
  protected renderTarget: THREE.WebGLRenderTarget | null = null
  protected scene: THREE.Scene
  protected camera: THREE.OrthographicCamera
  protected quad: THREE.Mesh
  private time: number = 0

  constructor(config: CRTConfig) {
    super()
    this.config = { ...config }
    
    // Create orthographic camera for fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    // Create scene for the filter
    this.scene = new THREE.Scene()
    
    // Create shader material with CRT effects
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1920, 1080) },
        uTime: { value: 0.0 },
        
        // Scanline uniforms
        uScanlinesEnabled: { value: this.config.scanlines.enabled },
        uScanlineIntensity: { value: this.config.scanlines.intensity },
        uScanlineSpacing: { value: this.config.scanlines.spacing },
        uScanlineThickness: { value: this.config.scanlines.thickness },
        
        // Curvature uniforms
        uCurvatureEnabled: { value: this.config.curvature.enabled },
        uCurvatureAmount: { value: this.config.curvature.amount },
        uCornerDarkening: { value: this.config.curvature.corners },
        
        // Phosphor uniforms
        uPhosphorEnabled: { value: this.config.phosphor.enabled },
        uPhosphorIntensity: { value: this.config.phosphor.intensity },
        uPhosphorPersistence: { value: this.config.phosphor.persistence },
        
        // Noise uniforms
        uNoiseEnabled: { value: this.config.noise.enabled },
        uNoiseIntensity: { value: this.config.noise.intensity },
        uNoiseSpeed: { value: this.config.noise.speed },
        
        // Flicker uniforms
        uFlickerEnabled: { value: this.config.flicker.enabled },
        uFlickerIntensity: { value: this.config.flicker.intensity },
        uFlickerFrequency: { value: this.config.flicker.frequency }
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
   * Get the vertex shader for the CRT filter
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
   * Get the fragment shader that handles all CRT effects
   */
  private getFragmentShader(): string {
    return `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uTime;
      
      // Scanline uniforms
      uniform bool uScanlinesEnabled;
      uniform float uScanlineIntensity;
      uniform float uScanlineSpacing;
      uniform float uScanlineThickness;
      
      // Curvature uniforms
      uniform bool uCurvatureEnabled;
      uniform float uCurvatureAmount;
      uniform float uCornerDarkening;
      
      // Phosphor uniforms
      uniform bool uPhosphorEnabled;
      uniform float uPhosphorIntensity;
      uniform float uPhosphorPersistence;
      
      // Noise uniforms
      uniform bool uNoiseEnabled;
      uniform float uNoiseIntensity;
      uniform float uNoiseSpeed;
      
      // Flicker uniforms
      uniform bool uFlickerEnabled;
      uniform float uFlickerIntensity;
      uniform float uFlickerFrequency;
      
      varying vec2 vUv;
      
      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      vec2 applyCurvature(vec2 uv) {
        if (!uCurvatureEnabled) return uv;
        
        uv = uv * 2.0 - 1.0;
        vec2 offset = abs(uv.yx) / vec2(6.0, 4.0);
        uv = uv + uv * offset * offset * uCurvatureAmount;
        uv = uv * 0.5 + 0.5;
        
        return uv;
      }
      
      float getCornerMask(vec2 uv) {
        if (!uCurvatureEnabled) return 1.0;
        
        vec2 crt = max(vec2(0.0), abs(uv * 2.0 - 1.0) - vec2(1.0));
        float corner = length(crt);
        return smoothstep(0.0, uCornerDarkening, 1.0 - corner);
      }
      
      float getScanlines(vec2 uv) {
        if (!uScanlinesEnabled) return 1.0;
        
        float scanline = sin(uv.y * uResolution.y * uScanlineSpacing) * 0.5 + 0.5;
        scanline = smoothstep(1.0 - uScanlineThickness, 1.0, scanline);
        return mix(1.0 - uScanlineIntensity, 1.0, scanline);
      }
      
      vec3 getPhosphorGlow(vec4 color, vec2 uv) {
        if (!uPhosphorEnabled) return color.rgb;
        
        float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float glow = pow(brightness, uPhosphorPersistence) * uPhosphorIntensity;
        
        return color.rgb + vec3(glow * 0.1, glow * 0.3, glow * 0.1);
      }
      
      float getNoise(vec2 uv) {
        if (!uNoiseEnabled) return 0.0;
        
        float noise = rand(uv + uTime * uNoiseSpeed) - 0.5;
        return noise * uNoiseIntensity;
      }
      
      float getFlicker() {
        if (!uFlickerEnabled) return 1.0;
        
        float flicker = sin(uTime * uFlickerFrequency * 6.28318) * 0.5 + 0.5;
        return 1.0 - (flicker * uFlickerIntensity);
      }
      
      void main() {
        vec2 uv = applyCurvature(vUv);
        
        // Sample texture with bounds checking
        vec4 color = vec4(0.0);
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
          color = texture2D(tDiffuse, uv);
        }
        
        // Apply CRT effects
        float cornerMask = getCornerMask(uv);
        float scanlines = getScanlines(uv);
        vec3 phosphor = getPhosphorGlow(color, uv);
        float noise = getNoise(uv);
        float flicker = getFlicker();
        
        // Combine all effects
        vec3 finalColor = phosphor;
        finalColor *= scanlines;
        finalColor *= cornerMask;
        finalColor += vec3(noise);
        finalColor *= flicker;
        
        gl_FragColor = vec4(finalColor, color.a);
      }
    `
  }

  /**
   * Apply the CRT filter to a texture
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

    // Update resolution uniform
    const size = renderer.getSize(new THREE.Vector2())
    this.material.uniforms.uResolution.value.set(size.x, size.y)

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
      console.error('Failed to apply CRT filter:', error)
      
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
   * Update time for animated effects (noise and flicker)
   */
  public updateTime(deltaTime: number): void {
    this.time += deltaTime
    this.material.uniforms.uTime.value = this.time
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
  }  /**

   * Get the current scanlines configuration
   */
  public get scanlines(): CRTConfig['scanlines'] {
    return { ...this.config.scanlines }
  }

  /**
   * Set scanlines configuration with validation
   */
  public set scanlines(value: Partial<CRTConfig['scanlines']>) {
    const oldConfig = { ...this.config.scanlines }
    
    try {
      // Apply new configuration with validation
      if (value.enabled !== undefined) {
        this.config.scanlines.enabled = value.enabled
        this.material.uniforms.uScanlinesEnabled.value = value.enabled
      }
      
      if (value.intensity !== undefined) {
        clampAndUpdate(
          value.intensity,
          0.0,
          1.0,
          this.config.scanlines,
          'intensity',
          this.material.uniforms.uScanlineIntensity,
          'Scanline intensity'
        )
      }
      
      if (value.spacing !== undefined) {
        clampAndUpdate(
          value.spacing,
          1.0,
          4.0,
          this.config.scanlines,
          'spacing',
          this.material.uniforms.uScanlineSpacing,
          'Scanline spacing'
        )
      }
      
      if (value.thickness !== undefined) {
        clampAndUpdate(
          value.thickness,
          0.1,
          1.0,
          this.config.scanlines,
          'thickness',
          this.material.uniforms.uScanlineThickness,
          'Scanline thickness'
        )
      }
      
    } catch (error) {
      console.error('Failed to update scanlines config:', error)
      // Revert to old configuration
      this.config.scanlines = oldConfig
      this.applyScanlineConfigToUniforms()
      throw error
    }
  }

  /**
   * Get the current curvature configuration
   */
  public get curvature(): CRTConfig['curvature'] {
    return { ...this.config.curvature }
  }

  /**
   * Set curvature configuration with validation
   */
  public set curvature(value: Partial<CRTConfig['curvature']>) {
    const oldConfig = { ...this.config.curvature }
    
    try {
      if (value.enabled !== undefined) {
        this.config.curvature.enabled = value.enabled
        this.material.uniforms.uCurvatureEnabled.value = value.enabled
      }
      
      if (value.amount !== undefined) {
        clampAndUpdate(
          value.amount,
          0.0,
          0.1,
          this.config.curvature,
          'amount',
          this.material.uniforms.uCurvatureAmount,
          'Curvature amount'
        )
      }
      
      if (value.corners !== undefined) {
        clampAndUpdate(
          value.corners,
          0.0,
          1.0,
          this.config.curvature,
          'corners',
          this.material.uniforms.uCornerDarkening,
          'Corner darkening'
        )
      }
      
    } catch (error) {
      console.error('Failed to update curvature config:', error)
      this.config.curvature = oldConfig
      this.applyCurvatureConfigToUniforms()
      throw error
    }
  }

  /**
   * Get the current phosphor configuration
   */
  public get phosphor(): CRTConfig['phosphor'] {
    return { ...this.config.phosphor }
  }

  /**
   * Set phosphor configuration with validation
   */
  public set phosphor(value: Partial<CRTConfig['phosphor']>) {
    const oldConfig = { ...this.config.phosphor }
    
    try {
      if (value.enabled !== undefined) {
        this.config.phosphor.enabled = value.enabled
        this.material.uniforms.uPhosphorEnabled.value = value.enabled
      }
      
      if (value.intensity !== undefined) {
        clampAndUpdate(
          value.intensity,
          0.0,
          1.0,
          this.config.phosphor,
          'intensity',
          this.material.uniforms.uPhosphorIntensity,
          'Phosphor intensity'
        )
      }
      
      if (value.persistence !== undefined) {
        clampAndUpdate(
          value.persistence,
          0.1,
          2.0,
          this.config.phosphor,
          'persistence',
          this.material.uniforms.uPhosphorPersistence,
          'Phosphor persistence'
        )
      }
      
    } catch (error) {
      console.error('Failed to update phosphor config:', error)
      this.config.phosphor = oldConfig
      this.applyPhosphorConfigToUniforms()
      throw error
    }
  }

  /**
   * Get the current noise configuration
   */
  public get noise(): CRTConfig['noise'] {
    return { ...this.config.noise }
  }

  /**
   * Set noise configuration with validation
   */
  public set noise(value: Partial<CRTConfig['noise']>) {
    const oldConfig = { ...this.config.noise }
    
    try {
      if (value.enabled !== undefined) {
        this.config.noise.enabled = value.enabled
        this.material.uniforms.uNoiseEnabled.value = value.enabled
      }
      
      if (value.intensity !== undefined) {
        clampAndUpdate(
          value.intensity,
          0.0,
          0.1,
          this.config.noise,
          'intensity',
          this.material.uniforms.uNoiseIntensity,
          'Noise intensity'
        )
      }
      
      if (value.speed !== undefined) {
        clampAndUpdate(
          value.speed,
          0.1,
          2.0,
          this.config.noise,
          'speed',
          this.material.uniforms.uNoiseSpeed,
          'Noise speed'
        )
      }
      
    } catch (error) {
      console.error('Failed to update noise config:', error)
      this.config.noise = oldConfig
      this.applyNoiseConfigToUniforms()
      throw error
    }
  }

  /**
   * Get the current flicker configuration
   */
  public get flicker(): CRTConfig['flicker'] {
    return { ...this.config.flicker }
  }

  /**
   * Set flicker configuration with validation
   */
  public set flicker(value: Partial<CRTConfig['flicker']>) {
    const oldConfig = { ...this.config.flicker }
    
    try {
      if (value.enabled !== undefined) {
        this.config.flicker.enabled = value.enabled
        this.material.uniforms.uFlickerEnabled.value = value.enabled
      }
      
      if (value.intensity !== undefined) {
        clampAndUpdate(
          value.intensity,
          0.0,
          0.1,
          this.config.flicker,
          'intensity',
          this.material.uniforms.uFlickerIntensity,
          'Flicker intensity'
        )
      }
      
      if (value.frequency !== undefined) {
        clampAndUpdate(
          value.frequency,
          0.1,
          5.0,
          this.config.flicker,
          'frequency',
          this.material.uniforms.uFlickerFrequency,
          'Flicker frequency'
        )
      }
      
    } catch (error) {
      console.error('Failed to update flicker config:', error)
      this.config.flicker = oldConfig
      this.applyFlickerConfigToUniforms()
      throw error
    }
  }

  /**
   * Get the enabled state
   */
  public get enabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable or disable the CRT effect
   */
  public set enabled(value: boolean) {
    this.config.enabled = value
  }

  /**
   * Toggle a specific CRT component
   */
  public toggleComponent(component: keyof CRTConfig, enabled: boolean): void {
    if (component === 'enabled') {
      this.enabled = enabled
      return
    }
    
    switch (component) {
      case 'scanlines':
        this.scanlines = { enabled }
        break
      case 'curvature':
        this.curvature = { enabled }
        break
      case 'phosphor':
        this.phosphor = { enabled }
        break
      case 'noise':
        this.noise = { enabled }
        break
      case 'flicker':
        this.flicker = { enabled }
        break
      default:
        console.warn(`Unknown CRT component: ${component}`)
    }
  }

  /**
   * Update all configuration parameters at once
   */
  public updateConfig(newConfig: Partial<CRTConfig>): void {
    const oldConfig = { ...this.config }
    
    try {
      // Apply new configuration with validation
      if (newConfig.scanlines !== undefined) {
        this.scanlines = newConfig.scanlines
      }
      
      if (newConfig.curvature !== undefined) {
        this.curvature = newConfig.curvature
      }
      
      if (newConfig.phosphor !== undefined) {
        this.phosphor = newConfig.phosphor
      }
      
      if (newConfig.noise !== undefined) {
        this.noise = newConfig.noise
      }
      
      if (newConfig.flicker !== undefined) {
        this.flicker = newConfig.flicker
      }
      
      if (newConfig.enabled !== undefined) {
        this.enabled = newConfig.enabled
      }
      
    } catch (error) {
      console.error('Failed to update CRT config:', error)
      // Revert to old configuration
      this.config = oldConfig
      this.applyConfigToUniforms()
      throw error
    }
  }

  /**
   * Apply scanline configuration to shader uniforms
   */
  private applyScanlineConfigToUniforms(): void {
    this.material.uniforms.uScanlinesEnabled.value = this.config.scanlines.enabled
    this.material.uniforms.uScanlineIntensity.value = this.config.scanlines.intensity
    this.material.uniforms.uScanlineSpacing.value = this.config.scanlines.spacing
    this.material.uniforms.uScanlineThickness.value = this.config.scanlines.thickness
  }

  /**
   * Apply curvature configuration to shader uniforms
   */
  private applyCurvatureConfigToUniforms(): void {
    this.material.uniforms.uCurvatureEnabled.value = this.config.curvature.enabled
    this.material.uniforms.uCurvatureAmount.value = this.config.curvature.amount
    this.material.uniforms.uCornerDarkening.value = this.config.curvature.corners
  }

  /**
   * Apply phosphor configuration to shader uniforms
   */
  private applyPhosphorConfigToUniforms(): void {
    this.material.uniforms.uPhosphorEnabled.value = this.config.phosphor.enabled
    this.material.uniforms.uPhosphorIntensity.value = this.config.phosphor.intensity
    this.material.uniforms.uPhosphorPersistence.value = this.config.phosphor.persistence
  }

  /**
   * Apply noise configuration to shader uniforms
   */
  private applyNoiseConfigToUniforms(): void {
    this.material.uniforms.uNoiseEnabled.value = this.config.noise.enabled
    this.material.uniforms.uNoiseIntensity.value = this.config.noise.intensity
    this.material.uniforms.uNoiseSpeed.value = this.config.noise.speed
  }

  /**
   * Apply flicker configuration to shader uniforms
   */
  private applyFlickerConfigToUniforms(): void {
    this.material.uniforms.uFlickerEnabled.value = this.config.flicker.enabled
    this.material.uniforms.uFlickerIntensity.value = this.config.flicker.intensity
    this.material.uniforms.uFlickerFrequency.value = this.config.flicker.frequency
  }

  /**
   * Apply current configuration to shader uniforms
   */
  private applyConfigToUniforms(): void {
    this.applyScanlineConfigToUniforms()
    this.applyCurvatureConfigToUniforms()
    this.applyPhosphorConfigToUniforms()
    this.applyNoiseConfigToUniforms()
    this.applyFlickerConfigToUniforms()
  }

  /**
   * Get current configuration
   */
  public getConfig(): CRTConfig {
    return JSON.parse(JSON.stringify(this.config)) // Deep copy
  }

  /**
   * Log successful disposal
   */
  protected logDisposalSuccess(): void {
    console.log('CRTFilter disposed successfully')
  }
}