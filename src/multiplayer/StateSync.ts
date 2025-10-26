/**
 * StateSync - Handles binary serialization and synchronization of game state
 * 
 * This class manages:
 * - Binary serialization/deserialization of GameState using DataView
 * - Update rate throttling (10 Hz default)
 * - State interpolation buffer for smooth movement
 * - Event serialization/deserialization (photo events)
 * - Message type handling (STATE_UPDATE, GAME_EVENT, PING, PONG)
 */

import type { GameState, GameEvent } from './types';
import { MessageType } from './types';

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
 * 
 * GAME_EVENT payload:
 * [0]: eventType (1 byte: 0=photo, 1=creature_interaction)
 * [1+]: event-specific data (optional)
 * 
 * PING/PONG payload:
 * [0-7]: timestamp (8 bytes, float64)
 */

const STATE_MESSAGE_SIZE = 34; // 1 (type) + 4 (timestamp) + 29 (payload)
const EVENT_MESSAGE_BASE_SIZE = 6; // 1 (type) + 4 (timestamp) + 1 (event type)
const PING_MESSAGE_SIZE = 13; // 1 (type) + 4 (timestamp) + 8 (ping timestamp)

export class StateSync {
  private lastSentState: GameState | null = null;
  private lastReceivedState: GameState | null = null;
  private updateRate: number;
  private lastUpdateTime: number = 0;
  private interpolationBuffer: GameState[] = [];
  private readonly maxBufferSize = 10; // Keep last 10 states for interpolation

  constructor(updateRate: number = 10) {
    this.updateRate = updateRate;
  }

  /**
   * Check if enough time has passed to send another update
   */
  public shouldSendUpdate(currentTime: number): boolean {
    const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
    const updateInterval = 1000 / this.updateRate; // Convert Hz to milliseconds
    
    if (timeSinceLastUpdate >= updateInterval) {
      this.lastUpdateTime = currentTime;
      return true;
    }
    
    return false;
  }

  /**
   * Serialize GameState to binary format
   */
  public serializeState(state: GameState): ArrayBuffer {
    const buffer = new ArrayBuffer(STATE_MESSAGE_SIZE);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Message type
    view.setUint8(offset, MessageType.STATE_UPDATE);
    offset += 1;
    
    // Timestamp (uint32 - milliseconds)
    view.setUint32(offset, state.timestamp & 0xFFFFFFFF, true);
    offset += 4;
    
    // Position
    offset = this.packVector3(view, offset, state.position);
    
    // Rotation
    offset = this.packVector3(view, offset, state.rotation);
    
    // Camera mode (0=ride, 1=free)
    view.setUint8(offset, state.cameraMode === 'ride' ? 0 : 1);
    offset += 1;
    
    // Ride progress
    view.setFloat32(offset, state.rideProgress, true);
    
    this.lastSentState = state;
    
    return buffer;
  }

