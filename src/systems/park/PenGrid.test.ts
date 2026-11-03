import { describe, expect, it, vi } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import {
  type Cell,
  cellToWorld,
  type Edge,
  edgeBetween,
  type GridBounds,
  type PenChange,
  PenGrid,
  worldToCell,
} from './index'

const { CELL_SIZE_M } = GAME_CONFIG.PARK
const BOUNDS: GridBounds = { minX: 0, minZ: 0, maxX: 9, maxZ: 9 }
const newGrid = () => new PenGrid(BOUNDS)

/** Fence the outline of the cell rectangle [x0..x1] x [z0..z1] (inclusive). */
function fenceRect(
  grid: PenGrid,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  options: { tall?: boolean; gate?: boolean } = {}
): void {
  for (let x = x0; x <= x1; x++) {
    grid.addFence({ x, z: z0, axis: 'h' }, options)
    grid.addFence({ x, z: z1 + 1, axis: 'h' }, options)
  }
  for (let z = z0; z <= z1; z++) {
    grid.addFence({ x: x0, z, axis: 'v' }, options)
    grid.addFence({ x: x1 + 1, z, axis: 'v' }, options)
  }
}

const cellsOf = (grid: PenGrid, id: string) => grid.getPen(id)?.cells.length

describe('coordinates', () => {
  it('converts between world metres and cells', () => {
    expect(worldToCell(0, 0)).toEqual({ x: 0, z: 0 })
    expect(worldToCell(CELL_SIZE_M - 0.01, CELL_SIZE_M)).toEqual({ x: 0, z: 1 })
    expect(worldToCell(-0.01, -0.01)).toEqual({ x: -1, z: -1 })
    const centre = cellToWorld({ x: 2, z: 3 })
    expect(worldToCell(centre.x, centre.z)).toEqual({ x: 2, z: 3 })
  })

  it('finds the edge shared by adjacent cells', () => {
    expect(edgeBetween({ x: 1, z: 1 }, { x: 2, z: 1 })).toEqual({ x: 2, z: 1, axis: 'v' })
    expect(edgeBetween({ x: 2, z: 1 }, { x: 1, z: 1 })).toEqual({ x: 2, z: 1, axis: 'v' })
    expect(edgeBetween({ x: 1, z: 1 }, { x: 1, z: 0 })).toEqual({ x: 1, z: 1, axis: 'h' })
    expect(edgeBetween({ x: 1, z: 1 }, { x: 2, z: 2 })).toBeNull() // diagonal
    expect(edgeBetween({ x: 1, z: 1 }, { x: 1, z: 1 })).toBeNull()
  })
})

describe('pen detection', () => {
  it('finds no pens on open ground', () => {
    expect(newGrid().getPens()).toEqual([])
  })

  it('detects a closed fence as a pen with the right area', () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 3, 3) // 2x2 cells
    const pens = grid.getPens()
    expect(pens).toHaveLength(1)
    expect(pens[0].id).toBe('pen-1')
    expect(pens[0].cells).toHaveLength(4)
    expect(pens[0].areaM2).toBe(4 * CELL_SIZE_M * CELL_SIZE_M)
  })

  it('does not treat a fence with a gap as a pen, and closes it when the gap is filled', () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 3, 3)
    const gap: Edge = { x: 2, z: 2, axis: 'h' }
    grid.removeFence(gap)
    expect(grid.getPens()).toHaveLength(0)

    grid.addFence(gap)
    expect(grid.getPens()).toHaveLength(1)
  })

  it('counts a closed gate as part of the enclosure', () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 3, 3)
    grid.addFence({ x: 2, z: 2, axis: 'h' }, { gate: true })
    expect(grid.getPens()).toHaveLength(1)
    expect(grid.getPens()[0].gateCount).toBe(1)
  })

  it('lets a pen use the edge of the buildable zone as one of its sides', () => {
    const grid = newGrid()
    // Corner pen at the zone's top-left: its north and west sides sit on the zone boundary.
    fenceRect(grid, 0, 0, 1, 1)
    expect(grid.getPens()).toHaveLength(1)
    expect(grid.getPens()[0].cells).toHaveLength(4)
  })

  it('detects adjacent pens that share a wall as separate pens', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 2, 2)
    fenceRect(grid, 3, 1, 4, 2) // shares the wall at x = 3
    const pens = grid.getPens()
    expect(pens).toHaveLength(2)
    expect(new Set(pens.map((p) => p.id)).size).toBe(2)
  })

  it('is not fooled by a stray fence inside a pen', () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 5, 5)
    grid.addFence({ x: 4, z: 3, axis: 'v' }) // dangling wall in the middle
    expect(grid.getPens()).toHaveLength(1)
    expect(cellsOf(grid, 'pen-1')).toBe(16)
  })

  it('finds the pen at a cell or world position', () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 3, 3)
    expect(grid.getPenAt({ x: 3, z: 3 })?.id).toBe('pen-1')
    expect(grid.getPenAt({ x: 5, z: 5 })).toBeUndefined()
    const w = cellToWorld({ x: 2, z: 2 })
    expect(grid.getPenAtWorld(w.x, w.z)?.id).toBe('pen-1')
  })
})

