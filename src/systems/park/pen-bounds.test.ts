import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { clampToPen, pointInPen } from './pen-bounds'

const CELL = GAME_CONFIG.PARK.CELL_SIZE_M
const square = [
  { x: 1, z: 1 },
  { x: 2, z: 1 },
  { x: 1, z: 2 },
  { x: 2, z: 2 },
] // world x,z in [2,6]
const lShape = [
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
] // missing the cell at (1,1)

describe('clampToPen', () => {
  it('leaves a point that is already inside alone', () => {
    const p = clampToPen(square, 4, 4, 0.4)
    expect(p).toEqual({ x: 4, z: 4 })
  })

  it('pulls an outside point back to the nearest wall, kept off it by the margin', () => {
    expect(clampToPen(square, 10, 4, 0.4)).toEqual({ x: 6 - 0.4, z: 4 }) // east wall at x=6
    expect(clampToPen(square, 0, 4, 0.4).x).toBeCloseTo(CELL + 0.4, 10) // west wall at x=2
    expect(clampToPen(square, 4, -9, 0.4).z).toBeCloseTo(CELL + 0.4, 10)
  })

  it('does not push a point away from the shared edge between two cells of the pen', () => {
    // x=4 is the boundary between cells 1 and 2; both are in the pen, so nothing is in the way.
    expect(clampToPen(square, 4, 3, 0.4)).toEqual({ x: 4, z: 3 })
    expect(clampToPen(square, 3, 4, 0.4)).toEqual({ x: 3, z: 4 })
  })

  it('never returns a point outside the pen, for any input', () => {
    const inside = (x: number, z: number) =>
      square.some(
        (c) => x >= c.x * CELL && x <= (c.x + 1) * CELL && z >= c.z * CELL && z <= (c.z + 1) * CELL
      )
    for (let x = -20; x <= 30; x += 2.3) {
      for (let z = -20; z <= 30; z += 1.9) {
        const p = clampToPen(square, x, z)
        expect(inside(p.x, p.z)).toBe(true)
      }
    }
  })

  it('respects an L-shaped pen, snapping out of the notch', () => {
    const notch = { x: (1 + 0.5) * CELL, z: (1 + 0.5) * CELL } // centre of the missing cell
    const p = clampToPen(lShape, notch.x, notch.z, 0.2)
    const cell = { x: Math.floor(p.x / CELL), z: Math.floor(p.z / CELL) }
    expect(lShape.some((c) => c.x === cell.x && c.z === cell.z)).toBe(true)
  })

  it('handles a one-cell pen and an oversized margin', () => {
    const one = [{ x: 0, z: 0 }]
    expect(clampToPen(one, 50, 50, 99)).toEqual({ x: CELL / 2, z: CELL / 2 }) // margin capped at half a cell
  })

  it('returns the input unchanged for an empty pen or non-finite input', () => {
    expect(clampToPen([], 3, 4)).toEqual({ x: 3, z: 4 })
    expect(clampToPen(square, Number.NaN, 4).z).toBe(4)
  })
})

describe('pointInPen', () => {
  it('spreads newcomers across the cells and wraps around', () => {
    expect(pointInPen(square, 0)).toEqual({ x: 1.5 * CELL, z: 1.5 * CELL })
    expect(pointInPen(square, 1)).toEqual({ x: 2.5 * CELL, z: 1.5 * CELL })
    expect(pointInPen(square, 4)).toEqual(pointInPen(square, 0))
    expect(pointInPen(square, -1)).toEqual(pointInPen(square, 1))
  })

  it('gives the origin for an empty pen', () => {
    expect(pointInPen([], 3)).toEqual({ x: 0, z: 0 })
  })
})
