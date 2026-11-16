/**
 * Card trading (GDD 12.2, MP-1)
 * Offer a creature to a connected friend; if they accept, it moves to their roster. The
 * hand-over is atomic from the receiver's side: the sender removes the creature *first*, then
 * confirms, and only that confirmation adds it to the receiver's roster. So a creature can
 * never be duplicated, and if it vanished meanwhile (sold, or off breeding) the trade is voided.
 * Swapping is just two offers, one each way.
 */

import { type Genome, validateGenome } from '@systems/creatures/genome'
import type { OwnedCreature, Roster } from '@systems/roster'
import type { SocialChannel, SocialMessage } from './channel'

/** Incoming offers kept at once; more are declined so a friend cannot flood the screen. */
export const MAX_INCOMING = 5
const MAX_NAME = 40
const AGE_STAGES = ['hatchling', 'juvenile', 'adult'] as const

export interface Offer {
  id: string
  name: string
  genome: Genome
  generation: number
  ageStage: OwnedCreature['ageStage']
}

export type TradeEvent =
  | { kind: 'offered'; offer: Offer }
  | { kind: 'received'; offer: Offer; creatureId: string }
  | { kind: 'sent'; name: string }
  | { kind: 'declined'; name: string }
  | { kind: 'voided'; name: string; reason: string }
  | { kind: 'cancelled'; name: string }

export type OfferResult = { ok: true; id: string } | { ok: false; reason: string }

export interface TradeOptions {
  /** Creatures that cannot leave right now (e.g. mid-breeding). */
  isLocked?: (creatureId: string) => boolean
  makeId?: () => string
}

export class TradeManager {
  private readonly roster: Roster
  private readonly channel: SocialChannel
  private readonly isLocked: (creatureId: string) => boolean
  private readonly makeId: () => string
  private outgoing = new Map<string, { creatureId: string; name: string }>()
  private incoming = new Map<string, { offer: Offer; accepted: boolean }>()
  private listeners = new Set<(event: TradeEvent) => void>()

  constructor(roster: Roster, channel: SocialChannel, options: TradeOptions = {}) {
    this.roster = roster
    this.channel = channel
    this.isLocked = options.isLocked ?? (() => false)
    let counter = 0
    this.makeId = options.makeId ?? (() => `${Date.now().toString(36)}-${++counter}`)

    channel.on('trade.offer', (m) => this.onOffer(m))
    channel.on('trade.accept', (m) => this.onAccept(m))
    channel.on('trade.confirm', (m) => this.onConfirm(m))
    channel.on('trade.decline', (m) => this.onDecline(m))
    channel.on('trade.cancel', (m) => this.onCancel(m))
    channel.on('trade.void', (m) => this.onVoid(m))
  }

  // ---- What the player does -----------------------------------------------------------------

  public getIncoming(): Array<{ offer: Offer; accepted: boolean }> {
    return [...this.incoming.values()]
  }

  public getOutgoing(): Array<{ id: string; creatureId: string; name: string }> {
    return [...this.outgoing].map(([id, o]) => ({ id, ...o }))
  }

  public offer(creatureId: string): OfferResult {
    const c = this.roster.get(creatureId)
    if (!c) return { ok: false, reason: 'Pick a creature' }
    if (this.isLocked(creatureId)) return { ok: false, reason: `${c.name} is busy breeding` }
    for (const o of this.outgoing.values()) {
      if (o.creatureId === creatureId) return { ok: false, reason: `${c.name} is already offered` }
    }
    const id = this.makeId()
    this.outgoing.set(id, { creatureId, name: c.name })
    this.channel.send({
      type: 'trade.offer',
      id,
      name: c.name,
      genome: c.genome,
      generation: c.generation,
      ageStage: c.ageStage,
    })
    return { ok: true, id }
  }

  public cancel(id: string): void {
    const o = this.outgoing.get(id)
    if (!o) return
    this.outgoing.delete(id)
    this.channel.send({ type: 'trade.cancel', id })
  }

