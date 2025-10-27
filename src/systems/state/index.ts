/**
 * State Management System
 * Barrel export for state management modules
 */

// State Machine
export { GameStateMachine } from './state-machine'
export type { GameStateType, StateTransition, StateCallbacks } from './state-machine'

// Subsystem State Manager
export { SubsystemStateManager } from './subsystem-state-manager'

// Subsystem States
export type {
  CameraState,
  UIState,
  CreatureState,
  CreatureBehaviorState,
  CreaturesState,
  MultiplayerState,
  MultiplayerConnectionStatus,
  PhotoSystemState,
  AudioSystemState,
  GameSubsystemState,
  StateChangeEvent,
  CapturedPhoto,
} from './subsystem-states'

export {
  createDefaultCameraState,
  createDefaultUIState,
  createDefaultCreaturesState,
  createDefaultMultiplayerState,
  createDefaultPhotoSystemState,
  createDefaultAudioSystemState,
  createDefaultGameSubsystemState,
} from './subsystem-states'

// State Integration
export { IntegratedStateManager } from './state-integration'

// State Sync Helpers
export {
  CameraStateSync,
  UIStateSync,
  CreatureStateSync,
  MultiplayerStateSync,
  createStateSyncHelpers,
} from './state-sync-helpers'

// World State Management
export { WorldStateManager } from './WorldStateManager'
export type {
  WorldState,
  SaveSlotMetadata,
  PlayerProgress,
  SerializedCreature,
  SerializedPhoto,
  SerializedCameraState,
  WorldSettings,
} from './world-state-types'
export {
  serializeCreature,
  serializeCameraState,
  deserializeCameraState,
  createSerializedPhoto,
  updateProgressWithPhoto,
  serializeProgress,
  deserializeProgress,
  createWorldStateSnapshot,
  getRarityTier,
  formatPlayTime,
  formatSaveDate,
} from './world-state-serializer'
