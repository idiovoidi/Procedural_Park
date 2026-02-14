import * as THREE from 'three'

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