  public accept(id: string): void {
    const entry = this.incoming.get(id)
    if (!entry || entry.accepted) return
    entry.accepted = true
    this.channel.send({ type: 'trade.accept', id })
  }

  public decline(id: string): void {
    const entry = this.incoming.get(id)
    if (!entry) return
    this.incoming.delete(id)
    this.channel.send({ type: 'trade.decline', id })
  }

  /** Forget everything pending (on disconnect). Nothing has moved, so nothing is lost. */
  public reset(): void {
    this.outgoing.clear()
    this.incoming.clear()
    this.channel.reset()
  }

  public onEvent(listener: (event: TradeEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(event: TradeEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  // ---- What the friend does ---------------------------------------------------------------------

  private onOffer(m: SocialMessage): void {
    const offer = parseOffer(m)
    if (!offer) return
    if (this.incoming.size >= MAX_INCOMING || this.incoming.has(offer.id)) {
      this.channel.send({ type: 'trade.decline', id: offer.id })
      return
    }
    this.incoming.set(offer.id, { offer, accepted: false })
    this.emit({ kind: 'offered', offer })
  }

  /** The friend accepted my offer: take the creature out first, then confirm. */
  private onAccept(m: SocialMessage): void {
    const id = String(m.id)
    const o = this.outgoing.get(id)
    if (!o) return
    this.outgoing.delete(id)
    if (!this.roster.has(o.creatureId) || this.isLocked(o.creatureId)) {
      this.channel.send({ type: 'trade.void', id, reason: `${o.name} is no longer available` })
      this.emit({ kind: 'voided', name: o.name, reason: 'it is no longer available' })
      return
    }
    this.roster.remove(o.creatureId)
    this.channel.send({ type: 'trade.confirm', id })
    this.emit({ kind: 'sent', name: o.name })
  }

  private onConfirm(m: SocialMessage): void {
    const id = String(m.id)
    const entry = this.incoming.get(id)
    if (!entry?.accepted) return // only a trade I accepted can complete
    this.incoming.delete(id)
    const { offer } = entry
    const created = this.roster.add(offer.genome, {
      name: offer.name,
      generation: offer.generation,
      ageStage: offer.ageStage,
      stats: { trust: 60 },
    })
    this.emit({ kind: 'received', offer, creatureId: created.id })
  }

  private onDecline(m: SocialMessage): void {
    const o = this.outgoing.get(String(m.id))
    if (!o) return
    this.outgoing.delete(String(m.id))
    this.emit({ kind: 'declined', name: o.name })
  }

  private onCancel(m: SocialMessage): void {
    const entry = this.incoming.get(String(m.id))
    if (!entry) return
    this.incoming.delete(String(m.id))
    this.emit({ kind: 'cancelled', name: entry.offer.name })
  }

  private onVoid(m: SocialMessage): void {
    const entry = this.incoming.get(String(m.id))
    if (!entry) return
    this.incoming.delete(String(m.id))
    this.emit({ kind: 'voided', name: entry.offer.name, reason: String(m.reason ?? 'voided') })
  }
}

/** A friend's offer, checked: a real genome, sane name and stage, or nothing. */
function parseOffer(m: SocialMessage): Offer | null {
  if (typeof m.id !== 'string' || m.id.length === 0 || m.id.length > 64) return null
  if (typeof m.name !== 'string' || m.name.trim().length === 0) return null
  const genome = m.genome as Genome | undefined
  if (!genome || typeof genome !== 'object') return null
  try {
    if (validateGenome(genome).length > 0) return null
  } catch {
    return null
  }
  const ageStage = AGE_STAGES.find((s) => s === m.ageStage)
  if (!ageStage) return null
  const generation =
    typeof m.generation === 'number' && Number.isFinite(m.generation)
      ? Math.min(99, Math.max(0, Math.floor(m.generation)))
      : 0
  return { id: m.id, name: m.name.slice(0, MAX_NAME), genome, generation, ageStage }
}
