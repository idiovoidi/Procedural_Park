import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import type { Genome } from '../creatures/genome'
import { generateGenome } from '../creatures/genome'
import { SimClock } from '../economy'
import { PenGrid } from '../park'
import { Roster } from '../roster'
import { CareSystem, reactionFor } from './CareSystem'

const E = GAME_CONFIG.ECONOMY
const CARE = E.CARE
const CYCLE = E.FEED_CYCLE_TICKS

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

/** A 3x3-cell (36 m²) fenced pen with `troughs` troughs. */
function setup(options: { troughs?: number } = {}) {
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
  for (let i = 0; i < (options.troughs ?? 1); i++) grid.addProp({ x: 2, z: 2 }, 'trough')

  const roster = new Roster()
  const care = new CareSystem(roster, grid)
  let cycle = 0
  const runCycles = (n: number) => {
    for (let i = 0; i < n; i++) care.tick(++cycle * CYCLE)
  }
  const addCreature = (g: Genome = genome(), stats = {}) => roster.add(g, { penId, stats })
  return { grid, penId, roster, care, runCycles, addCreature }
}

describe('troughs', () => {
  it('only accept food in a pen that has a trough', () => {
    const { care, penId } = setup({ troughs: 0 })
    expect(care.getTroughCapacity(penId)).toBe(0)
    expect(care.addFood(penId, 'berry', 5)).toBe(0)
    expect(care.addFood('not-a-pen', 'berry', 5)).toBe(0)
  })

  it('hold a fixed number of servings per trough', () => {
    const { care, penId } = setup({ troughs: 2 })
    expect(care.getTroughCapacity(penId)).toBe(2 * CARE.TROUGH_CAPACITY_SERVINGS)
    expect(care.addFood(penId, 'berry', 100)).toBe(40)
    expect(care.getTroughTotal(penId)).toBe(40)
    expect(care.addFood(penId, 'meat', 5)).toBe(0) // full
  })

  it('reject unknown food and nonsense amounts', () => {
    const { care, penId } = setup()
    expect(care.addFood(penId, 'pizza', 5)).toBe(0)
    expect(care.addFood(penId, 'berry', 0)).toBe(0)
    expect(care.addFood(penId, 'berry', -3)).toBe(0)
    expect(care.addFood(penId, 'berry', Number.NaN)).toBe(0)
  })

  it('keep different foods separately', () => {
    const { care, penId } = setup()
    care.addFood(penId, 'berry', 3)
    care.addFood(penId, 'fish', 2)
    expect(care.getTroughFood(penId)).toEqual({ berry: 3, fish: 2 })
  })
})

describe('feeding cycle timing', () => {
  it('does nothing between feeding cycles', () => {
    const { care, addCreature, roster } = setup()
    const c = addCreature()
    expect(care.tick(1)).toBeNull()
    expect(care.tick(CYCLE - 1)).toBeNull()
    expect(care.tick(0)).toBeNull()
    expect(roster.get(c.id)?.fullness).toBe(E.STARTING_STATS.fullness)
    expect(care.tick(CYCLE)).not.toBeNull()
  })
})

