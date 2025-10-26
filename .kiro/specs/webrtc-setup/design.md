# Design Document

## Overview

This document describes a serverless peer-to-peer multiplayer implementation using WebRTC with manual signaling. The system enables two players to connect directly through their browsers without requiring a dedicated server, making it ideal for deployment on static hosting platforms like GitHub Pages or Vercel.

The implementation uses the Simple Peer library to simplify WebRTC connection management and implements manual state synchronization with binary protocols for efficient bandwidth usage.

## Architecture

### Folder Structure

```
src/multiplayer/
├── types.ts                    # Shared types and interfaces
├── WebRTCPeer.ts              # Simple Peer wrapper
├── StateSync.ts               # Manual state synchronization
├── WebRTCMultiplayer.ts       # Main multiplayer manager
├── PeerAvatar.ts              # Peer rendering in 3D scene
└── ConnectionUI.ts            # Connection UI components
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Class                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         WebRTCMultiplayer                              │ │
│  │                                                         │ │
│  │  ┌──────────────┐    ┌──────────────┐                 │ │
│  │  │ WebRTCPeer   │    │  StateSync   │                 │ │
│  │  │ (SimplePeer) │    │  (Binary)    │                 │ │
│  │  └──────────────┘    └──────────────┘                 │ │
│  │                                                         │ │
│  │  ┌──────────────┐    ┌──────────────┐                 │ │
│  │  │ PeerAvatar   │    │ ConnectionUI │                 │ │
│  │  │ (THREE.js)   │    │ (HTML/CSS)   │                 │ │
│  │  └──────────────┘    └──────────────┘                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Existing Systems: SceneManager, CameraController, etc.     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

1. **WebRTCMultiplayer**: Main coordinator that manages the connection lifecycle and integrates all components
2. **WebRTCPeer**: Manages WebRTC connection using Simple Peer library
3. **StateSync**: Handles serialization, deserialization, and synchronization of game state
4. **PeerAvatar**: Renders the other player in the 3D scene
5. **ConnectionUI**: Manages the user interface for connection management

## Components and Interfaces

### Types and Interfaces

```typescript
// Core types
interface GameState {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  cameraMode: 'ride' | 'free'
  rideProgress: number
  timestamp: number
}

interface GameEvent {
  type: 'photo' | 'creature_interaction'
  timestamp: number
  data?: any
}

interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error'
  message?: string
  latency?: number
}

interface WebRTCConfig {
  iceServers: RTCIceServer[]
  updateRate: number // Updates per second
  interpolationDelay: number // Milliseconds
  connectionTimeout: number // Milliseconds
}
```

### WebRTCMultiplayer

Main coordinator class that manages the entire multiplayer system:

```typescript
class WebRTCMultiplayer {
  private peer: WebRTCPeer
  private stateSync: StateSync
  private avatar: PeerAvatar | null
  private ui: ConnectionUI
  private isHost: boolean
  private config: WebRTCConfig
  
  constructor(scene: THREE.Scene, config: WebRTCConfig)
  
  // Connection management
  public async createSession(): Promise<void>
  public async joinSession(offerData: string): Promise<void>
  public disconnect(): void
  
  // State synchronization
  public update(deltaTime: number): void
  public sendGameState(state: GameState): void
  public sendEvent(event: GameEvent): void
  
  // Event callbacks
  public onConnected: () => void
  public onDisconnected: () => void
  public onPeerStateUpdate: (state: GameState) => void
  public onGameEvent: (event: GameEvent) => void
  public onError: (error: Error) => void
  
  // Status
  public isConnected(): boolean
  public getLatency(): number
  
  // Private handlers
  private handleSignalData(data: string): void
  private handleDataReceived(data: ArrayBuffer): void
  private handleConnect(): void
  private handleDisconnect(): void
}
```

### WebRTCPeer

Wraps the Simple Peer library and manages the WebRTC connection:

```typescript
class WebRTCPeer {
  private peer: SimplePeer.Instance | null
  private config: WebRTCConfig
  private connectionTimeout: NodeJS.Timeout | null
  
