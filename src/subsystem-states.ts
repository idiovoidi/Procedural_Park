/**
 * Subsystem State Definitions
 * Centralized state structures for all game subsystems
 */

import type { CameraMode } from './camera'
import type * as THREE from 'three'

/**
 * Camera subsystem state
 */
export interface CameraState {
  mode: CameraMode
  position: { x: number; y: number; z: number }
  rotation: { yaw: number; pitch: number }
  rideT: number
  isPaused: boolean
  isSprinting: boolean
  isJumping: boolean
}

/**
 * UI subsystem state
 */
export interface UIState {
  photoCount: number
  totalScore: number
  lastScore: number
  isGalleryOpen: boolean
  isSettingsOpen: boolean
  isShortcutsOpen: boolean
  isMultiplayerPanelOpen: boolean
  showCreatureInfo: boolean
  capturedPhotos: CapturedPhoto[]
}

export interface CapturedPhoto {
  dataUrl: string
  score: number
  timestamp: number
  creatures: string[]
}

/**
 * Creature subsystem state
 */
export interface CreatureState {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  rotation: number
  behaviorState: CreatureBehaviorState
  animationTime: number
  isVisible: boolean
  rarity: number
}

export type CreatureBehaviorState = 
  | 'idle'
  | 'walking'
  | 'running'
  | 'eating'
  | 'drinking'
  | 'sleeping'
  | 'alert'

export interface CreaturesState {
  creatures: Map<string, CreatureState>
  activeCount: number
  lastUpdateTime: number
}

/**
 * Multiplayer subsystem state
 */
export interface MultiplayerState {
  isConnected: boolean
  isHost: boolean
  peerId: string | null
  peerName: string | null
  connectionStatus: MultiplayerConnectionStatus
  latency: number
  peerPosition: { x: number; y: number; z: number } | null
  peerRotation: { yaw: number; pitch: number } | null
  lastSyncTime: number
}

export type MultiplayerConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

/**
 * Photo system state
 */
export interface PhotoSystemState {
  isCapturing: boolean
  filmRemaining: number
  maxFilm: number
  cooldownRemaining: number
  lastCaptureTime: number
}

/**
 * Audio system state
 */
export interface AudioSystemState {
  isMuted: boolean
  masterVolume: number
  ambientVolume: number
  sfxVolume: number
  isPlaying: boolean
}

/**
 * Complete game state container
 */
export interface GameSubsystemState {
  camera: CameraState
  ui: UIState
  creatures: CreaturesState
  multiplayer: MultiplayerState
  photoSystem: PhotoSystemState
  audio: AudioSystemState
  timestamp: number
}

/**
 * State change event
 */
export interface StateChangeEvent<T = any> {
  subsystem: keyof GameSubsystemState
  previousState: T
  newState: T
  timestamp: number
}

/**
 * Default state factories
 */
export const createDefaultCameraState = (): CameraState => ({
  mode: 'ride',
  position: { x: 0, y: 1.6, z: 5 },
  rotation: { yaw: 0, pitch: 0 },
  rideT: 0,
  isPaused: false,
  isSprinting: false,
  isJumping: false,
})

export const createDefaultUIState = (): UIState => ({
  photoCount: 0,
  totalScore: 0,
  lastScore: 0,
  isGalleryOpen: false,
  isSettingsOpen: false,
  isShortcutsOpen: false,
  isMultiplayerPanelOpen: false,
  showCreatureInfo: true,
  capturedPhotos: [],
})

export const createDefaultCreaturesState = (): CreaturesState => ({
  creatures: new Map(),
  activeCount: 0,
  lastUpdateTime: 0,
})

export const createDefaultMultiplayerState = (): MultiplayerState => ({
  isConnected: false,
  isHost: false,
  peerId: null,
  peerName: null,
  connectionStatus: 'disconnected',
  latency: 0,
  peerPosition: null,
  peerRotation: null,
  lastSyncTime: 0,
})

export const createDefaultPhotoSystemState = (): PhotoSystemState => ({
  isCapturing: false,
  filmRemaining: 36,
  maxFilm: 36,
  cooldownRemaining: 0,
  lastCaptureTime: 0,
})

export const createDefaultAudioSystemState = (): AudioSystemState => ({
  isMuted: false,
  masterVolume: 1.0,
  ambientVolume: 0.5,
  sfxVolume: 1.0,
  isPlaying: false,
})

export const createDefaultGameSubsystemState = (): GameSubsystemState => ({
  camera: createDefaultCameraState(),
  ui: createDefaultUIState(),
  creatures: createDefaultCreaturesState(),
  multiplayer: createDefaultMultiplayerState(),
  photoSystem: createDefaultPhotoSystemState(),
  audio: createDefaultAudioSystemState(),
  timestamp: Date.now(),
})
