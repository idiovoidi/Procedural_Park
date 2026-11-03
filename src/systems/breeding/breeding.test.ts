import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { crossover, type Genome, generateGenome, validateGenome } from '../creatures/genome'
import { CurrencyManager } from '../currency'
import { SimClock } from '../economy'
import { PenGrid } from '../park'
import { Roster } from '../roster'
import { BreedingSystem } from './BreedingSystem'
import { breedingCost, checkPairing, type PairingContext, rarityLift } from './pairing'
import { describeOffspring, sampleOffspring } from './preview'

const B = GAME_CONFIG.ECONOMY.BREEDING

const genome = (seed: number, overrides: Partial<Genome> = {}): Genome => ({
  ...generateGenome(seed),
  archetype: 'terrestrial',
  bodyPlan: 'quadruped',
  locomotion: 'walk',
  size: 'medium',
  temperament: 'curious',
  rarity: 0.1,
  ...overrides,
})

const GOOD = { fullness: 80, happiness: 80, trust: 80 }

/** A big pen (5x5 cells = 100 m2) with `dens` breeding dens, plus the systems around it. */
function setup(options: { dens?: number; coins?: number } = {}) {
  const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 19, maxZ: 9 })
  const fence = (x0: number, z0: number, n: number) => {
    for (let x = x0; x < x0 + n; x++) {
      grid.addFence({ x, z: z0, axis: 'h' })
      grid.addFence({ x, z: z0 + n, axis: 'h' })
    }
    for (let z = z0; z < z0 + n; z++) {
      grid.addFence({ x: x0, z, axis: 'v' })
      grid.addFence({ x: x0 + n, z, axis: 'v' })
    }
  }
  fence(1, 1, 5) // pen-1
  fence(10, 1, 3) // pen-2: a small second pen
  const penId = grid.getPenAt({ x: 2, z: 2 })?.id as string
  const otherPen = grid.getPenAt({ x: 11, z: 2 })?.id as string
  for (let i = 0; i < (options.dens ?? 1); i++) grid.addProp({ x: 1 + i, z: 1 }, 'den')

  const roster = new Roster()
  const wallet = new CurrencyManager(options.coins ?? 1000)
  const breeding = new BreedingSystem(roster, grid, wallet, 1337)
  const add = (g: Genome, stats = GOOD, extra = {}) => roster.add(g, { penId, stats, ...extra })
  const run = (from: number, to: number) => {
    const events = []
    for (let t = from; t <= to; t++) events.push(...breeding.tick(t))
    return events
  }
  return { grid, roster, wallet, breeding, penId, otherPen, add, run }
}

const ctx = (over: Partial<PairingContext> = {}): PairingContext => ({
  tick: 1000,
  readyTick: () => 0,
  isBusy: () => false,
  ...over,
})

