// Creature System - Modular Architecture
// Body parts are built via @rendering/models/creature modules

export { createRng } from '@systems/terrain/noise-utils'
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
// Generator functions
export { choose, generateAnatomy, normalish, rangeInt } from './generator'

// Types
export type {
  Anatomy,
  BehaviorState,
  BodyType,
  CreatureArchetype,
  CreatureInstance,
} from './types'