  constructor(config: WebRTCConfig)
  
  // Connection lifecycle
  public initAsHost(): void
  public initAsGuest(offerData: string): void
  public close(): void
  
  // Data transmission
  public send(data: ArrayBuffer): void
  public isConnected(): boolean
  
  // Event callbacks
  public onSignal: (signalData: string) => void
  public onConnect: () => void
  public onData: (data: ArrayBuffer) => void
  public onClose: () => void
  public onError: (error: Error) => void
  
  // Private methods
  private setupPeer(isInitiator: boolean): void
  private startConnectionTimeout(): void
  private clearConnectionTimeout(): void
}
```

### StateSync

Handles game state serialization and synchronization:

```typescript
class StateSync {
  private lastSentState: GameState | null
  private lastReceivedState: GameState | null
  private updateRate: number
  private lastUpdateTime: number
  private interpolationBuffer: GameState[]
  
  constructor(updateRate: number = 10)
  
  // State management
  public shouldSendUpdate(currentTime: number): boolean
  public serializeState(state: GameState): ArrayBuffer
  public deserializeState(data: ArrayBuffer): GameState
  
  // Event management
  public serializeEvent(event: GameEvent): ArrayBuffer
  public deserializeEvent(data: ArrayBuffer): GameEvent
  
  // Interpolation for smooth movement
  public addStateToBuffer(state: GameState): void
  public getInterpolatedState(currentTime: number): GameState | null
  
  // Private helpers
  private packVector3(view: DataView, offset: number, vec: {x: number, y: number, z: number}): number
  private unpackVector3(view: DataView, offset: number): {x: number, y: number, z: number}
}
```

### PeerAvatar

Renders the other player in the 3D scene:

```typescript
class PeerAvatar {
  private group: THREE.Group
  private camera: THREE.Object3D
  private nameLabel: THREE.Sprite
  private scene: THREE.Scene
  private currentState: GameState | null
  private targetState: GameState | null
  
  constructor(scene: THREE.Scene, playerName: string)
  
  // Rendering
  public updateState(state: GameState): void
  public update(deltaTime: number): void
  public show(): void
  public hide(): void
  public dispose(): void
  
  // Visual representation
  private createAvatarMesh(): THREE.Group
  private createCameraIndicator(): THREE.Object3D
  private createNameLabel(name: string): THREE.Sprite
  private interpolateToTarget(deltaTime: number): void
}
```

### ConnectionUI

Manages the user interface for connection management:

```typescript
class ConnectionUI {
  private container: HTMLElement
  private modal: HTMLElement | null
  private status: ConnectionStatus
  
  constructor()
  
  // UI lifecycle
  public show(): void
  public hide(): void
  public dispose(): void
  
  // Status updates
  public updateStatus(status: ConnectionStatus): void
  
  // Signal data display
  public showSignalData(data: string, type: 'offer' | 'answer'): void
  
  // User interactions
  public onCreateSession: () => void
  public onJoinSession: (connectionData: string) => void
  public onDisconnect: () => void
  
  // Notifications
  public showNotification(message: string, duration: number): void
  
  // Private methods
  private createModal(): HTMLElement
  private createHostUI(): HTMLElement
  private createGuestUI(): HTMLElement
  private createStatusIndicator(): HTMLElement
}
```

## Data Models

### Message Protocol

All messages sent over the WebRTC data channel follow this binary structure:

```typescript
// Message types
enum MessageType {
  STATE_UPDATE = 0,
  GAME_EVENT = 1,
  PING = 2,
  PONG = 3
}

// Binary message format (using DataView)
// [0]: MessageType (1 byte)
// [1-4]: Timestamp (4 bytes, uint32)
// [5+]: Payload (variable length)

// STATE_UPDATE payload (29 bytes):
// [0-3]: position.x (float32)
// [4-7]: position.y (float32)
// [8-11]: position.z (float32)
// [12-15]: rotation.x (float32)
// [16-19]: rotation.y (float32)
// [20-23]: rotation.z (float32)
// [24]: cameraMode (1 byte: 0=ride, 1=free)
// [25-28]: rideProgress (float32)