describe('pairing rules', () => {
  const pair = (
    aOver: Partial<ReturnType<Roster['add']>> = {},
    bOver = {},
    ga = genome(1),
    gb = genome(2)
  ) => {
    const r = new Roster()
    const a = r.add(ga, { stats: GOOD })
    const b = r.add(gb, { stats: GOOD })
    return [Object.assign(a, aOver), Object.assign(b, bOver)] as const
  }

  it('accepts two happy, trusting, healthy adults', () => {
    const [a, b] = pair()
    expect(checkPairing(a, b, ctx())).toEqual([])
  })

  it('needs two different creatures', () => {
    const [a] = pair()
    expect(checkPairing(a, a, ctx())).toEqual(['Pick two different creatures'])
  })

  it('refuses young, starving, unhappy or distrustful parents, naming the one at fault', () => {
    const [a, b] = pair({ ageStage: 'juvenile' }, { fullness: 0 })
    const problems = checkPairing(a, b, ctx())
    expect(problems.some((p) => p.includes('is still growing up'))).toBe(true)
    expect(problems.some((p) => p.includes('is starving'))).toBe(true)

    const [c, d] = pair({ happiness: B.MIN_HAPPINESS - 1 }, { trust: B.MIN_TRUST - 1 })
    const p2 = checkPairing(c, d, ctx())
    expect(p2.some((p) => p.includes('not happy enough'))).toBe(true)
    expect(p2.some((p) => p.includes('does not trust you enough'))).toBe(true)
  })

  it('accepts parents exactly at the thresholds', () => {
    const [a, b] = pair(
      { happiness: B.MIN_HAPPINESS, trust: B.MIN_TRUST },
      { happiness: B.MIN_HAPPINESS, trust: B.MIN_TRUST }
    )
    expect(checkPairing(a, b, ctx())).toEqual([])
  })

  it('blocks parents that are busy or still resting', () => {
    const [a, b] = pair()
    expect(checkPairing(a, b, ctx({ isBusy: (id) => id === a.id }))[0]).toContain(
      'already breeding'
    )
    const resting = checkPairing(a, b, ctx({ readyTick: (id) => (id === b.id ? 1000 + 120 : 0) }))
    expect(resting[0]).toContain('needs to rest for 2 more min')
  })

  it('allows a one-class size gap but not more', () => {
    const [a, b] = pair({}, {}, genome(1, { size: 'medium' }), genome(2, { size: 'large' }))
    expect(checkPairing(a, b, ctx())).toEqual([])
    const [c, d] = pair({}, {}, genome(1, { size: 'tiny' }), genome(2, { size: 'large' }))
    expect(checkPairing(c, d, ctx())).toContain('They are too different in size')
  })

  it('refuses creatures that cannot share a pen', () => {
    const [a, b] = pair({}, {}, genome(1, { temperament: 'aggressive' }), genome(2))
    expect(checkPairing(a, b, ctx())).toContain('They cannot share a pen')
  })
})

describe('breedingCost', () => {
  it('is the base cost for common parents and rises with rarity', () => {
    expect(breedingCost(genome(1, { rarity: 0.1 }), genome(2, { rarity: 0.2 }))).toBe(B.BASE_COST)
    const rare = breedingCost(genome(1, { rarity: 0.99 }), genome(2, { rarity: 0.99 })) // tier 4
    expect(rare).toBe(Math.round(B.BASE_COST * (1 + B.COST_PER_TIER * 4)))
    expect(rare).toBeGreaterThan(B.BASE_COST)
  })
})

describe('offspring preview', () => {
  it('reports a single certain body when both parents share one', () => {
    const odds = describeOffspring(genome(1), genome(2))
    expect(odds.body).toHaveLength(1)
    expect(odds.body[0].chance).toBe(1)
    expect(odds.size).toEqual([{ label: 'medium', chance: 1 }])
  })

  it('splits evenly between two different bodies, sizes and temperaments', () => {
    const a = genome(1, {
      archetype: 'aerial',
      bodyPlan: 'winged_biped',
      locomotion: 'fly',
      size: 'small',
      temperament: 'shy',
    })
    const b = genome(2, { size: 'large', temperament: 'playful' })
    const odds = describeOffspring(a, b)
    expect(odds.body.map((o) => o.chance)).toEqual([0.5, 0.5])
    expect(odds.body.map((o) => o.label).sort()).toEqual([
      'aerial winged biped',
      'terrestrial quadruped',
    ])
    expect(odds.size.map((o) => o.label).sort()).toEqual(['large', 'small'])
    expect(odds.temperament.map((o) => o.chance)).toEqual([0.5, 0.5])
  })

  it('gives a rarity range around the parents’ average, with tier names', () => {
    const odds = describeOffspring(genome(1, { rarity: 0.5 }), genome(2, { rarity: 0.7 }))
    expect(odds.rarity.min).toBeCloseTo(0.55 + B.RARITY_LIFT, 10)
    expect(odds.rarity.max).toBeCloseTo(0.65 + B.RARITY_LIFT, 10)
    expect(odds.rarity.tierMin).toBe('uncommon')
    expect(odds.rarity.tierMax).toBe('rare')
  })

  it('keeps the range inside 0..1', () => {
    const odds = describeOffspring(genome(1, { rarity: 1 }), genome(2, { rarity: 1 }))
    expect(odds.rarity.max).toBe(1)
    expect(describeOffspring(genome(1, { rarity: 0 }), genome(2, { rarity: 0 })).rarity.min).toBe(0)
  })

  it('is deterministic and lists only parts that are possible, most likely first', () => {
    const a = genome(5)
    const b = genome(9)
    const odds = describeOffspring(a, b)
    expect(describeOffspring(a, b)).toEqual(odds)
    for (const part of odds.parts) {
      expect(part.chance).toBeGreaterThan(0)
      expect(part.chance).toBeLessThanOrEqual(1)
    }
    const chances = odds.parts.map((p) => p.chance)
    expect([...chances].sort((x, y) => y - x)).toEqual(chances)
    expect(odds.mutationChance).toBe(B.MUTATION_CHANCE)
  })

  it('shows valid example children, repeatably', () => {
    // Real generated genomes (the test helper's overrides can leave limbs inconsistent).
    const a = generateGenome(5)
    const b = generateGenome(9)
    const kids = sampleOffspring(a, b)
    expect(kids).toHaveLength(B.PREVIEW_CHILDREN)
    for (const k of kids) expect(validateGenome(k)).toEqual([])
    expect(sampleOffspring(a, b)).toEqual(kids)
    expect(sampleOffspring(a, b, 0)).toEqual([])
  })
})

