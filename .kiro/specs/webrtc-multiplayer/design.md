# Design Document

## Overview

This document describes two multiplayer implementation approaches:

1. **WebRTC P2P (Primary)**: Serverless peer-to-peer using Simple Peer with manual signaling - ideal for GitHub Pages/Vercel deployment with zero hosting costs
2. **Colyseus (Alternative)**: Server-based approach with automatic state synchronization - simpler implementation but requires server hosting

Both implementations share the same client-side architecture and can coexist in the codebase, allowing users to choose based on their hosting preferences. The implementations are isolated in separate folders (`src/multiplayer/webrtc/` and `src/multiplayer/colyseus/`) with a common interface.

## Architecture

### Folder Structure

```
src/multiplayer/
├── common/
│   ├── IMultiplayerProvider.ts    # Common interface
│   ├── PeerAvatar.ts               # Shared avatar rendering
│   ├── ConnectionUI.ts             # Shared UI components
│   └── types.ts                    # Shared types
├── webrtc/
│   ├── WebRTCProvider.ts           # WebRTC implementation
│   ├── WebRTCPeer.ts               # Simple Peer wrapper
│   └── StateSync.ts                # Manual state sync
└── colyseus/
    ├── ColyseusProvider.ts         # Colyseus implementation
    ├── server/                     # Server code (separate deployment)
    │   ├── index.ts
    │   └── GameRoom.ts
    └── schema/
        └── GameState.ts            # Colyseus schema
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Class                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         IMultiplayerProvider (interface)               │ │
│  │                      ▲                                  │ │
│  │         ┌────────────┴────────────┐                    │ │
│  │         │                         │                    │ │
│  │  ┌──────────────┐         ┌──────────────┐            │ │
│  │  │ WebRTCProvider│         │ColyseusProvider│          │ │
│  │  └──────────────┘         └──────────────┘            │ │
│  │         │                         │                    │ │
│  │         │                         │                    │ │
│  │  ┌──────▼──────┐           ┌─────▼──────┐             │ │
│  │  │ WebRTCPeer  │           │Colyseus    │             │ │
│  │  │ StateSync   │           │Client      │             │ │
│  │  └─────────────┘           └────────────┘             │ │
│  │                                                         │ │
│  │  Shared: PeerAvatar, ConnectionUI                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Existing Systems: SceneManager, CameraController, etc.     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Common Components:**
1. **IMultiplayerProvider**: Interface that both implementations follow
2. **PeerAvatar**: Renders other players in the 3D scene (shared)
3. **ConnectionUI**: UI for connection management (shared, with provider-specific panels)

**WebRTC Implementation:**
1. **WebRTCProvider**: Implements IMultiplayerProvider using WebRTC
2. **WebRTCPeer**: Manages WebRTC connection using Simple Peer library
3. **StateSync**: Manual serialization and synchronization of game state

**Colyseus Implementation:**
1. **ColyseusProvider**: Implements IMultiplayerProvider using Colyseus
2. **GameRoom**: Server-side room with automatic state sync
3. **GameState Schema**: Colyseus schema for automatic state synchronization

## Components and Interfaces

### Common Interface: IMultiplayerProvider

Both implementations follow this interface for seamless switching:

```typescript
interface IMultiplayerProvider {
  // Connection management
  createSession(): Promise<void>
  joinSession(connectionData: string): Promise<void>
  disconnect(): void
  
  // State synchronization
  update(deltaTime: number): void
  sendGameState(state: GameState): void
  
  // Event callbacks
  onConnected: () => void
  onDisconnected: () => void
  onPeerStateUpdate: (state: GameState) => void
  onGameEvent: (event: GameEvent) => void
  onError: (error: Error) => void
  
  // Status
  isConnected(): boolean
  getLatency(): number
}
```

### WebRTC Implementation

#### WebRTCProvider

Implements IMultiplayerProvider using WebRTC P2P:

```typescript
class WebRTCProvider implements IMultiplayerProvider {
  private webrtcPeer: WebRTCPeer
  private stateSync: StateSync
  private isHost: boolean
  
  constructor(config: WebRTCConfig)
  
  // IMultiplayerProvider implementation
  async createSession(): Promise<void>
  async joinSession(offerData: string): Promise<void>
  disconnect(): void
  update(deltaTime: number): void
  sendGameState(state: GameState): void
  
