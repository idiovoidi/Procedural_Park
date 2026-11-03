import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import type { Genome } from '../creatures/genome'
import { generateGenome } from '../creatures/genome'
import { RESOURCE_BY_ARCHETYPE, SimClock } from '../economy'
import { PenGrid } from '../park'
import { Roster } from '../roster'
import { happinessMultiplier, outputPerCycle } from './output'
import { ProductionSystem } from './ProductionSystem'
import { RESOURCE_TYPES, ResourceInventory } from './ResourceInventory'

const E = GAME_CONFIG.ECONOMY
const CYCLE = E.PRODUCTION_CYCLE_TICKS
const BIN = E.PRODUCTION.BIN_CAPACITY_UNITS

const genome = (overrides: Partial<Genome> = {}): Genome => ({
  ...generateGenome(1),
  archetype: 'terrestrial',
  size: 'medium',
  temperament: 'shy',
  locomotion: 'walk',
  bodyPlan: 'quadruped',
  rarity: 0.1,
  speciesId: 1,
  ...overrides,
})

const inputs = (
  overrides: Partial<Genome> = {},
  happiness = 75,
  ageStage: 'hatchling' | 'juvenile' | 'adult' = 'adult'
) => ({ genome: genome(overrides), happiness, ageStage })

describe('happinessMultiplier', () => {
  it('maps 0..100 onto the configured range, hitting 1x at 75', () => {
    expect(happinessMultiplier(0)).toBe(E.HAPPINESS_MULTIPLIER.min)
    expect(happinessMultiplier(100)).toBe(E.HAPPINESS_MULTIPLIER.max)
    expect(happinessMultiplier(75)).toBeCloseTo(1, 10)
  })

  it('clamps out-of-range and invalid happiness', () => {
    expect(happinessMultiplier(-50)).toBe(E.HAPPINESS_MULTIPLIER.min)
    expect(happinessMultiplier(500)).toBe(E.HAPPINESS_MULTIPLIER.max)
    expect(happinessMultiplier(Number.NaN)).toBe(E.HAPPINESS_MULTIPLIER.min)
  })
})

describe('outputPerCycle (GDD 7.5)', () => {
  it('yields the base output for a medium, common adult at 75 happiness', () => {
    expect(outputPerCycle(inputs())).toBeCloseTo(E.BASE_OUTPUT_PER_CYCLE.terrestrial, 10)
  })

  it('uses each archetype’s own base output', () => {
    for (const archetype of [
      'terrestrial',
      'aerial',
      'aquatic',
      'ethereal',
      'crystalline',
    ] as const) {
      expect(outputPerCycle(inputs({ archetype }))).toBeCloseTo(
        E.BASE_OUTPUT_PER_CYCLE[archetype],
        10
      )
    }
  })

  it('multiplies by size, rarity tier, happiness and age', () => {
    const base = E.BASE_OUTPUT_PER_CYCLE.terrestrial
    expect(outputPerCycle(inputs({ size: 'huge' }))).toBeCloseTo(base * 2, 10)
    expect(outputPerCycle(inputs({ size: 'tiny' }))).toBeCloseTo(base * 0.5, 10)
    expect(outputPerCycle(inputs({ rarity: 0.99 }))).toBeCloseTo(base * 7, 10) // legendary
    expect(outputPerCycle(inputs({ rarity: 0.5 }))).toBeCloseTo(base * 1.6, 10) // uncommon
    expect(outputPerCycle(inputs({}, 100))).toBeCloseTo(base * 1.25, 10)
    expect(outputPerCycle(inputs({}, 0))).toBeCloseTo(base * 0.25, 10)
    expect(outputPerCycle(inputs({}, 75, 'hatchling'))).toBeCloseTo(base * 0.25, 10)
    expect(outputPerCycle(inputs({}, 75, 'juvenile'))).toBeCloseTo(base * 0.6, 10)
  })

  it('compounds every factor together', () => {
    // crystalline 3 x large 1.5 x epic 4 x happiness 100 (1.25) x juvenile 0.6
    const expected = 3 * 1.5 * 4 * 1.25 * 0.6
    expect(
      outputPerCycle(
        inputs({ archetype: 'crystalline', size: 'large', rarity: 0.85 }, 100, 'juvenile')
      )
    ).toBeCloseTo(expected, 10)
  })
})

