import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { ArenaSystem } from '../arena'
import { BreedingSystem } from '../breeding'
import { CareSystem } from '../care'
import { Codex } from '../codex'
import { ContractBoard } from '../contracts'
import { generateGenome } from '../creatures/genome'
import { CurrencyManager } from '../currency'
import { SimClock } from '../economy'
import { FoodManager } from '../food'
import { MapManager } from '../maps'
import { MarketSystem } from '../market'
import { PenGrid } from '../park'
import { ProductionSystem, ResourceInventory } from '../production'
import { Roster } from '../roster'
import {
  awayMinutes,
  capturePark,
  PARK_SAVE_VERSION,
  type ParkTargets,
  restorePark,
} from './ParkSave'

const E = GAME_CONFIG.ECONOMY
const CYCLE = E.FEED_CYCLE_TICKS

/** A complete set of ranch systems wired to the clock exactly as the game wires them. */
function newWorld(): ParkTargets & { advance: (seconds: number) => void } {
  const clock = new SimClock()
  const roster = new Roster()
  const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 9, maxZ: 9 })
  const care = new CareSystem(roster, grid)
  const resources = new ResourceInventory()
  const production = new ProductionSystem(roster, grid, resources)
  const currency = new CurrencyManager(100)
  const market = new MarketSystem(roster, resources, currency)
  const food = new FoodManager()
  const contracts = new ContractBoard(roster, currency, 7)
  const maps = new MapManager()
  const arena = new ArenaSystem(roster, currency)
  const breeding = new BreedingSystem(roster, grid, currency, 1337)
  const codex = new Codex()
  roster.onChange((c) => {
    if (c.reason === 'added') codex.recordOwned(c.creature)
  })

  clock.onTick(() => roster.advanceTicks(1))
  clock.onTick((tick) => care.tick(tick))
  clock.onTick((tick) => production.tick(tick))
  clock.onTick(() => market.tick())
  clock.onTick((tick) => contracts.tick(tick))
  clock.onTick((tick) => breeding.tick(tick))

  return {
    clock,
    roster,
    grid,
    care,
    codex,
    breeding,
    production,
    resources,
    market,
    contracts,
    maps,
    arena,
    currency,
    food,
    advance: (seconds) => {
      clock.advanceRealTime(seconds)
    },
  }
}

/** A running ranch: a pen with a trough and bin, two creatures, food in the trough. */
function busyWorld() {
  const w = newWorld()
  for (let x = 2; x <= 4; x++) {
    w.grid.addFence({ x, z: 2, axis: 'h' })
    w.grid.addFence({ x, z: 5, axis: 'h' })
  }
  for (let z = 2; z <= 4; z++) {
    w.grid.addFence({ x: 2, z, axis: 'v' })
    w.grid.addFence({ x: 5, z, axis: 'v' })
  }
  const pen = w.grid.getPens()[0]
  w.grid.addProp({ x: 3, z: 3 }, 'trough')
  w.grid.addProp({ x: 4, z: 3 }, 'bin')
  w.grid.addProp({ x: 3, z: 4 }, 'toy')
  w.grid.addProp({ x: 2, z: 4 }, 'den')

  const a = w.roster.add(generateGenome(1), { name: 'Alpha', penId: pen.id })
  const b = w.roster.add(generateGenome(2), { name: 'Beta', penId: pen.id, ageStage: 'hatchling' })
  w.roster.add(generateGenome(3), { name: 'Stray' }) // no pen
  w.care.addFood(pen.id, 'berry', 12)
  w.care.addFood(pen.id, 'meat', 6)
  w.resources.add('fibre', 9)
  w.resources.add('shards', 2)
  w.market.sellResource('fibre', 4) // depresses demand
  w.food.addFood('berry', 3)
  // A breeding in progress: two adult parents in the den pen.
  const p1 = w.roster.add(
    { ...generateGenome(4), temperament: 'curious', size: 'medium' },
    { penId: pen.id, stats: { fullness: 90, happiness: 90, trust: 90 } }
  )
  const p2 = w.roster.add(
    { ...generateGenome(5), temperament: 'curious', size: 'medium' },
    { penId: pen.id, stats: { fullness: 90, happiness: 90, trust: 90 } }
  )
  w.arena?.restore({ version: 1, beaten: 2, fights: 5 })
  w.maps?.unlock('greenwood', w.currency, { ownedSpecies: 0 })
  const started = w.breeding.start(pen.id, p1.id, p2.id)
  if (!started.ok) throw new Error(`test setup: breeding did not start: ${started.reason}`)
  return { ...w, penId: pen.id, ids: [a.id, b.id] }
}