  // WebRTC-specific
  private handleSignalData(data: string): void
  private handleDataReceived(data: ArrayBuffer): void
}
```

### WebRTCPeer

Wraps the Simple Peer library and manages the WebRTC connection.

```typescript
interface WebRTCConfig {
  iceServers: RTCIceServer[]
  trickle: boolean
}

class WebRTCPeer {
  private peer: SimplePeer.Instance | null
  private config: WebRTCConfig
  
  constructor(config: WebRTCConfig)
  
  // Connection lifecycle
  public initAsHost(): void
  public initAsGuest(offerData: string): void
  public close(): void
  
  // Data transmission
  public send(data: ArrayBuffer): void
  
  // Event callbacks
  public onSignal: (signalData: string) => void
  public onConnect: () => void
  public onData: (data: ArrayBuffer) => void
  public onClose: () => void
  public onError: (error: Error) => void
}
```

### StateSync

Handles game state serialization and synchronization.

```typescript
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

class StateSync {
  private lastSentState: GameState | null
  private lastReceivedState: GameState | null
  private updateRate: number // Updates per second
  private lastUpdateTime: number
  
  constructor(updateRate: number = 10)
  
  // State management
  public shouldSendUpdate(currentTime: number): boolean
  public serializeState(state: GameState): ArrayBuffer
  public deserializeState(data: ArrayBuffer): GameState
  
  // Event management
  public serializeEvent(event: GameEvent): ArrayBuffer
  public deserializeEvent(data: ArrayBuffer): GameEvent
  
  // Interpolation for smooth movement
  public interpolateState(
    from: GameState,
    to: GameState,
    alpha: number
  ): GameState
}
```

### Colyseus Implementation

#### ColyseusProvider

Implements IMultiplayerProvider using Colyseus:

```typescript
class ColyseusProvider implements IMultiplayerProvider {
  private client: Colyseus.Client
  private room: Colyseus.Room<GameRoomState> | null
  private serverUrl: string
  
  constructor(serverUrl: string)
  
  // IMultiplayerProvider implementation
  async createSession(): Promise<void>
  async joinSession(roomId: string): Promise<void>
  disconnect(): void
  update(deltaTime: number): void
  sendGameState(state: GameState): void
  
  // Colyseus-specific
  private setupStateListeners(): void
  private handleStateChange(state: GameRoomState): void
}
```

#### GameRoom (Server-side)

Colyseus room that manages game state:

```typescript
import { Room, Client } from 'colyseus'
import { GameRoomState, Player } from './schema/GameState'

class GameRoom extends Room<GameRoomState> {
  maxClients = 2
  
  onCreate(options: any): void
  onJoin(client: Client, options: any): void
  onLeave(client: Client, consented: boolean): void
  
  onMessage(client: Client, message: any): void
  
  // Automatic state sync handled by Colyseus
}
```

#### GameRoomState Schema

Colyseus schema for automatic state synchronization:

```typescript
import { Schema, type, MapSchema } from '@colyseus/schema'

class Player extends Schema {
  @type('number') x: number
  @type('number') y: number
  @type('number') z: number
  @type('number') rotX: number
  @type('number') rotY: number
  @type('number') rotZ: number
  @type('string') cameraMode: string
  @type('number') rideProgress: number
  @type('number') timestamp: number
}

class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>()
}
```

### Common Components

#### ConnectionUI

Manages the user interface for connection management (adapts to provider):

```typescript
interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error'
  message?: string
  latency?: number
}

class ConnectionUI {
  private container: HTMLElement
  private status: ConnectionStatus
  private providerType: 'webrtc' | 'colyseus'
  
  constructor(providerType: 'webrtc' | 'colyseus')
  
  // UI lifecycle
  public show(): void
  public hide(): void
  
  // Status updates
  public updateStatus(status: ConnectionStatus): void
  
  // Provider-specific UI
  public showWebRTCSignalData(data: string, type: 'offer' | 'answer'): void
  public showColyseusRoomId(roomId: string): void
  
  // User interactions
  public onCreateSession: () => void
  public onJoinSession: (connectionData: string) => void
  public onDisconnect: () => void
  
  // Notifications
  public showNotification(message: string, duration: number): void
}
```

### PeerAvatar

Renders the other player in the 3D scene.

```typescript
class PeerAvatar {
  private group: THREE.Group
  private camera: THREE.Object3D
  private nameLabel: THREE.Sprite
  private scene: THREE.Scene
  
  constructor(scene: THREE.Scene, playerName: string)
  
  // Rendering
  public update(state: GameState, deltaTime: number): void
  public show(): void
  public hide(): void
  public dispose(): void
  
