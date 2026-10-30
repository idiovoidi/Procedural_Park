import { TAU } from '@core/constants'
import type { Random } from '@core/types'
import * as THREE from 'three'
import type { Anatomy, BehaviorState, CreatureInstance } from './types'

// Pre-allocated scratch vectors to eliminate allocations in animation frames
const _scratchToCam = new THREE.Vector3()
const _scratchClip = new THREE.Vector3()
const _scratchDir = new THREE.Vector3()
const _scratchToTarget = new THREE.Vector3()
const _scratchSocial = new THREE.Vector3()

export interface BehaviorContext {
  group: THREE.Group
  anchor: THREE.Vector3
  anatomy: Anatomy
  rand: Random
  territoryCenter?: THREE.Vector3
  territoryRadius?: number
  getDistanceTo: (other: CreatureInstance) => number
}

export interface BehaviorState_Internal {
  state: BehaviorState
  timer: number
  facingYaw: number
  targetYaw: number
  poseTimer: number
  targetPosition?: THREE.Vector3
  moveSpeed: number
}

/**
 * Updates the creature's behavior state based on camera, other creatures, and temperament
 */
export function updateBehaviorState(
  context: BehaviorContext,
  behaviorState: BehaviorState_Internal,
  dt: number,
  camera?: THREE.Camera,
  allCreatures?: CreatureInstance[]
): void {
  behaviorState.timer -= dt

  // Posing takes priority
  if (behaviorState.poseTimer > 0) {
    behaviorState.state = 'posing'
    behaviorState.poseTimer -= dt
    return
  }

  // Camera-based behaviors
  if (camera) {
    handleCameraInteractions(context, behaviorState, dt, camera)
  }

  // Social behaviors with other creatures
  if (allCreatures && behaviorState.timer <= 0) {
    handleSocialBehaviors(context, behaviorState, allCreatures)
  }

  // Wandering behavior for certain temperaments when idle
  if (behaviorState.timer <= 0 && behaviorState.state !== 'posing') {
    handleIdleWandering(context, behaviorState)
  }
}

/**
 * Handle creature reactions to camera presence
 */
function handleCameraInteractions(
  context: BehaviorContext,
  behaviorState: BehaviorState_Internal,
  _dt: number,
  camera: THREE.Camera
): void {
  const { group, anchor, anatomy, rand } = context

  _scratchToCam.subVectors(camera.position, group.position)
  const dist = _scratchToCam.length()
  _scratchClip.copy(group.position).project(camera)
  const centered = Math.max(Math.abs(_scratchClip.x), Math.abs(_scratchClip.y)) < 0.25

  // Temperament-based reactions to camera
  switch (anatomy.temperament) {
    case 'shy':
      if (dist < 12) {
        behaviorState.state = 'shy'
        _scratchDir.set(-_scratchToCam.x, 0, -_scratchToCam.z).normalize()
        if (!behaviorState.targetPosition) {
          behaviorState.targetPosition = new THREE.Vector3()
        }
        behaviorState.targetPosition.copy(anchor).addScaledVector(_scratchDir, 3)
        behaviorState.moveSpeed = 2.0 // Fast retreat
      }
      break

    case 'curious':
      if (centered && dist < 15) {
        behaviorState.state = 'curious'
        behaviorState.targetYaw = Math.atan2(_scratchToCam.x, _scratchToCam.z)
        // Curious creatures might move slightly closer
        if (dist > 8 && rand() > 0.95) {
          _scratchDir.set(_scratchToCam.x, 0, _scratchToCam.z).normalize()
          if (!behaviorState.targetPosition) {
            behaviorState.targetPosition = new THREE.Vector3()
          }
          behaviorState.targetPosition.copy(anchor).addScaledVector(_scratchDir, 2)
          behaviorState.moveSpeed = 0.5 // Slow approach
        }
      }
      break

    case 'aggressive':
      if (dist < 8) {
        behaviorState.state = 'territorial'
        behaviorState.targetYaw = Math.atan2(_scratchToCam.x, _scratchToCam.z)
      }
      break

    case 'playful':
      if (centered && dist < 20) {
        behaviorState.state = 'playing'
        // Playful movement - set target instead of teleporting
        if (behaviorState.timer <= 0) {
          _scratchDir.set((rand() - 0.5) * 2, 0, (rand() - 0.5) * 2).normalize()
          if (!behaviorState.targetPosition) {
            behaviorState.targetPosition = new THREE.Vector3()
          }
          behaviorState.targetPosition.copy(anchor).addScaledVector(_scratchDir, 4)
          behaviorState.moveSpeed = 1.5 // Energetic movement
          behaviorState.timer = 2 + rand() * 3
        }
      }
      break
  }
}

/**
 * Handle creature interactions with other creatures
 */
