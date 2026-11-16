/**
 * World State Types
 * Defines the structure of saveable game state
 */

import type { PatternType } from '@rendering/textures'
import type { BehaviorState, BodyType, CreatureArchetype } from '@systems/creatures'

/**
 * Serializable creature data (without Three.js objects)
 */
export interface SerializedCreature {
  // Position and basic info
  position: { x: number; y: number; z: number }
  anchor: { x: number; y: number; z: number }
  timeOffset: number
  rarity: number

  // Anatomy (simplified)
  anatomy: {
    archetype: CreatureArchetype
    torsoShape: string
    bodyType: BodyType
    hasHead: boolean
    headSize: number
    eyeCount: number
    eyeSize: number
    limbCount: number
    limbType: string
    wingCount: number
    wingType: string
    tailCount: number
    tailType: string
    antennaCount: number
    antennaType: string
    earCount: number
    earType: string
    hornCount: number
    hornType: string
    spineCount: number
    spineType: string
    furTufts: boolean
    hasScales: boolean
    pattern: PatternType
    patternColor: { r: number; g: number; b: number }
    bellyColor: { r: number; g: number; b: number }
    baseHue: number
    size: string
    temperament: string
  }

  // Behavior state
  behaviorState: BehaviorState
  behaviorTimer: number
}

/**
 * Serializable photo data
 */
export interface SerializedPhoto {
  dataUrl: string
  score: number
  creatureName: string
  timestamp: number
}

/**
 * Player progress and statistics
 */
export interface PlayerProgress {
  photoCount: number
  totalScore: number
  bestScore: number
  creaturesDiscovered: Set<string> // Creature names
  rarityTiers: {
    common: number
    uncommon: number
    rare: number
    epic: number
    legendary: number
  }
  playTime: number // in seconds
  lastPlayed: number // timestamp
}

/**
 * Camera state
 */
export interface SerializedCameraState {
  mode: 'ride' | 'freeroam'
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  rideProgress: number
}

/**
 * World settings
 */
export interface WorldSettings {
  seed: number
  dayNightMode: 'day' | 'night'
  audioEnabled: boolean
  ambientVolume: number
  shaderEnabled: boolean
  showCreatureInfo: boolean
}

/**
 * Complete world state
 */
export interface WorldState {
  version: string // For migration support
  saveDate: number // timestamp

  // World generation
  worldSeed: number

  // Creatures (only if we want to preserve exact creature positions)
  creatures?: SerializedCreature[]
  experimentCreature?: SerializedCreature

  // Player progress
  progress: PlayerProgress

  // Camera state
  camera: SerializedCameraState

  // Gallery
  photos: SerializedPhoto[]

  // Settings
  settings: WorldSettings

  /**
   * The breeding ranch (roster, pens, economy, coins...). Versioned and validated by
   * `restorePark`, so it is typed loosely here. Absent in saves made before the ranch existed.
   */
  park?: unknown
}

/**
 * Save slot metadata
 */
export interface SaveSlotMetadata {
  slotId: string
  saveDate: number
  playTime: number
  photoCount: number
  totalScore: number
  worldSeed: number
}
