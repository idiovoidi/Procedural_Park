import { describe, expect, it } from 'vitest'
import { createRng, hash2D, noise2D } from './noise-utils'

describe('noise-utils', () => {
  it('hash2D is deterministic and within [-1, 1]', () => {
    expect(hash2D(3, 7)).toBe(hash2D(3, 7))
    for (let i = 0; i < 50; i++) {
      const v = hash2D(i, i * 2)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('noise2D is deterministic and bounded', () => {
    expect(noise2D(1.5, 2.5)).toBe(noise2D(1.5, 2.5))
    for (let i = 0; i < 50; i++) {
      const v = noise2D(i * 0.37, i * 0.91)
      expect(Math.abs(v)).toBeLessThanOrEqual(1)
    }
  })

  it('noise2D is continuous across small steps', () => {
    expect(Math.abs(noise2D(4.0, 4.0) - noise2D(4.001, 4.0))).toBeLessThan(0.05)
  })

  it('createRng yields the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect(Array.from({ length: 10 }, a)).toEqual(Array.from({ length: 10 }, b))
  })

  it('createRng differs between seeds and stays in [0, 1]', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
    const rng = createRng(7)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