describe('ResourceInventory', () => {
  it('adds and removes whole units', () => {
    const inv = new ResourceInventory()
    expect(inv.add('fibre', 5.9)).toBe(5)
    expect(inv.get('fibre')).toBe(5)
    expect(inv.remove('fibre', 3)).toBe(true)
    expect(inv.get('fibre')).toBe(2)
    expect(inv.total()).toBe(2)
  })

  it('refuses to go negative and ignores nonsense', () => {
    const inv = new ResourceInventory()
    inv.add('down', 2)
    expect(inv.remove('down', 3)).toBe(false)
    expect(inv.get('down')).toBe(2)
    expect(inv.add('down', -4)).toBe(0)
    expect(inv.add('down', 0.5)).toBe(0)
    expect(inv.add('down', Number.NaN)).toBe(0)
    expect(inv.add('gold' as never, 5)).toBe(0)
    expect(inv.remove('down', 1.5)).toBe(false)
    expect(inv.remove('down', 0)).toBe(false)
  })

  it('reports all five resources and notifies on change', () => {
    const inv = new ResourceInventory()
    let calls = 0
    const off = inv.onChange(() => calls++)
    inv.add('shards', 1)
    inv.remove('shards', 1)
    expect(calls).toBe(2)
    off()
    inv.add('shards', 1)
    expect(calls).toBe(2)
    expect(Object.keys(inv.getAll()).sort()).toEqual([...RESOURCE_TYPES].sort())
  })

  it('round-trips and repairs a snapshot', () => {
    const a = new ResourceInventory()
    a.add('brine', 7)
    a.add('essence', 2)
    const b = new ResourceInventory()
    expect(b.restore(JSON.parse(JSON.stringify(a.serialize())))).toBe(true)
    expect(b.getAll()).toEqual(a.getAll())

    expect(b.restore({ version: 1, amounts: { brine: -3, shards: 1.5, fibre: 4, gold: 9 } })).toBe(
      true
    )
    expect(b.getAll()).toEqual({ fibre: 4, down: 0, brine: 0, essence: 0, shards: 0 })
    expect(b.restore(null)).toBe(false)
    expect(b.restore({ version: 2, amounts: {} })).toBe(false)
  })
})

/** A 3x3 pen with `bins` collector bins, and a roster creature living in it. */
function setup(options: { bins?: number } = {}) {
  const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 9, maxZ: 9 })
  for (let x = 1; x <= 3; x++) {
    grid.addFence({ x, z: 1, axis: 'h' })
    grid.addFence({ x, z: 4, axis: 'h' })
  }
  for (let z = 1; z <= 3; z++) {
    grid.addFence({ x: 1, z, axis: 'v' })
    grid.addFence({ x: 4, z, axis: 'v' })
  }
  const penId = grid.getPens()[0].id
  for (let i = 0; i < (options.bins ?? 1); i++) grid.addProp({ x: 2, z: 2 }, 'bin')

  const roster = new Roster()
  const inventory = new ResourceInventory()
  const production = new ProductionSystem(roster, grid, inventory)
  let cycle = 0
  const runCycles = (n: number) => {
    for (let i = 0; i < n; i++) production.tick(++cycle * CYCLE)
  }
  // Happiness 75 and a full stomach makes the output exactly the base value.
  const add = (g: Genome = genome(), stats = { happiness: 75, fullness: 100 }) =>
    roster.add(g, { penId, stats })
  return { grid, penId, roster, inventory, production, runCycles, add }
}

describe('ProductionSystem', () => {
  it('does nothing between production cycles', () => {
    const { production, add, penId } = setup()
    add()
    expect(production.tick(1)).toBeNull()
    expect(production.tick(CYCLE - 1)).toBeNull()
    expect(production.getBinTotal(penId)).toBe(0)
  })

  it('stores the creature’s archetype resource in the pen bin each cycle', () => {
    const { production, add, runCycles, penId } = setup()
    add()
    runCycles(1)
    expect(production.getBin(penId)).toEqual({ fibre: E.BASE_OUTPUT_PER_CYCLE.terrestrial })
    runCycles(2)
    expect(production.getBinTotal(penId)).toBeCloseTo(3 * E.BASE_OUTPUT_PER_CYCLE.terrestrial, 10)
    expect(production.getLastCycle()?.producers).toBe(1)
  })

  it('produces a different resource for each archetype', () => {
    const { production, add, runCycles, penId } = setup()
    add(genome({ archetype: 'terrestrial', speciesId: 1 }))
    add(genome({ archetype: 'crystalline', speciesId: 2 }))
    add(genome({ archetype: 'ethereal', speciesId: 3 }))
    runCycles(1)
    expect(Object.keys(production.getBin(penId)).sort()).toEqual(['essence', 'fibre', 'shards'])
    expect(RESOURCE_BY_ARCHETYPE.ethereal).toBe('essence')
  })

  it('stops at bin capacity and counts the rest as wasted', () => {
    const { production, add, runCycles, penId } = setup({ bins: 1 })
    add(genome({ size: 'huge' })) // 12 per cycle
    runCycles(10) // 120 produced, 100 fits
    expect(production.getBinTotal(penId)).toBe(BIN)
    runCycles(1)
    expect(production.getBinTotal(penId)).toBe(BIN)
    expect(production.getLastCycle()?.wasted).toBeCloseTo(12, 10)
    expect(production.getLastCycle()?.stored).toEqual({})
  })

  it('scales capacity with the number of bins', () => {
    const { production, penId } = setup({ bins: 3 })
    expect(production.getBinCapacity(penId)).toBe(3 * BIN)
    expect(production.getBinCapacity('not-a-pen')).toBe(0)
  })

  it('wastes everything in a pen with no bin', () => {
    const { production, add, runCycles, penId } = setup({ bins: 0 })
    add()
    runCycles(2)
    expect(production.getBinTotal(penId)).toBe(0)
    expect(production.getLastCycle()?.wasted).toBeCloseTo(E.BASE_OUTPUT_PER_CYCLE.terrestrial, 10)
    expect(production.getLastCycle()?.producers).toBe(1)
  })

  it('shares one capacity between all resource types', () => {
    const { production, add, runCycles, penId } = setup({ bins: 1 })
    add(genome({ archetype: 'terrestrial', size: 'huge', speciesId: 1 })) // 12
    add(genome({ archetype: 'aerial', size: 'huge', speciesId: 2 })) // 10
    runCycles(10) // 220 produced against 100 capacity
    expect(production.getBinTotal(penId)).toBeLessThanOrEqual(BIN + 1e-9)
    expect(production.getBinTotal(penId)).toBeGreaterThan(BIN - 1e-9)
  })

  it('skips starving creatures, creatures without a pen, and creatures in an open pen', () => {
    const { production, add, runCycles, roster, grid, penId } = setup()
    add(genome(), { happiness: 75, fullness: 0 }) // starving
    roster.add(genome({ speciesId: 2 }), { stats: { happiness: 75, fullness: 100 } }) // no pen
    runCycles(1)
    expect(production.getBinTotal(penId)).toBe(0)

    const fed = add(genome({ speciesId: 3 }))
    grid.removeFence({ x: 1, z: 1, axis: 'h' }) // pen opens
    runCycles(1)
    expect(production.getBinTotal(penId)).toBe(0)

    grid.addFence({ x: 1, z: 1, axis: 'h' }) // closes again
    runCycles(1)
    expect(production.getBinTotal(penId)).toBeCloseTo(
      outputPerCycle(roster.get(fed.id) as never),
      10
    )
  })

  it('produces less from a less happy creature', () => {
    const happy = setup()
    happy.add(genome(), { happiness: 100, fullness: 100 })
    happy.runCycles(1)
    const sad = setup()
    sad.add(genome(), { happiness: 0, fullness: 100 })
    sad.runCycles(1)
    expect(happy.production.getBinTotal(happy.penId)).toBeGreaterThan(
      sad.production.getBinTotal(sad.penId) * 4
    )
  })
})