  // Visual representation
  private createAvatarMesh(): THREE.Group
  private createCameraIndicator(): THREE.Object3D
  private createNameLabel(name: string): THREE.Sprite
}
```

## Data Models

### Message Protocol

All messages sent over the WebRTC data channel follow this structure:

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

// STATE_UPDATE payload:
// [0-3]: position.x (float32)
// [4-7]: position.y (float32)
// [8-11]: position.z (float32)
// [12-15]: rotation.x (float32)
// [16-19]: rotation.y (float32)
// [20-23]: rotation.z (float32)
// [24]: cameraMode (1 byte: 0=ride, 1=free)
// [25-28]: rideProgress (float32)

// GAME_EVENT payload:
// [0]: eventType (1 byte)
// [1+]: event-specific data
```

### Configuration

```typescript
interface MultiplayerConfig {
  updateRate: number // State updates per second (default: 10)
  interpolationDelay: number // Milliseconds (default: 100)
  maxLatency: number // Maximum acceptable latency in ms (default: 500)
  connectionTimeout: number // Connection timeout in ms (default: 30000)
  iceServers: RTCIceServer[]
}

const DEFAULT_CONFIG: MultiplayerConfig = {
  updateRate: 10,
  interpolationDelay: 100,
  maxLatency: 500,
  connectionTimeout: 30000,
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

## Error Handling

### Connection Errors

1. **Invalid Signal Data**: Display user-friendly error message, allow retry
2. **Connection Timeout**: Show timeout message after 30 seconds, reset UI
3. **Peer Disconnection**: Clean up peer avatar, show disconnection notification
4. **ICE Connection Failure**: Display error suggesting firewall/NAT issues

### Data Transmission Errors

1. **Malformed Data**: Log error, skip invalid message, continue processing
2. **Buffer Overflow**: Implement message queue with size limits
3. **Deserialization Errors**: Validate data structure before processing

### Recovery Strategies

- Automatic reconnection is not implemented (manual signaling limitation)
- Clear error messages guide users to restart connection process
- State is preserved locally, no data loss on disconnection

## Testing Strategy

### Unit Tests

1. **StateSync**
   - Test serialization/deserialization of game state
   - Verify interpolation calculations
   - Test update rate throttling

2. **WebRTCPeer**
   - Mock Simple Peer library
   - Test connection lifecycle
   - Verify data transmission

3. **PeerAvatar**
   - Test position updates
   - Verify visibility toggling
   - Test disposal/cleanup

### Integration Tests

1. **Connection Flow**
   - Test host session creation
   - Test guest joining process
   - Verify signal data exchange

2. **State Synchronization**
   - Test bidirectional state updates
   - Verify interpolation smoothness
   - Test event transmission

3. **Error Scenarios**
   - Test invalid signal data handling
   - Test connection timeout
   - Test disconnection cleanup

### Manual Testing

1. **Two-Browser Testing**
   - Open game in two browser windows
   - Test connection establishment
   - Verify real-time synchronization
   - Test disconnection scenarios

2. **Network Conditions**
   - Test with simulated latency
   - Test with packet loss
   - Verify graceful degradation

3. **Platform Testing**
   - Test on GitHub Pages deployment
   - Test on Vercel deployment
   - Verify STUN server connectivity

## Implementation Comparison

### WebRTC P2P Approach

**Pros:**
- Zero hosting costs (works on GitHub Pages/Vercel)
- True peer-to-peer, no server latency
- No server maintenance required
- Privacy-focused (no data goes through server)

**Cons:**
- Manual signaling (copy-paste connection data)
- More complex implementation
- Manual state synchronization required
- Limited to 2 players practically
- May fail with strict firewalls (no TURN server)

**Best For:**
- Personal projects
- Static hosting deployments
- Privacy-conscious applications
- Two-player sessions

### Colyseus Approach

**Pros:**
- Automatic state synchronization
- Simpler client code
- Built-in reconnection handling
- Easier to scale to more players
- Better for complex game state

**Cons:**
- Requires server hosting ($5-10/month minimum)
- Server maintenance needed
- Additional deployment complexity
- Data goes through server

**Best For:**
- Production applications
- More than 2 players
- Complex game state
- Professional deployments

## Integration with Existing Systems

### Game Class Integration

The multiplayer provider will be instantiated in the Game class constructor:

```typescript
class Game {
  // ... existing properties
  private multiplayerProvider: IMultiplayerProvider | null = null
  private peerAvatar: PeerAvatar | null = null
  
