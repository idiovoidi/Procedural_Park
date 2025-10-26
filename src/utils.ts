import * as THREE from 'three'

/**
 * Clamp a value between min and max, with optional logging
 */
export function clamp(value: number, min: number, max: number, propertyName?: string): number {
  const clampedValue = Math.max(min, Math.min(max, value))

  if (clampedValue !== value && propertyName) {
    console.warn(`${propertyName} clamped from ${value} to ${clampedValue}`)
  }

  return clampedValue
}

/**
 * Clamp a value and update both config and uniform
 */
export function clampAndUpdate(
  value: number,
  min: number,
  max: number,
  configTarget: any,
  configKey: string,
  uniformTarget: { value: number },
  propertyName?: string
): void {
  const clampedValue = clamp(value, min, max, propertyName)
  configTarget[configKey] = clampedValue
  uniformTarget.value = clampedValue
}

/**
 * Mathematical constant for 2π (tau)
 */
export const TAU = Math.PI * 2

/**
 * Common angle constants
 */
export const HALF_PI = Math.PI / 2
export const QUARTER_PI = Math.PI / 4
export const SIXTH_PI = Math.PI / 6
export const EIGHTH_PI = Math.PI / 8

/**
 * Generate a random value centered around 0 using a seeded random function
 */
export function randomCenteredSeeded(rand: () => number): number {
  return rand() - 0.5
}

/**
 * Normalize an angle to [0, 2π)
 */
export function normalizeAngle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Object pool for Three.js objects to reduce garbage collection
 */
class ObjectPool<T> {
  private available: T[] = []
  private inUse: Set<T> = new Set()
  private createFn: () => T
  private resetFn?: (obj: T) => void

  constructor(createFn: () => T, resetFn?: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn
    this.resetFn = resetFn

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn())
    }
  }

  get(): T {
    let obj: T
    if (this.available.length > 0) {
      obj = this.available.pop()!
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
      this.available.push(obj)
    }
  }

  size(): number {
    return this.available.length + this.inUse.size
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

/**
 * Simple memoization utility for expensive function calls
 */
export function memoize<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyGenerator?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>()

  return (...args: TArgs): TReturn => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

/**
 * Memoized trigonometric functions for better performance
 */
export const memoizedSin = memoize(Math.sin, (x: number) => x.toFixed(3))
export const memoizedCos = memoize(Math.cos, (x: number) => x.toFixed(3))
export const memoizedTan = memoize(Math.tan, (x: number) => x.toFixed(3))

/**
 * Memoized square root for performance-critical calculations
 */
export const memoizedSqrt = memoize(Math.sqrt, (x: number) => x.toFixed(3))

/**
 * Fast approximation functions for performance-critical code
 */
export function fastSin(x: number): number {
  // Using Taylor series approximation for better performance than Math.sin
  const x2 = x * x
  return x - (x2 * x) / 6 + (x2 * x2 * x) / 120 - (x2 * x2 * x2 * x) / 5040
}

export function fastCos(x: number): number {
  // Using Taylor series approximation
  const x2 = x * x
  return 1 - x2 / 2 + (x2 * x2) / 24 - (x2 * x2 * x2) / 720
}
