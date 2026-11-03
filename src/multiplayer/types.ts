/**
 * Shared types and interfaces for WebRTC multiplayer system
 */

/**
 * Game state synchronized between peers
 */
export interface GameState {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  cameraMode: 'ride' | 'free'
  rideProgress: number
  timestamp: number
}

/**
 * Game events transmitted between peers
 */
export interface GameEvent {
  type: 'photo' | 'creature_interaction'
  timestamp: number
  data?: unknown
}

/**
 * Connection status information
 */
export interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error'
  message?: string
  latency?: number
}

/**
 * WebRTC configuration options
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[]
  updateRate: number // Updates per second
  interpolationDelay: number // Milliseconds
  /** Milliseconds to establish the connection once both codes have been exchanged. */
  connectionTimeout: number
  /** Milliseconds a human may take to copy/paste the offer and answer codes. */
  signalingTimeout: number
}

/**
 * Message types for binary protocol
 */
export const MessageType = {
  STATE_UPDATE: 0,
  GAME_EVENT: 1,
  PING: 2,
  PONG: 3,
  /** UTF-8 JSON text for trades, shared codex and park visits (chunked by the social layer). */
  SOCIAL: 4,
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]

/**
 * Default WebRTC configuration
 */
export const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
  updateRate: 10, // 10 updates per second
  interpolationDelay: 100, // 100ms interpolation buffer
  connectionTimeout: 30000, // 30 seconds once the answer is applied
  signalingTimeout: 300000, // 5 minutes for the manual code exchange
}