  constructor(container: HTMLElement) {
    // ... existing initialization
    
    // Initialize multiplayer (choose implementation)
    const useColyseus = import.meta.env.VITE_USE_COLYSEUS === 'true'
    
    if (useColyseus) {
      const serverUrl = import.meta.env.VITE_COLYSEUS_SERVER || 'ws://localhost:2567'
      this.multiplayerProvider = new ColyseusProvider(serverUrl)
    } else {
      this.multiplayerProvider = new WebRTCProvider(DEFAULT_WEBRTC_CONFIG)
    }
    
    // Setup callbacks
    this.multiplayerProvider.onConnected = () => this.onMultiplayerConnected()
    this.multiplayerProvider.onPeerStateUpdate = (state) => this.onPeerStateUpdate(state)
    this.multiplayerProvider.onDisconnected = () => this.onMultiplayerDisconnected()
  }
  
  private gameLoop = (now = performance.now()) => {
    // ... existing game loop code
    
    // Update multiplayer
    if (this.multiplayerProvider && this.multiplayerProvider.isConnected()) {
      this.multiplayerProvider.update(dt)
      
      // Send current state
      const state: GameState = {
        position: this.cameraController.camera.position,
        rotation: this.cameraController.camera.rotation,
        cameraMode: this.cameraController.getMode(),
        rideProgress: this.cameraController.getRideProgress(),
        timestamp: now
      }
      this.multiplayerProvider.sendGameState(state)
    }
    
    // Update peer avatar
    if (this.peerAvatar) {
      this.peerAvatar.update(dt)
    }
    
    // ... rest of game loop
  }
  
  private onMultiplayerConnected(): void {
    this.peerAvatar = new PeerAvatar(this.sceneManager.scene, 'Friend')
    this.uiManager.showToast('🌐 Connected to peer!')
  }
  
  private onPeerStateUpdate(state: GameState): void {
    if (this.peerAvatar) {
      this.peerAvatar.update(state, 0)
    }
  }
  
  private onMultiplayerDisconnected(): void {
    if (this.peerAvatar) {
      this.peerAvatar.dispose()
      this.peerAvatar = null
    }
    this.uiManager.showToast('🌐 Disconnected from peer')
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
- Avatar uses distinct visual style (different color/glow)

## Performance Considerations

### Bandwidth Optimization

- Binary protocol reduces message size (~40 bytes per state update)
- Update rate of 10 Hz balances responsiveness and bandwidth
- Only send state when values change significantly (delta compression)

### Rendering Performance

- Peer avatar uses low-poly mesh (< 100 triangles)
- Interpolation smooths movement without increasing update rate
- Avatar culling when out of view

### Memory Management

- Message queue limited to 100 messages
- Old state data cleaned up after interpolation
- Proper disposal of Three.js objects on disconnection

## Deployment

### WebRTC Deployment

**Client (GitHub Pages/Vercel):**
1. Build client with WebRTC provider enabled
2. Deploy static files to GitHub Pages or Vercel
3. No additional configuration needed

**Environment Variables:**
```bash
VITE_USE_COLYSEUS=false  # Use WebRTC
```

### Colyseus Deployment

**Client (GitHub Pages/Vercel):**
1. Build client with Colyseus provider enabled
2. Configure server URL in environment variables
3. Deploy static files

**Server (Railway/Heroku/DigitalOcean):**
1. Deploy Colyseus server separately
2. Configure CORS to allow client origin
3. Set up SSL for wss:// connections

**Environment Variables:**
```bash
# Client
VITE_USE_COLYSEUS=true
VITE_COLYSEUS_SERVER=wss://your-server.com

# Server
PORT=2567
NODE_ENV=production
```

**Example Server Deployment (Railway):**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:server",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## Security Considerations

### Data Validation

- Validate all received data before processing
- Clamp position values to valid game world bounds
- Sanitize any text data (player names, etc.)

### Privacy

**WebRTC:**
- No personal data transmitted
- Connection data (offers/answers) contain only WebRTC metadata
- No server-side logging or data collection
- True peer-to-peer privacy

**Colyseus:**
- Data passes through server (use SSL/TLS)
- Server can log connections (configure appropriately)
- Implement rate limiting on server

### Limitations

**WebRTC:**
- Manual signaling prevents automated attacks
- Two-player limit reduces abuse potential
- No authentication system (trust-based for friends)

**Colyseus:**
- Implement room password/authentication if needed
- Rate limit room creation
- Monitor server resources
