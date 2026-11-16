import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import type { Genome } from '../creatures/genome'
import { generateGenome } from '../creatures/genome'
import { dietEfficiency } from '../economy'
import { FOOD_ITEMS } from '../food'
import { PenGrid } from '../park'
import { Roster } from '../roster'
import { CaptureSystem, requiresNight, type WildCreature } from './CaptureSystem'
import { findPenFor } from './housing'

const C = GAME_CONFIG.ECONOMY.CAPTURE
const LURE = C.LURE

interface Wild extends WildCreature {
  x: number
  z: number
}

const genome = (overrides: Partial<Genome> = {}): Genome => ({
  ...generateGenome(1),
  archetype: 'terrestrial',
  size: 'medium',
  temperament: 'curious',
  locomotion: 'walk',
  bodyPlan: 'quadruped',
  rarity: 0.1,
  speciesId: 1,
  ...overrides,
})

const wild = (overrides: Partial<Genome> = {}, x = 0, z = 0): Wild => ({
  genome: genome(overrides),
  x,
  z,
})

const system = () => new CaptureSystem<Wild>((c) => ({ x: c.x, z: c.z }))

describe('required trust', () => {
  it('rises with rarity tier', () => {
    const s = system()
    const req = (rarity: number) => s.getRequiredTrust(wild({ rarity }))
    expect(req(0.1)).toBe(C.TRUST_REQUIRED_BASE)
    expect(req(0.5)).toBe(C.TRUST_REQUIRED_BASE + C.TRUST_REQUIRED_PER_TIER)
    expect(req(0.99)).toBe(C.TRUST_REQUIRED_BASE + 4 * C.TRUST_REQUIRED_PER_TIER)
  })

  it('never exceeds the trust scale', () => {
    const s = system()
    for (let seed = 0; seed < 200; seed++) {
      const w = { genome: generateGenome(seed), x: 0, z: 0 }
      expect(s.getRequiredTrust(w)).toBeLessThanOrEqual(100)
    }
  })
})

describe('feeding builds trust', () => {
  it('adds the food trust bonus scaled by diet and temperament', () => {
    const s = system()
    const c = wild({ temperament: 'curious' })
    const result = s.feed(c, 'berry') // perfect match, trust bonus 5
    const expected =
      FOOD_ITEMS.berry.effects.trustBonus *
      1 *
      C.TRUST_FEED_SCALE *
      C.TRUST_TEMPERAMENT_MULT.curious
    expect(result.gained).toBeCloseTo(expected, 10)
    expect(s.getTrust(c)).toBeCloseTo(expected, 10)
    expect(result.required).toBe(C.TRUST_REQUIRED_BASE)
    expect(result.ready).toBe(false)
  })

  it('works less well with the wrong food', () => {
    const s = system()
    const right = s.feed(wild(), 'berry').gained
    const wrong = s.feed(wild(), 'fish').gained // 0.4 efficiency, larger trust bonus
    expect(wrong).toBeLessThan(right * 2)
    const poorMatch = s.feed(wild(), 'crystal') // 0.3 efficiency
    expect(poorMatch.gained).toBeLessThan(s.feed(wild(), 'meat').gained)
  })

  it('warms up to shy creatures more slowly than to curious ones', () => {
    const s = system()
    const shy = s.feed(wild({ temperament: 'shy' }), 'berry').gained
    const curious = s.feed(wild({ temperament: 'curious' }), 'berry').gained
    const aggressive = s.feed(wild({ temperament: 'aggressive' }), 'berry').gained
    expect(shy).toBeLessThan(curious)
    expect(aggressive).toBeLessThan(shy)
  })

  it('becomes ready after enough feedings, and caps at 100', () => {
    const s = system()
    const c = wild({ temperament: 'playful' })
    let feeds = 0
    while (!s.isReady(c) && feeds < 100) {
      s.feed(c, 'berry')
      feeds++
    }
    expect(s.isReady(c)).toBe(true)
    expect(feeds).toBeGreaterThan(2) // not instant
    expect(feeds).toBeLessThan(10) // not a grind
    for (let i = 0; i < 50; i++) s.feed(c, 'berry')
    expect(s.getTrust(c)).toBe(100)
  })

  it('keeps trust per creature and ignores unknown food', () => {
    const s = system()
    const a = wild()
    const b = wild()
    s.feed(a, 'berry')
    expect(s.getTrust(b)).toBe(0)
    expect(s.feed(a, 'pizza').gained).toBe(0)
  })

  it('makes rare creatures harder to win over', () => {
    const s = system()
    const feedsNeeded = (rarity: number) => {
      const c = wild({ rarity, temperament: 'curious' })
      let n = 0
      while (!s.isReady(c) && n < 500) {
        s.feed(c, 'berry')
        n++
      }
      return n
    }
    expect(feedsNeeded(0.99)).toBeGreaterThan(feedsNeeded(0.1))
  })
})

