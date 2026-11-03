/**
 * Codex
 * A record of every species the player has met, keyed by `speciesId` (GDD 9, decision Q5).
 *
 * A species enters the codex when a creature of it is photographed in the wild, captured, or
 * bred. Owning one counts as fully knowing it; a species only photographed must be photographed
 * a few times before its diet and habitat are revealed ("studied"). For each species the codex
 * keeps the best individual (highest rarity) ever owned or seen, so the UI can show it.
 */

import { GAME_CONFIG } from '@core/constants'
import { type Genome, generateSpeciesName } from '@systems/creatures/genome'
import type { OwnedCreature, Roster } from '@systems/roster'

const { STUDY_PHOTOS_REQUIRED } = GAME_CONFIG.ECONOMY.CODEX

export type HowFound = 'photographed' | 'captured' | 'bred'

export interface CodexEntry {
  speciesId: number
  name: string
  /** How the species was first found. */
  foundBy: HowFound
  /** Order of discovery, 1-based. */
  order: number
  /** Photos taken of this species in the wild. */
  photos: number
  /** True once the player has owned one. */
  owned: boolean
  /** Whether its diet and habitat are known: owned, or photographed enough times. */
  studied: boolean
  /** The rarest individual owned or seen, kept whole so the codex can show it. */
  best: { name: string; rarity: number; genome: Genome }
}

export interface CodexSnapshot {
  version: 1
  nextOrder: number
  entries: CodexEntry[]
}

export type CodexListener = (entry: Readonly<CodexEntry>, isNew: boolean) => void

export class Codex {
  private entries = new Map<number, CodexEntry>()
  private nextOrder = 1
  private listeners = new Set<CodexListener>()

  /** A wild creature was photographed. Returns true if its species is new to the codex. */
  public recordPhoto(genome: Genome): boolean {
    const { entry, isNew } = this.touch(genome, 'photographed', generateSpeciesName(genome))
    entry.photos++
    this.updateBest(entry, generateSpeciesName(genome), genome)
    this.refreshStudied(entry)
    this.notify(entry, isNew)
    return isNew
  }

  /** The player now owns this creature (captured or bred). Returns true if its species is new. */
  public recordOwned(creature: Pick<OwnedCreature, 'name' | 'genome' | 'parentIds'>): boolean {
    const { entry, isNew } = this.touch(
      creature.genome,
      creature.parentIds ? 'bred' : 'captured',
      creature.name
    )
    // The player's own creature takes the "best" slot from one that was only photographed.
    if (!entry.owned && creature.genome.rarity >= entry.best.rarity) {
      entry.best = {
        name: creature.name,
        rarity: creature.genome.rarity,
        genome: structuredClone(creature.genome),
      }
    }
    entry.owned = true
    this.updateBest(entry, creature.name, creature.genome)
    this.refreshStudied(entry)
    this.notify(entry, isNew)
    return isNew
  }

  /** Add every creature in the roster (used when loading an older save, or at start-up). */
  public ingestRoster(roster: Roster): void {
    for (const creature of roster.list()) this.recordOwned(creature)
  }

  public get(speciesId: number): Readonly<CodexEntry> | undefined {
    return this.entries.get(speciesId)
  }

  /** All entries in the order they were discovered. */
  public list(): ReadonlyArray<Readonly<CodexEntry>> {
    return [...this.entries.values()].sort((a, b) => a.order - b.order)
  }

  public count(): number {
    return this.entries.size
  }

  public ownedCount(): number {
    let n = 0
    for (const e of this.entries.values()) if (e.owned) n++
    return n
  }

  public onChange(listener: CodexListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // ---- Internals -------------------------------------------------------------------------------

  private touch(
    genome: Genome,
    how: HowFound,
    bestName: string
  ): { entry: CodexEntry; isNew: boolean } {
    const existing = this.entries.get(genome.speciesId)
    if (existing) return { entry: existing, isNew: false }

    const entry: CodexEntry = {
      speciesId: genome.speciesId,
      name: generateSpeciesName(genome),
      foundBy: how,
      order: this.nextOrder++,
      photos: 0,
      owned: false,
      studied: false,
      best: { name: bestName, rarity: genome.rarity, genome: structuredClone(genome) },
    }
    this.entries.set(entry.speciesId, entry)
    return { entry, isNew: true }
  }

  private updateBest(entry: CodexEntry, name: string, genome: Genome): void {
    if (genome.rarity > entry.best.rarity) {
      entry.best = { name, rarity: genome.rarity, genome: structuredClone(genome) }
    }
  }

  private refreshStudied(entry: CodexEntry): void {
    entry.studied = entry.owned || entry.photos >= STUDY_PHOTOS_REQUIRED
  }

  private notify(entry: CodexEntry, isNew: boolean): void {
    for (const listener of this.listeners) listener(entry, isNew)
  }

  // ---- Save / load ---------------------------------------------------------------------------------

  public serialize(): CodexSnapshot {
    return {
      version: 1,
      nextOrder: this.nextOrder,
      entries: structuredClone([...this.entries.values()]),
    }
  }

  /** Restore from a save, skipping corrupt entries. Returns false if the data is unusable. */
  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<CodexSnapshot> | null
    if (!s || s.version !== 1 || !Array.isArray(s.entries)) return false

    const how: HowFound[] = ['photographed', 'captured', 'bred']
    const entries = new Map<number, CodexEntry>()
    for (const raw of s.entries) {
      const e = raw as Partial<CodexEntry> | null
      const best = e?.best
      if (
        !e ||
        typeof e.speciesId !== 'number' ||
        !Number.isFinite(e.speciesId) ||
        typeof e.name !== 'string' ||
        !how.includes(e.foundBy as HowFound) ||
        !Number.isInteger(e.order) ||
        !best ||
        typeof best.rarity !== 'number' ||
        typeof best.name !== 'string' ||
        typeof best.genome !== 'object' ||
        best.genome === null ||
        entries.has(e.speciesId)
      ) {
        continue
      }
      const photos =
        Number.isInteger(e.photos) && (e.photos as number) >= 0 ? (e.photos as number) : 0
      const entry: CodexEntry = {
        speciesId: e.speciesId,
        name: e.name,
        foundBy: e.foundBy as HowFound,
        order: e.order as number,
        photos,
        owned: e.owned === true,
        studied: false,
        best: { name: best.name, rarity: best.rarity, genome: best.genome as Genome },
      }
      this.refreshStudied(entry)
      entries.set(entry.speciesId, entry)
    }

    this.entries = entries
    const maxOrder = [...entries.values()].reduce((m, e) => Math.max(m, e.order), 0)
    this.nextOrder = Math.max(
      Number.isInteger(s.nextOrder) ? (s.nextOrder as number) : 1,
      maxOrder + 1
    )
    return true
  }
}