describe('BreedingSystem.check', () => {
  it('needs a closed pen with a den, both parents in it, and the coins', () => {
    const { breeding, add, penId, otherPen, roster } = setup()
    const a = add(genome(1))
    const b = add(genome(2))
    expect(breeding.check(penId, a.id, b.id)).toEqual([])

    expect(breeding.check('pen-99', a.id, b.id)).toEqual(['That pen is not closed'])
    expect(breeding.check(otherPen, a.id, b.id)).toEqual(['This pen has no breeding den'])
    expect(breeding.check(penId, a.id, 'nope')).toEqual(['Pick two creatures'])

    const stranger = roster.add(genome(3), { stats: GOOD }) // no pen
    expect(breeding.check(penId, a.id, stranger.id)).toEqual(['Both parents must live in this pen'])
  })

  it('reports it when the player cannot afford it', () => {
    const { breeding, add, penId } = setup({ coins: 5 })
    const a = add(genome(1))
    const b = add(genome(2))
    expect(breeding.check(penId, a.id, b.id)).toEqual([`Breeding costs ${B.BASE_COST} coins`])
  })
})

describe('BreedingSystem.start and hatch', () => {
  it('charges the cost and hatches after the gestation time', () => {
    const { breeding, add, penId, wallet, roster, run } = setup()
    const a = add(genome(1))
    const b = add(genome(2))

    const started = breeding.start(penId, a.id, b.id)
    expect(started.ok).toBe(true)
    expect(wallet.getBalance()).toBe(1000 - B.BASE_COST)
    expect(breeding.getJobs()).toHaveLength(1)

    expect(run(1, B.GESTATION_TICKS - 1)).toEqual([]) // not yet
    expect(roster.count()).toBe(2)

    const [event] = run(B.GESTATION_TICKS, B.GESTATION_TICKS)
    expect(event).toBeDefined()
    expect(roster.count()).toBe(3)
    expect(breeding.getJobs()).toHaveLength(0)

    const baby = event.child
    expect(baby.ageStage).toBe('hatchling')
    expect(baby.parentIds).toEqual([a.id, b.id])
    expect(baby.generation).toBe(1)
    expect(baby.penId).toBe(penId)
    expect(baby.fullness).toBe(B.NEWBORN_STATS.fullness)
    expect(validateGenome(baby.genome)).toEqual([])
    expect(event.parentNames).toEqual([a.name, b.name])
  })

  it('takes a den for the whole gestation, so a one-den pen is busy meanwhile', () => {
    const { breeding, add, penId } = setup({ dens: 1 })
    const [a, b, c, d] = [genome(1), genome(2), genome(3), genome(4)].map((g) => add(g))
    expect(breeding.start(penId, a.id, b.id).ok).toBe(true)
    expect(breeding.getDenStatus(penId)).toEqual({ dens: 1, busy: 1, free: 0 })
    const second = breeding.start(penId, c.id, d.id)
    expect(second).toEqual({ ok: false, reason: 'Every den here is busy' })
  })

  it('runs several breedings at once with several dens', () => {
    const { breeding, add, penId } = setup({ dens: 2 })
    const [a, b, c, d] = [genome(1), genome(2), genome(3), genome(4)].map((g) => add(g))
    expect(breeding.start(penId, a.id, b.id).ok).toBe(true)
    expect(breeding.start(penId, c.id, d.id).ok).toBe(true)
    expect(breeding.getDenStatus(penId).free).toBe(0)
  })

  it('does not let a creature breed twice at once', () => {
    const { breeding, add, penId } = setup({ dens: 2 })
    const [a, b, c] = [genome(1), genome(2), genome(3)].map((g) => add(g))
    breeding.start(penId, a.id, b.id)
    const result = breeding.start(penId, a.id, c.id)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('already breeding')
  })

  it('refuses without charging when a rule is broken', () => {
    const { breeding, add, penId, wallet } = setup()
    const a = add(genome(1))
    const b = add(genome(2), { fullness: 80, happiness: 10, trust: 80 })
    const result = breeding.start(penId, a.id, b.id)
    expect(result.ok).toBe(false)
    expect(wallet.getBalance()).toBe(1000)
    expect(breeding.getJobs()).toHaveLength(0)
  })

  it('makes the same child for the same pair and job, and different children for different jobs', () => {
    const make = () => {
      const w = setup({ dens: 1 })
      const a = w.add(genome(1))
      const b = w.add(genome(2))
      w.breeding.start(w.penId, a.id, b.id)
      return w.run(1, B.GESTATION_TICKS)[0].child.genome
    }
    expect(make()).toEqual(make())

    const w = setup({ dens: 1 })
    const a = w.add(genome(1))
    const b = w.add(genome(2))
    const seeds = new Set<number>()
    let t = 1
    for (let i = 0; i < 5; i++) {
      // Let the parents rest and refresh their mood between litters.
      w.roster.adjustStats(a.id, { happiness: 100, trust: 100, fullness: 100 })
      w.roster.adjustStats(b.id, { happiness: 100, trust: 100, fullness: 100 })
      const start = w.breeding.start(w.penId, a.id, b.id)
      expect(start.ok).toBe(true)
      const ev = w.run(t, t + B.GESTATION_TICKS)
      seeds.add(ev[0].child.genome.seed)
      t += B.GESTATION_TICKS + B.COOLDOWN_TICKS + 1
      w.run(t - B.COOLDOWN_TICKS, t)
    }
    expect(seeds.size).toBe(5)
  })

  it('hatches even if a parent is sold meanwhile, and keeps their lineage', () => {
    const { breeding, add, penId, roster, run } = setup()
    const a = add(genome(1))
    const b = add(genome(2))
    breeding.start(penId, a.id, b.id)
    roster.remove(b.id)
    const [event] = run(1, B.GESTATION_TICKS)
    expect(event.child.parentIds).toEqual([a.id, b.id])
    expect(event.parentNames[1]).toBe(b.name)
    expect(roster.getParents(event.child.id).map((p) => p.id)).toEqual([a.id])
  })

  it('puts a hatchling in another pen when the den pen is full, or nowhere if nothing fits', () => {
    const crowd = (fillOtherPen: boolean) => {
      const { breeding, add, penId, otherPen, roster, run } = setup()
      // pen-1 is 100 m2: three huge creatures (32 m2 each) leave no room for a fourth.
      const a = add(genome(1, { size: 'huge' }))
      const b = add(genome(2, { size: 'huge' }))
      add(genome(3, { size: 'huge' }))
      // pen-2 is 36 m2: one huge creature fills it; otherwise it has room for the newborn.
      if (fillOtherPen) roster.add(genome(4, { size: 'huge' }), { penId: otherPen, stats: GOOD })
      breeding.start(penId, a.id, b.id)
      const [event] = run(1, B.GESTATION_TICKS)
      return { event, otherPen, roster }
    }

    const spare = crowd(false)
    expect(spare.event.penId).toBe(spare.otherPen) // moved to the pen that has room

    const none = crowd(true)
    expect(none.event.penId).toBeNull()
    expect(none.roster.get(none.event.child.id)?.penId).toBeNull()
  })

  it('tells listeners when an egg hatches', () => {
    const { breeding, add, penId, run } = setup()
    const a = add(genome(1))
    const b = add(genome(2))
    const seen: number[] = []
    const off = breeding.onHatch((e) => seen.push(e.jobId))
    breeding.start(penId, a.id, b.id)
    run(1, B.GESTATION_TICKS)
    expect(seen).toEqual([1])
    off()
  })
})

