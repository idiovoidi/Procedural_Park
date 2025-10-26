/**
 * Common types for multiplayer functionality
 */

/**
 * Game state synchronized between players
 */
export interface GameState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  cameraMode: 'ride' | 'free';
  rideProgress: number;
  timestamp: number;
}

/**
 * Game events transmitted between players
 */
export interface GameEvent {
  type: 'photo' | 'creature_interaction';
  timestamp: number;
  data?: any;
}

/**
 * Connection status information
 */
export interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  message?: string;
  latency?: number;
}

/**
 * Configuration for multiplayer providers
 */
export interface MultiplayerConfig {
  updateRate: number; // State updates per second
  interpolationDelay: number; // Milliseconds
  maxLatency: number; // Maximum acceptable latency in ms
  connectionTimeout: number; // Connection timeout in ms
}

/**
 * WebRTC-specific configuration
 */
export interface WebRTCConfig extends MultiplayerConfig {
  iceServers: RTCIceServer[];
  trickle: boolean;
}

/**
 * Default multiplayer configuration
 */
export const DEFAULT_MULTIPLAYER_CONFIG: MultiplayerConfig = {
  updateRate: 10,
  interpolationDelay: 100,
  maxLatency: 500,
  connectionTimeout: 30000,
};

/**
 * Default WebRTC configuration with Google STUN servers
 */
export const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
  ...DEFAULT_MULTIPLAYER_CONFIG,
  trickle: false,
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Message types for WebRTC data channel
 */
export const MessageType = {
  STATE_UPDATE: 0,
  GAME_EVENT: 1,
  PING: 2,
  PONG: 3,
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];
