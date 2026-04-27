/**
 * Shared noise utility functions for terrain generation
 */

/**
 * Simple 2D hash function for noise generation
 */
export function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return (n - Math.floor(n)) * 2 - 1
}

/**
 * Simple 2D noise implementation using smooth interpolation
 */
export function noise2D(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy

  // Generate pseudo-random values at grid corners
  const a = hash2D(ix, iy)
  const b = hash2D(ix + 1, iy)
  const c = hash2D(ix, iy + 1)
  const d = hash2D(ix + 1, iy + 1)

  // Smooth interpolation
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)

  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

/**
 * Simple LCG (Linear Congruential Generator) for seeded random numbers
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 0xffffffff
}
