/**
 * State Management System
 * Barrel export for state management modules
 */

// State Integration
export { IntegratedStateManager } from './state-integration'
export type { GameStateType, StateCallbacks, StateTransition } from './state-machine'
// State Machine
export { GameStateMachine } from './state-machine'
// State Sync Helpers
export {
  CameraStateSync,
  CreatureStateSync,
  createStateSyncHelpers,
  MultiplayerStateSync,
  UIStateSync,
} from './state-sync-helpers'
// Subsystem State Manager
export { SubsystemStateManager } from './subsystem-state-manager'
// Subsystem States
export type {
  AudioSystemState,
  CameraState,
  CapturedPhoto,
  CreatureBehaviorState,
  CreatureState,
  CreaturesState,
  GameSubsystemState,
  MultiplayerConnectionStatus,
  MultiplayerState,
  PhotoSystemState,
  StateChangeEvent,
  UIState,
} from './subsystem-states'
export {
  createDefaultAudioSystemState,
  createDefaultCameraState,
  createDefaultCreaturesState,
  createDefaultGameSubsystemState,
  createDefaultMultiplayerState,
  createDefaultPhotoSystemState,
  createDefaultUIState,
} from './subsystem-states'

// World State Management
export { WorldStateManager } from './WorldStateManager'
export {
  createSerializedPhoto,
  createWorldStateSnapshot,
  deserializeCameraState,
  deserializeProgress,
  formatPlayTime,
  formatSaveDate,
  getRarityTier,
  serializeCameraState,
  serializeCreature,
  serializeProgress,
  updateProgressWithPhoto,
} from './world-state-serializer'
export type {
  PlayerProgress,
  SaveSlotMetadata,
  SerializedCameraState,
  SerializedCreature,
  SerializedPhoto,
  WorldSettings,
  WorldState,
} from './world-state-types'
