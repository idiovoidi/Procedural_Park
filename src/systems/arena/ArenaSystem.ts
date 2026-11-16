/**
 * Arena ladder (GDD 11)
 * Fight a ladder of seeded opponent teams for coins. Optional: nothing else in the game needs
 * it. The first win on a rung pays well and unlocks the next; repeat wins pay a little, so the
 * ladder cannot be farmed. There is no permadeath: a fight never changes the creatures.
 */

import { GAME_CONFIG } from '@core/constants'
import { type Genome, generateGenome, hashSeed } from '@systems/creatures/genome'
import type { OwnedCreature, Roster } from '@systems/roster'
import { type BattleResult, simulateBattle, type TeamMember } from './battle'

const A = GAME_CONFIG.ECONOMY.ARENA

export interface ArenaPurse {
  addMoney(amount: number, reason?: string): void
}

export interface ArenaSnapshot {
  version: 1
  /** Highest rung beaten (0 = none). */
  beaten: number
  fights: number
}

export type FightOutcome =
  | {
      ok: true
      rung: number
      result: BattleResult
      team: TeamMember[]
      foes: TeamMember[]
      won: boolean
      coins: number
      firstWin: boolean
    }
  | { ok: false; reason: string }

/** The opponent team for a rung: the same three genomes for everyone, tougher each rung. */
export function ladderTeam(rung: number): TeamMember[] {
  const r = Math.min(A.LADDER_RUNGS, Math.max(1, Math.floor(rung)))
  const wanted = Math.min(0.95, 0.05 + r * 0.1)
  return [0, 1, 2].map((slot) => {
    let best: Genome | null = null
    for (let attempt = 0; attempt < 80; attempt++) {
      const g = generateGenome(hashSeed(GAME_CONFIG.WORLD_SEED, 0xa7e1a, r, slot, attempt))
      if (g.rarity >= wanted - 0.05 && g.rarity <= wanted + 0.15) {
        best = g
        break
      }
      if (!best || Math.abs(g.rarity - wanted) < Math.abs(best.rarity - wanted)) best = g
    }
    return { name: `Rung ${r} fighter ${slot + 1}`, genome: best as Genome }
  })
}

export class ArenaSystem {
  private readonly roster: Roster
  private readonly purse: ArenaPurse
  private beaten = 0
  private fights = 0
  private listeners = new Set<() => void>()

  constructor(roster: Roster, purse: ArenaPurse) {
    this.roster = roster
    this.purse = purse
  }

  public getBeaten(): number {
    return this.beaten
  }

  /** The highest rung the player may fight now. */
  public getOpenRung(): number {
    return Math.min(A.LADDER_RUNGS, this.beaten + 1)
  }

  public getRungCount(): number {
    return A.LADDER_RUNGS
  }

  /** Whether a creature may fight (adults only; the young are too small to send). */
  public canFight(c: Readonly<OwnedCreature>): boolean {
    return c.ageStage === 'adult'
  }

  public rewardFor(rung: number): { firstWin: number; repeat: number } {
    return {
      firstWin: A.FIRST_WIN_COINS + A.FIRST_WIN_COINS_PER_RUNG * (rung - 1),
      repeat: A.REPEAT_WIN_COINS,
    }
  }

  public fightLadder(creatureIds: readonly string[], rung: number): FightOutcome {
    if (!Number.isInteger(rung) || rung < 1 || rung > this.getOpenRung()) {
      return { ok: false, reason: 'That rung is not open yet' }
    }
    const ids = [...new Set(creatureIds)]
    if (ids.length === 0) return { ok: false, reason: 'Pick at least one fighter' }
    if (ids.length > A.TEAM_SIZE) return { ok: false, reason: `At most ${A.TEAM_SIZE} fighters` }
    const team: TeamMember[] = []
    for (const id of ids) {
      const c = this.roster.get(id)
      if (!c) return { ok: false, reason: 'A fighter is no longer in your roster' }
      if (!this.canFight(c)) return { ok: false, reason: `${c.name} is too young to fight` }
      team.push({ name: c.name, genome: c.genome })
    }

    const foes = ladderTeam(rung)
    // The seed depends on the team and how many fights were fought, so a retry is a new roll.
    const seed = hashSeed(
      GAME_CONFIG.WORLD_SEED,
      rung,
      this.fights,
      ...ids.map((id) => Number(id.slice(1)) || 0)
    )
    const result = simulateBattle(team, foes, seed)
    this.fights++

    const won = result.winner === 'a'
    const firstWin = won && rung > this.beaten
    const rewards = this.rewardFor(rung)
    const coins = won ? (firstWin ? rewards.firstWin : rewards.repeat) : 0
    if (firstWin) this.beaten = rung
    if (coins > 0) this.purse.addMoney(coins, `Arena rung ${rung}`)
    this.notify()
    return { ok: true, rung, result, team, foes, won, coins, firstWin }
  }

  public onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  public serialize(): ArenaSnapshot {
    return { version: 1, beaten: this.beaten, fights: this.fights }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<ArenaSnapshot> | null
    if (!s || s.version !== 1) return false
    const int = (v: unknown, max: number) =>
      typeof v === 'number' && Number.isInteger(v) && v >= 0 ? Math.min(v, max) : 0
    this.beaten = int(s.beaten, A.LADDER_RUNGS)
    this.fights = int(s.fights, 1_000_000)
    this.notify()
    return true
  }
}
