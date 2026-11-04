import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { type Genome, generateGenome } from '../creatures/genome'
import { RESOURCE_BY_ARCHETYPE } from '../economy'
import { outputPerCycle } from '../production'
import { simulateBattle, type TeamMember } from './battle'
import { ARCHETYPE_WHEEL, deriveCombatStats, typeMultiplier } from './stats'

const A = GAME_CONFIG.ECONOMY.ARENA

/** A bare creature: no parts, medium, one limb pair, so tests change one thing at a time. */
const plain = (overrides: Partial<Genome> = {}): Genome => {
  const g = generateGenome(1)
  return {
    ...g,
    archetype: 'terrestrial',
    size: 'medium',
    temperament: 'curious',
    rarity: 0,
    genes: { ...g.genes, girth: 0, glow: 0 },
    limbSets: [{ type: 'leg', count: 2 }] as Genome['limbSets'],
    wings: { ...g.wings, pairs: 0 },
    tails: { ...g.tails, count: 0 },
    horns: { ...g.horns, count: 0 },
    spines: { ...g.spines, count: 0, type: 'none' },
    scales: false,
    ...overrides,
  }
}
const member = (name: string, g: Genome): TeamMember => ({ name, genome: g })
const team = (n: number, g: Genome = plain()) =>
  Array.from({ length: n }, (_, i) => member(`T${i}`, g))

describe('combat stats from the genome', () => {
  it('bigger and rarer creatures have more hp and hit harder', () => {
    const small = deriveCombatStats(plain({ size: 'small' }))
    const big = deriveCombatStats(plain({ size: 'large' }))
    expect(big.maxHp).toBeGreaterThan(small.maxHp)
    expect(big.damage).toBeGreaterThan(small.damage)
    expect(big.speed).toBeLessThan(small.speed) // but slower
    const rare = deriveCombatStats(plain({ rarity: 1 }))
    expect(rare.maxHp).toBeGreaterThan(deriveCombatStats(plain()).maxHp)
  })

  it('parts give their specials, and nothing else does', () => {
    const base = deriveCombatStats(plain())
    expect(base).toMatchObject({
      dodge: 0,
      reflect: 0,
      firstStrike: 0,
      splash: 0,
      damageTaken: 1,
      hits: 1,
    })
    const g = plain()
    expect(deriveCombatStats({ ...g, horns: { ...g.horns, count: 2 } }).firstStrike).toBe(
      A.HORN_FIRST_STRIKE
    )
    expect(deriveCombatStats({ ...g, spines: { count: 4, type: 'back' } }).reflect).toBe(
      A.SPINE_REFLECT
    )
    expect(deriveCombatStats({ ...g, scales: true }).damageTaken).toBe(A.SCALE_DAMAGE_TAKEN)
    expect(deriveCombatStats({ ...g, wings: { ...g.wings, pairs: 1 } }).dodge).toBe(A.WING_DODGE)
    expect(deriveCombatStats({ ...g, tails: { ...g.tails, count: 1 } }).splash).toBe(
      A.TAIL_SWEEP_SPLASH
    )
  })

  it('more limbs mean more hits, capped', () => {
    const many = plain({
      limbSets: [
        { type: 'leg', count: 6 },
        { type: 'arm', count: 6 },
      ] as Genome['limbSets'],
    })
    expect(deriveCombatStats(many).hits).toBe(A.MAX_HITS)
    expect(deriveCombatStats(plain()).hits).toBe(1)
  })

  it('temperament leans behaviour', () => {
    expect(deriveCombatStats(plain({ temperament: 'aggressive' })).damage).toBeGreaterThan(
      deriveCombatStats(plain()).damage
    )
    expect(deriveCombatStats(plain({ temperament: 'shy' })).dodge).toBe(A.SHY_DODGE)
    expect(deriveCombatStats(plain({ temperament: 'territorial' })).maxHp).toBeGreaterThan(
      deriveCombatStats(plain()).maxHp
    )
    expect(deriveCombatStats(plain({ temperament: 'playful' })).crit).toBe(A.PLAYFUL_CRIT)
  })

  it('the archetype wheel: each beats the next two and loses to the previous two', () => {
    for (const a of ARCHETYPE_WHEEL) {
      let wins = 0
      let losses = 0
      for (const d of ARCHETYPE_WHEEL) {
        if (typeMultiplier(a, d) > 1) wins++
        else if (typeMultiplier(a, d) < 1) losses++
        // Antisymmetric: if I beat you, you do not beat me.
        if (typeMultiplier(a, d) > 1) expect(typeMultiplier(d, a)).toBeLessThan(1)
      }
      expect([wins, losses]).toEqual([2, 2])
      expect(typeMultiplier(a, a)).toBe(1)
    }
  })

  it('the best fighters are not simply the best earners', () => {
    const gs = Array.from({ length: 400 }, (_, i) => generateGenome(i + 1))
    const power = gs.map((g) => {
      const s = deriveCombatStats(g)
      return s.maxHp * s.damage * s.hits
    })
    const income = gs.map(
      (g) =>
        outputPerCycle({ genome: g, happiness: 75, ageStage: 'adult' }) *
        GAME_CONFIG.ECONOMY.MARKET.BASE_UNIT_PRICE[RESOURCE_BY_ARCHETYPE[g.archetype]]
    )
    const top = (xs: number[]) => new Set([...xs.keys()].sort((a, b) => xs[b] - xs[a]).slice(0, 20))
    const fighters = top(power)
    const earners = top(income)
    const both = [...fighters].filter((i) => earners.has(i)).length
    expect(both).toBeLessThan(10) // fewer than half the top fighters are top earners
  })
})

