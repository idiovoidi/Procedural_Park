import { QUARTER_PI, TAU } from '@core/constants'
import type { Random } from '@core/types'
import { memoizedCos, memoizedSin } from '@core/utils'
import {
  buildAntennae,
  buildEars,
  buildEyes,
  buildFurTufts,
  buildHead,
  buildHorns,
  buildLimbs,
  buildMouth,
  buildScales,
  buildSpines,
  buildTails,
  buildTorso,
  buildWings,
  makePalette,
} from '@rendering/models/creature'
import * as THREE from 'three'

// Pre-allocated scratch objects to prevent allocations in eye tracking loop
const _scratchEyeWorldPos = new THREE.Vector3()
const _scratchDirToCam = new THREE.Vector3()
const _scratchEyeQuat = new THREE.Quaternion()
const _scratchLocalDir = new THREE.Vector3()
import {
  applyBehaviorEffects,
  type BehaviorContext,
  type BehaviorState_Internal,
  getMouthOpenAmount,
  getWingFlapSpeedMultiplier,
  updateBehaviorState as updateBehaviorStateLogic,
  updateMovement,
} from './creature-behavior'
import type { Anatomy, BehaviorState, CreatureInstance } from './types'

export function spawnCreatureNearPath(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  rand: Random,
  anatomy: Anatomy
): CreatureInstance {
  return buildCreature(scene, anatomy, curve, rand)
}

export function spawnCreatureAt(
  scene: THREE.Scene,
  position: THREE.Vector3,
  rand: Random,
  anatomy: Anatomy
): CreatureInstance {
  // Create a simple curve for the buildCreature function (it won't be used for positioning)
  const dummyCurve = new THREE.CatmullRomCurve3([position, position])
  const creature = buildCreature(scene, anatomy, dummyCurve, rand)

  // Override position to exact location
  creature.group.position.copy(position)
  creature.anchor.copy(position)

  return creature
}