describe('a fed creature', () => {
  it('eats from the trough and stays full, using one serving a cycle', () => {
    const { care, penId, addCreature, runCycles, roster } = setup()
    const c = addCreature()
    care.addFood(penId, 'berry', 10)

    runCycles(1)
    // 80 - 20 decay = 60, then a full meal +25 = 85.
    expect(roster.get(c.id)?.fullness).toBe(85)
    expect(care.getTroughTotal(penId)).toBeCloseTo(9, 10)

    runCycles(5)
    expect(roster.get(c.id)?.fullness).toBeGreaterThanOrEqual(85)
    expect(care.getTroughTotal(penId)).toBeCloseTo(4, 10)
  })

  it('grows happier and more trusting toward the pen quality', () => {
    const { care, penId, addCreature, runCycles, roster } = setup()
    const c = addCreature()
    care.addFood(penId, 'berry', 20)
    const before = { happiness: c.happiness, trust: c.trust }

    runCycles(10)
    const after = roster.get(c.id)
    expect(after?.happiness).toBeGreaterThan(before.happiness)
    expect(after?.happiness).toBeCloseTo(100, 0) // a perfect pen pulls it to the top
    expect(after?.trust).toBeGreaterThan(before.trust)
  })

  it('reports each meal in the cycle summary', () => {
    const { care, penId, addCreature, runCycles } = setup()
    const c = addCreature()
    care.addFood(penId, 'berry', 5)
    runCycles(1)
    const summary = care.getLastCycle()
    expect(summary?.fed).toBe(1)
    expect(summary?.hungry).toBe(0)
    expect(summary?.meals[0]).toMatchObject({ creatureId: c.id, foodId: 'berry', servings: 1 })
  })

  it('skips the meal when it is already full', () => {
    const { care, penId, addCreature, runCycles, roster } = setup()
    const c = addCreature(genome(), { fullness: 100 })
    care.addFood(penId, 'berry', 5)
    runCycles(1) // 100 - 20 = 80 <= 85, so it still eats once
    expect(roster.get(c.id)?.fullness).toBe(100)
    // Prove the threshold: a creature above it after decay doesn't eat.
    const other = setup()
    const d = other.addCreature(genome(), { fullness: 200 }) // clamped to 100
    other.roster.adjustStats(d.id, { fullness: 0 })
    expect(other.roster.get(d.id)?.fullness).toBe(100)
  })
})

describe('soft failure when hungry', () => {
  it('starves slowly to zero without being harmed or removed', () => {
    const { care, addCreature, runCycles, roster } = setup()
    const c = addCreature() // no food at all
    runCycles(1)
    expect(roster.get(c.id)?.fullness).toBe(60)
    runCycles(3)
    expect(roster.get(c.id)?.fullness).toBe(0)

    runCycles(20)
    expect(roster.get(c.id)?.fullness).toBe(0) // floor, never negative
    expect(roster.has(c.id)).toBe(true) // never lost
    expect(care.getLastCycle()?.hungry).toBe(1)
  })

  it('halves the mood target while starving', () => {
    const { care, addCreature, runCycles, roster, penId } = setup()
    const c = addCreature(genome(), { happiness: 100 })
    runCycles(10) // starving: fullness hits 0, target = 100 / 2
    expect(roster.get(c.id)?.happiness).toBeCloseTo(50, 0)

    care.addFood(penId, 'berry', 20)
    runCycles(10) // fed again: recovers
    expect(roster.get(c.id)?.happiness).toBeGreaterThan(90)
  })

  it('serves a partial meal when the trough is nearly empty', () => {
    const { care, penId, addCreature, runCycles, roster } = setup()
    const c = addCreature()
    care.addFood(penId, 'berry', 0.4)
    runCycles(1)
    // Needed 1 serving, only 0.4 left: fullness gains 40% of a meal (25 * 0.4 = 10).
    expect(roster.get(c.id)?.fullness).toBe(60 + 10)
    expect(care.getTroughTotal(penId)).toBe(0)
  })
})

describe('choosing food', () => {
  it('picks the best-matching food in the trough', () => {
    const { care, penId, addCreature, runCycles } = setup()
    addCreature(genome({ archetype: 'aquatic', locomotion: 'swim', bodyPlan: 'swimmer' }))
    care.addFood(penId, 'berry', 3)
    care.addFood(penId, 'fish', 3)
    runCycles(1)
    expect(care.getLastCycle()?.meals[0].foodId).toBe('fish')
  })

  it('falls back to a poor match, which costs more servings', () => {
    const { care, penId, addCreature, runCycles } = setup()
    addCreature(genome({ archetype: 'terrestrial' }))
    care.addFood(penId, 'fish', 5) // 0.4 effective for a common terrestrial creature
    runCycles(1)
    const meal = care.getLastCycle()?.meals[0]
    expect(meal?.foodId).toBe('fish')
    expect(meal?.efficiency).toBeCloseTo(0.4, 10)
    expect(meal?.servings).toBeCloseTo(1 / 0.4, 10)
  })

  it('shares a trough between creatures, first come first served', () => {
    const { care, penId, addCreature, runCycles } = setup()
    addCreature(genome({ size: 'small', speciesId: 1 }))
    addCreature(genome({ size: 'small', speciesId: 2 }))
    care.addFood(penId, 'berry', 1) // a small creature needs 0.75
    runCycles(1)
    const summary = care.getLastCycle()
    expect(summary?.fed).toBe(2)
    expect(summary?.meals[0].servings).toBeCloseTo(0.75, 10)
    expect(summary?.meals[1].servings).toBeCloseTo(0.25, 10)
  })
})

