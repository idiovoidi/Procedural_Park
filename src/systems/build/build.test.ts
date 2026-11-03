import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { CurrencyManager } from '../currency'
import { type Cell, PenGrid } from '../park'
import { BUILD_TOOLS, BuildController, type BuildTool, nearestEdge } from './BuildController'

const { COSTS, REFUND_FRACTION } = GAME_CONFIG.ECONOMY.BUILD
const CELL = GAME_CONFIG.PARK.CELL_SIZE_M

type Side = 'n' | 's' | 'w' | 'e' | 'mid'

/** A world point near one side of a cell (or its middle), for aiming. */
function aim(cell: Cell, side: Side): [number, number] {
  const x0 = cell.x * CELL
  const z0 = cell.z * CELL
  switch (side) {
    case 'n':
      return [x0 + CELL / 2, z0 + CELL * 0.05]
    case 's':
      return [x0 + CELL / 2, z0 + CELL * 0.95]
    case 'w':
      return [x0 + CELL * 0.05, z0 + CELL / 2]
    case 'e':
      return [x0 + CELL * 0.95, z0 + CELL / 2]
    default:
      return [x0 + CELL / 2, z0 + CELL / 2]
  }
}

function setup(coins = 1000) {
  const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 9, maxZ: 9 })
  const wallet = new CurrencyManager(coins)
  const build = new BuildController(grid, wallet)
  const place = (tool: BuildTool, cell: Cell, side: Side) => {
    build.setTool(tool)
    return build.commit(...aim(cell, side))
  }
  /** Fence the outline of cells [x0..x1] x [z0..z1] using the fence tool. */
  const fenceRect = (x0: number, z0: number, x1: number, z1: number) => {
    for (let x = x0; x <= x1; x++) {
      place('fence', { x, z: z0 }, 'n')
      place('fence', { x, z: z1 }, 's')
    }
    for (let z = z0; z <= z1; z++) {
      place('fence', { x: x0, z }, 'w')
      place('fence', { x: x1, z }, 'e')
    }
  }
  return { grid, wallet, build, place, fenceRect }
}

describe('nearestEdge', () => {
  it('picks the side of the cell the point is closest to', () => {
    const cell = { x: 3, z: 4 }
    expect(nearestEdge(...aim(cell, 'n')).edge).toEqual({ x: 3, z: 4, axis: 'h' })
    expect(nearestEdge(...aim(cell, 's')).edge).toEqual({ x: 3, z: 5, axis: 'h' })
    expect(nearestEdge(...aim(cell, 'w')).edge).toEqual({ x: 3, z: 4, axis: 'v' })
    expect(nearestEdge(...aim(cell, 'e')).edge).toEqual({ x: 4, z: 4, axis: 'v' })
  })

  it('reports how close the point is, in cells', () => {
    expect(nearestEdge(...aim({ x: 1, z: 1 }, 'n')).distance).toBeCloseTo(0.05, 10)
    expect(nearestEdge(...aim({ x: 1, z: 1 }, 'mid')).distance).toBeCloseTo(0.5, 10)
  })

  it('works for negative coordinates', () => {
    const { edge, cell } = nearestEdge(-0.1, -0.1)
    expect(cell).toEqual({ x: -1, z: -1 })
    expect(edge.x === 0 || edge.z === 0).toBe(true)
  })
})

describe('tools', () => {
  it('starts on the fence tool and ignores unknown tools', () => {
    const { build } = setup()
    expect(build.getTool()).toBe('fence')
    build.setTool('laser' as BuildTool)
    expect(build.getTool()).toBe('fence')
    for (const tool of BUILD_TOOLS) {
      build.setTool(tool)
      expect(build.getTool()).toBe(tool)
    }
  })

  it('has a price for every buildable tool', () => {
    for (const tool of BUILD_TOOLS.filter((t) => t !== 'remove')) {
      expect(COSTS[tool as keyof typeof COSTS]).toBeGreaterThan(0)
    }
  })
})