describe('lure', () => {
  it('can be placed only with a real food and a real position', () => {
    const s = system()
    expect(s.placeLure(1, 2, 'berry')).toMatchObject({
      x: 1,
      z: 2,
      foodId: 'berry',
      remaining: LURE.DURATION_S,
    })
    expect(s.placeLure(Number.NaN, 0, 'berry')).toBeNull()
    expect(s.placeLure(0, 0, 'pizza')).toBeNull()
  })

  it('builds trust in creatures within range and ignores those outside', () => {
    const s = system()
    const near = wild({}, 5, 0)
    const far = wild({}, LURE.RADIUS_M + 1, 0)
    s.placeLure(0, 0, 'berry')
    const attracted = s.update(1, [near, far])
    expect(attracted).toEqual([near])
    expect(s.getTrust(near)).toBeGreaterThan(0)
    expect(s.getTrust(far)).toBe(0)
  })

  it('works best on shy creatures and barely on aggressive ones', () => {
    const s = system()
    const shy = wild({ temperament: 'shy' }, 1, 0)
    const curious = wild({ temperament: 'curious' }, 1, 0)
    const aggressive = wild({ temperament: 'aggressive' }, 1, 0)
    s.placeLure(0, 0, 'berry')
    s.update(5, [shy, curious, aggressive])
    expect(s.getTrust(shy)).toBeGreaterThan(0)
    expect(s.getTrust(curious)).toBeGreaterThan(s.getTrust(aggressive))
    // Compare the multipliers directly: shy responds 4x as strongly as aggressive.
    expect(s.getTrust(shy) / s.getTrust(aggressive)).toBeCloseTo(
      LURE.TEMPERAMENT_MULT.shy / LURE.TEMPERAMENT_MULT.aggressive,
      6
    )
  })

  it('pays back according to the bait: a matching food beats a poor one', () => {
    const goodBait = system()
    const poorBait = system()
    const a = wild({}, 1, 0)
    const b = wild({}, 1, 0)
    goodBait.placeLure(0, 0, 'berry')
    poorBait.placeLure(0, 0, 'crystal')
    goodBait.update(5, [a])
    poorBait.update(5, [b])
    expect(goodBait.getTrust(a)).toBeGreaterThan(poorBait.getTrust(b))
  })

  it('expires after its duration and only counts the time it had left', () => {
    const s = system()
    const c = wild({ temperament: 'shy' }, 1, 0)
    s.placeLure(0, 0, 'berry')
    s.update(LURE.DURATION_S - 1, [c])
    expect(s.getLure()?.remaining).toBeCloseTo(1, 6)

    s.update(10, [c]) // only 1 second of bait left
    expect(s.getLure()).toBeNull()
    const trustAfter = s.getTrust(c)
    expect(trustAfter).toBeCloseTo(
      LURE.TRUST_PER_SEC *
        LURE.TEMPERAMENT_MULT.shy *
        dietEfficiency(c.genome, 'berry') *
        LURE.DURATION_S,
      6
    )

    expect(s.update(5, [c])).toEqual([]) // nothing happens once it has gone
    expect(s.getTrust(c)).toBe(trustAfter)
  })

  it('is replaced by a newer lure', () => {
    const s = system()
    s.placeLure(0, 0, 'berry')
    s.placeLure(9, 9, 'meat')
    expect(s.getLure()).toMatchObject({ x: 9, z: 9, foodId: 'meat' })
  })

  it('ignores invalid time steps', () => {
    const s = system()
    const c = wild({}, 1, 0)
    s.placeLure(0, 0, 'berry')
    for (const dt of [0, -1, Number.NaN]) expect(s.update(dt, [c])).toEqual([])
    expect(s.getLure()?.remaining).toBe(LURE.DURATION_S)
  })
})

describe('check / release', () => {
  it('needs both trust and proximity', () => {
    const s = system()
    const c = wild({ temperament: 'playful' }, 4, 0)
    const here = { x: 0, z: 0 }

    const early = s.check(c, here)
    expect(early).toMatchObject({ ok: false, reason: 'notTrusting' })

    while (!s.isReady(c)) s.feed(c, 'berry')
    expect(s.check(c, here)).toEqual({ ok: true, trust: s.getTrust(c) })

    const far = s.check(c, { x: C.CAPTURE_RANGE_M + 5, z: 0 })
    expect(far).toMatchObject({ ok: false, reason: 'tooFar' })
  })

  it('does not change anything when checking', () => {
    const s = system()
    const c = wild({}, 1, 0)
    s.feed(c, 'berry')
    const before = s.getTrust(c)
    s.check(c, { x: 0, z: 0 })
    expect(s.getTrust(c)).toBe(before)
  })

  it('forgets a released creature', () => {
    const s = system()
    const c = wild()
    s.feed(c, 'berry')
    s.release(c)
    expect(s.getTrust(c)).toBe(0)
  })

  it('finds the nearest creature within a limit', () => {
    const s = system()
    const a = wild({}, 3, 0)
    const b = wild({}, 8, 0)
    expect(s.nearest([b, a], { x: 0, z: 0 }, 10)).toBe(a)
    expect(s.nearest([b], { x: 0, z: 0 }, 5)).toBeNull()
    expect(s.nearest([], { x: 0, z: 0 }, 5)).toBeNull()
  })
})

