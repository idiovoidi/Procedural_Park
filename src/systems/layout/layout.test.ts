import { describe, expect, it } from 'vitest'
import {
  type Footprint,
  pushOutside,
  type RectShape,
  type Shape,
  shapesOverlap,
  signedDistance,
} from './footprint'
import { parkFootprints } from './park-sites'
import { WorldLayout } from './WorldLayout'

const rect = (x: number, z: number, w: number, d: number, rot = 0): RectShape => ({
  type: 'rect',
  x,
  z,
  w,
  d,
  rot,
})

describe('signedDistance', () => {
  it('is negative inside and positive outside a circle', () => {
    const c: Shape = { type: 'circle', x: 0, z: 0, r: 5 }
    expect(signedDistance(c, 0, 0)).toBeCloseTo(-5)
    expect(signedDistance(c, 8, 0)).toBeCloseTo(3)
  })

  it('respects rectangle rotation', () => {
    const r = rect(0, 0, 10, 2, Math.PI / 2) // long axis now along world Z
    expect(signedDistance(r, 0, 4)).toBeLessThan(0)
    expect(signedDistance(r, 4, 0)).toBeGreaterThan(0)
  })

  it('measures distance to a path ribbon', () => {
    const path: Shape = {
      type: 'path',
      points: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
      ],
      halfWidth: 1,
      closed: false,
    }
    expect(signedDistance(path, 5, 4)).toBeCloseTo(3)
    expect(signedDistance(path, 5, 0)).toBeCloseTo(-1)
  })
})

describe('shapesOverlap', () => {
  it('detects circle/circle, circle/rect and rect/rect overlap', () => {
    expect(
      shapesOverlap({ type: 'circle', x: 0, z: 0, r: 3 }, { type: 'circle', x: 5, z: 0, r: 3 })
    ).toBe(true)
    expect(shapesOverlap({ type: 'circle', x: 0, z: 0, r: 1 }, rect(4, 0, 4, 4))).toBe(false)
    expect(shapesOverlap(rect(0, 0, 4, 4), rect(3, 0, 4, 4))).toBe(true)
    expect(shapesOverlap(rect(0, 0, 4, 4), rect(7, 0, 4, 4))).toBe(false)
  })

  it('applies a margin', () => {
    expect(shapesOverlap(rect(0, 0, 4, 4), rect(5, 0, 4, 4))).toBe(false)
    expect(shapesOverlap(rect(0, 0, 4, 4), rect(5, 0, 4, 4), 2)).toBe(true)
  })

  it('detects a path crossing a shape', () => {
    const path: Shape = {
      type: 'path',
      points: [
        { x: -10, z: 0 },
        { x: 10, z: 0 },
      ],
      halfWidth: 1,
      closed: false,
    }
    expect(shapesOverlap(path, { type: 'circle', x: 0, z: 2, r: 2 })).toBe(true)
    expect(shapesOverlap(path, { type: 'circle', x: 0, z: 8, r: 2 })).toBe(false)
  })
})

describe('pushOutside', () => {
  it('moves points out to the requested clearance', () => {
    for (const shape of [{ type: 'circle', x: 0, z: 0, r: 5 } as Shape, rect(0, 0, 8, 6, 0.7)]) {
      const p = pushOutside(shape, 1, 1, 4)
      expect(signedDistance(shape, p.x, p.z)).toBeGreaterThanOrEqual(4 - 1e-6)
    }
  })

  it('leaves clear points alone', () => {
    const p = pushOutside({ type: 'circle', x: 0, z: 0, r: 5 }, 20, 0, 4)
    expect(p).toEqual({ x: 20, z: 0 })
  })
})

describe('WorldLayout', () => {
  const fence: Footprint = {
    id: 'fence',
    label: 'Fence',
    kind: 'boundary',
    shape: { type: 'circle', x: 0, z: 0, r: 50 },
  }
  const hut: Footprint = { id: 'hut', label: 'Hut', kind: 'building', shape: rect(10, 0, 6, 6) }

  it('refuses placements that overlap or leave the fence', () => {
    const layout = new WorldLayout()
    layout.add(fence, hut)
    expect(layout.canPlace(rect(12, 0, 4, 4))).toBe(false)
    expect(layout.canPlace(rect(-20, 0, 4, 4))).toBe(true)
    expect(layout.canPlace(rect(60, 0, 4, 4))).toBe(false)
  })

  it('can ignore the footprint being moved', () => {
    const layout = new WorldLayout()
    layout.add(fence, hut)
    expect(layout.canPlace(rect(11, 0, 6, 6), 0, ['hut'])).toBe(true)
  })

  it('reports overlapping pairs and notifies listeners', () => {
    const layout = new WorldLayout()
    let changes = 0
    layout.onChange(() => changes++)
    layout.add(hut, { id: 'shed', label: 'Shed', kind: 'building', shape: rect(12, 0, 6, 6) })
    expect(changes).toBe(1)
    expect(layout.findOverlaps()).toHaveLength(1)
    layout.remove('shed')
    expect(layout.findOverlaps()).toHaveLength(0)
  })
})

describe('park sites', () => {
  it('start with no overlapping structures', () => {
    const layout = new WorldLayout()
    layout.add(...parkFootprints())
    expect(layout.findOverlaps().map((p) => `${p.a.id}/${p.b.id}`)).toEqual([])
  })

  it('all sit inside the fence', () => {
    const layout = new WorldLayout()
    layout.add(...parkFootprints())
    for (const f of layout.list().filter((f) => f.kind !== 'boundary')) {
      expect(layout.insideBoundary(f.shape), f.id).toBe(true)
    }
  })
})
