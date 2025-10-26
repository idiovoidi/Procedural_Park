/**
 * StateSync - Manual state synchronization for WebRTC
 * Handles binary serialization, deserialization, and interpolation of game state
 */

import type { GameState, GameEvent } from '../common/types';
import { MessageType } from '../common/types';

/**
 * Binary message format:
 * [0]: MessageType (1 byte)
 * [1-4]: Timestamp (4 bytes, uint32)
 * [5+]: Payload (variable length)
 *
 * STATE_UPDATE payload (29 bytes):
 * [0-3]: position.x (float32)
 * [4-7]: position.y (float32)
 * [8-11]: position.z (float32)
 * [12-15]: rotation.x (float32)
 * [16-19]: rotation.y (float32)
 * [20-23]: rotation.z (float32)
 * [24]: cameraMode (1 byte: 0=ride, 1=free)
 * [25-28]: rideProgress (float32)
 */

const STATE_UPDATE_SIZE = 34; // 1 (type) + 4 (timestamp) + 29 (payload)
const GAME_EVENT_BASE_SIZE = 6; // 1 (type) + 4 (timestamp) + 1 (event type)

export class StateSync {
  private lastSentState: GameState | null = null;
  private lastReceivedState: GameState | null = null;
  private updateRate: number; // Updates per second
  private lastUpdateTime: number = 0;
  private updateInterval: number; // Milliseconds between updates

  constructor(updateRate: number = 10) {
    this.updateRate = updateRate;
    this.updateInterval = 1000 / updateRate;
  }

  /**
   * Check if enough time has passed to send an update
   * @param currentTime - Current timestamp in milliseconds
   * @returns true if an update should be sent
   */
  public shouldSendUpdate(currentTime: number): boolean {
    return currentTime - this.lastUpdateTime >= this.updateInterval;
  }

  /**
   * Mark that an update was sent
   * @param currentTime - Current timestamp in milliseconds
   */
  public markUpdateSent(currentTime: number): void {
    this.lastUpdateTime = currentTime;
  }

  /**
   * Check if state has changed significantly (delta compression)
   * @param state - New state to compare
   * @returns true if state has changed enough to warrant sending
   */
  public hasStateChanged(state: GameState): boolean {
    if (!this.lastSentState) return true;

    const posThreshold = 0.01; // 1cm
    const rotThreshold = 0.01; // ~0.57 degrees
    const progressThreshold = 0.001;

    const posDiff =
      Math.abs(state.position.x - this.lastSentState.position.x) +
      Math.abs(state.position.y - this.lastSentState.position.y) +
      Math.abs(state.position.z - this.lastSentState.position.z);

    const rotDiff =
      Math.abs(state.rotation.x - this.lastSentState.rotation.x) +
      Math.abs(state.rotation.y - this.lastSentState.rotation.y) +
      Math.abs(state.rotation.z - this.lastSentState.rotation.z);

    const progressDiff = Math.abs(state.rideProgress - this.lastSentState.rideProgress);

    const cameraModeChanged = state.cameraMode !== this.lastSentState.cameraMode;

    return (
      posDiff > posThreshold ||
      rotDiff > rotThreshold ||
      progressDiff > progressThreshold ||
      cameraModeChanged
    );
  }

  /**
   * Serialize game state to binary format
   * @param state - Game state to serialize
   * @returns ArrayBuffer containing serialized state
   */
  public serializeState(state: GameState): ArrayBuffer {
    const buffer = new ArrayBuffer(STATE_UPDATE_SIZE);
    const view = new DataView(buffer);
    let offset = 0;

    // Message type
    view.setUint8(offset, MessageType.STATE_UPDATE);
    offset += 1;

    // Timestamp
    view.setUint32(offset, state.timestamp, true);
    offset += 4;

    // Position
    view.setFloat32(offset, state.position.x, true);
    offset += 4;
    view.setFloat32(offset, state.position.y, true);
    offset += 4;
    view.setFloat32(offset, state.position.z, true);
    offset += 4;

    // Rotation
    view.setFloat32(offset, state.rotation.x, true);
    offset += 4;
    view.setFloat32(offset, state.rotation.y, true);
    offset += 4;
    view.setFloat32(offset, state.rotation.z, true);
    offset += 4;

    // Camera mode (0 = ride, 1 = free)
    view.setUint8(offset, state.cameraMode === 'ride' ? 0 : 1);
    offset += 1;

    // Ride progress
    view.setFloat32(offset, state.rideProgress, true);

    this.lastSentState = { ...state };

    return buffer;
  }