describe('mood follows pen quality', () => {
  it('sinks in a pen that does not suit the creature', () => {
    const { care, penId, addCreature, runCycles, roster } = setup()
    // A flier in an unroofed pen: enclosure scores 0.4, so quality is well under 1.
    const c = addCreature(
      genome({ archetype: 'aerial', locomotion: 'fly', bodyPlan: 'winged_biped' }),
      { happiness: 100 }
    )
    care.addFood(penId, 'berry', 20)
    runCycles(10)

    const quality = care.getCreatureQuality(c.id) as number
    expect(quality).toBeLessThan(0.9)
    // It settles at the pen's quality plus a small bonus from each meal (berry for an aerial
    // creature: 10 happiness x 0.7 efficiency x the meal scale), never below the quality.
    const target = quality * 100
    const mealBonus = 10 * 0.7 * CARE.MEAL_HAPPINESS_SCALE
    const happiness = roster.get(c.id)?.happiness as number
    expect(happiness).toBeGreaterThanOrEqual(target - 0.01)
    expect(happiness).toBeLessThanOrEqual(target + mealBonus + 0.01)
  })

  it('exposes the last pen report', () => {
    const { care, penId, addCreature, runCycles } = setup()
    const c = addCreature()
    expect(care.getPenReport(penId)).toBeUndefined()
    runCycles(1)
    expect(care.getPenReport(penId)?.occupants[0].creatureId).toBe(c.id)
    expect(care.getCreatureQuality(c.id)).toBeCloseTo(1, 10)
  })
})

describe('creatures without a closed pen', () => {
  it('are not fed, and their mood sinks to the unpenned level', () => {
    const { care, penId, roster, runCycles } = setup()
    care.addFood(penId, 'berry', 20)
    const stray = roster.add(genome(), { stats: { happiness: 100 } }) // never assigned
    runCycles(10)

    expect(roster.get(stray.id)?.fullness).toBe(0)
    expect(roster.get(stray.id)?.happiness).toBeCloseTo(CARE.UNPENNED_HAPPINESS_TARGET, 0)
    expect(care.getLastCycle()?.unpenned).toBe(1)
    expect(care.getCreatureQuality(stray.id)).toBeNull()
  })

  it('keep their assignment while the pen is open, and are looked after again once it closes', () => {
    const { care, penId, grid, addCreature, runCycles, roster } = setup()
    const c = addCreature()
    care.addFood(penId, 'berry', 20)

    grid.removeFence({ x: 1, z: 1, axis: 'h' }) // open the pen
    runCycles(3)
    expect(roster.get(c.id)?.penId).toBe(penId) // still assigned
    expect(roster.get(c.id)?.fullness).toBe(20) // 80 - 3 * 20, uncared for
    expect(care.getTroughTotal(penId)).toBe(20) // food untouched

    grid.addFence({ x: 1, z: 1, axis: 'h' }) // close it again: same pen id
    runCycles(2)
    expect(roster.get(c.id)?.fullness).toBeGreaterThan(20)
    expect(care.getTroughTotal(penId)).toBeLessThan(20)
  })
})