/** Everything observable about a world, for comparing two worlds. */
function snapshotOf(w: ParkTargets) {
  return {
    tick: w.clock.getTick(),
    coins: w.currency.getBalance(),
    roster: w.roster.list().map((c) => ({ ...c })),
    pens: w.grid.getPens().map((p) => ({ id: p.id, cells: p.cells.length, props: p.props })),
    care: w.care.serialize(),
    breeding: w.breeding.serialize(),
    codex: w.codex.serialize(),
    production: w.production.serialize(),
    resources: w.resources.getAll(),
    demand: w.market.serialize(),
    contracts: w.contracts?.serialize(),
    maps: w.maps?.serialize(),
    arena: w.arena?.serialize(),
    food: w.food.getInventory().map((i) => [i.id, i.quantity]),
  }
}

describe('capturePark', () => {
  it('produces plain JSON that survives a round trip', () => {
    const w = busyWorld()
    w.advance(CYCLE * 3)
    const save = capturePark(w, [11, 22], 1_000_000)
    expect(save.version).toBe(PARK_SAVE_VERSION)
    expect(save.savedAt).toBe(1_000_000)
    expect(save.capturedSeeds).toEqual([11, 22])
    expect(JSON.parse(JSON.stringify(save))).toEqual(save)
  })
})