function buildCreature(
  scene: THREE.Scene,
  anatomy: Anatomy,
  curve: THREE.CatmullRomCurve3,
  rand: Random
): CreatureInstance {
  const palette = makePalette(anatomy.baseHue, rand)

  const group = new THREE.Group()
  const torso = buildTorso(rand, anatomy)
  group.add(torso)

  const head = buildHead(rand, anatomy, palette)
  if (head) group.add(head)

  const eyes = buildEyes(rand, anatomy, head)
  const { mouth: _mouth, lowerJaw } = buildMouth(rand, anatomy, head, palette)
  const limbs = buildLimbs(rand, anatomy, palette, torso)
  const wings = buildWings(rand, anatomy, palette, torso)
  const tails = buildTails(rand, anatomy, palette, torso)
  const antennae = buildAntennae(rand, anatomy, palette, head)

  // Decorative features
  const ears = buildEars(rand, anatomy, palette, head)
  const horns = buildHorns(rand, anatomy, palette, head)
  const spines = buildSpines(rand, anatomy, palette, torso, tails)
  const furTufts = buildFurTufts(rand, anatomy, palette, torso)
  const scales = buildScales(rand, anatomy, palette, torso)

  // Debug: Log creature features
  if (
    ears.length > 0 ||
    horns.length > 0 ||
    spines.length > 0 ||
    furTufts.length > 0 ||
    scales.length > 0 ||
    anatomy.pattern !== 'solid'
  ) {
    console.log(
      `Creature created with: ${ears.length} ears, ${horns.length} horns, ${spines.length} spines, ${furTufts.length} fur tufts, ${scales.length} scales, pattern: ${anatomy.pattern}`
    )
  }

  // Spawn near the track
  const t = rand()
  const pos = curve.getPointAt(t)
  const tangent = curve.getTangentAt(t)
  const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()
  const offset = (rand() * 2 + 4) * (rand() > 0.5 ? 1 : -1)
  group.position
    .copy(pos)
    .addScaledVector(side, offset)
    .add(new THREE.Vector3(0, -0.2 + rand() * 1.6, 0))

  scene.add(group)

  // Animation parameters
  const floatAmplitude = 0.35 + rand() * 0.4
  const floatSpeed = 0.4 + rand() * 0.5
  const flapSpeed = 2.0 + rand() * 2.0
  const tailSpeed = 1.0 + rand() * 1.5
  const blinkInterval = 2.5 + rand() * 3.5
  let blinkTimer = blinkInterval * rand()

  // Enhanced behavior system
  const anchor = group.position.clone()
  const timeOffset = rand() * 1000
  let behaviorState: BehaviorState = 'idle'
  let behaviorTimer = 0
  let facingYaw = rand() * TAU
  let targetYaw = facingYaw
  let poseTimer = 0

  // Territory setup for territorial creatures
  const territoryCenter = anatomy.temperament === 'territorial' ? anchor.clone() : undefined
  const territoryRadius = anatomy.temperament === 'territorial' ? 8 + rand() * 12 : undefined

  const setMouthOpen = (open: number) => {
    if (!lowerJaw) return
    const clamped = Math.max(0, Math.min(1, open))
    lowerJaw.rotation.x = -0.1 - clamped * 0.7
  }

  const getDistanceTo = (other: CreatureInstance): number => {
    return group.position.distanceTo(other.group.position)
  }

  const isInTerritory = (position: THREE.Vector3): boolean => {
    if (!territoryCenter || !territoryRadius) return false
    return territoryCenter.distanceTo(position) <= territoryRadius
  }

  // Create behavior context for the AI system
  const behaviorContext: BehaviorContext = {
    group,
    anchor,
    anatomy,
    rand,
    territoryCenter,
    territoryRadius,
    getDistanceTo,
  }

  // Internal behavior state
  const internalBehaviorState: BehaviorState_Internal = {
    state: behaviorState,
    timer: behaviorTimer,
    facingYaw,
    targetYaw,
    poseTimer,
    targetPosition: undefined,
    moveSpeed: 1.0,
  }

  const updateBehaviorState = (
    dt: number,
    camera?: THREE.Camera,
    allCreatures?: CreatureInstance[]
  ) => {
    // Update using the behavior module
    updateBehaviorStateLogic(behaviorContext, internalBehaviorState, dt, camera, allCreatures)

    // Apply smooth movement toward target
    updateMovement(anchor, internalBehaviorState, dt)

    // Sync back to local variables
    behaviorState = internalBehaviorState.state
    behaviorTimer = internalBehaviorState.timer
    facingYaw = internalBehaviorState.facingYaw
    targetYaw = internalBehaviorState.targetYaw
    poseTimer = internalBehaviorState.poseTimer
  }

  const update = (
    dt: number,
    tSec: number,
    camera?: THREE.Camera,
    allCreatures?: CreatureInstance[]
  ) => {
    updateBehaviorState(dt, camera, allCreatures)
    // Floating motion
    const upDown = memoizedSin((tSec + timeOffset) * floatSpeed) * floatAmplitude
    group.position.set(anchor.x, anchor.y + upDown, anchor.z)

    // Gentle body breathing
    const s = 1.0 + memoizedSin((tSec + timeOffset) * 1.6) * 0.03
    group.scale.setScalar(s)

    // Apply behavior-based animations
    setMouthOpen(getMouthOpenAmount(behaviorState))
    applyBehaviorEffects(behaviorState, group, tSec)

    // Turn body towards target yaw smoothly
    const yawDelta = ((targetYaw - facingYaw + TAU * 1.5) % TAU) - TAU / 2
    facingYaw += Math.max(-1.5 * dt, Math.min(1.5 * dt, yawDelta))
    group.rotation.y = facingYaw

    // Wings flapping
    for (let i = 0; i < wings.length; i++) {
      const wing = wings[i] as THREE.Mesh
      const dir = i % 2 === 0 ? 1 : -1
      const speedMultiplier = getWingFlapSpeedMultiplier(behaviorState)
      const speed = flapSpeed * speedMultiplier
      wing.rotation.z =
        dir * (QUARTER_PI + memoizedSin((tSec + timeOffset) * speed) * QUARTER_PI * 0.3)
    }

    // Tails sway
    for (const tail of tails) {
      tail.rotation.y = memoizedSin((tSec + timeOffset) * tailSpeed) * 0.6
      tail.rotation.x = memoizedCos((tSec + timeOffset) * tailSpeed * 0.7) * 0.2
    }

    // Antennae wiggle
    for (const ant of antennae) {
      ant.rotation.z = memoizedSin((tSec + timeOffset) * 2.2) * 0.3
    }

    // Ears twitch
    for (let i = 0; i < ears.length; i++) {
      const ear = ears[i]
      const side = i === 0 ? -1 : 1
      ear.rotation.z = side * QUARTER_PI + memoizedSin((tSec + timeOffset) * 3.0 + i) * 0.15
    }

    // Horns subtle movement (breathing)
    for (const horn of horns) {
      horn.rotation.y = memoizedSin((tSec + timeOffset) * 0.5) * 0.05
    }

    // Spines subtle sway
    for (let i = 0; i < spines.length; i++) {
      const spine = spines[i]
      spine.rotation.x += memoizedSin((tSec + timeOffset) * 1.5 + i * 0.5) * 0.02
    }

    // Fur tufts gentle wave
    for (const tuft of furTufts) {
      tuft.rotation.y = memoizedSin((tSec + timeOffset) * 1.8) * 0.1
    }

    // Scales shimmer (subtle scale change)
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i]
      const shimmer = 1.0 + memoizedSin((tSec + timeOffset) * 2.0 + i * 0.3) * 0.05
      scale.scale.setScalar(shimmer)
    }

    // Limbs idle sway
    for (let i = 0; i < limbs.length; i++) {
      const limb = limbs[i]
      limb.rotation.x = memoizedSin((tSec + timeOffset) * 1.3 + i) * 0.3
      limb.rotation.y = memoizedCos((tSec + timeOffset) * 1.1 + i * 0.5) * 0.2
    }

    // Eyes blink (scale pupils)
    blinkTimer -= dt
    if (blinkTimer <= 0) {
      blinkTimer = blinkInterval + rand() * 1.5
      for (const e of eyes) {
        // Access pupil from userData (more reliable than child index)
        const pupil = e.userData.pupil as THREE.Mesh
        if (pupil) {
          const targetScale = 0.1 + rand() * 0.5
          pupil.scale.set(1, targetScale, 1)
        }
      }
    }

    // Eye tracking - pupils follow camera when nearby
    if (camera) {
      const distanceToCamera = group.position.distanceTo(camera.position)
      const trackingDistance = 15 // Start tracking within 15 units

      if (distanceToCamera < trackingDistance) {
        for (const eye of eyes) {
          const pupil = eye.userData.pupil as THREE.Mesh
          const iris = eye.userData.iris as THREE.Mesh
          const maxOffset = eye.userData.maxOffset as number

          if (pupil && iris && maxOffset) {
            // Get world position of eye
            eye.getWorldPosition(_scratchEyeWorldPos)

            // Calculate direction to camera
            _scratchDirToCam.subVectors(camera.position, _scratchEyeWorldPos).normalize()

            // Convert to local space of the eye
            eye.getWorldQuaternion(_scratchEyeQuat)
            _scratchLocalDir.copy(_scratchDirToCam).applyQuaternion(_scratchEyeQuat.invert())

            // Calculate offset for pupil (constrained to maxOffset)
            const offsetX = Math.max(
              -maxOffset,
              Math.min(maxOffset, _scratchLocalDir.x * maxOffset * 2)
            )
            const offsetY = Math.max(
              -maxOffset,
              Math.min(maxOffset, _scratchLocalDir.y * maxOffset * 2)
            )

            // Smoothly move pupil and iris
            const smoothing = 0.1
            pupil.position.x += (offsetX - pupil.position.x) * smoothing
            pupil.position.y += (offsetY - pupil.position.y) * smoothing

            iris.position.x += (offsetX * 0.7 - iris.position.x) * smoothing
            iris.position.y += (offsetY * 0.7 - iris.position.y) * smoothing
          }
        }
      }
    }
  }

  const reactToPhoto = () => {
    poseTimer = 2.5 + rand() * 2.0
  }

  const creatureInstance: CreatureInstance = {
    group,
    anchor,
    timeOffset,
    rarity: anatomy.rarity,
    anatomy,
    behaviorState,
    behaviorTimer,
    territoryCenter,
    territoryRadius,
    update,
    reactToPhoto,
    getDistanceTo,
    isInTerritory,
  }

  return creatureInstance
}
