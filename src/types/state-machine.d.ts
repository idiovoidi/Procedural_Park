/**
 * Type definitions for the game state machine
 */

export type GameStateType =
  | 'loading'
  | 'menu'
  | 'playing'
  | 'paused'
  | 'photo_mode'
  | 'gallery'
  | 'settings'
  | 'multiplayer_connecting'
  | 'multiplayer_connected'
  | 'game_over'

export interface StateTransition {
  from: GameStateType
  to: GameStateType
  timestamp: number
}

export interface StateCallbacks {
  onEnter?: (previousState: GameStateType) => void
  onExit?: (nextState: GameStateType) => void
  onUpdate?: (deltaTime: number) => void
}

export interface GameStateConfig {
  pauseGameLoop?: boolean
  pauseAudio?: boolean
  showUI?: boolean
  allowInput?: boolean
  allowCameraMovement?: boolean
  allowPhotoCapture?: boolean
}

export interface StateMachineStatus {
  current: GameStateType
  previous: GameStateType | null
  timeInState: number
  availableTransitions: GameStateType[]
  historyCount: number
  config?: GameStateConfig
}

// Re-export subsystem state types
export type {
  GameSubsystemState,
  CameraState,
  UIState,
  CreaturesState,
  CreatureState,
  MultiplayerState,
  PhotoSystemState,
  AudioSystemState,
  StateChangeEvent,
} from '@systems/state'
