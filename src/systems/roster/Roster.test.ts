import { describe, expect, it, vi } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { crossover, generateGenome } from '../creatures/genome'
import { ageTicksForStage, Roster, stageForAge } from './Roster'
import type { RosterChange } from './types'

const { AGE_STAGE_TICKS, STARTING_STATS } = GAME_CONFIG.ECONOMY

const founder = (seed = 1) => generateGenome(seed)

describe('stageForAge', () => {
  it('moves hatchling → juvenile → adult at the configured tick counts', () => {
    expect(stageForAge(0)).toBe('hatchling')
    expect(stageForAge(AGE_STAGE_TICKS.hatchling - 1)).toBe('hatchling')
    expect(stageForAge(AGE_STAGE_TICKS.hatchling)).toBe('juvenile')
    const adultAt = AGE_STAGE_TICKS.hatchling + AGE_STAGE_TICKS.juvenile
    expect(stageForAge(adultAt - 1)).toBe('juvenile')
    expect(stageForAge(adultAt)).toBe('adult')
    expect(stageForAge(adultAt * 100)).toBe('adult')
  })

  it('round-trips with ageTicksForStage', () => {
    for (const stage of ['hatchling', 'juvenile', 'adult'] as const) {
      expect(stageForAge(ageTicksForStage(stage))).toBe(stage)
    }
  })
})

describe('Roster.add', () => {
  it('stores a founder as an adult with starting stats and a generated name', () => {
    const roster = new Roster()
    const c = roster.add(founder())

    expect(c.id).toBe('c1')
    expect(c.ageStage).toBe('adult')
    expect(c.generation).toBe(0)
    expect(c.parentIds).toBeNull()
    expect(c.penId).toBeNull()
    expect(c.fullness).toBe(STARTING_STATS.fullness)
    expect(c.happiness).toBe(STARTING_STATS.happiness)
    expect(c.trust).toBe(STARTING_STATS.trust)
    expect(c.name.length).toBeGreaterThan(0)
    expect(roster.count()).toBe(1)
  })

  it('gives each creature a unique id', () => {
    const roster = new Roster()
    const ids = [1, 2, 3].map((seed) => roster.add(founder(seed)).id)
    expect(new Set(ids).size).toBe(3)
  })

  it('copies the genome so outside edits cannot change an owned creature', () => {
    const roster = new Roster()
    const genome = founder()
    const c = roster.add(genome)
    genome.size = genome.size === 'tiny' ? 'huge' : 'tiny'
    expect(c.genome.size).not.toBe(genome.size)
  })

  it('applies custom name, pen, stats, stage and clamps stats', () => {
    const roster = new Roster()
    const c = roster.add(founder(), {
      name: '  Moss  ',
      penId: 'pen-1',
      ageStage: 'hatchling',
      acquiredTick: 42,
      stats: { fullness: 500, happiness: -20, trust: 10 },
    })
    expect(c.name).toBe('Moss')
    expect(c.penId).toBe('pen-1')
    expect(c.ageStage).toBe('hatchling')
    expect(c.ageTicks).toBe(0)
    expect(c.acquiredTick).toBe(42)
    expect([c.fullness, c.happiness, c.trust]).toEqual([100, 0, 10])
  })
})

describe('Roster.remove / queries', () => {
  it('removes and reports unknown ids', () => {
    const roster = new Roster()
    const c = roster.add(founder())
    expect(roster.remove(c.id)?.id).toBe(c.id)
    expect(roster.has(c.id)).toBe(false)
    expect(roster.remove(c.id)).toBeNull()
    expect(roster.get('nope')).toBeUndefined()
  })

  it('never reuses the id of a removed creature', () => {
    const roster = new Roster()
    const a = roster.add(founder(1))
    roster.remove(a.id)
    expect(roster.add(founder(2)).id).not.toBe(a.id)
  })

  it('lists in acquisition order and filters by pen', () => {
    const roster = new Roster()
    const a = roster.add(founder(1), { penId: 'p1' })
    const b = roster.add(founder(2))
    const c = roster.add(founder(3), { penId: 'p1' })

    expect(roster.list().map((x) => x.id)).toEqual([a.id, b.id, c.id])
    expect(roster.getByPen('p1').map((x) => x.id)).toEqual([a.id, c.id])
    expect(roster.getUnassigned().map((x) => x.id)).toEqual([b.id])
  })
})

describe('Roster.assignToPen', () => {
  it('moves a creature between pens and out of them', () => {
    const roster = new Roster()
    const c = roster.add(founder())
    expect(roster.assignToPen(c.id, 'p1')).toBe(true)
    expect(roster.get(c.id)?.penId).toBe('p1')
    expect(roster.assignToPen(c.id, 'p1')).toBe(false) // no change
    expect(roster.assignToPen(c.id, null)).toBe(true)
    expect(roster.getUnassigned()).toHaveLength(1)
    expect(roster.assignToPen('missing', 'p1')).toBe(false)
  })
})

