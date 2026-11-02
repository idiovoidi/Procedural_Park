import { describe, expect, it } from 'vitest'
import { aimAtGround } from './aim'

describe('aimAtGround', () => {
  it('finds where a downward ray meets the floor', () => {
    // Eye at 1.6 m looking 45 degrees down along +z: hits 1.7 m ahead (floor at -0.1).
    const hit = aimAtGround({ x: 0, y: 1.6, z: 0 }, { x: 0, y: -1, z: 1 }, -0.1, 14)
    expect(hit?.x).toBeCloseTo(0, 10)
    expect(hit?.z).toBeCloseTo(1.7, 10)
    expect(hit?.distance).toBeCloseTo(1.7 * Math.SQRT2, 10)
  })

  it('handles a direction that is not normalised', () => {
    const a = aimAtGround({ x: 2, y: 2, z: 3 }, { x: 1, y: -1, z: 0 }, 0, 50)
    const b = aimAtGround({ x: 2, y: 2, z: 3 }, { x: 10, y: -10, z: 0 }, 0, 50)
    expect(b?.x).toBeCloseTo(a?.x as number, 10)
    expect(b?.distance).toBeCloseTo(a?.distance as number, 10)
  })

  it('returns null when looking level or upward', () => {
    expect(aimAtGround({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 0, z: 1 }, 0, 14)).toBeNull()
    expect(aimAtGround({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 0.5, z: 1 }, 0, 14)).toBeNull()
  })

  it('returns null beyond the reach limit', () => {
    // A shallow downward angle hits the floor far away.
    const ray = { x: 0, y: -0.05, z: 1 }
    expect(aimAtGround({ x: 0, y: 1.6, z: 0 }, ray, 0, 14)).toBeNull()
    expect(aimAtGround({ x: 0, y: 1.6, z: 0 }, ray, 0, 100)).not.toBeNull()
  })

  it('returns null from below the floor or for non-finite input', () => {
    expect(aimAtGround({ x: 0, y: -1, z: 0 }, { x: 0, y: -1, z: 1 }, 0, 14)).toBeNull()
    expect(aimAtGround({ x: Number.NaN, y: 1, z: 0 }, { x: 0, y: -1, z: 1 }, 0, 14)).toBeNull()
    expect(aimAtGround({ x: 0, y: 1, z: 0 }, { x: 0, y: Number.NaN, z: 1 }, 0, 14)).toBeNull()
  })

  it('looking straight down hits directly below', () => {
    const hit = aimAtGround({ x: 4, y: 1.6, z: -2 }, { x: 0, y: -1, z: 0 }, -0.1, 14)
    expect(hit).toMatchObject({ x: 4, z: -2 })
    expect(hit?.distance).toBeCloseTo(1.7, 10)
  })
})