  /**
   * Deserialize game state from binary format
   * @param data - ArrayBuffer containing serialized state
   * @returns Deserialized game state
   */
  public deserializeState(data: ArrayBuffer): GameState {
    const view = new DataView(data);
    let offset = 0;

    // Skip message type (already validated)
    offset += 1;

    // Timestamp
    const timestamp = view.getUint32(offset, true);
    offset += 4;

    // Position
    const position = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;

    // Rotation
    const rotation = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;

    // Camera mode
    const cameraModeValue = view.getUint8(offset);
    const cameraMode = cameraModeValue === 0 ? 'ride' : 'free';
    offset += 1;

    // Ride progress
    const rideProgress = view.getFloat32(offset, true);

    const state: GameState = {
      position,
      rotation,
      cameraMode,
      rideProgress,
      timestamp,
    };

    this.lastReceivedState = state;

    return state;
  }

  /**
   * Serialize game event to binary format
   * @param event - Game event to serialize
   * @returns ArrayBuffer containing serialized event
   */
  public serializeEvent(event: GameEvent): ArrayBuffer {
    // Calculate size based on event data
    const dataStr = event.data ? JSON.stringify(event.data) : '';
    const dataBytes = new TextEncoder().encode(dataStr);
    const buffer = new ArrayBuffer(GAME_EVENT_BASE_SIZE + dataBytes.length);
    const view = new DataView(buffer);
    let offset = 0;

    // Message type
    view.setUint8(offset, MessageType.GAME_EVENT);
    offset += 1;

    // Timestamp
    view.setUint32(offset, event.timestamp, true);
    offset += 4;

    // Event type (0 = photo, 1 = creature_interaction)
    view.setUint8(offset, event.type === 'photo' ? 0 : 1);
    offset += 1;

    // Event data (if any)
    if (dataBytes.length > 0) {
      const uint8View = new Uint8Array(buffer);
      uint8View.set(dataBytes, offset);
    }

    return buffer;
  }

  /**
   * Deserialize game event from binary format
   * @param data - ArrayBuffer containing serialized event
   * @returns Deserialized game event
   */
  public deserializeEvent(data: ArrayBuffer): GameEvent {
    const view = new DataView(data);
    let offset = 0;

    // Skip message type (already validated)
    offset += 1;

    // Timestamp
    const timestamp = view.getUint32(offset, true);
    offset += 4;

    // Event type
    const eventTypeValue = view.getUint8(offset);
    const type = eventTypeValue === 0 ? 'photo' : 'creature_interaction';
    offset += 1;

    // Event data (if any)
    let eventData: any = undefined;
    if (data.byteLength > GAME_EVENT_BASE_SIZE) {
      const dataBytes = new Uint8Array(data, offset);
      const dataStr = new TextDecoder().decode(dataBytes);
      try {
        eventData = JSON.parse(dataStr);
      } catch (error) {
        console.warn('Failed to parse event data:', error);
      }
    }

    return {
      type,
      timestamp,
      data: eventData,
    };
  }

  /**
   * Interpolate between two states for smooth movement
   * @param from - Starting state
   * @param to - Target state
   * @param alpha - Interpolation factor (0-1)
   * @returns Interpolated state
   */
  public interpolateState(from: GameState, to: GameState, alpha: number): GameState {
    // Clamp alpha to [0, 1]
    alpha = Math.max(0, Math.min(1, alpha));

    return {
      position: {
        x: from.position.x + (to.position.x - from.position.x) * alpha,
        y: from.position.y + (to.position.y - from.position.y) * alpha,
        z: from.position.z + (to.position.z - from.position.z) * alpha,
      },
      rotation: {
        x: from.rotation.x + (to.rotation.x - from.rotation.x) * alpha,
        y: from.rotation.y + (to.rotation.y - from.rotation.y) * alpha,
        z: from.rotation.z + (to.rotation.z - from.rotation.z) * alpha,
      },
      cameraMode: alpha < 0.5 ? from.cameraMode : to.cameraMode,
      rideProgress: from.rideProgress + (to.rideProgress - from.rideProgress) * alpha,
      timestamp: to.timestamp,
    };
  }

  /**
   * Get the last received state
   */
  public getLastReceivedState(): GameState | null {
    return this.lastReceivedState;
  }

  /**
   * Serialize ping message
   * @param timestamp - Current timestamp
   * @returns ArrayBuffer containing ping message
   */
  public serializePing(timestamp: number): ArrayBuffer {
    const buffer = new ArrayBuffer(5);
    const view = new DataView(buffer);
    view.setUint8(0, MessageType.PING);
    view.setUint32(1, timestamp, true);
    return buffer;
  }

  /**
   * Serialize pong message
   * @param timestamp - Original ping timestamp
   * @returns ArrayBuffer containing pong message
   */
  public serializePong(timestamp: number): ArrayBuffer {
    const buffer = new ArrayBuffer(5);
    const view = new DataView(buffer);
    view.setUint8(0, MessageType.PONG);
    view.setUint32(1, timestamp, true);
    return buffer;
  }

  /**
   * Deserialize ping/pong timestamp
   * @param data - ArrayBuffer containing ping/pong message
   * @returns Timestamp from the message
   */
  public deserializePingPong(data: ArrayBuffer): number {
    const view = new DataView(data);
    return view.getUint32(1, true);
  }
}
