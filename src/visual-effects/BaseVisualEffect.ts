import * as THREE from 'three'

/**
 * Base class for visual effects with common disposal patterns
 */
export abstract class BaseVisualEffect {
  protected material: THREE.ShaderMaterial | null = null
  protected quad: THREE.Mesh | null = null
  protected renderTarget: THREE.WebGLRenderTarget | null = null
  protected scene: THREE.Scene | null = null

  /**
   * Dispose of all resources with common error handling
   */
  public dispose(): void {
    try {
      // Dispose material
      if (this.material) {
        this.material.dispose()
        this.material = null
      }

      // Dispose geometry
      if (this.quad && this.quad.geometry) {
        this.quad.geometry.dispose()
        this.quad = null
      }

      // Dispose render target if we created one
      if (this.renderTarget) {
        this.renderTarget.dispose()
        this.renderTarget = null
      }

      // Clear scene
      if (this.scene) {
        this.scene.clear()
        this.scene = null
      }

      this.logDisposalSuccess()
    } catch (error) {
      this.logDisposalError(error)
    }
  }

  /**
   * Log successful disposal - override in subclasses for specific messages
   */
  protected logDisposalSuccess(): void {
    console.log(`${this.constructor.name} disposed successfully`)
  }

  /**
   * Log disposal error - override in subclasses for specific messages
   */
  protected logDisposalError(error: any): void {
    console.error(`Error during ${this.constructor.name} disposal:`, error)
  }
}