function handleSocialBehaviors(
  context: BehaviorContext,
  behaviorState: BehaviorState_Internal,
  allCreatures: CreatureInstance[]
): void {
  const { group, anatomy, rand, territoryCenter, territoryRadius, getDistanceTo } = context

  let firstIntruder: CreatureInstance | null = null
  let foundPlaymate = false
  let randomCuriousTarget: CreatureInstance | null = null
  let nearbyCount = 0

  for (let i = 0; i < allCreatures.length; i++) {
    const c = allCreatures[i]
    if (c.group === group) continue
    const dist = getDistanceTo(c)
    if (dist < 15) {
      nearbyCount++
      if (
        anatomy.temperament === 'territorial' &&
        !firstIntruder &&
        territoryCenter &&
        c.group.position.distanceTo(territoryCenter) < (territoryRadius || 8)
      ) {
        firstIntruder = c
      } else if (anatomy.temperament === 'playful' && c.anatomy.temperament === 'playful') {
        foundPlaymate = true
      } else if (anatomy.temperament === 'curious' && !randomCuriousTarget) {
        randomCuriousTarget = c
      }
    }
  }

  if (nearbyCount === 0) return

  switch (anatomy.temperament) {
    case 'territorial': {
      if (firstIntruder) {
        behaviorState.state = 'territorial'
        _scratchSocial.subVectors(firstIntruder.group.position, group.position)
        behaviorState.targetYaw = Math.atan2(_scratchSocial.x, _scratchSocial.z)
        behaviorState.timer = 3 + rand() * 2
      }
      break
    }

    case 'playful': {
      if (foundPlaymate && rand() > 0.7) {
        behaviorState.state = 'playing'
        behaviorState.timer = 5 + rand() * 5
      }
      break
    }

    case 'curious':
      if (rand() > 0.8 && randomCuriousTarget) {
        _scratchSocial.subVectors(randomCuriousTarget.group.position, group.position)
        behaviorState.targetYaw = Math.atan2(_scratchSocial.x, _scratchSocial.z)
        behaviorState.state = 'curious'
        behaviorState.timer = 2 + rand() * 3
      }
      break
  }
}

/**
 * Handle idle wandering behavior
 */
function handleIdleWandering(
  context: BehaviorContext,
  behaviorState: BehaviorState_Internal
): void {
  const { anchor, anatomy, rand } = context

  // Curious and playful creatures wander more often
  const shouldWander =
    (anatomy.temperament === 'curious' && rand() > 0.4) ||
    (anatomy.temperament === 'playful' && rand() > 0.3) ||
    (anatomy.temperament === 'territorial' && rand() > 0.7)

  if (shouldWander) {
    behaviorState.state = 'wandering'

    // Pick a random direction to wander
    const wanderAngle = rand() * TAU
    const wanderDistance = 3 + rand() * 8
    _scratchDir.set(Math.cos(wanderAngle), 0, Math.sin(wanderAngle)).normalize()

    // Set target position without re-allocating if already present
    if (!behaviorState.targetPosition) {
      behaviorState.targetPosition = new THREE.Vector3()
    }
    behaviorState.targetPosition.copy(anchor).addScaledVector(_scratchDir, wanderDistance)

    // Face the direction we're wandering
    behaviorState.targetYaw = wanderAngle

    // Set movement speed based on temperament
    behaviorState.moveSpeed =
      anatomy.temperament === 'playful' ? 1.2 : anatomy.temperament === 'curious' ? 0.8 : 0.6

    behaviorState.timer = 4 + rand() * 6
  } else {
    behaviorState.state = 'idle'
    behaviorState.timer = 3 + rand() * 7
  }
}

/**
 * Get mouth open amount based on behavior state
 */
export function getMouthOpenAmount(state: BehaviorState): number {
  switch (state) {
    case 'posing':
      return 0.8
    case 'shy':
      return 0.1
    case 'curious':
      return 0.3
    case 'territorial':
      return 0.6
    case 'playing':
      return 0.4
    case 'wandering':
      return 0.2
    default:
      return 0.0
  }
}

/**
 * Get wing flap speed multiplier based on behavior state
 */
export function getWingFlapSpeedMultiplier(state: BehaviorState): number {
  switch (state) {
    case 'posing':
    case 'playing':
    case 'wandering':
      return 1.5
    default:
      return 1.0
  }
}

/**
 * Smoothly move creature toward target position
 */
export function updateMovement(
  anchor: THREE.Vector3,
  behaviorState: BehaviorState_Internal,
  dt: number
): void {
  if (!behaviorState.targetPosition) return

  _scratchToTarget.subVectors(behaviorState.targetPosition, anchor)
  const distance = _scratchToTarget.length()

  // If we're close enough, clear the target
  if (distance < 0.1) {
    behaviorState.targetPosition = undefined
    return
  }

  // Move toward target with smooth interpolation
  const moveDistance = Math.min(distance, behaviorState.moveSpeed * dt)
  _scratchToTarget.normalize().multiplyScalar(moveDistance)
  anchor.add(_scratchToTarget)
}

/**
 * Apply behavior-specific visual effects
 */
export function applyBehaviorEffects(state: BehaviorState, group: THREE.Group, tSec: number): void {
  switch (state) {
    case 'wandering': {
      // Add slight bobbing motion while wandering
      const bobAmount = Math.sin(tSec * 3) * 0.15
      group.position.y += bobAmount
      break
    }
  }
}