  /**
   * Deserialize binary data to GameState
   */
  public deserializeState(data: ArrayBuffer): GameState | null {
    if (data.byteLength < STATE_MESSAGE_SIZE) {
      console.error('Invalid state data size:', data.byteLength);
      return null;
    }
    
    const view = new DataView(data);
    let offset = 0;
    
    // Verify message type
    const messageType = view.getUint8(offset);
    offset += 1;
    
    if (messageType !== MessageType.STATE_UPDATE) {
      console.error('Invalid message type for state:', messageType);
      return null;
    }
    
    // Timestamp
    const timestamp = view.getUint32(offset, true);
    offset += 4;
    
    // Position
    const position = this.unpackVector3(view, offset);
    offset += 12;
    
    // Rotation
    const rotation = this.unpackVector3(view, offset);
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
   * Serialize GameEvent to binary format
   */
  public serializeEvent(event: GameEvent): ArrayBuffer {
    const buffer = new ArrayBuffer(EVENT_MESSAGE_BASE_SIZE);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Message type
    view.setUint8(offset, MessageType.GAME_EVENT);
    offset += 1;
    
    // Timestamp (uint32 - milliseconds)
    view.setUint32(offset, event.timestamp & 0xFFFFFFFF, true);
    offset += 4;
    
    // Event type (0=photo, 1=creature_interaction)
    const eventTypeValue = event.type === 'photo' ? 0 : 1;
    view.setUint8(offset, eventTypeValue);
    
    return buffer;
  }

  /**
   * Deserialize binary data to GameEvent
   */
  public deserializeEvent(data: ArrayBuffer): GameEvent | null {
    if (data.byteLength < EVENT_MESSAGE_BASE_SIZE) {
      console.error('Invalid event data size:', data.byteLength);
      return null;
    }
    
    const view = new DataView(data);
    let offset = 0;
    
    // Verify message type
    const messageType = view.getUint8(offset);
    offset += 1;
    
    if (messageType !== MessageType.GAME_EVENT) {
      console.error('Invalid message type for event:', messageType);
      return null;
    }
    
    // Timestamp
    const timestamp = view.getUint32(offset, true);
    offset += 4;
    
    // Event type
    const eventTypeValue = view.getUint8(offset);
    const type = eventTypeValue === 0 ? 'photo' : 'creature_interaction';
    
    const event: GameEvent = {
      type,
      timestamp,
    };
    
    return event;
  }

  /**
   * Serialize PING message
   */
  public serializePing(timestamp: number): ArrayBuffer {
    const buffer = new ArrayBuffer(PING_MESSAGE_SIZE);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Message type
    view.setUint8(offset, MessageType.PING);
    offset += 1;
    
    // Message timestamp (uint32)
    view.setUint32(offset, Date.now() & 0xFFFFFFFF, true);
    offset += 4;
    
    // Ping timestamp (float64 for precision)
    view.setFloat64(offset, timestamp, true);
    
    return buffer;
  }

  /**
   * Serialize PONG message
   */
  public serializePong(timestamp: number): ArrayBuffer {
    const buffer = new ArrayBuffer(PING_MESSAGE_SIZE);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Message type
    view.setUint8(offset, MessageType.PONG);
    offset += 1;
    
    // Message timestamp (uint32)
    view.setUint32(offset, Date.now() & 0xFFFFFFFF, true);
    offset += 4;
    
    // Original ping timestamp (float64)
    view.setFloat64(offset, timestamp, true);
    
    return buffer;
  }

  /**
   * Deserialize PING/PONG message
   */
  public deserializePingPong(data: ArrayBuffer): { type: MessageType; timestamp: number } | null {
    if (data.byteLength < PING_MESSAGE_SIZE) {
      console.error('Invalid ping/pong data size:', data.byteLength);
      return null;
    }
    
    const view = new DataView(data);
    let offset = 0;
    
    // Message type
    const messageType = view.getUint8(offset);
    offset += 1;
    
    if (messageType !== MessageType.PING && messageType !== MessageType.PONG) {
      console.error('Invalid message type for ping/pong:', messageType);
      return null;
    }
    
    // Skip message timestamp
    offset += 4;
    
    // Ping/pong timestamp
    const timestamp = view.getFloat64(offset, true);
    
    return { type: messageType, timestamp };
  }

  /**
   * Add state to interpolation buffer
   */
  public addStateToBuffer(state: GameState): void {
    this.interpolationBuffer.push(state);
    
    // Keep buffer size limited
    if (this.interpolationBuffer.length > this.maxBufferSize) {
      this.interpolationBuffer.shift();
    }
  }

  /**
   * Get interpolated state for smooth movement
   * Uses linear interpolation between buffered states
   */
  public getInterpolatedState(currentTime: number): GameState | null {
    if (this.interpolationBuffer.length === 0) {
      return this.lastReceivedState;
    }
    
    if (this.interpolationBuffer.length === 1) {
      return this.interpolationBuffer[0];
    }
    
    // Find two states to interpolate between
    let prevState: GameState | null = null;
    let nextState: GameState | null = null;
    
    for (let i = 0; i < this.interpolationBuffer.length - 1; i++) {
      const state1 = this.interpolationBuffer[i];
      const state2 = this.interpolationBuffer[i + 1];
      
      if (currentTime >= state1.timestamp && currentTime <= state2.timestamp) {
        prevState = state1;
        nextState = state2;
        break;
      }
    }
    
    // If we're past all buffered states, use the latest
    if (!prevState || !nextState) {
      return this.interpolationBuffer[this.interpolationBuffer.length - 1];
    }
    
    // Calculate interpolation factor
    const timeDiff = nextState.timestamp - prevState.timestamp;
    const t = timeDiff > 0 ? (currentTime - prevState.timestamp) / timeDiff : 0;
    const clampedT = Math.max(0, Math.min(1, t));
    
    // Interpolate position and rotation
    const interpolatedState: GameState = {
      position: {
        x: this.lerp(prevState.position.x, nextState.position.x, clampedT),
        y: this.lerp(prevState.position.y, nextState.position.y, clampedT),
        z: this.lerp(prevState.position.z, nextState.position.z, clampedT),
      },
      rotation: {
        x: this.lerp(prevState.rotation.x, nextState.rotation.x, clampedT),
        y: this.lerp(prevState.rotation.y, nextState.rotation.y, clampedT),
        z: this.lerp(prevState.rotation.z, nextState.rotation.z, clampedT),
      },
      cameraMode: nextState.cameraMode, // No interpolation for discrete values
      rideProgress: this.lerp(prevState.rideProgress, nextState.rideProgress, clampedT),
      timestamp: currentTime,
    };
    
    return interpolatedState;
  }

  /**
   * Get the message type from binary data
   */
  public getMessageType(data: ArrayBuffer): MessageType | null {
    if (data.byteLength < 1) {
      return null;
    }
    
    const view = new DataView(data);
    const messageType = view.getUint8(0);
    
    // Validate message type
    if (messageType < MessageType.STATE_UPDATE || messageType > MessageType.PONG) {
      return null;
    }
    
    return messageType as MessageType;
  }

  /**
   * Clear interpolation buffer
   */
  public clearBuffer(): void {
    this.interpolationBuffer = [];
  }

  /**
   * Pack a Vector3 into DataView
   */
  private packVector3(
    view: DataView,
    offset: number,
    vec: { x: number; y: number; z: number }
  ): number {
    view.setFloat32(offset, vec.x, true);
    view.setFloat32(offset + 4, vec.y, true);
    view.setFloat32(offset + 8, vec.z, true);
    return offset + 12;
  }

  /**
   * Unpack a Vector3 from DataView
   */
  private unpackVector3(view: DataView, offset: number): { x: number; y: number; z: number } {
    return {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
