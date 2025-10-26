/**
 * Common interface for multiplayer providers
 * Both WebRTC and Colyseus implementations follow this interface
 */

import type { GameState, GameEvent } from './types';

export interface IMultiplayerProvider {
  // Connection management
  
  /**
   * Create a new multiplayer session (host)
   * For WebRTC: generates offer signal data
   * For Colyseus: creates a new room
   */
  createSession(): Promise<void>;
  
  /**
   * Join an existing multiplayer session (guest)
   * @param connectionData - For WebRTC: offer signal data; For Colyseus: room ID
   */
  joinSession(connectionData: string): Promise<void>;
  
  /**
   * Disconnect from the current session
   */
  disconnect(): void;
  
  // State synchronization
  
  /**
   * Update the multiplayer provider (called each frame)
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime: number): void;
  
  /**
   * Send current game state to connected peer(s)
   * @param state - Current game state to synchronize
   */
  sendGameState(state: GameState): void;
  
  // Event callbacks
  
  /**
   * Called when successfully connected to peer
   */
  onConnected: () => void;
  
  /**
   * Called when disconnected from peer
   */
  onDisconnected: () => void;
  
  /**
   * Called when peer state update is received
   * @param state - Received game state from peer
   */
  onPeerStateUpdate: (state: GameState) => void;
  
  /**
   * Called when a game event is received from peer
   * @param event - Received game event
   */
  onGameEvent: (event: GameEvent) => void;
  
  /**
   * Called when an error occurs
   * @param error - Error that occurred
   */
  onError: (error: Error) => void;
  
  // Status
  
  /**
   * Check if currently connected to a peer
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean;
  
  /**
   * Get current network latency
   * @returns Latency in milliseconds
   */
  getLatency(): number;
}
