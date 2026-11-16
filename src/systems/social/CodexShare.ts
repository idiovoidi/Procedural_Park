/**
 * Shared codex (GDD 12.2, MP-3)
 * Species either friend has found are logged for both. On connecting each side sends the best
 * individual of every species it knows; afterwards each new discovery is sent as it happens.
 * A species learned from a friend is marked as shared and never sent back, so there is no echo.
 * Only genomes travel: names are derived from them on each side.
 */

import type { Codex, CodexEntry } from '@systems/codex'
import { type Genome, validateGenome } from '@systems/creatures/genome'
import type { SocialChannel, SocialMessage } from './channel'

/** Species accepted from one message; more are ignored. */
export const MAX_SHARED_PER_MESSAGE = 400

export class CodexShare {
  private readonly codex: Codex
  private readonly channel: SocialChannel
  private listeners = new Set<(newSpecies: number) => void>()

  constructor(codex: Codex, channel: SocialChannel) {
    this.codex = codex
    this.channel = channel
    channel.on('codex.share', (m) => this.onShare(m))
  }

  /** Send everything this player has found themselves. */
  public sendAll(): void {
    const own = this.codex.list().filter((e) => e.foundBy !== 'shared')
    this.send(own)
  }

  /** Send one fresh discovery (ignored if it came from the friend). */
  public sendEntry(entry: Readonly<CodexEntry>): void {
    if (entry.foundBy === 'shared') return
    this.send([entry])
  }

  /** Told how many new species a friend's message added. */
  public onLearned(listener: (newSpecies: number) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private send(entries: ReadonlyArray<Readonly<CodexEntry>>): void {
    if (entries.length === 0) return
    this.channel.send({
      type: 'codex.share',
      genomes: entries.slice(0, MAX_SHARED_PER_MESSAGE).map((e) => e.best.genome),
    })
  }

  private onShare(m: SocialMessage): void {
    if (!Array.isArray(m.genomes)) return
    let learned = 0
    for (const raw of m.genomes.slice(0, MAX_SHARED_PER_MESSAGE)) {
      if (!raw || typeof raw !== 'object') continue
      try {
        if (validateGenome(raw as Genome).length > 0) continue
      } catch {
        continue
      }
      if (this.codex.recordShared(raw as Genome)) learned++
    }
    if (learned > 0) for (const listener of this.listeners) listener(learned)
  }
}