// GAME_EVENT payload:
// [0]: eventType (1 byte: 0=photo, 1=creature_interaction)
// [1+]: event-specific data (optional)

// PING/PONG payload:
// [0-7]: timestamp (8 bytes, float64)
```

### Configuration

```typescript
const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  updateRate: 10, // 10 updates per second
  interpolationDelay: 100, // 100ms interpolation buffer
  connectionTimeout: 30000 // 30 second timeout
}
```

## Error Handling

### Connection Errors

1. **Invalid Signal Data**: 
   - Validate JSON structure before parsing
   - Display user-friendly error message
   - Allow retry without resetting UI

2. **Connection Timeout**: 
   - 30-second timeout for connection establishment
   - Show timeout message with troubleshooting tips
   - Reset UI to allow new connection attempt

3. **Peer Disconnection**: 
   - Clean up peer avatar immediately
   - Show disconnection notification
   - Reset connection state

4. **ICE Connection Failure**: 
   - Display error suggesting firewall/NAT issues
   - Provide troubleshooting guidance
   - Suggest trying from different network

### Data Transmission Errors

1. **Malformed Data**: 
   - Validate message structure
   - Log error for debugging
   - Skip invalid message, continue processing

2. **Buffer Overflow**: 
   - Implement message queue with size limits (100 messages max)
   - Drop oldest messages if queue full
   - Log warning when dropping messages

3. **Deserialization Errors**: 
   - Validate data length before parsing
   - Check for valid enum values
   - Return null for invalid data

### Recovery Strategies

- No automatic reconnection (manual signaling limitation)
- Clear error messages guide users to restart connection
- State preserved locally, no data loss on disconnection
- Graceful degradation: continue single-player if connection fails

## Testing Strategy

### Unit Tests

1. **StateSync**
   - Test serialization/deserialization of game state
   - Verify binary format correctness
   - Test interpolation calculations
   - Verify update rate throttling

2. **WebRTCPeer**
   - Mock Simple Peer library
   - Test connection lifecycle
   - Verify data transmission
   - Test timeout handling

3. **PeerAvatar**
   - Test position updates
   - Verify interpolation smoothness
   - Test visibility toggling
   - Test disposal/cleanup

### Integration Tests

1. **Connection Flow**
   - Test host session creation
   - Test guest joining process
   - Verify signal data exchange
   - Test connection establishment

2. **State Synchronization**
   - Test bidirectional state updates
   - Verify interpolation smoothness
   - Test event transmission
   - Measure latency

3. **Error Scenarios**
   - Test invalid signal data handling
   - Test connection timeout
   - Test disconnection cleanup
   - Test malformed data handling

### Manual Testing

1. **Two-Browser Testing**
   - Open game in two browser windows
   - Test connection establishment
   - Verify real-time synchronization
   - Test disconnection scenarios
   - Verify avatar rendering

2. **Network Conditions**
   - Test with simulated latency (Chrome DevTools)
   - Test with packet loss
   - Verify graceful degradation
   - Test reconnection after network interruption

3. **Platform Testing**
   - Test on GitHub Pages deployment
   - Test on Vercel deployment
   - Verify STUN server connectivity
   - Test across different browsers

## Integration with Existing Systems

### Game Class Integration

```typescript
class Game {
  // ... existing properties
  private multiplayer: WebRTCMultiplayer | null = null
  
  constructor(container: HTMLElement) {
    // ... existing initialization
    
    // Initialize multiplayer
    this.multiplayer = new WebRTCMultiplayer(
      this.sceneManager.scene,
      DEFAULT_CONFIG
    )
    
    // Setup callbacks
    this.multiplayer.onConnected = () => this.onMultiplayerConnected()
    this.multiplayer.onPeerStateUpdate = (state) => this.onPeerStateUpdate(state)
    this.multiplayer.onDisconnected = () => this.onMultiplayerDisconnected()
    this.multiplayer.onGameEvent = (event) => this.onGameEvent(event)
    this.multiplayer.onError = (error) => this.onMultiplayerError(error)
  }
  
