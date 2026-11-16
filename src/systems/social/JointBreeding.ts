/**
 * Joint breeding (GDD 12.2, MP-4)
 * Each friend brings one parent; both players get a child of the same two parents (a different
 * one each, from a shared seed). Nothing is exchanged but the two parent genomes: each side
 * starts its own egg in its own den, pays its own cost, and keeps its own parent. So there is
 * nothing to duplicate or lose, and no escrow is needed. If one side cannot start (no den, no
 * coins) the other's egg still hatches: it is simply a litter of two parents with one half.
 */

import { type Genome, validateGenome } from '@systems/creatures/genome'
import type { Roster } from '@systems/roster'
import type { SocialChannel, SocialMessage } from './channel'

export const MAX_INCOMING_JOINT = 3

export interface JointProposal {
  id: string
  name: string
  genome: Genome
}

export interface JointBeginArgs {
  jointId: string
  myParentId: string
  friendGenome: Genome
  friendName: string
  iProposed: boolean
}

export type JointBeginResult = { ok: true } | { ok: false; reason: string }

export type JointEvent =
  | { kind: 'proposed'; proposal: JointProposal }
  | { kind: 'started'; friendName: string }
  | { kind: 'declined'; name: string }
  | { kind: 'cancelled'; name: string }
  | { kind: 'failed'; reason: string }

export class JointBreeding {
  private readonly roster: Roster
  private readonly channel: SocialChannel
  private readonly begin: (args: JointBeginArgs) => JointBeginResult
  private readonly makeId: () => string
  private outgoing = new Map<string, { creatureId: string; name: string }>()
  private incoming = new Map<string, JointProposal>()
  private listeners = new Set<(event: JointEvent) => void>()

  constructor(
    roster: Roster,
    channel: SocialChannel,
    begin: (args: JointBeginArgs) => JointBeginResult,
    makeId?: () => string
  ) {
    this.roster = roster
    this.channel = channel
    this.begin = begin
    let counter = 0
    this.makeId = makeId ?? (() => `jb-${Date.now().toString(36)}-${++counter}`)
    channel.on('joint.propose', (m) => this.onPropose(m))
    channel.on('joint.accept', (m) => this.onAccept(m))
    channel.on('joint.decline', (m) => this.onDecline(m))
    channel.on('joint.cancel', (m) => this.onCancel(m))
  }

  public getIncoming(): JointProposal[] {
    return [...this.incoming.values()]
  }

  public getOutgoing(): Array<{ id: string; creatureId: string; name: string }> {
    return [...this.outgoing].map(([id, o]) => ({ id, ...o }))
  }

  /** Offer one of my creatures as a parent to the friend. */
  public propose(creatureId: string): { ok: true; id: string } | { ok: false; reason: string } {
    const c = this.roster.get(creatureId)
    if (!c) return { ok: false, reason: 'Pick a creature' }
    for (const o of this.outgoing.values()) {
      if (o.creatureId === creatureId) return { ok: false, reason: `${c.name} is already offered` }
    }
    const id = this.makeId()
    this.outgoing.set(id, { creatureId, name: c.name })
    this.channel.send({ type: 'joint.propose', id, name: c.name, genome: c.genome })
    return { ok: true, id }
  }

  public cancel(id: string): void {
    if (!this.outgoing.delete(id)) return
    this.channel.send({ type: 'joint.cancel', id })
  }

  /** Accept a friend's proposal with one of my creatures as the other parent. */
  public accept(id: string, myCreatureId: string): JointBeginResult {
    const proposal = this.incoming.get(id)
    const mine = this.roster.get(myCreatureId)
    if (!proposal) return { ok: false, reason: 'That proposal is gone' }
    if (!mine) return { ok: false, reason: 'Pick a creature' }
    // Start my own egg first: if I cannot, nothing is sent and the friend is not told yes.
    const result = this.begin({
      jointId: id,
      myParentId: myCreatureId,
      friendGenome: proposal.genome,
      friendName: proposal.name,
      iProposed: false,
    })
    if (!result.ok) return result
    this.incoming.delete(id)
    this.channel.send({ type: 'joint.accept', id, name: mine.name, genome: mine.genome })
    this.emit({ kind: 'started', friendName: proposal.name })
    return { ok: true }
  }

  public decline(id: string): void {
    if (!this.incoming.delete(id)) return
    this.channel.send({ type: 'joint.decline', id })
  }

  public reset(): void {
    this.outgoing.clear()
    this.incoming.clear()
    this.channel.reset()
  }

  public onEvent(listener: (event: JointEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(event: JointEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  // ---- The friend's messages ------------------------------------------------------------------

  private onPropose(m: SocialMessage): void {
    const proposal = parseProposal(m)
    if (!proposal) return
    if (this.incoming.size >= MAX_INCOMING_JOINT || this.incoming.has(proposal.id)) {
      this.channel.send({ type: 'joint.decline', id: proposal.id })
      return
    }
    this.incoming.set(proposal.id, proposal)
    this.emit({ kind: 'proposed', proposal })
  }

  /** The friend accepted: start my own egg with their parent. */
  private onAccept(m: SocialMessage): void {
    const id = String(m.id)
    const out = this.outgoing.get(id)
    const friend = parseProposal({ ...m, id })
    if (!out || !friend) return
    this.outgoing.delete(id)
    const result = this.begin({
      jointId: id,
      myParentId: out.creatureId,
      friendGenome: friend.genome,
      friendName: friend.name,
      iProposed: true,
    })
    if (result.ok) this.emit({ kind: 'started', friendName: friend.name })
    else this.emit({ kind: 'failed', reason: result.reason })
  }

  private onDecline(m: SocialMessage): void {
    const out = this.outgoing.get(String(m.id))
    if (!out) return
    this.outgoing.delete(String(m.id))
    this.emit({ kind: 'declined', name: out.name })
  }

  private onCancel(m: SocialMessage): void {
    const p = this.incoming.get(String(m.id))
    if (!p) return
    this.incoming.delete(String(m.id))
    this.emit({ kind: 'cancelled', name: p.name })
  }
}

function parseProposal(m: SocialMessage): JointProposal | null {
  if (typeof m.id !== 'string' || m.id.length === 0 || m.id.length > 64) return null
  if (typeof m.name !== 'string' || m.name.trim().length === 0) return null
  const genome = m.genome as Genome | undefined
  if (!genome || typeof genome !== 'object') return null
  try {
    if (validateGenome(genome).length > 0) return null
  } catch {
    return null
  }
  return { id: m.id, name: m.name.slice(0, 40), genome }
}