describe('building fences', () => {
  it('places a fence on the nearest edge and charges for it', () => {
    const { place, grid, wallet } = setup(100)
    const result = place('fence', { x: 2, z: 2 }, 'n')
    expect(result.ok).toBe(true)
    expect(result.message).toBe('Built fence')
    expect(grid.getFence({ x: 2, z: 2, axis: 'h' })).toBeDefined()
    expect(wallet.getBalance()).toBe(100 - COSTS.fence)
  })

  it('builds a closed pen out of fences', () => {
    const { fenceRect, grid, wallet } = setup(1000)
    fenceRect(2, 2, 4, 4)
    expect(grid.getPens()).toHaveLength(1)
    expect(grid.getPens()[0].cells).toHaveLength(9)
    expect(wallet.getBalance()).toBe(1000 - 12 * COSTS.fence)
  })

  it('refuses to build outside the zone, without charging', () => {
    const { build, wallet, grid } = setup(100)
    const result = build.commit(500, 500)
    expect(result.ok).toBe(false)
    expect(result.message).toBe('Outside the build zone')
    expect(wallet.getBalance()).toBe(100)
    expect(grid.getFences()).toHaveLength(0)
  })

  it('refuses a duplicate fence', () => {
    const { place, wallet } = setup(100)
    place('fence', { x: 2, z: 2 }, 'n')
    const again = place('fence', { x: 2, z: 2 }, 'n')
    expect(again.ok).toBe(false)
    expect(again.message).toBe('Already built')
    expect(wallet.getBalance()).toBe(100 - COSTS.fence)
  })

  it('refuses when the player cannot afford it, and builds nothing', () => {
    const { place, grid, wallet } = setup(COSTS.gate - 1)
    const result = place('gate', { x: 2, z: 2 }, 'n')
    expect(result.ok).toBe(false)
    expect(result.message).toBe(`Need ${COSTS.gate} coins`)
    expect(grid.getFences()).toHaveLength(0)
    expect(wallet.getBalance()).toBe(COSTS.gate - 1)
  })

  it('previews without changing anything', () => {
    const { build, grid, wallet } = setup(100)
    build.setTool('tallFence')
    const target = build.preview(...aim({ x: 2, z: 2 }, 'w'))
    expect(target).toMatchObject({
      valid: true,
      kind: 'edge',
      action: 'place',
      cost: COSTS.tallFence,
    })
    expect(grid.getFences()).toHaveLength(0)
    expect(wallet.getBalance()).toBe(100)
  })

  it('returns null for an invalid aim point', () => {
    const { build } = setup()
    expect(build.preview(Number.NaN, 0)).toBeNull()
    expect(build.commit(Number.NaN, 0)).toEqual({
      ok: false,
      message: 'Aim at the ground',
      target: null,
    })
  })
})

describe('replacing a fence', () => {
  it('upgrades a fence to a tall fence for the price difference plus a part refund', () => {
    const { place, grid, wallet } = setup(100)
    place('fence', { x: 2, z: 2 }, 'n')
    const before = wallet.getBalance()

    const result = place('tallFence', { x: 2, z: 2 }, 'n')
    expect(result.ok).toBe(true)
    expect(result.target?.action).toBe('replace')
    expect(grid.getFence({ x: 2, z: 2, axis: 'h' })).toMatchObject({ tall: true, gate: false })
    expect(wallet.getBalance()).toBe(
      before - COSTS.tallFence + Math.floor(COSTS.fence * REFUND_FRACTION)
    )
  })

  it('turns a fence into a gate', () => {
    const { place, grid } = setup()
    place('fence', { x: 2, z: 2 }, 'e')
    place('gate', { x: 2, z: 2 }, 'e')
    expect(grid.getFence({ x: 3, z: 2, axis: 'v' })).toMatchObject({ gate: true })
  })

  it('only needs the net cost to be affordable', () => {
    const { place, wallet } = setup(COSTS.fence)
    place('fence', { x: 2, z: 2 }, 'n') // spends everything
    expect(wallet.getBalance()).toBe(0)
    // A tall fence costs 6, refunds 1: net 5, which 0 coins can't cover.
    expect(place('tallFence', { x: 2, z: 2 }, 'n').ok).toBe(false)
  })
})

describe('props', () => {
  it('can only go inside a closed pen', () => {
    const { place, grid, wallet } = setup(1000)
    const open = place('trough', { x: 6, z: 6 }, 'mid')
    expect(open.ok).toBe(false)
    expect(open.message).toBe('Place this inside a closed pen')
    expect(grid.getProps({ x: 6, z: 6 })).toEqual([])
    expect(wallet.getBalance()).toBe(1000)
  })

  it('places a trough and a bin in a pen, which the pen then counts', () => {
    const { place, fenceRect, grid, wallet } = setup(1000)
    fenceRect(2, 2, 3, 3)
    const spent = 8 * COSTS.fence
    expect(wallet.getBalance()).toBe(1000 - spent)

    expect(place('trough', { x: 2, z: 2 }, 'mid').ok).toBe(true)
    expect(place('bin', { x: 3, z: 3 }, 'mid').ok).toBe(true)

    const pen = grid.getPens()[0]
    expect(pen.props.trough).toBe(1)
    expect(pen.props.bin).toBe(1)
    expect(wallet.getBalance()).toBe(1000 - spent - COSTS.trough - COSTS.bin)
  })

  it('allows one prop per cell', () => {
    const { place, fenceRect } = setup(1000)
    fenceRect(2, 2, 3, 3)
    place('toy', { x: 2, z: 2 }, 'mid')
    const second = place('shelter', { x: 2, z: 2 }, 'mid')
    expect(second.ok).toBe(false)
    expect(second.message).toBe('Cell is taken')
  })

  it('places each enrichment kind', () => {
    const { place, fenceRect, grid } = setup(1000)
    fenceRect(2, 2, 4, 4)
    place('toy', { x: 2, z: 2 }, 'mid')
    place('shelter', { x: 3, z: 2 }, 'mid')
    place('plant', { x: 4, z: 2 }, 'mid')
    expect(grid.getPens()[0].props).toMatchObject({ toy: 1, shelter: 1, plant: 1 })
  })
})