  private gameLoop = (now = performance.now()) => {
    // ... existing game loop code
    
    // Update multiplayer
    if (this.multiplayer && this.multiplayer.isConnected()) {
      const dt = (now - this.lastTime) / 1000
      this.multiplayer.update(dt)
      
      // Send current state
      const state: GameState = {
        position: this.cameraController.camera.position,
        rotation: this.cameraController.camera.rotation,
        cameraMode: this.cameraController.getMode(),
        rideProgress: this.cameraController.getRideProgress(),
        timestamp: now
      }
      this.multiplayer.sendGameState(state)
    }
    
    // ... rest of game loop
  }
  
  private onMultiplayerConnected(): void {
    console.log('Connected to peer!')
  }
  
  private onPeerStateUpdate(state: GameState): void {
    // Avatar updates handled internally by WebRTCMultiplayer
  }
  
  private onMultiplayerDisconnected(): void {
    console.log('Disconnected from peer')
  }
  
  private onGameEvent(event: GameEvent): void {
    if (event.type === 'photo') {
      // Show notification that peer took a photo
      this.uiManager.showToast('📸 Friend took a photo!')
    }
  }
  
  private onMultiplayerError(error: Error): void {
    console.error('Multiplayer error:', error)
  }
  
  // Hook into photo system
  private onPhotoTaken(): void {
    // ... existing photo logic
    
    // Send photo event to peer
    if (this.multiplayer && this.multiplayer.isConnected()) {
      this.multiplayer.sendEvent({
        type: 'photo',
        timestamp: performance.now()
      })
    }
  }
}
```

### UI Integration

The multiplayer UI will be added to the existing UI system:

- Add "Multiplayer" button to main menu
- Connection UI appears as modal overlay
- Status indicator in corner during active connection
- Photo notifications appear as toast messages

### Scene Integration

The peer avatar will be added to the existing scene:

- Avatar positioned based on received state
- Camera indicator shows peer's view direction
- Name label rendered above avatar
- Avatar uses distinct visual style (glowing outline, different color)

## Performance Considerations

### Bandwidth Optimization

- Binary protocol reduces message size (~34 bytes per state update)
- Update rate of 10 Hz balances responsiveness and bandwidth
- Only send state when values change significantly (delta compression)
- Estimated bandwidth: ~3.4 KB/s per direction

### Rendering Performance

- Peer avatar uses low-poly mesh (< 100 triangles)
- Interpolation smooths movement without increasing update rate
- Avatar culling when out of view
- Minimal impact on frame rate (< 1ms per frame)

### Memory Management

- Message queue limited to 100 messages
- Interpolation buffer limited to 1 second of data
- Old state data cleaned up after interpolation
- Proper disposal of Three.js objects on disconnection

## Deployment

### Static Hosting (GitHub Pages/Vercel)

1. Build client application
2. Deploy static files to hosting platform
3. No additional configuration needed
4. STUN servers are public and free

### Environment Variables

```bash
# Optional: Custom STUN servers
VITE_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```

### Build Configuration

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## Security Considerations

### Data Validation

- Validate all received data before processing
- Clamp position values to valid game world bounds
- Validate enum values (cameraMode, event types)
- Sanitize any text data (player names, etc.)

### Privacy

- No personal data transmitted
- Connection data (offers/answers) contain only WebRTC metadata
- No server-side logging or data collection
- True peer-to-peer privacy

### Limitations

- Manual signaling prevents automated attacks
- Two-player limit reduces abuse potential
- No authentication system (trust-based for friends)
- Connection data should be shared through secure channels (not public)

## Future Enhancements

Potential improvements for future iterations:

1. **Automated Signaling**: Implement lightweight signaling server for easier connection
2. **TURN Server**: Add TURN server support for strict firewall scenarios
3. **More Players**: Support for 3-4 players with mesh topology
4. **Voice Chat**: Add WebRTC audio channels for voice communication
5. **Text Chat**: Simple text messaging between players
6. **Shared Creature Spawns**: Synchronize creature positions and behaviors
7. **Collaborative Photos**: Take photos together with both players in frame