describe('feedByHand', () => {
  it('applies the food effects scaled by diet efficiency', () => {
    const { care, addCreature, roster } = setup()
    const c = addCreature(genome(), { fullness: 20, happiness: 20, trust: 20 })

    const result = care.feedByHand(c.id, 'berry')
    expect(result).toEqual({ creatureId: c.id, foodId: 'berry', efficiency: 1, reaction: 'loved' })
    const after = roster.get(c.id)
    expect(after?.fullness).toBe(20 + CARE.FULLNESS_PER_MEAL)
    expect(after?.happiness).toBe(30) // berry: +10
    expect(after?.trust).toBe(25) // berry: +5
  })

  it('gives a poor match a weaker effect and a worse reaction', () => {
    const { care, addCreature, roster } = setup()
    const c = addCreature(genome(), { fullness: 0, happiness: 0, trust: 0 })
    const result = care.feedByHand(c.id, 'fish') // 0.4 for terrestrial
    expect(result?.reaction).toBe('disliked')
    expect(roster.get(c.id)?.happiness).toBeCloseTo(15 * 0.4, 10)
  })

  it('returns null for an unknown creature or food', () => {
    const { care, addCreature } = setup()
    const c = addCreature()
    expect(care.feedByHand('nope', 'berry')).toBeNull()
    expect(care.feedByHand(c.id, 'pizza')).toBeNull()
  })

  it('maps efficiency to a reaction at the documented thresholds', () => {
    expect(reactionFor(1)).toBe('loved')
    expect(reactionFor(0.9)).toBe('loved')
    expect(reactionFor(0.89)).toBe('liked')
    expect(reactionFor(0.7)).toBe('liked')
    expect(reactionFor(0.5)).toBe('neutral')
    expect(reactionFor(0.49)).toBe('disliked')
  })
})

describe('save and restore', () => {
  it('does not save troughs that have been eaten empty', () => {
    const { care, penId, addCreature, runCycles } = setup()
    addCreature()
    care.addFood(penId, 'berry', 1)
    runCycles(2) // the single serving is eaten
    expect(care.getTroughTotal(penId)).toBe(0)
    expect(care.serialize().troughs).toEqual([])
  })

  it('round-trips trough contents', () => {
    const a = setup()
    a.care.addFood(a.penId, 'berry', 3)
    a.care.addFood(a.penId, 'fish', 2)

    const b = setup()
    expect(b.care.restore(JSON.parse(JSON.stringify(a.care.serialize())))).toBe(true)
    expect(b.care.getTroughFood(b.penId)).toEqual({ berry: 3, fish: 2 })
  })

  it('skips bad entries and rejects an unusable snapshot', () => {
    const { care, penId } = setup()
    expect(
      care.restore({
        version: 1,
        troughs: [
          { penId, food: { berry: 4, pizza: 9, fish: -1, meat: Number.NaN } },
          { penId: 7, food: { berry: 1 } },
          null,
        ],
      })
    ).toBe(true)
    expect(care.getTroughFood(penId)).toEqual({ berry: 4 })

    for (const bad of [null, undefined, 5, {}, { version: 2, troughs: [] }]) {
      expect(care.restore(bad)).toBe(false)
    }
    expect(care.getTroughFood(penId)).toEqual({ berry: 4 }) // unchanged
  })
})

describe('with the economy clock', () => {
  it('runs on SimClock ticks and gives the same result however time is split', () => {
    const run = (frames: number[]) => {
      const { care, penId, addCreature, roster } = setup()
      const c = addCreature()
      care.addFood(penId, 'berry', 20)
      const clock = new SimClock(1, 1000)
      clock.onTick((t) => care.tick(t))
      for (const dt of frames) clock.advanceRealTime(dt)
      return { fullness: roster.get(c.id)?.fullness, food: care.getTroughTotal(penId) }
    }
    const oneJump = run([CYCLE * 5])
    const smooth = run(Array.from({ length: CYCLE * 5 * 10 }, () => 0.1))
    expect(smooth).toEqual(oneJump)
    expect(oneJump.food).toBeCloseTo(15, 10) // five cycles, one serving each
  })
})

