/**
 * Visit a friend's park (GDD 12.2, MP-2)
 * The guest asks; the host answers with a read-only snapshot of the pens and the creatures
 * living in them; the guest walks through a copy. Nothing the guest does reaches the host's
 * ranch: the snapshot is only data, restored into separate objects on the guest's side.
 * Pure: it only moves messages, the game layer builds and shows the copy.
 */

import type { SocialChannel, SocialMessage } from './channel'

export interface ParkSnapshotData {
  /** `PenGrid.serialize()` of the host's park. */
  grid: unknown
  /** `Roster.serialize()` of the host's creatures. */
  roster: unknown
}

export interface VisitHandlers {
  /** Host: build a snapshot of my park to send. */
  getSnapshot: () => ParkSnapshotData
  /** Host: a friend asked to visit (told for a toast). */
  onVisitorArrived?: () => void
  /** Host: the friend left. */
  onVisitorLeft?: () => void
  /** Guest: the host's park arrived. */
  onSnapshot: (snapshot: ParkSnapshotData) => void
}

export class VisitShare {
  private readonly channel: SocialChannel
  private readonly handlers: VisitHandlers
  /** Whether a request of mine is waiting for an answer. */
  private waiting = false

  constructor(channel: SocialChannel, handlers: VisitHandlers) {
    this.channel = channel
    this.handlers = handlers
    channel.on('visit.request', () => this.onRequest())
    channel.on('visit.snapshot', (m) => this.onSnapshot(m))
    channel.on('visit.leave', () => this.handlers.onVisitorLeft?.())
  }

  public isWaiting(): boolean {
    return this.waiting
  }

  /** Guest: ask the friend to show their park. */
  public request(): void {
    this.waiting = true
    this.channel.send({ type: 'visit.request' })
  }

  /** Guest: tell the host the visit is over. */
  public leave(): void {
    this.waiting = false
    this.channel.send({ type: 'visit.leave' })
  }

  public reset(): void {
    this.waiting = false
  }

  private onRequest(): void {
    this.handlers.onVisitorArrived?.()
    const { grid, roster } = this.handlers.getSnapshot()
    this.channel.send({ type: 'visit.snapshot', grid, roster })
  }

  private onSnapshot(m: SocialMessage): void {
    // Only an answer to my own request is taken; an unsolicited park is ignored.
    if (!this.waiting) return
    this.waiting = false
    if (!m.grid || !m.roster) return
    this.handlers.onSnapshot({ grid: m.grid, roster: m.roster })
  }
}
