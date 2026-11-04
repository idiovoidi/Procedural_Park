/**
 * Roster
 * The creatures the player owns: full genomes, care stats, age and lineage.
 *
 * Holds state only; hunger decay, feeding, pens and breeding act on it through its methods.
 * It follows the same pattern as FoodManager/CurrencyManager: its own state, change
 * callbacks, and serialize/restore for saves.
 */

import { GAME_CONFIG } from '@core/constants'
import { generateSpeciesName, validateGenome } from '@systems/creatures/genome'
import type { AgeStage } from '@systems/economy'
import { childAncestry, inbreedingOf, MAX_ANCESTRY_DEPTH, sanitizeAncestry } from './pedigree'
import type {
  AddCreatureOptions,
  OwnedCreature,
  ParentIds,
  RestoreResult,
  RosterChange,
  RosterChangeReason,
  RosterListener,
  RosterSnapshot,
  StatDelta,
} from './types'

const { AGE_STAGE_TICKS, STARTING_STATS } = GAME_CONFIG.ECONOMY

const STAT_MIN = 0
const STAT_MAX = 100

const clampStat = (value: number): number => Math.min(STAT_MAX, Math.max(STAT_MIN, value))

const isStat = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

/** Age stage for a number of lived ticks. */
export function stageForAge(ageTicks: number): AgeStage {
  if (ageTicks < AGE_STAGE_TICKS.hatchling) return 'hatchling'
  if (ageTicks < AGE_STAGE_TICKS.hatchling + AGE_STAGE_TICKS.juvenile) return 'juvenile'
  return 'adult'
}

/** The lived ticks at which a creature first enters a stage. */
export function ageTicksForStage(stage: AgeStage): number {
  if (stage === 'hatchling') return 0
  if (stage === 'juvenile') return AGE_STAGE_TICKS.hatchling
  return AGE_STAGE_TICKS.hatchling + AGE_STAGE_TICKS.juvenile
}

export class Roster {
  private creatures = new Map<string, OwnedCreature>()
  private nextId = 1
  private listeners = new Set<RosterListener>()

  /** Add a creature. The genome is copied, so later edits to the original don't leak in. */
  public add(genome: OwnedCreature['genome'], options: AddCreatureOptions = {}): OwnedCreature {
    const parentIds = options.parentIds ?? null
    const stage = options.ageStage ?? 'adult'
    const stats = { ...STARTING_STATS, ...options.stats }

    const creature: OwnedCreature = {
      id: `c${this.nextId++}`,
      name: options.name?.trim() || generateSpeciesName(genome),
      genome: structuredClone(genome),
      fullness: clampStat(stats.fullness),
      happiness: clampStat(stats.happiness),
      trust: clampStat(stats.trust),
      ageTicks: ageTicksForStage(stage),
      ageStage: stage,
      generation: options.generation ?? this.generationFor(parentIds),
      parentIds,
      ...this.pedigreeFor(parentIds, options),
      penId: options.penId ?? null,
      acquiredTick: options.acquiredTick ?? 0,
    }

    this.creatures.set(creature.id, creature)
    this.emit('added', creature)
    return creature
  }

  public remove(id: string): OwnedCreature | null {
    const creature = this.creatures.get(id)
    if (!creature) return null
    this.creatures.delete(id)
    this.emit('removed', creature)
    return creature
  }

  public get(id: string): Readonly<OwnedCreature> | undefined {
    return this.creatures.get(id)
  }

  public has(id: string): boolean {
    return this.creatures.has(id)
  }

  public count(): number {
    return this.creatures.size
  }

  /** All creatures, oldest acquired first. */
  public list(): ReadonlyArray<Readonly<OwnedCreature>> {
    return [...this.creatures.values()]
  }

  public getByPen(penId: string): ReadonlyArray<Readonly<OwnedCreature>> {
    return this.list().filter((c) => c.penId === penId)
  }

  public getUnassigned(): ReadonlyArray<Readonly<OwnedCreature>> {
    return this.list().filter((c) => c.penId === null)
  }

  /** The parents still in the roster (a sold parent is simply absent). */
  public getParents(id: string): ReadonlyArray<Readonly<OwnedCreature>> {
    const parentIds = this.creatures.get(id)?.parentIds
    if (!parentIds) return []
    return parentIds.flatMap((pid) => {
      const parent = this.creatures.get(pid)
      return parent ? [parent] : []
    })
  }

  public getChildren(id: string): ReadonlyArray<Readonly<OwnedCreature>> {
    return this.list().filter((c) => c.parentIds?.includes(id))
  }

  public assignToPen(id: string, penId: string | null): boolean {
    const creature = this.creatures.get(id)
    if (!creature || creature.penId === penId) return false
    creature.penId = penId
    this.emit('pen', creature)
    return true
  }

  public rename(id: string, name: string): boolean {
    const creature = this.creatures.get(id)
    const trimmed = name.trim()
    if (!creature || !trimmed || creature.name === trimmed) return false
    creature.name = trimmed
    this.emit('name', creature)
    return true
  }

  /** Add (or subtract) from stats, clamped to 0..100. Returns false for an unknown id. */
  public adjustStats(id: string, delta: StatDelta): boolean {
    const creature = this.creatures.get(id)
    if (!creature) return false

    let changed = false
    for (const key of ['fullness', 'happiness', 'trust'] as const) {
      const amount = delta[key]
      if (!isStat(amount) || amount === 0) continue
      const next = clampStat(creature[key] + amount)
      if (next !== creature[key]) {
        creature[key] = next
        changed = true
      }
    }
    if (changed) this.emit('stats', creature)
    return true
  }