describe('the battle', () => {
  it('is deterministic: same teams and seed give the same fight, event for event', () => {
    const a = [
      member('Ash', plain({ temperament: 'playful', wings: { type: 'feather', pairs: 1 } })),
      member('Bo', plain({ size: 'large' })),
    ]
    const b = [
      member('Cy', plain({ archetype: 'aquatic', temperament: 'shy' })),
      member('Di', plain({ scales: true })),
    ]
    const r1 = simulateBattle(a, b, 1234)
    const r2 = simulateBattle(a, b, 1234)
    expect(r2).toEqual(r1)
    expect(
      JSON.stringify(
        simulateBattle(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 1234)
      )
    ).toBe(JSON.stringify(r1))
  })

  it('luck comes only from the seed', () => {
    const lucky = [
      member('P', plain({ temperament: 'playful', wings: { type: 'feather', pairs: 1 } })),
    ]
    const foe = [member('Q', plain({ temperament: 'shy' }))]
    const outcomes = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      outcomes.add(JSON.stringify(simulateBattle(lucky, foe, seed).events))
    }
    expect(outcomes.size).toBeGreaterThan(5)
  })

  it('a clearly stronger team wins, whichever side it is on', () => {
    const strong = team(3, plain({ size: 'large', rarity: 0.9 }))
    const weak = team(3, plain({ size: 'tiny' }))
    for (let seed = 1; seed <= 10; seed++) {
      expect(simulateBattle(strong, weak, seed).winner).toBe('a')
      expect(simulateBattle(weak, strong, seed).winner).toBe('b')
    }
  })

  it('type advantage decides an otherwise even fight', () => {
    const t = plain({ archetype: 'terrestrial' })
    const aerial = plain({ archetype: 'aerial' }) // terrestrial beats aerial
    const wins = { terrestrial: 0, aerial: 0 }
    for (let seed = 1; seed <= 20; seed++) {
      const r = simulateBattle([member('T', t)], [member('A', aerial)], seed)
      const r2 = simulateBattle([member('A', aerial)], [member('T', t)], seed)
      if (r.winner === 'a') wins.terrestrial++
      if (r2.winner === 'b') wins.terrestrial++
      if (r.winner === 'b') wins.aerial++
      if (r2.winner === 'a') wins.aerial++
    }
    expect(wins.terrestrial).toBeGreaterThan(wins.aerial)
  })

  it('always ends within the round limit and reports sane numbers', () => {
    for (let s = 1; s <= 60; s++) {
      const mk = (offset: number) =>
        [1, 2, 3].map((i) => member(`M${i}`, generateGenome(s * 10 + i + offset)))
      const r = simulateBattle(mk(0), mk(500), s)
      expect(r.rounds).toBeLessThanOrEqual(A.MAX_ROUNDS)
      expect(['a', 'b', 'draw']).toContain(r.winner)
      for (const e of r.events) {
        expect(e.targetHp).toBeGreaterThanOrEqual(0)
        expect(e.damage).toBeGreaterThanOrEqual(0)
      }
      for (const side of ['a', 'b'] as const) {
        expect(r.hpLeft[side]).toBeGreaterThanOrEqual(0)
        expect(r.hpLeft[side]).toBeLessThanOrEqual(1)
      }
    }
  })

  it('caps teams at the team size, ignores empty teams, and never changes its inputs', () => {
    const big = team(A.TEAM_SIZE + 2)
    const before = JSON.stringify(big)
    const r = simulateBattle(big, team(1, plain({ size: 'tiny' })), 5)
    expect(JSON.stringify(big)).toBe(before) // no permadeath: nothing is touched
    expect(r.survivors.a.length).toBeLessThanOrEqual(A.TEAM_SIZE)
    expect(simulateBattle([], team(2), 1).winner).toBe('b')
    expect(simulateBattle([], [], 1).winner).toBe('draw')
  })

  it('specials show up in the log: dodges, reflects, splash and falls', () => {
    const kinds = new Set<string>()
    const a = [
      member(
        'Wing',
        plain({
          wings: { type: 'feather', pairs: 1 },
          tails: { type: 'fur', count: 1 },
          spines: { count: 4, type: 'back' },
          temperament: 'playful',
        })
      ),
      member('Wing2', plain({ wings: { type: 'feather', pairs: 1 } })),
    ]
    for (let seed = 1; seed <= 30; seed++) {
      for (const e of simulateBattle(a, a, seed).events) kinds.add(e.kind)
    }
    for (const k of ['hit', 'dodge', 'reflect', 'splash', 'fall', 'crit'])
      expect(kinds.has(k)).toBe(true)
  })
})
