import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { generateGenome } from '../creatures/genome'
import { Roster } from '../roster'
import { ArenaSystem, ladderTeam } from './ArenaSystem'
import { deriveCombatStats } from './stats'

const A = GAME_CONFIG.ECONOMY.ARENA

function setup() {
  const roster = new Roster()
  const paid: Array<[number, string]> = []
  const arena = new ArenaSystem(roster, { addMoney: (n, r) => paid.push([n, r ?? '']) })
  return { roster, arena, paid }
}

/** A team strong enough to clear the lower rungs. */
const strong = (roster: Roster, n = 3) =>
  Array.from({ length: n }, (_, i) => {
    const g = { ...generateGenome(i + 1), size: 'large' as const, rarity: 1 }
    return roster.add(g, { name: `S${i}` }).id
  })

describe('ladder teams', () => {
  it('are the same for everyone and get tougher each rung', () => {
    expect(ladderTeam(3)).toEqual(ladderTeam(3))
    const power = (r: number) =>
      ladderTeam(r).reduce(
        (n, m) => n + deriveCombatStats(m.genome).maxHp * deriveCombatStats(m.genome).damage,
        0
      )
    expect(power(A.LADDER_RUNGS)).toBeGreaterThan(power(1))
    expect(ladderTeam(1)).toHaveLength(3)
    // Out-of-range rungs clamp rather than throw.
    expect(ladderTeam(0)).toEqual(ladderTeam(1))
    expect(ladderTeam(99)).toEqual(ladderTeam(A.LADDER_RUNGS))
  })
})

describe('the ladder', () => {
  it('pays well for a first win, unlocks the next rung, and pays little afterwards', () => {
    const { roster, arena, paid } = setup()
    const team = strong(roster)
    expect(arena.getOpenRung()).toBe(1)

    const first = arena.fightLadder(team, 1)
    expect(first.ok && first.won).toBe(true)
    if (first.ok) {
      expect(first.firstWin).toBe(true)
      expect(first.coins).toBe(A.FIRST_WIN_COINS)
    }
    expect(arena.getOpenRung()).toBe(2)

    const again = arena.fightLadder(team, 1)
    if (again.ok && again.won) {
      expect(again.firstWin).toBe(false)
      expect(again.coins).toBe(A.REPEAT_WIN_COINS)
    }
    expect(paid[0]).toEqual([A.FIRST_WIN_COINS, 'Arena rung 1'])
  })

  it('pays nothing and unlocks nothing for a loss, and never harms the team', () => {
    const { roster, arena, paid } = setup()
    const weak = roster.add({ ...generateGenome(9), size: 'tiny', rarity: 0 }).id
    const before = JSON.stringify(roster.list())
    const lost = arena.fightLadder([weak], 1) // one tiny creature against three
    expect(lost.ok && !lost.won).toBe(true)
    if (lost.ok) expect(lost.coins).toBe(0)
    expect(arena.getOpenRung()).toBe(1)
    expect(paid).toEqual([])
    expect(JSON.stringify(roster.list())).toBe(before)
  })

  it('refuses a rung that is not open, bad teams, and the young', () => {
    const { roster, arena } = setup()
    const team = strong(roster)
    expect(arena.fightLadder(team, 2).ok).toBe(false)
    expect(arena.fightLadder([], 1).ok).toBe(false)
    expect(arena.fightLadder([...team, ...strong(roster, 1)], 1).ok).toBe(false) // four fighters
    expect(arena.fightLadder(['c999'], 1).ok).toBe(false)
    const baby = roster.add(generateGenome(30), { ageStage: 'hatchling' })
    expect(arena.fightLadder([baby.id], 1).ok).toBe(false)
    expect(arena.fightLadder(team, 1.5).ok).toBe(false)
  })

  it('the same team gets a fresh roll on a retry, but the same state gives the same result', () => {
    const run = () => {
      const { roster, arena } = setup()
      const team = strong(roster)
      const a = arena.fightLadder(team, 1)
      const b = arena.fightLadder(team, 1)
      return [a, b]
    }
    const [a1, b1] = run()
    const [a2, b2] = run()
    expect(JSON.stringify(a1)).toBe(JSON.stringify(a2))
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2))
  })

  it('saves progress and ignores bad data', () => {
    const { roster, arena } = setup()
    arena.fightLadder(strong(roster), 1)
    const snap = JSON.parse(JSON.stringify(arena.serialize()))
    const other = setup().arena
    expect(other.restore(snap)).toBe(true)
    expect(other.getBeaten()).toBe(1)
    expect(other.restore({ version: 1, beaten: 999, fights: -5 })).toBe(true)
    expect(other.getBeaten()).toBe(A.LADDER_RUNGS)
    expect(other.restore(null)).toBe(false)
  })
})
