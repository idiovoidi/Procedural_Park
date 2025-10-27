/**
 * ShaderService
 * Decouples shader management from scene rendering
 * Provides a clean interface for shader operations
 */

import type { ShaderManager, ShaderConfig } from '@rendering/shaders'
import { INSCRYPTION_SHADER_DEFAULTS } from '@rendering/shaders'

export class ShaderService {
  private config: ShaderConfig
  private shaderManager: ShaderManager | null = null
  private onConfigChangeCallback: ((config: ShaderConfig) => void) | null = null

  constructor(initialConfig?: Partial<ShaderConfig>) {
    this.config = {
      ...INSCRYPTION_SHADER_DEFAULTS,
      ...initialConfig,
    }
  }

  /**
   * Set callback for config changes (for UI updates)
   */
  public onConfigChange(callback: (config: ShaderConfig) => void): void {
    this.onConfigChangeCallback = callback
  }

  /**
   * Set the shader manager instance (called by SceneManager)
   */
  public setShaderManager(manager: ShaderManager): void {
    this.shaderManager = manager
    // Apply current config to the manager
    if (this.shaderManager) {
      this.shaderManager.updateConfig(this.config)
    }
  }

  /**
   * Get current shader configuration
   */
  public getConfig(): Readonly<ShaderConfig> {
    return { ...this.config }
  }

  /**
   * Update shader configuration
   */
  public updateConfig(updates: Partial<ShaderConfig>): void {
    this.config = { ...this.config, ...updates }
    
    if (this.shaderManager) {
      this.shaderManager.updateConfig(this.config)
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
  }

  /**
   * Toggle shader on/off
   */
  public toggle(): boolean {
    this.config.enabled = !this.config.enabled
    
    if (this.shaderManager) {
      this.shaderManager.setEnabled(this.config.enabled)
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
    
    return this.config.enabled
  }

  /**
   * Enable shaders
   */
  public enable(): void {
    this.config.enabled = true
    
    if (this.shaderManager) {
      this.shaderManager.setEnabled(true)
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
  }

  /**
   * Disable shaders
   */
  public disable(): void {
    this.config.enabled = false
    
    if (this.shaderManager) {
      this.shaderManager.setEnabled(false)
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
  }

  /**
   * Check if shaders are enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Load a preset configuration
   */
  public loadPreset(preset: ShaderConfig): void {
    this.config = { ...preset }
    
    if (this.shaderManager) {
      this.shaderManager.updateConfig(this.config)
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
  }

  /**
   * Reset to default configuration
   */
  public resetToDefaults(): void {
    this.config = { ...INSCRYPTION_SHADER_DEFAULTS }
    
    if (this.shaderManager) {
      this.shaderManager.updateConfig(this.config)
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return this.shaderManager?.getPerformanceMetrics() || null
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): string {
    return this.shaderManager?.getPerformanceReport() || 'No shader manager available'
  }

  /**
   * Check if there are shader errors
   */
  public hasErrors(): boolean {
    return this.shaderManager?.hasErrors() || false
  }

  /**
   * Get current quality level
   */
  public getQualityLevel(): string {
    return this.shaderManager?.getCurrentQualityLevel() || 'unknown'
  }

  /**
   * Enable/disable auto performance adjustment
   */
  public setAutoPerformanceAdjustment(enabled: boolean): void {
    if (this.shaderManager) {
      this.shaderManager.setAutoPerformanceAdjustment(enabled)
    }
  }

  /**
   * Check if auto performance adjustment is enabled
   */
  public isAutoPerformanceAdjustmentEnabled(): boolean {
    return this.shaderManager?.isAutoPerformanceAdjustmentEnabled() || false
  }

  /**
   * Adjust luminance threshold
   */
  public adjustThreshold(delta: number): void {
    this.config.luminanceThreshold = Math.max(
      0,
      Math.min(1, this.config.luminanceThreshold + delta)
    )
    
    if (this.shaderManager) {
      this.shaderManager.updateConfig({ luminanceThreshold: this.config.luminanceThreshold })
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
  }

  /**
   * Adjust intensity
   */
  public adjustIntensity(delta: number): void {
    this.config.intensity = Math.max(0, Math.min(2, this.config.intensity + delta))
    
    if (this.shaderManager) {
      this.shaderManager.updateConfig({ intensity: this.config.intensity })
    }

    // Notify UI of config change
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config)
    }
  }

  /**
   * Get debug information
   */
  public getDebugInfo() {
    return {
      enabled: this.config.enabled,
      luminanceThreshold: this.config.luminanceThreshold,
      intensity: this.config.intensity,
      hasManager: this.shaderManager !== null,
      hasErrors: this.hasErrors(),
      qualityLevel: this.getQualityLevel(),
      autoPerformance: this.isAutoPerformanceAdjustmentEnabled(),
    }
  }
}