describe('cooldown', () => {
  it('rests both parents after a litter, then lets them breed again', () => {
    const { breeding, add, penId, roster, run } = setup()
    const a = add(genome(1))
    const b = add(genome(2))
    breeding.start(penId, a.id, b.id)
    run(1, B.GESTATION_TICKS)

    roster.adjustStats(a.id, { happiness: 100, trust: 100, fullness: 100 })
    roster.adjustStats(b.id, { happiness: 100, trust: 100, fullness: 100 })
    expect(breeding.getCooldownTicks(a.id)).toBe(B.COOLDOWN_TICKS)
    expect(breeding.check(penId, a.id, b.id)[0]).toContain('needs to rest')

    run(B.GESTATION_TICKS + 1, B.GESTATION_TICKS + B.COOLDOWN_TICKS)
    expect(breeding.getCooldownTicks(a.id)).toBe(0)
    expect(breeding.check(penId, a.id, b.id)).toEqual([])
  })
})

describe('species tracking', () => {
  it('knows the species of every creature already owned', () => {
    const { breeding, add } = setup()
    const a = add(genome(1))
    expect(breeding.isKnownSpecies(a.genome.speciesId)).toBe(true)
    expect(breeding.isKnownSpecies(-1)).toBe(false)
  })

  it('flags a hatchling whose species is new, and remembers it afterwards', () => {
    const { breeding, add, penId, roster, run } = setup()
    const a = add(genome(1))
    const b = add(
      genome(7, { archetype: 'aerial', bodyPlan: 'winged_biped', locomotion: 'fly', size: 'small' })
    )
    let sawNew = false
    let t = 1
    for (let i = 0; i < 12 && !sawNew; i++) {
      roster.adjustStats(a.id, { happiness: 100, trust: 100, fullness: 100 })
      roster.adjustStats(b.id, { happiness: 100, trust: 100, fullness: 100 })
      if (!breeding.start(penId, a.id, b.id).ok) break
      const [ev] = run(t, t + B.GESTATION_TICKS)
      if (ev.isNewSpecies) {
        sawNew = true
        expect(breeding.isKnownSpecies(ev.child.genome.speciesId)).toBe(true) // now known
      }
      t += B.GESTATION_TICKS + B.COOLDOWN_TICKS + 1
      run(t - B.COOLDOWN_TICKS, t)
    }
    expect(sawNew).toBe(true)
  })

  it('does not flag twins of an existing species as new', () => {
    const { breeding, add, penId, run } = setup()
    const g = genome(3)
    const a = add(g)
    const b = add(structuredClone(g))
    breeding.start(penId, a.id, b.id)
    const [ev] = run(1, B.GESTATION_TICKS)
    if (ev.child.genome.speciesId === g.speciesId) expect(ev.isNewSpecies).toBe(false)
  })
})

