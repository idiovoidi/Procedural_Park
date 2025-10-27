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