describe('fence validation', () => {
  it('rejects edges outside the zone and malformed edges', () => {
    const grid = newGrid()
    expect(grid.addFence({ x: 50, z: 50, axis: 'h' })).toBe(false)
    expect(grid.addFence({ x: 1.5, z: 2, axis: 'h' })).toBe(false)
    expect(grid.addFence({ x: 1, z: 2, axis: 'x' as never })).toBe(false)
    expect(grid.getFences()).toHaveLength(0)
  })

  it('accepts edges on the zone boundary', () => {
    const grid = newGrid()
    expect(grid.addFence({ x: 0, z: 0, axis: 'h' })).toBe(true) // north of the first row
    expect(grid.addFence({ x: 10, z: 0, axis: 'v' })).toBe(true) // east of the last column
  })

  it('reports whether a fence call changed anything', () => {
    const grid = newGrid()
    const edge: Edge = { x: 2, z: 2, axis: 'v' }
    expect(grid.addFence(edge)).toBe(true)
    expect(grid.addFence(edge)).toBe(false)
    expect(grid.addFence(edge, { gate: true })).toBe(true) // upgrade to a gate
    expect(grid.getFence(edge)).toMatchObject({ gate: true, tall: false })
    expect(grid.removeFence(edge)).toBe(true)
    expect(grid.removeFence(edge)).toBe(false)
  })
})

describe('stable pen ids', () => {
  it('splits a pen in two: one side keeps the id, the other is new', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 4, 2) // 4x2
    const changes: PenChange[] = []
    grid.onChange((c) => changes.push(c))

    for (const z of [1, 2]) grid.addFence({ x: 3, z, axis: 'v' }) // wall down the middle
    expect(grid.getPens()).toHaveLength(2)
    expect(grid.getPen('pen-1')).toBeDefined()
    expect(grid.getPen('pen-2')).toBeDefined()

    // The first wall segment alone doesn't split it; the second completes the split.
    const last = changes[changes.length - 1]
    expect(last.created).toEqual(['pen-2'])
    expect(last.changed).toEqual(['pen-1'])
    expect(last.removed).toEqual([])
  })

  it('merges two pens: the larger keeps its id and the other is removed', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 3, 2) // 3x2 = 6 cells -> pen-1
    fenceRect(grid, 4, 1, 4, 2) // 1x2 = 2 cells -> pen-2
    expect(grid.getPens().map((p) => cellsOf(grid, p.id))).toEqual([6, 2])

    const changes: PenChange[] = []
    grid.onChange((c) => changes.push(c))
    for (const z of [1, 2]) grid.removeFence({ x: 4, z, axis: 'v' }) // remove the shared wall

    expect(grid.getPens()).toHaveLength(1)
    expect(grid.getPens()[0].id).toBe('pen-1')
    expect(cellsOf(grid, 'pen-1')).toBe(8)
    expect(changes[changes.length - 1].removed).toEqual(['pen-2'])
  })

  it('keeps the same id when a pen is extended', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 2, 2)
    const before = grid.getPens()[0].id

    // Move the east wall one cell outwards.
    for (const z of [1, 2]) grid.removeFence({ x: 3, z, axis: 'v' })
    grid.addFence({ x: 3, z: 1, axis: 'h' })
    grid.addFence({ x: 3, z: 3, axis: 'h' })
    for (const z of [1, 2]) grid.addFence({ x: 4, z, axis: 'v' })

    expect(grid.getPens()).toHaveLength(1)
    expect(grid.getPens()[0].id).toBe(before)
    expect(cellsOf(grid, before)).toBe(6)
  })

  it('gives a pen its id back when the same region is closed again', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 2, 2)
    const changes: PenChange[] = []
    grid.onChange((c) => changes.push(c))

    const gap: Edge = { x: 1, z: 1, axis: 'h' }
    grid.removeFence(gap) // opens the pen
    expect(grid.getPens()).toHaveLength(0)
    expect(changes.at(-1)?.removed).toEqual(['pen-1'])

    grid.addFence(gap) // closes it again
    expect(grid.getPens().map((p) => p.id)).toEqual(['pen-1'])
    expect(changes.at(-1)?.created).toEqual(['pen-1'])
  })

  it('keeps a pen id when a wall is moved by removing it first', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 2, 2)
    for (const z of [1, 2]) grid.removeFence({ x: 3, z, axis: 'v' }) // pen is now open
    grid.addFence({ x: 3, z: 1, axis: 'h' })
    grid.addFence({ x: 3, z: 3, axis: 'h' })
    for (const z of [1, 2]) grid.addFence({ x: 4, z, axis: 'v' })
    expect(grid.getPens().map((p) => p.id)).toEqual(['pen-1'])
    expect(cellsOf(grid, 'pen-1')).toBe(6)
  })

  it('does not hand a destroyed pen id to an unrelated region', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 2, 2)
    grid.removeFence({ x: 1, z: 1, axis: 'h' })
    fenceRect(grid, 6, 6, 7, 7)
    expect(grid.getPens().map((p) => p.id)).toEqual(['pen-2'])
  })

  it('never reuses the id of a destroyed pen', () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 2, 2) // pen-1
    grid.removeFence({ x: 1, z: 1, axis: 'h' }) // opens it: pen-1 is gone
    expect(grid.getPens()).toHaveLength(0)
    fenceRect(grid, 6, 6, 7, 7)
    expect(grid.getPens().map((p) => p.id)).toEqual(['pen-2'])
  })
})

