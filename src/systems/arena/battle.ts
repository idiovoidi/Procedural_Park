/**
 * Arena battle (GDD 11)
 * A deterministic, seeded auto-battle between two teams. The same teams and the same seed give
 * the same result on every machine, so friends can duel by swapping team genomes and each
 * running it locally. All randomness (dodges, crits) comes from one seeded generator drawn in a
 * fixed order. Nobody dies for good: a "fallen" creature only drops out of this fight.
 *
 * Each round, living creatures act from fastest to slowest (ties go to team A, then position).
 * An action hits the first living enemy (a tail also splashes the next), once per hit.
 */

import { GAME_CONFIG } from '@core/constants'
import { createSeededRandom, type Genome } from '@systems/creatures/genome'
import { type CombatStats, deriveCombatStats, typeMultiplier } from './stats'

const A = GAME_CONFIG.ECONOMY.ARENA

export type Side = 'a' | 'b'

export interface BattleEvent {
  round: number
  actor: string
  target: string
  damage: number
  kind: 'hit' | 'crit' | 'dodge' | 'reflect' | 'splash' | 'fall'
  /** HP of the target after the event. */
  targetHp: number
}

export interface Fighter {
  id: string
  side: Side
  name: string
  stats: CombatStats
  hp: number
  struck: boolean
}

export interface BattleResult {
  winner: Side | 'draw'
  rounds: number
  events: BattleEvent[]
  /** Fighters standing at the end, by side. */
  survivors: Record<Side, string[]>
  /** Share of total max HP each side has left (0..1): decides a fight that times out. */
  hpLeft: Record<Side, number>
}

export interface TeamMember {
  name: string
  genome: Genome
}

export function simulateBattle(
  teamA: readonly TeamMember[],
  teamB: readonly TeamMember[],
  seed: number
): BattleResult {
  const rand = createSeededRandom(seed >>> 0)
  const make = (team: readonly TeamMember[], side: Side): Fighter[] =>
    team.slice(0, A.TEAM_SIZE).map((m, i) => {
      const stats = deriveCombatStats(m.genome)
      return { id: `${side}${i}`, side, name: m.name, stats, hp: stats.maxHp, struck: false }
    })
  const fighters = [...make(teamA, 'a'), ...make(teamB, 'b')]
  const events: BattleEvent[] = []
  const alive = (side: Side) => fighters.filter((f) => f.side === side && f.hp > 0)

  const hpLeft = (side: Side) => {
    const all = fighters.filter((f) => f.side === side)
    const max = all.reduce((n, f) => n + f.stats.maxHp, 0)
    return max === 0 ? 0 : all.reduce((n, f) => n + Math.max(0, f.hp), 0) / max
  }

  let round = 0
  while (round < A.MAX_ROUNDS && alive('a').length > 0 && alive('b').length > 0) {
    round++
    // Fastest first; ties: team A, then position. Stable and fully determined by the teams.
    const order = [...fighters].sort(
      (x, y) =>
        y.stats.speed - x.stats.speed ||
        (x.side === y.side ? 0 : x.side === 'a' ? -1 : 1) ||
        x.id.localeCompare(y.id)
    )
    for (const actor of order) {
      if (actor.hp <= 0) continue
      const foes = alive(actor.side === 'a' ? 'b' : 'a')
      if (foes.length === 0) break

      for (let h = 0; h < actor.stats.hits && actor.hp > 0; h++) {
        const targets = alive(actor.side === 'a' ? 'b' : 'a')
        if (targets.length === 0) break
        strike(actor, targets[0], 1, round, events, rand)
        // A tail sweep also catches the next enemy in line.
        if (actor.stats.splash > 0 && targets[1] && targets[1].hp > 0) {
          strike(actor, targets[1], actor.stats.splash, round, events, rand, true)
        }
        actor.struck = true
      }
    }
  }

  const a = hpLeft('a')
  const b = hpLeft('b')
  const winner: BattleResult['winner'] =
    alive('b').length === 0 && alive('a').length > 0
      ? 'a'
      : alive('a').length === 0 && alive('b').length > 0
        ? 'b'
        : a > b + 1e-9
          ? 'a'
          : b > a + 1e-9
            ? 'b'
            : 'draw'
  return {
    winner,
    rounds: round,
    events,
    survivors: { a: alive('a').map((f) => f.id), b: alive('b').map((f) => f.id) },
    hpLeft: { a, b },
  }
}

function strike(
  actor: Fighter,
  target: Fighter,
  share: number,
  round: number,
  events: BattleEvent[],
  rand: () => number,
  splash = false
): void {
  // Always draw the same two numbers per strike so the random stream never depends on outcomes.
  const dodgeRoll = rand()
  const critRoll = rand()

  if (dodgeRoll < target.stats.dodge) {
    events.push({
      round,
      actor: actor.id,
      target: target.id,
      damage: 0,
      kind: 'dodge',
      targetHp: target.hp,
    })
    return
  }
  const crit = critRoll < actor.stats.crit
  let damage = actor.stats.damage * share
  damage *= typeMultiplier(actor.stats.archetype, target.stats.archetype)
  if (!actor.struck) damage *= 1 + actor.stats.firstStrike
  if (crit) damage *= A.CRIT_MULTIPLIER
  damage = Math.max(1, Math.round(damage * target.stats.damageTaken))

  target.hp -= damage
  events.push({
    round,
    actor: actor.id,
    target: target.id,
    damage,
    kind: splash ? 'splash' : crit ? 'crit' : 'hit',
    targetHp: Math.max(0, target.hp),
  })
  if (target.stats.reflect > 0 && actor.hp > 0) {
    const back = Math.max(1, Math.round(damage * target.stats.reflect))
    actor.hp -= back
    events.push({
      round,
      actor: target.id,
      target: actor.id,
      damage: back,
      kind: 'reflect',
      targetHp: Math.max(0, actor.hp),
    })
    if (actor.hp <= 0)
      events.push({
        round,
        actor: target.id,
        target: actor.id,
        damage: 0,
        kind: 'fall',
        targetHp: 0,
      })
  }
  if (target.hp <= 0) {
    events.push({ round, actor: actor.id, target: target.id, damage: 0, kind: 'fall', targetHp: 0 })
  }
}