describe('collect', () => {
  it('moves whole units to the inventory and leaves fractions behind', () => {
    const { production, inventory, add, runCycles, penId } = setup()
    add(genome(), { happiness: 100, fullness: 100 }) // 6 x 1.25 = 7.5
    runCycles(1)

    const collected = production.collect(penId)
    expect(collected).toEqual({ fibre: 7 })
    expect(inventory.get('fibre')).toBe(7)
    expect(production.getBin(penId).fibre).toBeCloseTo(0.5, 10)

    runCycles(1) // another 7.5 -> 8 whole
    expect(production.collect(penId)).toEqual({ fibre: 8 })
    expect(inventory.get('fibre')).toBe(15)
  })

  it('frees bin space so production resumes', () => {
    const { production, add, runCycles, penId } = setup()
    add(genome({ size: 'huge' }))
    runCycles(20)
    expect(production.getBinTotal(penId)).toBe(BIN)
    production.collect(penId)
    runCycles(1)
    expect(production.getLastCycle()?.stored.fibre).toBeGreaterThan(0)
  })

  it('returns nothing for an empty or unknown pen', () => {
    const { production, penId } = setup()
    expect(production.collect(penId)).toEqual({})
    expect(production.collect('nope')).toEqual({})
  })
})

describe('save and restore', () => {
  it('round-trips bin contents and repairs bad data', () => {
    const a = setup()
    a.add(genome({ archetype: 'aquatic' }))
    a.runCycles(2)

    const b = setup()
    expect(b.production.restore(JSON.parse(JSON.stringify(a.production.serialize())))).toBe(true)
    expect(b.production.getBin(b.penId)).toEqual(a.production.getBin(a.penId))

    expect(
      b.production.restore({
        version: 1,
        bins: [
          { penId: b.penId, contents: { fibre: 3, down: -1, brine: Number.NaN, gold: 5 } },
          null,
        ],
      })
    ).toBe(true)
    expect(b.production.getBin(b.penId)).toEqual({ fibre: 3 })
    expect(b.production.restore({ version: 9 })).toBe(false)
  })
})

describe('with the economy clock', () => {
  it('gives the same result however time is split', () => {
    const run = (frames: number[]) => {
      const { production, add, penId } = setup()
      add()
      const clock = new SimClock(1, 1000)
      clock.onTick((t) => production.tick(t))
      for (const dt of frames) clock.advanceRealTime(dt)
      return production.getBinTotal(penId)
    }
    const oneJump = run([CYCLE * 4])
    const smooth = run(Array.from({ length: CYCLE * 4 * 10 }, () => 0.1))
    expect(smooth).toBeCloseTo(oneJump, 10)
    expect(oneJump).toBeCloseTo(4 * E.BASE_OUTPUT_PER_CYCLE.terrestrial, 10)
  })
})