describe('pen profile', () => {
  const build = () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 4, 4) // 3x3 = 9 cells
    return grid
  }

  it('measures water, ground and props', () => {
    const grid = build()
    grid.setWater({ x: 2, z: 2 }, 'shallow')
    grid.setWater({ x: 3, z: 2 }, 'deep')
    grid.setWater({ x: 4, z: 2 }, 'deep')
    grid.setGround({ x: 2, z: 3 }, 'wetland')
    grid.setGround({ x: 3, z: 3 }, 'wetland')
    grid.addProp({ x: 4, z: 4 }, 'toy')
    grid.addProp({ x: 4, z: 4 }, 'toy')
    grid.addProp({ x: 3, z: 4 }, 'trough')
    grid.addProp({ x: 9, z: 9 }, 'plant') // outside the pen

    const pen = grid.getPens()[0]
    expect(pen.waterShallowFraction).toBeCloseTo(1 / 9, 10)
    expect(pen.waterDeepFraction).toBeCloseTo(2 / 9, 10)
    expect(pen.groundFractions.wetland).toBeCloseTo(2 / 9, 10)
    expect(pen.groundFractions.meadow).toBeCloseTo(7 / 9, 10)
    expect(pen.props).toEqual({
      toy: 2,
      shelter: 0,
      plant: 0,
      trough: 1,
      hopper: 0,
      collector: 0,
      silo: 0,
      valve: 0,
      farm: 0,
      bin: 0,
      den: 0,
    })
  })

  it('reports the enclosure level from fences and roofs', () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 3, 3)
    expect(grid.getPens()[0].enclosure).toBe('fenced')

    // Upgrade every boundary fence to tall.
    fenceRect(grid, 2, 2, 3, 3, { tall: true })
    expect(grid.getPens()[0].enclosure).toBe('tall')

    // One low fence drops it back to fenced.
    grid.addFence({ x: 2, z: 2, axis: 'h' }, { tall: false })
    expect(grid.getPens()[0].enclosure).toBe('fenced')

    // A roof over every cell makes it an aviary.
    for (const c of grid.getPens()[0].cells) grid.setRoof(c, true)
    expect(grid.getPens()[0].enclosure).toBe('roofed')
  })

  it('needs every cell roofed to count as roofed', () => {
    const grid = build()
    const cells = grid.getPens()[0].cells
    for (const c of cells.slice(0, -1)) grid.setRoof(c, true)
    expect(grid.getPens()[0].enclosure).toBe('fenced')
  })

  it('ignores terrain edits outside the buildable zone', () => {
    const grid = build()
    expect(grid.setWater({ x: 99, z: 99 }, 'deep')).toBe(false)
    expect(grid.setGround({ x: -1, z: 0 }, 'rocky')).toBe(false)
    expect(grid.setRoof({ x: 99, z: 0 }, true)).toBe(false)
    expect(grid.addProp({ x: 0, z: 99 }, 'toy')).toBe(false)
  })

  it('removes props one at a time', () => {
    const grid = build()
    grid.addProp({ x: 3, z: 3 }, 'toy')
    grid.addProp({ x: 3, z: 3 }, 'toy')
    expect(grid.removeProp({ x: 3, z: 3 }, 'toy')).toBe(true)
    expect(grid.getPens()[0].props.toy).toBe(1)
    expect(grid.removeProp({ x: 3, z: 3 }, 'shelter')).toBe(false)
  })
})