describe('mutation', () => {
  it('happens to some hatchlings, but not most', () => {
    const { breeding, add, penId, roster, run } = setup({ coins: 100000 })
    const a = add(genome(1))
    const b = add(genome(2))
    let mutated = 0
    const litters = 60
    let t = 1
    for (let i = 0; i < litters; i++) {
      roster.adjustStats(a.id, { happiness: 100, trust: 100, fullness: 100 })
      roster.adjustStats(b.id, { happiness: 100, trust: 100, fullness: 100 })
      breeding.start(penId, a.id, b.id)
      const [ev] = run(t, t + B.GESTATION_TICKS)
      if (ev.mutated) mutated++
      roster.remove(ev.child.id) // keep the pen from filling up
      t += B.GESTATION_TICKS + B.COOLDOWN_TICKS + 1
      run(t - B.COOLDOWN_TICKS, t)
    }
    expect(mutated).toBeGreaterThan(2)
    expect(mutated).toBeLessThan(litters * 0.5)
  })
})

describe('with the economy clock', () => {
  it('hatches while time is skipped, as offline catch-up does', () => {
    const { breeding, add, penId, roster } = setup()
    const a = add(genome(1))
    const b = add(genome(2))
    const clock = new SimClock()
    clock.onTick((t) => breeding.tick(t))
    breeding.start(penId, a.id, b.id)
    clock.fastForward(B.GESTATION_TICKS + 10)
    expect(roster.count()).toBe(3)
  })
})

