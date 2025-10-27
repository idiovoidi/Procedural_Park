// Types
export type {
  Anatomy,
  BehaviorState,
  BodyType,
  CreatureArchetype,
  CreatureInstance,
} from './types'

// Generator functions
export { createRng, generateAnatomy, choose, rangeInt, normalish } from './creature-generator'

// Builder functions
export { spawnCreatureNearPath, spawnCreatureAt } from './creature-builder'

// Behavior functions
export {
  updateBehaviorState,
  updateMovement,
  getMouthOpenAmount,
  getWingFlapSpeedMultiplier,
  applyBehaviorEffects,
  type BehaviorContext,
  type BehaviorState_Internal,
} from './creature-behavior'

// Pooling
export { PooledCreature, CreaturePool } from './creature-pool'
