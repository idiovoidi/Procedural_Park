import type { Random } from '@core/types'

/**
 * Seeded randomness helpers for creature generation.
 * Pure (no Three.js) so genome code can run in tests and be shared with peers.
 */

/** A list of [value, weight] pairs used for weighted picks. */
export type Weighted<T> = ReadonlyArray<readonly [T, number]>

/** Mix any number of integers into one unsigned 32-bit seed. */
export function hashSeed(...parts: number[]): number {
  let h = 0x811c9dc5
  for (const part of parts) {
    h ^= part | 0
    h = Math.imul(h, 0x01000193)
    h ^= h >>> 15
  }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/** Hash a string to an unsigned 32-bit seed. */
export function hashString(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return hashSeed(h)
}

/** Mulberry32 generator. Returns values in [0, 1). */
export function createSeededRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function choose<T>(rand: Random, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]
}

export function rangeInt(rand: Random, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

export function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t
}

/** Roughly bell-shaped value in [0, 1]; clusters around 0.5 so extremes are rare. */
export function normalish(rand: Random): number {
  return (rand() + rand() + rand() + rand()) / 4
}

export function uniform<T>(...items: T[]): Weighted<T> {
  return items.map((item) => [item, 1] as const)
}

export function pickWeighted<T>(rand: Random, items: Weighted<T>): T {
  let total = 0
  for (const [, weight] of items) total += weight
  let roll = rand() * total
  for (const [value, weight] of items) {
    roll -= weight
    if (roll < 0) return value
  }
  return items[items.length - 1][0]
}

/** Pick up to `count` distinct values, each pick weighted, without replacement. */
export function pickDistinct<T>(rand: Random, items: Weighted<T>, count: number): T[] {
  const pool = [...items]
  const picked: T[] = []
  while (picked.length < count && pool.length > 0) {
    const value = pickWeighted(rand, pool)
    picked.push(value)
    pool.splice(
      pool.findIndex(([v]) => v === value),
      1
    )
  }
  return picked
}