describe('save and restore', () => {
  it('round-trips jobs, cooldowns and known species, and still hatches', () => {
    const a1 = setup()
    const p = a1.add(genome(1))
    const q = a1.add(genome(2))
    a1.breeding.start(a1.penId, p.id, q.id)
    a1.run(1, 50)
    const save = JSON.parse(JSON.stringify(a1.breeding.serialize()))

    const a2 = setup()
    a2.add(genome(1))
    a2.add(genome(2))
    expect(a2.breeding.restore(save)).toBe(true)
    a2.breeding.syncTick(50)
    expect(a2.breeding.getJobs()).toHaveLength(1)
    expect(a2.breeding.getJobs()[0].hatchTick).toBe(B.GESTATION_TICKS)
    const events = a2.run(51, B.GESTATION_TICKS)
    expect(events).toHaveLength(1)
    // The same child as if it had never been saved.
    const continued = a1.run(51, B.GESTATION_TICKS)
    expect(events[0].child.genome).toEqual(continued[0].child.genome)
  })

  it('never reuses a job id after a restore', () => {
    const a1 = setup({ dens: 2 })
    const p = a1.add(genome(1))
    const q = a1.add(genome(2))
    a1.breeding.start(a1.penId, p.id, q.id)
    const save = JSON.parse(JSON.stringify(a1.breeding.serialize()))
    const a2 = setup({ dens: 2 }) // a second den, since the restored job occupies the first
    a2.add(genome(1)) // the roster comes back first in a real restore: these are the job's parents
    a2.add(genome(2))
    a2.breeding.restore({ ...save, nextJobId: 1 })
    const x = a2.add(genome(3))
    const y = a2.add(genome(4))
    const r = a2.breeding.start(a2.penId, x.id, y.id)
    expect(r.ok && r.job.id).toBe(2)
  })

  it('skips corrupt jobs and rejects unusable snapshots', () => {
    const { breeding } = setup()
    expect(
      breeding.restore({
        version: 1,
        nextJobId: 'x',
        jobs: [null, { id: 'a' }, { id: 1, penId: 'pen-1', parentIds: ['c1'] }, 5],
        cooldowns: { c1: 10, c2: 'soon', c3: -4 },
        knownSpecies: [1, 'two', null],
      })
    ).toBe(true)
    expect(breeding.getJobs()).toEqual([])
    expect(breeding.getCooldownTicks('c1')).toBe(10)
    expect(breeding.getCooldownTicks('c2')).toBe(0)
    for (const bad of [null, undefined, 3, {}, { version: 2, jobs: [] }, { version: 1 }]) {
      expect(breeding.restore(bad)).toBe(false)
    }
  })
})

describe('rarity ratchet', () => {
  it('lifts the preview range only when both parents are good enough', () => {
    const good = describeOffspring(genome(1, { rarity: 0.5 }), genome(2, { rarity: 0.7 }))
    expect(good.rarity.min).toBeCloseTo(0.6 + B.RARITY_LIFT - 0.05, 10)
    const weak = describeOffspring(genome(1, { rarity: 0.1 }), genome(2, { rarity: 0.7 }))
    expect(weak.rarity.min).toBeCloseTo(0.4 - 0.05, 10)
  })

  it('climbs when the best pair keeps breeding', () => {
    let a = genome(1, { rarity: 0.5 })
    const b = genome(2, { rarity: 0.5 })
    for (let gen = 0; gen < 6; gen++) {
      const best = Math.max(
        ...Array.from(
          { length: 6 },
          (_, i) => crossover(a, b, 100 + gen * 10 + i, rarityLift(a, b)).rarity
        )
      )
      a = { ...a, rarity: best }
    }
    expect(a.rarity).toBeGreaterThan(0.6)
  })
})