describe('restorePark', () => {
  it('rebuilds an identical ranch in fresh systems', () => {
    const a = busyWorld()
    a.advance(CYCLE * 4)
    const save = JSON.parse(JSON.stringify(capturePark(a, [5], 5_000)))

    const b = newWorld()
    const result = restorePark(b, save, 5_000) // restored at the moment of saving: no time away
    expect(result.ok).toBe(true)
    expect(result.failed).toEqual([])
    expect(result.restored.sort()).toEqual(
      [
        'arena',
        'breeding',
        'captured',
        'care',
        'clock',
        'codex',
        'coins',
        'contracts',
        'food',
        'grid',
        'maps',
        'market',
        'production',
        'resources',
        'roster',
      ].sort()
    )
    expect(result.offlineTicks).toBe(0)
    expect(result.capturedSeeds).toEqual([5])
    expect(snapshotOf(b)).toEqual(snapshotOf(a))
  })

  it('keeps creatures, their pens and lineage intact', () => {
    const a = busyWorld()
    const save = JSON.parse(JSON.stringify(capturePark(a, [], 0)))
    const b = newWorld()
    restorePark(b, save, 0)

    expect(b.roster.count()).toBe(5) // Alpha, Beta, Stray and the two parents of the egg
    expect(b.roster.get(a.ids[0])?.name).toBe('Alpha')
    expect(b.roster.get(a.ids[1])?.ageStage).toBe('hatchling')
    expect(b.roster.getByPen(a.penId)).toHaveLength(4)
    expect(b.grid.getPen(a.penId)).toBeDefined() // same pen id after a reload
    expect(b.care.getTroughFood(a.penId)).toEqual({ berry: 12, meat: 6 })
    // New creatures keep getting fresh ids.
    expect(['c1', 'c2', 'c3']).not.toContain(b.roster.add(generateGenome(9)).id)
  })

  it('catches the economy up for time spent away, exactly as if it had kept running', () => {
    const AWAY = CYCLE * 10 // ten minutes

    // World A never stops.
    const a = busyWorld()
    a.advance(CYCLE * 2)
    const save = JSON.parse(JSON.stringify(capturePark(a, [], 1_000)))
    a.advance(AWAY)

    // World B is saved, closed, and reopened AWAY seconds later.
    const b = newWorld()
    const result = restorePark(b, save, 1_000 + AWAY * 1000)

    expect(result.offlineTicks).toBe(AWAY)
    expect(awayMinutes(result)).toBe(10)
    expect(snapshotOf(b)).toEqual(snapshotOf(a))
    // And something actually happened while away: output stored, food eaten, creatures aged.
    expect(b.production.getBinTotal(a.penId)).toBeGreaterThan(0)
    expect(b.care.getTroughTotal(a.penId)).toBeLessThan(18)
    // The egg that was in progress hatched while away, in both worlds.
    expect(b.roster.count()).toBe(6)
    expect(b.breeding.getJobs()).toHaveLength(0)
  })

  it('caps catch-up at the offline limit', () => {
    const a = busyWorld()
    const save = JSON.parse(JSON.stringify(capturePark(a, [], 0)))
    const b = newWorld()
    const result = restorePark(b, save, 100 * 3600 * 1000) // away 100 hours
    expect(result.awaySeconds).toBe(100 * 3600)
    expect(result.offlineTicks).toBe(E.OFFLINE_CAP_SECONDS)
    expect(awayMinutes(result)).toBe(E.OFFLINE_CAP_SECONDS / 60)
  })

  it('does not run the clock backwards or ahead when the save is dated in the future', () => {
    const a = busyWorld()
    const save = JSON.parse(JSON.stringify(capturePark(a, [], 10_000)))
    const b = newWorld()
    const result = restorePark(b, save, 5_000) // device clock is earlier than the save
    expect(result.offlineTicks).toBe(0)
    expect(b.clock.getTick()).toBe(a.clock.getTick())
  })

  it('keeps going when one section is corrupt, losing only that section', () => {
    const a = busyWorld()
    a.advance(CYCLE * 2)
    const save = JSON.parse(JSON.stringify(capturePark(a, [], 0))) as Record<string, unknown>
    save.roster = { version: 99, junk: true }
    save.coins = 'a lot'
    save.market = null

    const b = newWorld()
    const result = restorePark(b, save, 0)
    expect(result.ok).toBe(true)
    expect(result.failed.sort()).toEqual(['coins', 'market', 'roster'])
    expect(result.restored).toContain('grid')
    expect(result.restored).toContain('care')
    expect(b.grid.getPens()).toHaveLength(1) // the pen survived
    expect(b.currency.getBalance()).toBe(100) // untouched default
    expect(b.roster.count()).toBe(0)
  })

  it('repairs bad food entries and coin values', () => {
    const a = busyWorld()
    const save = JSON.parse(JSON.stringify(capturePark(a, [], 0))) as Record<string, unknown>
    save.food = [
      { id: 'berry', quantity: 4 },
      { id: 'berry', quantity: 2.5 },
      { id: 'pizza', quantity: 3 },
      { id: 'meat', quantity: -1 },
      { id: 'fish', quantity: 1e9 },
      null,
      'junk',
    ]
    save.coins = 12.9

    const b = newWorld()
    restorePark(b, save, 0)
    const inv = Object.fromEntries(b.food.getInventory().map((i) => [i.id, i.quantity]))
    expect(inv).toEqual({ berry: 4, fish: 9999 })
    expect(b.currency.getBalance()).toBe(12)
  })

  it('filters junk out of the captured-creature list', () => {
    const a = busyWorld()
    const save = JSON.parse(JSON.stringify(capturePark(a, [1, 2], 0))) as Record<string, unknown>
    save.capturedSeeds = [1, 'two', Number.NaN, null, 3]
    const b = newWorld()
    expect(restorePark(b, save, 0).capturedSeeds).toEqual([1, 3])
  })

  it('rebuilds the codex from the roster when loading a save that predates it', () => {
    const a = busyWorld()
    const save = JSON.parse(JSON.stringify(capturePark(a, [], 0))) as Record<string, unknown>
    save.codex = undefined
    const b = newWorld()
    const result = restorePark(b, save, 0)
    expect(result.failed).toEqual([])
    expect(b.codex.ownedCount()).toBeGreaterThan(0)
    expect(b.codex.ownedCount()).toBe(new Set(b.roster.list().map((c) => c.genome.speciesId)).size)
  })

  it('refuses data that is not a park save, without changing anything', () => {
    const b = busyWorld()
    const before = snapshotOf(b)
    for (const bad of [null, undefined, 42, 'x', [], {}, { version: 2 }, { version: 'one' }]) {
      const result = restorePark(b, bad, 0)
      expect(result.ok).toBe(false)
      expect(result.restored).toEqual([])
    }
    expect(snapshotOf(b)).toEqual(before)
  })

  it('never throws on hostile data', () => {
    const b = newWorld()
    const hostile = {
      version: 1,
      savedAt: 'later',
      coins: {},
      food: 'berry',
      clock: [],
      roster: { version: 1, nextId: 'x', creatures: [{ id: 'c1', genome: { bodyPlan: 7 } }] },
      grid: { version: 1, bounds: {}, fences: 7 },
      care: { version: 1, troughs: 5 },
      production: { version: 1, bins: {} },
      resources: [],
      market: { version: 1, demand: 'high' },
      capturedSeeds: 9,
    }
    expect(() => restorePark(b, hostile, 0)).not.toThrow()
    expect(restorePark(b, hostile, 0).ok).toBe(true)
  })
})
