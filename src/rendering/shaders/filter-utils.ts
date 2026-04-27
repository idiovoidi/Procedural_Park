import * as THREE from 'three'

/**
 * Standard fullscreen quad vertex shader for post-processing filters
 */
export const FULLSCREEN_VERTEX_SHADER = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export function copyTextureToRenderTarget(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  inputTexture: THREE.Texture,
  outputTarget: THREE.WebGLRenderTarget
): void {
  const copyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: inputTexture },
    },
    vertexShader: FULLSCREEN_VERTEX_SHADER,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tDiffuse, vUv);
      }
    `,
  })

  const copyScene = new THREE.Scene()
  const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial)
  copyScene.add(copyQuad)

  const currentTarget = renderer.getRenderTarget()
  renderer.setRenderTarget(outputTarget)
  renderer.render(copyScene, camera)
  renderer.setRenderTarget(currentTarget)

  copyMaterial.dispose()
  copyQuad.geometry.dispose()
}

export function createFilterFallbackTarget(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  inputTexture: THREE.Texture,
  outputTarget: THREE.WebGLRenderTarget | undefined,
  createRenderTarget: (renderer: THREE.WebGLRenderer) => THREE.WebGLRenderTarget
): THREE.WebGLRenderTarget {
  if (outputTarget) {
    copyTextureToRenderTarget(renderer, camera, inputTexture, outputTarget)
    return outputTarget
  }

  const fallbackTarget = createRenderTarget(renderer)
  copyTextureToRenderTarget(renderer, camera, inputTexture, fallbackTarget)
  return fallbackTarget
}

/**
 * Base class for shader-based post-processing filters
 * Consolidates common setup: camera, scene, quad, and render target creation
 */
export abstract class ShaderFilterBase extends THREE.Scene {
  protected material: THREE.ShaderMaterial
  protected camera: THREE.OrthographicCamera
  protected quad: THREE.Mesh
  private _renderTarget: THREE.WebGLRenderTarget | null = null

  constructor(
    vertexShader: string,
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>
  ) {
    super()

    // Create orthographic camera for fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // Create shader material
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    })

    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2)
    this.quad = new THREE.Mesh(geometry, this.material)
    this.add(this.quad)
  }

  /**
   * Create a render target matching the renderer's size
   */
  protected createRenderTarget(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const size = renderer.getSize(new THREE.Vector2())

    return new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    })
  }

  /**
   * Get cached render target or create new one
   */
  protected getOrCreateRenderTarget(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const size = renderer.getSize(new THREE.Vector2())

    if (
      !this._renderTarget ||
      this._renderTarget.width !== size.x ||
      this._renderTarget.height !== size.y
    ) {
      this._renderTarget?.dispose()
      this._renderTarget = this.createRenderTarget(renderer)
    }

    return this._renderTarget
  }

  /**
   * Apply the filter effect to an input texture
   * Returns the output render target containing the filtered result
   */
  public abstract apply(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget?: THREE.WebGLRenderTarget
  ): THREE.WebGLRenderTarget

  /**
   * Render to a target with error handling and fallback
   */
  protected renderWithFallback(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget,
    filterName: string
  ): THREE.WebGLRenderTarget {
    const currentTarget = renderer.getRenderTarget()

    try {
      renderer.setRenderTarget(outputTarget)
      renderer.render(this, this.camera)
      renderer.setRenderTarget(currentTarget)
      return outputTarget
    } catch (error) {
      console.error(`Failed to apply ${filterName}:`, error)
      renderer.setRenderTarget(currentTarget)

      // Fallback: copy input to output
      copyTextureToRenderTarget(renderer, this.camera, inputTexture, outputTarget)
      return outputTarget
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.material.dispose()
    this.quad.geometry.dispose()
    this._renderTarget?.dispose()
    this.clear()
  }
}