  /**
   * Age every creature by a number of sim ticks. Listeners hear only about stage changes
   * (not every tick), so this is cheap to call from the economy clock.
   */
  public advanceTicks(ticks: number = 1): void {
    if (!isNonNegativeInt(ticks) || ticks === 0) return
    for (const creature of this.creatures.values()) {
      creature.ageTicks += ticks
      const stage = stageForAge(creature.ageTicks)
      if (stage !== creature.ageStage) {
        creature.ageStage = stage
        this.emit('stage', creature)
      }
    }
  }

  public onChange(listener: RosterListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public serialize(): RosterSnapshot {
    return {
      version: 1,
      nextId: this.nextId,
      creatures: structuredClone([...this.creatures.values()]),
    }
  }

  /**
   * Replace the roster from a save. Corrupt creatures are dropped one by one so a single
   * bad entry never loses the whole park; an unusable snapshot leaves the roster unchanged.
   */
  public restore(snapshot: unknown): RestoreResult {
    if (!isRecord(snapshot) || snapshot.version !== 1 || !Array.isArray(snapshot.creatures)) {
      return { valid: false, restored: 0, dropped: 0 }
    }

    const restored = new Map<string, OwnedCreature>()
    let dropped = 0
    for (const raw of snapshot.creatures) {
      const creature = sanitizeCreature(raw)
      if (!creature || restored.has(creature.id)) {
        dropped++
        continue
      }
      restored.set(creature.id, creature)
    }

    // Never reuse an id: take the larger of the saved counter and the highest id seen.
    let maxId = 0
    for (const id of restored.keys()) maxId = Math.max(maxId, Number(id.slice(1)) || 0)
    const savedNext = isNonNegativeInt(snapshot.nextId) ? snapshot.nextId : 1

    this.creatures = restored
    this.nextId = Math.max(savedNext, maxId + 1)
    return { valid: true, restored: restored.size, dropped }
  }

  /** Ancestry and inbreeding for a new creature: given, else worked out from parents still here. */
  private pedigreeFor(
    parentIds: ParentIds | null,
    options: AddCreatureOptions
  ): Pick<OwnedCreature, 'ancestry' | 'inbreeding'> {
    if (options.ancestry || options.inbreeding !== undefined) {
      return {
        ancestry: sanitizeAncestry(options.ancestry),
        inbreeding: Math.min(0.5, Math.max(0, options.inbreeding ?? 0)),
      }
    }
    const nodes = (parentIds ?? []).flatMap((pid) => {
      const p = this.creatures.get(pid)
      return p ? [{ id: p.id, ancestry: p.ancestry }] : []
    })
    if (parentIds && nodes.length === 2) {
      return {
        ancestry: childAncestry(nodes[0], nodes[1]),
        inbreeding: inbreedingOf(nodes[0], nodes[1]),
      }
    }
    // One or both parents are gone: remember what is known (the parents' ids).
    const known: Record<string, number> = {}
    for (const pid of parentIds ?? []) known[pid] = 1
    for (const n of nodes) {
      for (const [id, steps] of Object.entries(n.ancestry)) {
        if (steps + 1 <= MAX_ANCESTRY_DEPTH) known[id] = Math.min(known[id] ?? Infinity, steps + 1)
      }
    }
    return { ancestry: known, inbreeding: 0 }
  }

  private generationFor(parentIds: ParentIds | null): number {
    if (!parentIds) return 0
    const known = parentIds.flatMap((pid) => {
      const parent = this.creatures.get(pid)
      return parent ? [parent.generation] : []
    })
    return known.length > 0 ? Math.max(...known) + 1 : 1
  }

  private emit(reason: RosterChangeReason, creature: OwnedCreature): void {
    const change: RosterChange = { reason, creature }
    for (const listener of this.listeners) listener(change)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validate one saved creature; returns a clean copy, or null if it is unusable. */
function sanitizeCreature(raw: unknown): OwnedCreature | null {
  if (!isRecord(raw)) return null
  const { id, genome } = raw
  if (typeof id !== 'string' || !/^c\d+$/.test(id) || !isRecord(genome)) return null

  // validateGenome indexes into body-plan tables, so a malformed genome can throw.
  try {
    if (validateGenome(genome as unknown as OwnedCreature['genome']).length > 0) return null
  } catch {
    return null
  }

  const typedGenome = structuredClone(genome) as unknown as OwnedCreature['genome']
  const ageTicks = isNonNegativeInt(raw.ageTicks) ? raw.ageTicks : 0
  const parents = raw.parentIds
  const parentIds: ParentIds | null =
    Array.isArray(parents) &&
    parents.length === 2 &&
    typeof parents[0] === 'string' &&
    typeof parents[1] === 'string'
      ? [parents[0], parents[1]]
      : null

  return {
    id,
    name:
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim()
        : generateSpeciesName(typedGenome),
    genome: typedGenome,
    fullness: clampStat(isStat(raw.fullness) ? raw.fullness : STARTING_STATS.fullness),
    happiness: clampStat(isStat(raw.happiness) ? raw.happiness : STARTING_STATS.happiness),
    trust: clampStat(isStat(raw.trust) ? raw.trust : STARTING_STATS.trust),
    ageTicks,
    ageStage: stageForAge(ageTicks),
    generation: isNonNegativeInt(raw.generation) ? raw.generation : 0,
    parentIds,
    ancestry: sanitizeAncestry(raw.ancestry),
    inbreeding: isStat(raw.inbreeding) ? Math.min(0.5, Math.max(0, Number(raw.inbreeding))) : 0,
    penId: typeof raw.penId === 'string' ? raw.penId : null,
    acquiredTick: isNonNegativeInt(raw.acquiredTick) ? raw.acquiredTick : 0,
  }
}
