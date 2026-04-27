// Types

export { createRng } from '@systems/terrain/noise-utils'
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
// Builder functions
export { spawnCreatureAt, spawnCreatureNearPath } from './creature-builder'
// Generator functions
export { choose, generateAnatomy, normalish, rangeInt } from './creature-generator'
// Pooling
export { CreaturePool, PooledCreature } from './creature-pool'
export type {
  Anatomy,
  BehaviorState,
  BodyType,
  CreatureArchetype,
  CreatureInstance,
} from './types'