describe('findPenFor', () => {
  /** Two 3x3 pens: pen-1 is meadow, pen-2 is wetland. */
  function twoPens() {
    const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 19, maxZ: 9 })
    const fence = (x0: number, z0: number) => {
      for (let x = x0; x < x0 + 3; x++) {
        grid.addFence({ x, z: z0, axis: 'h' })
        grid.addFence({ x, z: z0 + 3, axis: 'h' })
      }
      for (let z = z0; z < z0 + 3; z++) {
        grid.addFence({ x: x0, z, axis: 'v' })
        grid.addFence({ x: x0 + 3, z, axis: 'v' })
      }
    }
    fence(1, 1)
    fence(8, 1)
    for (let x = 8; x < 11; x++) for (let z = 1; z < 4; z++) grid.setGround({ x, z }, 'wetland')
    return { grid, roster: new Roster() }
  }

  it('returns null when there are no pens', () => {
    expect(findPenFor(new PenGrid(), new Roster(), genome())).toBeNull()
  })

  it('chooses the pen that suits the creature best', () => {
    const { grid, roster } = twoPens()
    const ids = grid.getPens().map((p) => p.id)
    expect(ids).toHaveLength(2)

    const wetlandPen = grid.getPenAt({ x: 9, z: 2 })?.id
    const meadowPen = grid.getPenAt({ x: 2, z: 2 })?.id
    expect(findPenFor(grid, roster, genome({ archetype: 'terrestrial' }))).toBe(meadowPen)
    expect(findPenFor(grid, roster, genome({ archetype: 'aquatic', locomotion: 'slither' }))).toBe(
      wetlandPen
    )
  })

  it('skips full pens and pens with an incompatible resident', () => {
    const { grid, roster } = twoPens()
    const meadowPen = grid.getPenAt({ x: 2, z: 2 })?.id as string
    const wetlandPen = grid.getPenAt({ x: 9, z: 2 })?.id as string

    // A grumpy resident makes the meadow pen unusable for anyone.
    roster.add(genome({ temperament: 'aggressive', speciesId: 9 }), { penId: meadowPen })
    expect(findPenFor(grid, roster, genome({ archetype: 'terrestrial' }))).toBe(wetlandPen)

    // Fill the other pen to capacity (36 m2: three medium creatures use 30).
    for (let i = 0; i < 3; i++) roster.add(genome({ speciesId: 20 + i }), { penId: wetlandPen })
    expect(findPenFor(grid, roster, genome({ archetype: 'terrestrial' }))).toBeNull()
  })
})

describe('special-condition capture', () => {
  const T = GAME_CONFIG.ECONOMY.CAPTURE.NIGHT_ONLY_MIN_RARITY

  it('makes only the rarest founders night-only', () => {
    const at = (rarity: number): Genome => ({ ...generateGenome(1), rarity })
    expect(requiresNight(at(0.1))).toBe(false)
    expect(requiresNight(at(T - 0.01))).toBe(false)
    expect(requiresNight(at(T))).toBe(true)
    expect(requiresNight(at(1))).toBe(true)
  })

  it('leaves most founders always available, and some on every rich map elusive', () => {
    const wild = Array.from({ length: GAME_CONFIG.CREATURE_COUNT }, (_, i) =>
      generateGenome(1337 * 31 + i)
    )
    const elusive = wild.filter(requiresNight).length
    expect(elusive).toBeGreaterThan(0)
    expect(elusive).toBeLessThan(wild.length / 2)
  })
})

describe('skittish trust', () => {
  it('drains over time, never below zero, and forgets creatures at zero', () => {
    const sys = new CaptureSystem<WildCreature>(() => ({ x: 0, z: 0 }))
    const c: WildCreature = { genome: { ...generateGenome(1), temperament: 'curious' } }
    const food = Object.keys(FOOD_ITEMS)[0]
    sys.feed(c, food)
    const start = sys.getTrust(c)
    expect(start).toBeGreaterThan(0)

    sys.decay(4, 0.5)
    expect(sys.getTrust(c)).toBeCloseTo(start - 2, 10)
    sys.decay(1000, 0.5)
    expect(sys.getTrust(c)).toBe(0)
  })

  it('ignores nonsense and leaves a tended creature gaining on net', () => {
    const sys = new CaptureSystem<WildCreature>(() => ({ x: 0, z: 0 }))
    const c: WildCreature = { genome: { ...generateGenome(2), temperament: 'curious' } }
    sys.feed(c, 'berry')
    const t = sys.getTrust(c)
    sys.decay(Number.NaN)
    sys.decay(-5)
    sys.decay(5, 0)
    expect(sys.getTrust(c)).toBe(t)
    // A feeding every 5 s (the real cooldown) more than covers the drain.
    const per = GAME_CONFIG.ECONOMY.CAPTURE.SKITTISH_TRUST_LOSS_PER_SEC * 5
    sys.decay(5)
    const before = sys.getTrust(c)
    sys.feed(c, 'berry')
    expect(sys.getTrust(c) - before).toBeGreaterThan(per)
  })
})
