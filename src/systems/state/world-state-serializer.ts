/**
 * World State Serializer
 * Helper functions to convert game objects to/from serializable format
 */

import type { CreatureInstance } from '@systems/creatures'
import type * as THREE from 'three'
import type {
  PlayerProgress,
  SerializedCameraState,
  SerializedCreature,
  SerializedPhoto,
  WorldState,
} from './world-state-types'

/**
 * Serialize a creature instance
 */
export function serializeCreature(creature: CreatureInstance): SerializedCreature {
  return {
    position: {
      x: creature.group.position.x,
      y: creature.group.position.y,
      z: creature.group.position.z,
    },
    anchor: {
      x: creature.anchor.x,
      y: creature.anchor.y,
      z: creature.anchor.z,
    },
    timeOffset: creature.timeOffset,
    rarity: creature.rarity,
    anatomy: {
      archetype: creature.anatomy.archetype,
      torsoShape: creature.anatomy.torsoShape,
      bodyType: creature.anatomy.bodyType,
      hasHead: creature.anatomy.hasHead,
      headSize: creature.anatomy.headSize,
      eyeCount: creature.anatomy.eyeCount,
      eyeSize: creature.anatomy.eyeSize,
      limbCount: creature.anatomy.limbCount,
      limbType: creature.anatomy.limbType,
      wingCount: creature.anatomy.wingCount,
      wingType: creature.anatomy.wingType,
      tailCount: creature.anatomy.tailCount,
      tailType: creature.anatomy.tailType,
      antennaCount: creature.anatomy.antennaCount,
      antennaType: creature.anatomy.antennaType,
      earCount: creature.anatomy.earCount,
      earType: creature.anatomy.earType,
      hornCount: creature.anatomy.hornCount,
      hornType: creature.anatomy.hornType,
      spineCount: creature.anatomy.spineCount,
      spineType: creature.anatomy.spineType,
      furTufts: creature.anatomy.furTufts,
      hasScales: creature.anatomy.hasScales,
      pattern: creature.anatomy.pattern,
      patternColor: {
        r: creature.anatomy.patternColor.r,
        g: creature.anatomy.patternColor.g,
        b: creature.anatomy.patternColor.b,
      },
      bellyColor: {
        r: creature.anatomy.bellyColor.r,
        g: creature.anatomy.bellyColor.g,
        b: creature.anatomy.bellyColor.b,
      },
      baseHue: creature.anatomy.baseHue,
      size: creature.anatomy.size,
      temperament: creature.anatomy.temperament,
    },
    behaviorState: creature.behaviorState,
    behaviorTimer: creature.behaviorTimer,
  }
}

/**
 * Serialize camera state
 */
export function serializeCameraState(
  camera: THREE.Camera,
  mode: 'ride' | 'freeroam',
  rideProgress: number = 0
): SerializedCameraState {
  return {
    mode,
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    rotation: {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z,
    },
    rideProgress,
  }
}

/**
 * Deserialize camera state
 */
export function deserializeCameraState(camera: THREE.Camera, state: SerializedCameraState): void {
  camera.position.set(state.position.x, state.position.y, state.position.z)
  camera.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z)
}

/**
 * Create photo data for serialization
 */
export function createSerializedPhoto(
  dataUrl: string,
  score: number,
  creatureName: string
): SerializedPhoto {
  return {
    dataUrl,
    score,
    creatureName,
    timestamp: Date.now(),
  }
}

/**
 * Update player progress with new photo
 */
export function updateProgressWithPhoto(
  progress: PlayerProgress,
  score: number,
  creatureName: string,
  rarity: number
): PlayerProgress {
  const updated = { ...progress }

  updated.photoCount++
  updated.totalScore += score
  updated.bestScore = Math.max(updated.bestScore, score)
  updated.creaturesDiscovered.add(creatureName)
  updated.lastPlayed = Date.now()

  // Update rarity tiers
  if (rarity < 0.3) {
    updated.rarityTiers.common++
  } else if (rarity < 0.5) {
    updated.rarityTiers.uncommon++
  } else if (rarity < 0.7) {
    updated.rarityTiers.rare++
  } else if (rarity < 0.9) {
    updated.rarityTiers.epic++
  } else {
    updated.rarityTiers.legendary++
  }

  return updated
}

/**
 * Serialize player progress (handles Set conversion)
 */
export function serializeProgress(progress: PlayerProgress): string {
  return JSON.stringify({
    ...progress,
    creaturesDiscovered: Array.from(progress.creaturesDiscovered),
  })
}

/**
 * Deserialize player progress (handles Set conversion)
 */
export function deserializeProgress(json: string): PlayerProgress {
  const data = JSON.parse(json)
  return {
    ...data,
    creaturesDiscovered: new Set(data.creaturesDiscovered),
  }
}

/**
 * Create a complete world state snapshot from game systems
 */
export function createWorldStateSnapshot(params: {
  worldSeed: number
  creatures?: CreatureInstance[]
  experimentCreature?: CreatureInstance
  progress: PlayerProgress
  camera: THREE.Camera
  cameraMode: 'ride' | 'freeroam'
  rideProgress?: number
  photos: SerializedPhoto[]
  settings: {
    dayNightMode: 'day' | 'night'
    audioEnabled: boolean
    ambientVolume: number
    shaderEnabled: boolean
    showCreatureInfo: boolean
  }
}): WorldState {
  return {
    version: '1.0.0',
    saveDate: Date.now(),
    worldSeed: params.worldSeed,
    creatures: params.creatures?.map(serializeCreature),
    experimentCreature: params.experimentCreature
      ? serializeCreature(params.experimentCreature)
      : undefined,
    progress: params.progress,
    camera: serializeCameraState(params.camera, params.cameraMode, params.rideProgress),
    photos: params.photos,
    settings: {
      seed: params.worldSeed,
      ...params.settings,
    },
  }
}

/**
 * Calculate rarity tier from rarity value
 */
export function getRarityTier(rarity: number): keyof PlayerProgress['rarityTiers'] {
  if (rarity < 0.3) return 'common'
  if (rarity < 0.5) return 'uncommon'
  if (rarity < 0.7) return 'rare'
  if (rarity < 0.9) return 'epic'
  return 'legendary'
}

/**
 * Format play time for display
 */
export function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Format date for display
 */
export function formatSaveDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}
