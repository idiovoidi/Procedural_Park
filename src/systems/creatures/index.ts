// Types
export type {
  Anatomy,
  BehaviorState,
  BodyType,
  CreatureArchetype,
  CreatureInstance,
} from './types'

// Generator functions
export { generateAnatomy, choose, rangeInt, normalish } from './creature-generator'
export { createRng } from '@systems/terrain/noise-utils'

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
