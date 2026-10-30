import { QUARTER_PI, TAU } from '@core/constants'
import { log, memoizedCos, memoizedSin } from '@core/utils'
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
import { getSizeMultiplier } from '@rendering/models/creature/body-types'
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
import { deriveAnatomy } from './genome/derive'
import { createSeededRandom } from './genome/random'
import type { Genome, PartFamily } from './genome/types'
import type { BehaviorState, CreatureInstance } from './types'

const UP = new THREE.Vector3(0, 1, 0)

/** A part's resting rotation, so idle animation sways around it instead of replacing it. */
type Rest = { object: THREE.Object3D; x: number; y: number; z: number }

function captureRest(objects: THREE.Object3D[]): Rest[] {
  return objects.map((object) => ({
    object,
    x: object.rotation.x,
    y: object.rotation.y,
    z: object.rotation.z,
  }))
}

export function spawnCreatureNearPath(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  genome: Genome
): CreatureInstance {
  const rand = createSeededRandom(genome.partSeeds.placement)
  const t = rand()
  const point = curve.getPointAt(t)
  const tangent = curve.getTangentAt(t)
  const side = new THREE.Vector3().crossVectors(tangent, UP).normalize()
  const offset = (rand() * 2 + 4) * (rand() > 0.5 ? 1 : -1)
  const position = point
    .clone()
    .addScaledVector(side, offset)
    .add(new THREE.Vector3(0, -0.2 + rand() * 1.6, 0))

  return buildCreature(scene, genome, position)
}

export function spawnCreatureAt(
  scene: THREE.Scene,
  position: THREE.Vector3,
  genome: Genome
): CreatureInstance {
  return buildCreature(scene, genome, position.clone())
}

