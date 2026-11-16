/**
 * Roster System
 * Barrel export for owned-creature state
 */

export {
  type Ancestry,
  childAncestry,
  describeRelation,
  inbreedingOf,
  MAX_ANCESTRY_DEPTH,
  type PedigreeNode,
  relatedness,
  sanitizeAncestry,
} from './pedigree'
export { ageTicksForStage, Roster, stageForAge } from './Roster'
export type {
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