describe('change events and bounds', () => {
  it('notifies on create, profile change and removal, but not on no-ops', () => {
    const grid = newGrid()
    const listener = vi.fn()
    grid.onChange(listener)

    fenceRect(grid, 2, 2, 3, 3)
    const created = listener.mock.calls.filter((call) => (call[0] as PenChange).created.length > 0)
    expect(created).toHaveLength(1)

    listener.mockClear()
    grid.addProp({ x: 2, z: 2 }, 'toy')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].changed).toEqual(['pen-1'])

    listener.mockClear()
    grid.addProp({ x: 8, z: 8 }, 'toy') // outside any pen
    grid.setWater({ x: 8, z: 8 }, 'none') // already none
    expect(listener).not.toHaveBeenCalled()

    grid.removeFence({ x: 2, z: 2, axis: 'h' })
    expect(listener.mock.calls.at(-1)?.[0].removed).toEqual(['pen-1'])
  })

  it('stops notifying after unsubscribing', () => {
    const grid = newGrid()
    const listener = vi.fn()
    const off = grid.onChange(listener)
    off()
    fenceRect(grid, 2, 2, 3, 3)
    expect(listener).not.toHaveBeenCalled()
  })

  it('grows the buildable zone outwards only', () => {
    const grid = newGrid()
    grid.expandBounds({ maxX: 3, minZ: 2, maxZ: -5, minX: 1.5 })
    expect(grid.getBounds()).toEqual({ minX: 0, minZ: -2, maxX: 12, maxZ: 9 })
    expect(grid.inBounds({ x: 12, z: -2 })).toBe(true)
    expect(grid.inBounds({ x: 13, z: 0 })).toBe(false)
  })

  it('keeps a closed pen intact when the zone grows', () => {
    const grid = newGrid()
    fenceRect(grid, 2, 2, 3, 3)
    grid.expandBounds({ maxX: 4, maxZ: 4, minX: 4, minZ: 4 })
    expect(grid.getPens().map((p) => p.id)).toEqual(['pen-1'])
  })
})

describe('serialize / restore', () => {
  const build = () => {
    const grid = newGrid()
    fenceRect(grid, 1, 1, 3, 3, { tall: true })
    fenceRect(grid, 5, 5, 6, 6)
    grid.addFence({ x: 1, z: 1, axis: 'h' }, { gate: true, tall: true })
    grid.setWater({ x: 2, z: 2 }, 'deep')
    grid.setGround({ x: 3, z: 3 }, 'rocky')
    grid.setRoof({ x: 5, z: 5 }, true)
    grid.addProp({ x: 6, z: 6 }, 'shelter')
    return grid
  }

  it('round-trips the whole grid, including pen ids', () => {
    const original = build()
    const copy = new PenGrid({ minX: -1, minZ: -1, maxX: 0, maxZ: 0 })
    expect(copy.restore(JSON.parse(JSON.stringify(original.serialize())))).toBe(true)

    expect(copy.getBounds()).toEqual(original.getBounds())
    expect(copy.getPens()).toEqual(original.getPens())
    expect(copy.getWater({ x: 2, z: 2 })).toBe('deep')
    expect(copy.getGround({ x: 3, z: 3 })).toBe('rocky')
    expect(copy.hasRoof({ x: 5, z: 5 })).toBe(true)
    expect(copy.getProps({ x: 6, z: 6 })).toEqual(['shelter'])
  })

  it('keeps ids stable and unique after restoring and editing', () => {
    const copy = new PenGrid()
    copy.restore(build().serialize())
    const ids = copy.getPens().map((p) => p.id)
    fenceRect(copy, 8, 8, 9, 9)
    expect(copy.getPens().map((p) => p.id)).toEqual([...ids, 'pen-3'])
  })

  it('rejects an unusable snapshot without changing the grid', () => {
    const grid = build()
    const before = grid.serialize()
    for (const bad of [
      null,
      undefined,
      3,
      {},
      { version: 2 },
      { version: 1, bounds: { minX: 5 } },
    ]) {
      expect(grid.restore(bad)).toBe(false)
    }
    expect(grid.serialize()).toEqual(before)
  })

  it('skips bad entries but loads the rest', () => {
    const snapshot = build().serialize() as unknown as Record<string, unknown[]>
    snapshot.fences.push({ x: 'a', z: 1, axis: 'h' }, { x: 999, z: 999, axis: 'h' }, null)
    snapshot.water.push({ x: 1, z: 1, level: 'lava' })
    snapshot.props.push({ x: 1, z: 1, kind: 'dragon' })
    snapshot.ground.push({ x: 1, z: 1, biome: 'moon' })

    const grid = new PenGrid()
    expect(grid.restore(snapshot)).toBe(true)
    expect(grid.getPens()).toHaveLength(2)
    expect(grid.getWater({ x: 1, z: 1 })).toBe('none')
    expect(grid.getProps({ x: 1, z: 1 })).toEqual([])
  })
})

describe('Cell type', () => {
  it('is a plain serialisable object', () => {
    const cell: Cell = { x: 1, z: 2 }
    expect(JSON.parse(JSON.stringify(cell))).toEqual(cell)
  })
})
