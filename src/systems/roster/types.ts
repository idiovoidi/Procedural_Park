/**
 * Roster Types
 */

import type { Genome } from '@systems/creatures/genome'
import type { AgeStage } from '@systems/economy'

/** Ids of the two parents, for bred creatures. */
export type ParentIds = readonly [string, string]

/** A creature the player owns. */
export interface OwnedCreature {
  /** Stable id, unique within a save (`c1`, `c2`, ...). */
  readonly id: string
  name: string
  /**
   * The full genome. Bred creatures cannot be rebuilt from a seed, so the genome itself
   * is what is stored, saved and exported.
   */
  readonly genome: Genome

  /** 0..100. 100 = fully fed, 0 = starving (it produces nothing but is never harmed). */
  fullness: number
  /** 0..100. Drives the output multiplier and whether it will breed. */
  happiness: number
  /** 0..100. Drives how easily it is handled and whether it will breed. */
  trust: number

  /** Sim ticks lived. The stage is derived from this, never stored on its own. */
  ageTicks: number
  ageStage: AgeStage

  /** 0 for founders (captured wild), parent generation + 1 for bred creatures. */
  readonly generation: number
  readonly parentIds: ParentIds | null

  /** The pen it lives in, or null while unassigned. */
  penId: string | null
  /** Sim tick on which the player acquired it. */
  readonly acquiredTick: number
}

export interface AddCreatureOptions {
  name?: string
  parentIds?: ParentIds
  /** Overrides the generation worked out from the parents. */
  generation?: number
  /** Defaults to `adult` (a captured founder). Hatchlings pass `hatchling`. */
  ageStage?: AgeStage
  penId?: string | null
  acquiredTick?: number
  stats?: Partial<Pick<OwnedCreature, 'fullness' | 'happiness' | 'trust'>>
}

export type StatDelta = Partial<Pick<OwnedCreature, 'fullness' | 'happiness' | 'trust'>>

export type RosterChangeReason = 'added' | 'removed' | 'stats' | 'pen' | 'stage' | 'name'

export interface RosterChange {
  reason: RosterChangeReason
  creature: Readonly<OwnedCreature>
}

export type RosterListener = (change: RosterChange) => void

/** Serialised roster for saves. Bump `version` and add a migration if the shape changes. */
export interface RosterSnapshot {
  version: 1
  nextId: number
  creatures: OwnedCreature[]
}

export interface RestoreResult {
  /** False when the snapshot as a whole was unusable; the roster is left unchanged. */
  valid: boolean
  restored: number
  /** Creatures skipped because they were corrupt or duplicated. */
  dropped: number
}
