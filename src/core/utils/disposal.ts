import * as THREE from 'three'

/**
 * Dispose a Three.js material and any attached textures
 */
export function disposeMaterial(material: THREE.Material): void {
  // Dispose all attached textures
  const mat = material as unknown as Record<string, unknown>
  for (const key of Object.keys(mat)) {
    const value = mat[key]
    if (value && typeof value === 'object' && 'isTexture' in value) {
      const texture = value as THREE.Texture
      if (typeof texture.dispose === 'function') {
        texture.dispose()
      }
    }
  }
  material.dispose()
}

/**
 * Recursively dispose all geometries, materials, and textures in an Object3D hierarchy
 */
export function disposeThreeObject(root: THREE.Object3D, removeFromParent = true): void {
  if (!root) return

  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      if (object.geometry) {
        object.geometry.dispose()
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          for (const mat of object.material) {
            if (mat && typeof mat.dispose === 'function') {
              disposeMaterial(mat)
            }
          }
        } else if (typeof object.material.dispose === 'function') {
          disposeMaterial(object.material)
        }
      }
    }
  })

  if (removeFromParent && root.parent) {
    root.parent.remove(root)
  }
}