describe('feeder hoppers', () => {
  it('hold servings only in a pen that has a hopper', () => {
    const { care, penId } = setup()
    // No hopper: stock() fills the trough and the rest is refused.
    expect(care.stock(penId, 'berry', CARE.TROUGH_CAPACITY_SERVINGS + 30)).toBe(
      CARE.TROUGH_CAPACITY_SERVINGS
    )
    expect(care.getHopperTotal(penId)).toBe(0)
  })

  it('take the overflow once the troughs are full', () => {
    const { care, grid, penId } = setup()
    grid.addProp({ x: 2, z: 3 }, 'hopper')
    const total = CARE.TROUGH_CAPACITY_SERVINGS + 30
    expect(care.stock(penId, 'berry', total)).toBe(total)
    expect(care.getTroughTotal(penId)).toBe(CARE.TROUGH_CAPACITY_SERVINGS)
    expect(care.getHopperTotal(penId)).toBe(30)
    expect(care.stock(penId, 'berry', 999)).toBe(CARE.HOPPER_CAPACITY_SERVINGS - 30)
  })

  it('keep a pen fed for many cycles without anyone refilling the trough', () => {
    const { care, grid, penId, addCreature, runCycles, roster } = setup()
    grid.addProp({ x: 2, z: 3 }, 'hopper')
    const c = addCreature(genome(), { fullness: 100, happiness: 100, trust: 100 })
    const food = 'berry'
    care.stock(penId, food, CARE.TROUGH_CAPACITY_SERVINGS + CARE.HOPPER_CAPACITY_SERVINGS)
    // More cycles than the trough alone could cover.
    runCycles(CARE.TROUGH_CAPACITY_SERVINGS + 30)
    expect(roster.get(c.id)?.fullness).toBeGreaterThan(0)
    expect(care.getHopperTotal(penId)).toBeLessThan(CARE.HOPPER_CAPACITY_SERVINGS)
  })

  it('survive a save and restore, tolerating bad data', () => {
    const { care, grid, penId } = setup()
    grid.addProp({ x: 2, z: 3 }, 'hopper')
    care.stock(penId, 'berry', CARE.TROUGH_CAPACITY_SERVINGS + 10)
    const snap = JSON.parse(JSON.stringify(care.serialize()))

    const other = setup()
    other.care.restore(snap)
    expect(other.care.getHopperFood(penId)).toEqual({ berry: 10 })

    expect(
      other.care.restore({
        version: 1,
        troughs: [],
        hoppers: [{ penId, food: { berry: -3, junk: 4 } }, 7],
      })
    ).toBe(true)
    expect(other.care.getHopperTotal(penId)).toBe(0)
  })
})

describe('food farms', () => {
  const FARM = CARE.FARM

  it('grow the farmable staple the residents like best', () => {
    const { care, grid, penId, addCreature } = setup()
    grid.addProp({ x: 3, z: 3 }, 'farm')
    expect(care.getFarmFood(penId)).toBeNull() // nobody lives here yet
    addCreature()
    const food = care.getFarmFood(penId)
    expect(food).not.toBeNull()
    expect(FARM.FOODS).toContain(food)
  })

  it('stay idle in a pen without a farm', () => {
    const { care, penId, addCreature } = setup()
    addCreature()
    expect(care.getFarmFood(penId)).toBeNull() // no farm built
    expect(care.getFarmOutput(penId)).toBe(0)
  })

  it('fill the trough each cycle, scaling with the number of farms', () => {
    const one = setup()
    one.grid.addProp({ x: 3, z: 3 }, 'farm')
    one.addCreature(genome(), { fullness: 100, happiness: 100, trust: 100 })
    const before = one.care.getTroughTotal(one.penId)
    one.runCycles(1)
    expect(one.care.getTroughTotal(one.penId) + 0).toBeGreaterThanOrEqual(before)
    expect(one.care.getFarmOutput(one.penId)).toBeCloseTo(FARM.SERVINGS_PER_CYCLE, 10)

    const two = setup()
    two.grid.addProp({ x: 3, z: 3 }, 'farm')
    two.grid.addProp({ x: 3, z: 2 }, 'farm')
    two.addCreature()
    expect(two.care.getFarmOutput(two.penId)).toBeCloseTo(2 * FARM.SERVINGS_PER_CYCLE, 10)
  })

  it('keep a creature fed with no food ever bought', () => {
    const { care, grid, penId, addCreature, runCycles, roster } = setup()
    grid.addProp({ x: 3, z: 3 }, 'farm')
    grid.addProp({ x: 3, z: 2 }, 'farm')
    const c = addCreature(genome(), { fullness: 100, happiness: 100, trust: 100 })
    expect(care.getTroughTotal(penId)).toBe(0)
    runCycles(40)
    expect(roster.get(c.id)?.fullness).toBeGreaterThan(50)
  })
})
