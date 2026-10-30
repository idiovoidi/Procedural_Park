// Creature System - Modular Architecture
// Body parts are built via @rendering/models/creature modules

// Builder functions - uses modular body parts from @rendering/models/creature
export { spawnCreatureAt, spawnCreatureNearPath } from './builder'
// Behavior functions
export {
  applyBehaviorEffects,
  type BehaviorContext,
  type BehaviorState_Internal,
  getMouthOpenAmount,
  getWingFlapSpeedMultiplier,
  updateBehaviorState,
  updateMovement,
} from './creature-behavior'
// Pooling
export { CreaturePool, PooledCreature } from './creature-pool'
// Genome: seeded, serializable creature definition
export {
  BODY_PLANS,
  type BodyPlanId,
  deriveAnatomy,
  GENOME_VERSION,
  type Genome,
  generateGenome,
  generateSpeciesName,
  hashSeed,
  validateGenome,
} from './genome'

// Types
export type {
  Anatomy,
  BehaviorState,
  BodyType,
  CreatureArchetype,
  CreatureInstance,
} from './types'