describe('roofs', () => {
  it('roofs a cell once, anywhere in the zone', () => {
    const { place, grid, wallet } = setup(100)
    expect(place('roof', { x: 6, z: 6 }, 'mid').ok).toBe(true)
    expect(grid.hasRoof({ x: 6, z: 6 })).toBe(true)
    expect(wallet.getBalance()).toBe(100 - COSTS.roof)
    expect(place('roof', { x: 6, z: 6 }, 'mid').message).toBe('Already roofed')
  })

  it('turns a fully roofed pen into an aviary', () => {
    const { place, fenceRect, grid } = setup(1000)
    fenceRect(2, 2, 3, 3)
    for (const cell of grid.getPens()[0].cells) place('roof', cell, 'mid')
    expect(grid.getPens()[0].enclosure).toBe('roofed')
  })
})

describe('removing', () => {
  it('removes a fence aimed at near its edge, refunding part of the cost', () => {
    const { place, grid, wallet } = setup(100)
    place('fence', { x: 2, z: 2 }, 'n')
    const before = wallet.getBalance()

    const result = place('remove', { x: 2, z: 2 }, 'n')
    expect(result.ok).toBe(true)
    expect(result.message).toBe('Removed fence')
    expect(grid.getFences()).toHaveLength(0)
    expect(wallet.getBalance()).toBe(before + Math.floor(COSTS.fence * REFUND_FRACTION))
  })

  it('refunds according to the kind of fence that was removed', () => {
    const { place, wallet } = setup(100)
    place('gate', { x: 2, z: 2 }, 'n')
    const before = wallet.getBalance()
    place('remove', { x: 2, z: 2 }, 'n')
    expect(wallet.getBalance()).toBe(before + Math.floor(COSTS.gate * REFUND_FRACTION))
  })

  it('removes a prop when aiming at the middle of its cell, not the fence', () => {
    const { place, fenceRect, grid, wallet } = setup(1000)
    fenceRect(2, 2, 3, 3)
    place('trough', { x: 2, z: 2 }, 'mid')
    const before = wallet.getBalance()

    const result = place('remove', { x: 2, z: 2 }, 'mid')
    expect(result.ok).toBe(true)
    expect(result.message).toBe('Removed trough')
    expect(grid.getProps({ x: 2, z: 2 })).toEqual([])
    expect(grid.getPens()).toHaveLength(1) // the pen is untouched
    expect(wallet.getBalance()).toBe(before + Math.floor(COSTS.trough * REFUND_FRACTION))
  })

  it('removes a roof once there is nothing else to remove', () => {
    const { place, grid } = setup(100)
    place('roof', { x: 6, z: 6 }, 'mid')
    expect(place('remove', { x: 6, z: 6 }, 'mid').ok).toBe(true)
    expect(grid.hasRoof({ x: 6, z: 6 })).toBe(false)
  })

  it('reports when there is nothing to remove, without charging', () => {
    const { place, wallet } = setup(100)
    const result = place('remove', { x: 6, z: 6 }, 'mid')
    expect(result.ok).toBe(false)
    expect(result.message).toBe('Nothing to remove here')
    expect(wallet.getBalance()).toBe(100)
  })

  it('opens a pen when one of its fences is removed', () => {
    const { place, fenceRect, grid } = setup(1000)
    fenceRect(2, 2, 3, 3)
    expect(grid.getPens()).toHaveLength(1)
    place('remove', { x: 2, z: 2 }, 'n')
    expect(grid.getPens()).toHaveLength(0)
  })
})

describe('grid edit events', () => {
  it('fire for every build action, including ones that do not change a pen', () => {
    const { place, grid } = setup(1000)
    let edits = 0
    grid.onEdit(() => edits++)
    place('fence', { x: 2, z: 2 }, 'n') // no pen formed
    place('roof', { x: 6, z: 6 }, 'mid')
    place('remove', { x: 6, z: 6 }, 'mid')
    expect(edits).toBe(3)
  })

  it('also fire when the grid is restored, so a view can redraw', () => {
    const { grid } = setup()
    let edits = 0
    grid.onEdit(() => edits++)
    grid.restore(grid.serialize())
    expect(edits).toBe(1)
  })
})