function buildCreature(
  scene: THREE.Scene,
  genome: Genome,
  position: THREE.Vector3
): CreatureInstance {
  const anatomy = deriveAnatomy(genome)
  const palette = makePalette(genome.palette)
  // Each part family reads its own seeded stream, so changing one never shifts another
  const streamFor = (family: PartFamily) => createSeededRandom(genome.partSeeds[family])

  const group = new THREE.Group()
  const {
    object: torso,
    bounds,
    segments: bodySegments,
  } = buildTorso(streamFor('body'), anatomy, palette)
  group.add(torso)

  const headStream = streamFor('head')
  const head = buildHead(headStream, anatomy, palette, bounds)
  if (head) group.add(head)

  const eyes = buildEyes(headStream, anatomy, head)
  const { mouth: _mouth, lowerJaw } = buildMouth(headStream, anatomy, head, palette)
  const limbs = buildLimbs(streamFor('limbs'), anatomy, palette, group, bounds)
  const wings = buildWings(streamFor('wings'), anatomy, palette, group, bounds)
  const tails = buildTails(streamFor('tails'), anatomy, palette, group, bounds)

  // Decorative features share one stream, drawn in a fixed order
  const decorStream = streamFor('decor')
  const antennae = buildAntennae(decorStream, anatomy, palette, head)
  const ears = buildEars(decorStream, anatomy, palette, head)
  const horns = buildHorns(decorStream, anatomy, palette, head)
  const spines = buildSpines(decorStream, anatomy, palette, group, bounds, tails)
  const furTufts = buildFurTufts(decorStream, anatomy, palette, group, bounds)
  const scales = buildScales(decorStream, anatomy, palette, group, bounds)

  const limbRest = captureRest(limbs)
  const tailRest = captureRest(tails)
  const antennaRest = captureRest(antennae)
  const earRest = captureRest(ears)
  const hornRest = captureRest(horns)
  const spineRest = captureRest(spines)
  const furRest = captureRest(furTufts)

  log.debug(
    `Creature ${genome.seed} (${genome.bodyPlan}, ${genome.archetype}): ${limbs.length} limbs, ${wings.length} wings, ${tails.length} tails, ${ears.length} ears, ${horns.length} horns, ${spines.length} spines, pattern: ${anatomy.pattern}`
  )

  group.position.copy(position)
  scene.add(group)

  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const motion = streamFor('motion')
  const behaviorRand = streamFor('behavior')

  // Animation parameters
  const floatAmplitude = 0.35 + motion() * 0.4
  const floatSpeed = 0.4 + motion() * 0.5
  const flapSpeed = 2.0 + motion() * 2.0
  const tailSpeed = 1.0 + motion() * 1.5
  const blinkInterval = 2.5 + motion() * 3.5
  let blinkTimer = blinkInterval * motion()
  // Fliers beat their wings wide; everything else only ruffles them
  const flapAmplitude = anatomy.locomotion === 'fly' ? 0.55 : 0.15

  // Enhanced behavior system
  const anchor = group.position.clone()
  const timeOffset = motion() * 1000
  let behaviorState: BehaviorState = 'idle'
  let behaviorTimer = 0
  let facingYaw = motion() * TAU
  let targetYaw = facingYaw
  let poseTimer = 0

  // Territory setup for territorial creatures
  const territoryCenter = anatomy.temperament === 'territorial' ? anchor.clone() : undefined
  const territoryRadius = anatomy.temperament === 'territorial' ? 8 + motion() * 12 : undefined

  const setMouthOpen = (open: number) => {
    if (!lowerJaw) return
    const clamped = Math.max(0, Math.min(1, open))
    lowerJaw.rotation.x = -0.1 - clamped * 0.7
  }

  const getDistanceTo = (other: CreatureInstance): number => {
    return group.position.distanceTo(other.group.position)
  }

  const isInTerritory = (pos: THREE.Vector3): boolean => {
    if (!territoryCenter || !territoryRadius) return false
    return territoryCenter.distanceTo(pos) <= territoryRadius
  }

  // Create behavior context for the AI system
  const behaviorContext: BehaviorContext = {
    group,
    anchor,
    anatomy,
    rand: behaviorRand,
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

    // Wings flapping (left wings are even indices; negative z lifts the tip)
    for (let i = 0; i < wings.length; i++) {
      const wing = wings[i]
      const dir = i % 2 === 0 ? 1 : -1
      const speedMultiplier = getWingFlapSpeedMultiplier(behaviorState)
      const speed = flapSpeed * speedMultiplier
      wing.rotation.z =
        -dir * (QUARTER_PI * 0.6 + memoizedSin((tSec + timeOffset) * speed) * flapAmplitude)
    }

    // Tails sway around their mounting angle
    for (const { object, x, y } of tailRest) {
      object.rotation.y = y + memoizedSin((tSec + timeOffset) * tailSpeed) * 0.6
      object.rotation.x = x + memoizedCos((tSec + timeOffset) * tailSpeed * 0.7) * 0.2
    }

    // Serpent bodies ripple head to tail, widening toward the tip
    for (let i = 0; i < bodySegments.length; i++) {
      const reach = i / Math.max(1, bodySegments.length - 1)
      bodySegments[i].position.x =
        memoizedSin((tSec + timeOffset) * 2.2 - i * 0.7) * 0.14 * sizeMultiplier * reach
    }

    // Antennae wiggle
    for (const { object, z } of antennaRest) {
      object.rotation.z = z + memoizedSin((tSec + timeOffset) * 2.2) * 0.2
    }

    // Ears twitch
    for (let i = 0; i < earRest.length; i++) {
      const { object, z } = earRest[i]
      object.rotation.z = z + memoizedSin((tSec + timeOffset) * 3.0 + i) * 0.15
    }

    // Horns subtle movement (breathing)
    for (const { object, y } of hornRest) {
      object.rotation.y = y + memoizedSin((tSec + timeOffset) * 0.5) * 0.05
    }

    // Spines subtle sway
    for (let i = 0; i < spineRest.length; i++) {
      const { object, x } = spineRest[i]
      object.rotation.x = x + memoizedSin((tSec + timeOffset) * 1.5 + i * 0.5) * 0.08
    }

    // Fur tufts gentle wave
    for (const { object, y } of furRest) {
      object.rotation.y = y + memoizedSin((tSec + timeOffset) * 1.8) * 0.1
    }

    // Scales shimmer (subtle scale change)
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i]
      const shimmer = 1.0 + memoizedSin((tSec + timeOffset) * 2.0 + i * 0.3) * 0.05
      scale.scale.setScalar(shimmer)
    }

    // Limbs idle sway, scaled by how loose each limb type is
    for (let i = 0; i < limbRest.length; i++) {
      const { object, x, z } = limbRest[i]
      const sway = object.userData.swayAmp as number
      object.rotation.x = x + memoizedSin((tSec + timeOffset) * 1.3 + i) * sway
      object.rotation.z = z + memoizedCos((tSec + timeOffset) * 1.1 + i * 0.5) * sway * 0.6
    }

    // Eyes blink (scale pupils)
    blinkTimer -= dt
    if (blinkTimer <= 0) {
      blinkTimer = blinkInterval + behaviorRand() * 1.5
      for (const e of eyes) {
        // Access pupil from userData (more reliable than child index)
        const pupil = e.userData.pupil as THREE.Mesh
        if (pupil) {
          const targetScale = 0.1 + behaviorRand() * 0.5
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
    poseTimer = 2.5 + behaviorRand() * 2.0
  }

  const creatureInstance: CreatureInstance = {
    group,
    anchor,
    timeOffset,
    rarity: anatomy.rarity,
    anatomy,
    genome,
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
