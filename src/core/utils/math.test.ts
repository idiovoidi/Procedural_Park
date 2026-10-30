import { describe, expect, it } from 'vitest'
import { clamp, lerp, normalizeAngle } from './math'

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('limits values to min and max', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
  })
})

describe('lerp', () => {
  it('interpolates between endpoints', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(0, 10, 0.25)).toBe(2.5)
  })
})

describe('normalizeAngle', () => {
  it('wraps angles into [0, 2π)', () => {
    const tau = Math.PI * 2
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(tau + 1)).toBeCloseTo(1)
    expect(normalizeAngle(-1)).toBeCloseTo(tau - 1)
    expect(normalizeAngle(-tau * 3 - 0.5)).toBeGreaterThanOrEqual(0)
    expect(normalizeAngle(tau * 3)).toBeLessThan(tau)
  })
})
