import * as THREE from 'three'

/**
 * Object pool for Three.js objects to reduce garbage collection
 */
export class ObjectPool<T> {
  private available: T[] = []
  private inUse: Set<T> = new Set()
  private createFn: () => T
  private resetFn?: (obj: T) => void
  private maxSize: number

  constructor(createFn: () => T, resetFn?: (obj: T) => void, initialSize = 10, maxSize = 100) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn())
    }
  }

  get(): T {
    let obj: T
    const popped = this.available.pop()
    if (popped !== undefined) {
      obj = popped
    } else {
      obj = this.createFn()
    }

    this.inUse.add(obj)
    return obj
  }

  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj)
      if (this.resetFn) {
        this.resetFn(obj)
      }

      // Only keep up to maxSize objects in pool
      if (this.available.length < this.maxSize) {
        this.available.push(obj)
      }
    }
  }

  releaseAll(): void {
    this.inUse.forEach((obj) => {
      if (this.resetFn) {
        this.resetFn(obj)
      }
      if (this.available.length < this.maxSize) {
        this.available.push(obj)
      }
    })
    this.inUse.clear()
  }

  size(): number {
    return this.available.length + this.inUse.size
  }

  getInUseCount(): number {
    return this.inUse.size
  }

  getAvailableCount(): number {
    return this.available.length
  }

  clear(): void {
    this.available.length = 0
    this.inUse.clear()
  }
}

/**
 * Three.js Vector3 object pool
 */
export const vector3Pool = new ObjectPool<THREE.Vector3>(
  () => new THREE.Vector3(),
  (v) => v.set(0, 0, 0)
)

/**
 * Three.js Vector2 object pool
 */
export const vector2Pool = new ObjectPool<THREE.Vector2>(
  () => new THREE.Vector2(),
  (v) => v.set(0, 0)
)

/**
 * Three.js Color object pool
 */
export const colorPool = new ObjectPool<THREE.Color>(
  () => new THREE.Color(),
  (c) => c.setRGB(0, 0, 0)
)

/**
 * Utility functions for getting pooled objects
 */
export function getPooledVector3(x = 0, y = 0, z = 0): THREE.Vector3 {
  const vec = vector3Pool.get()
  vec.set(x, y, z)
  return vec
}

export function getPooledVector2(x = 0, y = 0): THREE.Vector2 {
  const vec = vector2Pool.get()
  vec.set(x, y)
  return vec
}

export function getPooledColor(r = 0, g = 0, b = 0): THREE.Color {
  const color = colorPool.get()
  color.setRGB(r, g, b)
  return color
}

/**
 * Release pooled objects back to pool
 */
export function releaseVector3(vec: THREE.Vector3): void {
  vector3Pool.release(vec)
}

export function releaseVector2(vec: THREE.Vector2): void {
  vector2Pool.release(vec)
}