describe('Roster.adjustStats', () => {
  it('adds deltas and clamps to 0..100', () => {
    const roster = new Roster()
    const c = roster.add(founder())
    roster.adjustStats(c.id, { fullness: -1000, happiness: 1000, trust: 5 })
    expect(c.fullness).toBe(0)
    expect(c.happiness).toBe(100)
    expect(c.trust).toBe(STARTING_STATS.trust + 5)
  })

  it('ignores non-finite deltas and unknown creatures', () => {
    const roster = new Roster()
    const c = roster.add(founder())
    const before = { ...c }
    expect(
      roster.adjustStats(c.id, { fullness: Number.NaN, trust: Number.POSITIVE_INFINITY })
    ).toBe(true)
    expect(c.fullness).toBe(before.fullness)
    expect(c.trust).toBe(before.trust)
    expect(roster.adjustStats('missing', { trust: 1 })).toBe(false)
  })

  it('only notifies when something actually changed', () => {
    const roster = new Roster()
    const c = roster.add(founder(), { stats: { trust: 100 } })
    const listener = vi.fn()
    roster.onChange(listener)

    roster.adjustStats(c.id, { trust: 10 }) // already at max
    roster.adjustStats(c.id, { trust: 0 })
    expect(listener).not.toHaveBeenCalled()

    roster.adjustStats(c.id, { trust: -10 })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('Roster.advanceTicks', () => {
  it('ages creatures and notifies only on stage changes', () => {
    const roster = new Roster()
    const baby = roster.add(founder(), { ageStage: 'hatchling' })
    const adult = roster.add(founder(2)) // adult
    const changes: RosterChange[] = []
    roster.onChange((c) => changes.push(c))

    roster.advanceTicks(AGE_STAGE_TICKS.hatchling - 1)
    expect(changes).toHaveLength(0)
    expect(baby.ageStage).toBe('hatchling')

    roster.advanceTicks(1)
    expect(baby.ageStage).toBe('juvenile')
    expect(changes).toHaveLength(1)
    expect(changes[0].reason).toBe('stage')

    roster.advanceTicks(AGE_STAGE_TICKS.juvenile)
    expect(baby.ageStage).toBe('adult')
    expect(adult.ageStage).toBe('adult')
    expect(changes).toHaveLength(2)
  })

  it('ignores invalid tick counts', () => {
    const roster = new Roster()
    const c = roster.add(founder(), { ageStage: 'hatchling' })
    roster.advanceTicks(-5)
    roster.advanceTicks(1.5)
    roster.advanceTicks(Number.NaN)
    roster.advanceTicks(0)
    expect(c.ageTicks).toBe(0)
  })

  it('ages the same whether ticks arrive one at a time or in one batch', () => {
    const a = new Roster()
    const b = new Roster()
    const ca = a.add(founder(), { ageStage: 'hatchling' })
    const cb = b.add(founder(), { ageStage: 'hatchling' })
    for (let i = 0; i < 700; i++) a.advanceTicks(1)
    b.advanceTicks(700)
    expect(ca.ageTicks).toBe(cb.ageTicks)
    expect(ca.ageStage).toBe(cb.ageStage)
  })
})

describe('Roster lineage', () => {
  it('tracks parents, children and generation', () => {
    const roster = new Roster()
    const mum = roster.add(founder(1))
    const dad = roster.add(founder(2))
    const childGenome = crossover(mum.genome, dad.genome, 99)
    const kid = roster.add(childGenome, { parentIds: [mum.id, dad.id], ageStage: 'hatchling' })
    const grandKid = roster.add(crossover(kid.genome, mum.genome, 7), {
      parentIds: [kid.id, mum.id],
    })

    expect(kid.generation).toBe(1)
    expect(grandKid.generation).toBe(2) // one past the older parent
    expect(roster.getParents(kid.id).map((p) => p.id)).toEqual([mum.id, dad.id])
    expect(roster.getChildren(mum.id).map((c) => c.id)).toEqual([kid.id, grandKid.id])
    expect(roster.getChildren(dad.id).map((c) => c.id)).toEqual([kid.id])
  })

  it('keeps lineage ids after a parent is sold', () => {
    const roster = new Roster()
    const mum = roster.add(founder(1))
    const dad = roster.add(founder(2))
    const kid = roster.add(crossover(mum.genome, dad.genome, 5), { parentIds: [mum.id, dad.id] })

    roster.remove(dad.id)
    expect(kid.parentIds).toEqual([mum.id, dad.id])
    expect(roster.getParents(kid.id).map((p) => p.id)).toEqual([mum.id])
  })

  it('treats a child of unknown parents as generation 1, unless told otherwise', () => {
    const roster = new Roster()
    expect(roster.add(founder(), { parentIds: ['x1', 'x2'] }).generation).toBe(1)
    expect(roster.add(founder(2), { parentIds: ['x1', 'x2'], generation: 5 }).generation).toBe(5)
  })
})

describe('Roster change events', () => {
  it('reports add, rename, pen and remove, and supports unsubscribing', () => {
    const roster = new Roster()
    const reasons: string[] = []
    const off = roster.onChange((c) => reasons.push(c.reason))

    const c = roster.add(founder())
    roster.rename(c.id, 'Pip')
    roster.assignToPen(c.id, 'p1')
    roster.remove(c.id)
    expect(reasons).toEqual(['added', 'name', 'pen', 'removed'])

    off()
    roster.add(founder(2))
    expect(reasons).toHaveLength(4)
  })

  it('rejects blank or unchanged names', () => {
    const roster = new Roster()
    const c = roster.add(founder(), { name: 'Pip' })
    expect(roster.rename(c.id, '   ')).toBe(false)
    expect(roster.rename(c.id, 'Pip')).toBe(false)
    expect(roster.rename('missing', 'X')).toBe(false)
  })
})

describe('Roster serialize / restore', () => {
  const build = () => {
    const roster = new Roster()
    const mum = roster.add(founder(1), { name: 'Mum', penId: 'p1' })
    const dad = roster.add(founder(2), { name: 'Dad' })
    roster.add(crossover(mum.genome, dad.genome, 11), {
      name: 'Kid',
      parentIds: [mum.id, dad.id],
      ageStage: 'hatchling',
    })
    roster.adjustStats(mum.id, { happiness: 25, fullness: -30 })
    roster.advanceTicks(50)
    return roster
  }

  it('round-trips everything, including bred genomes and lineage', () => {
    const original = build()
    const copy = new Roster()
    const result = copy.restore(JSON.parse(JSON.stringify(original.serialize())))

    expect(result).toEqual({ valid: true, restored: 3, dropped: 0 })
    expect(copy.list()).toEqual(original.list())
  })

  it('keeps issuing fresh ids after a restore', () => {
    const copy = new Roster()
    copy.restore(build().serialize())
    const next = copy.add(founder(9))
    expect(['c1', 'c2', 'c3']).not.toContain(next.id)
  })

  it('does not reuse an id even if the saved counter is stale', () => {
    const snapshot = build().serialize()
    snapshot.nextId = 1
    const copy = new Roster()
    copy.restore(snapshot)
    expect(copy.add(founder(9)).id).toBe('c4')
  })

  it('serialises a detached copy', () => {
    const roster = build()
    const snapshot = roster.serialize()
    snapshot.creatures[0].name = 'Tampered'
    expect(roster.list()[0].name).toBe('Mum')
  })

  it('drops corrupt, duplicate and malformed creatures but keeps the rest', () => {
    const snapshot = build().serialize() as unknown as {
      creatures: Record<string, unknown>[]
      nextId: number
      version: number
    }
    snapshot.creatures.push(
      { ...snapshot.creatures[0] }, // duplicate id
      { id: 'c99', genome: { bodyPlan: 'nonsense' } }, // malformed genome
      { id: 'bad id', genome: snapshot.creatures[0].genome }, // bad id
      null as never,
      'junk' as never
    )

    const copy = new Roster()
    const result = copy.restore(snapshot)
    expect(result).toEqual({ valid: true, restored: 3, dropped: 5 })
  })

  it('repairs out-of-range numbers and recomputes the stage from age', () => {
    const snapshot = build().serialize() as unknown as { creatures: Record<string, unknown>[] }
    Object.assign(snapshot.creatures[0], {
      fullness: 9999,
      happiness: -5,
      trust: 'lots',
      ageTicks: AGE_STAGE_TICKS.hatchling,
      ageStage: 'adult', // lies: should be juvenile
      parentIds: ['only-one'],
      penId: 42,
    })

    const copy = new Roster()
    copy.restore(snapshot)
    const c = copy.list()[0]
    expect(c.fullness).toBe(100)
    expect(c.happiness).toBe(0)
    expect(c.trust).toBe(STARTING_STATS.trust)
    expect(c.ageStage).toBe('juvenile')
    expect(c.parentIds).toBeNull()
    expect(c.penId).toBeNull()
  })

  it('leaves the roster untouched when the whole snapshot is unusable', () => {
    const roster = build()
    for (const bad of [null, undefined, 'x', 42, [], {}, { version: 2, creatures: [] }]) {
      expect(roster.restore(bad)).toEqual({ valid: false, restored: 0, dropped: 0 })
    }
    expect(roster.count()).toBe(3)
  })
})
