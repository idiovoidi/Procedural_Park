/**
 * Friend duels (GDD 11 and 12.2, MP-5)
 * One friend challenges with a team; the other answers with theirs; both then run the same
 * seeded battle locally and see the same result. Only team genomes travel, and nothing is won
 * or lost beyond bragging rights (no coins), so there is nothing to farm.
 */

import { type BattleResult, simulateBattle, type TeamMember } from '@systems/arena'
import { type Genome, hashString, validateGenome } from '@systems/creatures/genome'
import type { SocialChannel, SocialMessage } from './channel'

const MAX_TEAM = 3

export interface DuelChallenge {
  id: string
  from: TeamMember[]
}

export interface DuelOutcome {
  id: string
  /** Seen from my side: my team first. */
  mine: TeamMember[]
  theirs: TeamMember[]
  result: BattleResult
  /** 'a' = the challenger's side. */
  iChallenged: boolean
  iWon: boolean | null
}

export type DuelEvent =
  | { kind: 'challenged'; challenge: DuelChallenge }
  | { kind: 'result'; outcome: DuelOutcome }
  | { kind: 'declined' }
  | { kind: 'cancelled' }

export class DuelShare {
  private readonly channel: SocialChannel
  private readonly makeId: () => string
  private outgoing: { id: string; team: TeamMember[] } | null = null
  private incoming: DuelChallenge | null = null
  private listeners = new Set<(event: DuelEvent) => void>()

  constructor(channel: SocialChannel, makeId?: () => string) {
    this.channel = channel
    let counter = 0
    this.makeId = makeId ?? (() => `duel-${Date.now().toString(36)}-${++counter}`)
    channel.on('duel.challenge', (m) => this.onChallenge(m))
    channel.on('duel.accept', (m) => this.onAccept(m))
    channel.on('duel.decline', () => this.onDecline())
    channel.on('duel.cancel', () => this.onCancel())
  }

  public getIncoming(): DuelChallenge | null {
    return this.incoming
  }

  public hasOutgoing(): boolean {
    return this.outgoing !== null
  }

  public challenge(team: TeamMember[]): { ok: true } | { ok: false; reason: string } {
    if (team.length === 0 || team.length > MAX_TEAM)
      return { ok: false, reason: 'Pick 1 to 3 fighters' }
    if (this.outgoing) return { ok: false, reason: 'A challenge is already waiting' }
    const id = this.makeId()
    this.outgoing = { id, team }
    this.channel.send({ type: 'duel.challenge', id, team })
    return { ok: true }
  }

  public cancel(): void {
    if (!this.outgoing) return
    this.outgoing = null
    this.channel.send({ type: 'duel.cancel' })
  }

  /** Answer the friend's challenge with my team; both of us then see the same fight. */
  public accept(team: TeamMember[]): { ok: true } | { ok: false; reason: string } {
    const challenge = this.incoming
    if (!challenge) return { ok: false, reason: 'No challenge to answer' }
    if (team.length === 0 || team.length > MAX_TEAM)
      return { ok: false, reason: 'Pick 1 to 3 fighters' }
    this.incoming = null
    this.channel.send({ type: 'duel.accept', id: challenge.id, team })
    this.finish(challenge.id, challenge.from, team, false)
    return { ok: true }
  }

  public decline(): void {
    if (!this.incoming) return
    this.incoming = null
    this.channel.send({ type: 'duel.decline' })
  }

  public reset(): void {
    this.outgoing = null
    this.incoming = null
    this.channel.reset()
  }

  public onEvent(listener: (event: DuelEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(event: DuelEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  private onChallenge(m: SocialMessage): void {
    const team = parseTeam(m.team)
    if (typeof m.id !== 'string' || !m.id || m.id.length > 64 || !team) return
    if (this.incoming) {
      this.channel.send({ type: 'duel.decline' })
      return
    }
    this.incoming = { id: m.id, from: team }
    this.emit({ kind: 'challenged', challenge: this.incoming })
  }

  private onAccept(m: SocialMessage): void {
    const out = this.outgoing
    const theirs = parseTeam(m.team)
    if (!out || m.id !== out.id || !theirs) return
    this.outgoing = null
    this.finish(out.id, out.team, theirs, true)
  }

  private onDecline(): void {
    if (!this.outgoing) return
    this.outgoing = null
    this.emit({ kind: 'declined' })
  }

  private onCancel(): void {
    if (!this.incoming) return
    this.incoming = null
    this.emit({ kind: 'cancelled' })
  }

  /** Both sides call this with the challenger's team first, so the seed and order match. */
  private finish(
    id: string,
    challenger: TeamMember[],
    answerer: TeamMember[],
    iChallenged: boolean
  ) {
    const result = simulateBattle(challenger, answerer, hashString(id))
    const mine = iChallenged ? challenger : answerer
    const theirs = iChallenged ? answerer : challenger
    const mySide = iChallenged ? 'a' : 'b'
    const iWon = result.winner === 'draw' ? null : result.winner === mySide
    this.emit({ kind: 'result', outcome: { id, mine, theirs, result, iChallenged, iWon } })
  }
}

function parseTeam(raw: unknown): TeamMember[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TEAM) return null
  const team: TeamMember[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null
    const { name, genome } = m as { name?: unknown; genome?: unknown }
    if (typeof name !== 'string' || !name.trim() || !genome || typeof genome !== 'object')
      return null
    try {
      if (validateGenome(genome as Genome).length > 0) return null
    } catch {
      return null
    }
    team.push({ name: name.slice(0, 40), genome: genome as Genome })
  }
  return team
}
