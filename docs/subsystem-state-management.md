# Subsystem State Management

## Overview

The extended state management system provides a **single source of truth** for all game state, managing both game flow states (loading, playing, paused, etc.) and subsystem states (camera, UI, creatures, multiplayer, etc.).

## Architecture

```
┌─────────────────────────────────────────┐
│     IntegratedStateManager              │
│  (Unified Interface)                    │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  GameStateManager                │  │
│  │  (Flow States)                   │  │
│  │  - loading, playing, paused...   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  SubsystemStateManager           │  │
│  │  (Subsystem States)              │  │
│  │  - camera, ui, creatures...      │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Key Components

### 1. **IntegratedStateManager**
- Main entry point for all state management
- Coordinates flow states and subsystem states
- Provides unified API

### 2. **SubsystemStateManager**
- Manages individual subsystem states
- Tracks state changes
- Provides dirty tracking for efficient sync

### 3. **State Sync Helpers**
- Synchronize game objects with state
- Handle bidirectional sync
- Support multiplayer state transmission

## Subsystem States

### Camera State
```typescript
{
  mode: 'ride' | 'freeroam',
  position: { x, y, z },
  rotation: { yaw, pitch },
  rideT: number,
  isPaused: boolean,
  isSprinting: boolean,
  isJumping: boolean
}
```

### UI State
```typescript
{
  photoCount: number,
  totalScore: number,
  lastScore: number,
  isGalleryOpen: boolean,
  isSettingsOpen: boolean,
  showCreatureInfo: boolean,
  capturedPhotos: CapturedPhoto[]
}
```

### Creatures State
```typescript
{
  creatures: Map<string, CreatureState>,
  activeCount: number,
  lastUpdateTime: number
}
```

### Multiplayer State
```typescript
{
  isConnected: boolean,
  isHost: boolean,
  peerId: string | null,
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error',
  latency: number,
  peerPosition: { x, y, z } | null,
  peerRotation: { yaw, pitch } | null,
  lastSyncTime: number
}
```

### Photo System State
```typescript
{
  isCapturing: boolean,
  filmRemaining: number,
  maxFilm: number,
  cooldownRemaining: number,
  lastCaptureTime: number
}
```

### Audio System State
```typescript
{
  isMuted: boolean,
  masterVolume: number,
  ambientVolume: number,
  sfxVolume: number,
  isPlaying: boolean
}
```

## Usage

### Basic Setup

```typescript
import { IntegratedStateManager } from './state-integration'

// Create state manager
const stateManager = new IntegratedStateManager()

// Transition flow state
stateManager.setFlowState('playing')

// Update subsystem state
stateManager.updateCameraState({
  mode: 'freeroam',
  position: { x: 10, y: 2, z: 15 }
})
```

### State Change Callbacks

```typescript
// Listen to flow state changes
stateManager.onFlowStateChange((newState, prevState) => {
  console.log(`State: ${prevState} -> ${newState}`)
})

// Listen to specific subsystem changes
stateManager.onSubsystemChange('camera', (event) => {
  console.log('Camera changed:', event.newState)
})

// Listen to all subsystem changes
stateManager.onAnySubsystemChange((event) => {
  console.log(`${event.subsystem} changed`)
})
```

### Syncing with Game Objects

```typescript
import { createStateSyncHelpers } from './state-sync-helpers'

// Create sync helpers
const syncHelpers = createStateSyncHelpers(
  stateManager.getSubsystemStateManager(),
  camera,
  ui
)

// Push camera state to state manager
syncHelpers.camera.pushToState()

// Setup automatic sync
const stopSync = syncHelpers.camera.setupAutoSync(100) // every 100ms
```

### Creature Management

```typescript
// Add creature
syncHelpers.creatures.pushCreature('creature-1', mesh, {
  name: 'Spotted Deer',
  behaviorState: 'walking',
  rarity: 2
})

// Update creature behavior
syncHelpers.creatures.updateCreatureBehavior('creature-1', 'eating')

// Remove creature
syncHelpers.creatures.removeCreature('creature-1')
```

### Multiplayer Synchronization

```typescript
// Create lightweight sync packet
const packet = syncHelpers.multiplayer.createSyncPacket()

// Send to peer (serialize)
const json = JSON.stringify(packet)
peer.send(json)

// Receive from peer (deserialize)
const receivedPacket = JSON.parse(data)
syncHelpers.multiplayer.applySyncPacket(receivedPacket)
```

### Dirty Tracking

```typescript
// Check what changed
const dirtySubsystems = stateManager.getDirtySubsystems()

// Get only changed state
const delta = syncHelpers.multiplayer.getStateDelta()

// Send delta to peers...

// Mark as synced
stateManager.markAllClean()
```

### Snapshots and Rollback

```typescript
// Create snapshot
const snapshot = stateManager.createSnapshot()

// Make changes...
stateManager.updateUIState({ photoCount: 10 })

// Rollback
stateManager.restoreSnapshot(snapshot)
```

## Integration with Game Loop

```typescript
function gameLoop(deltaTime: number) {
  // Update state machine
  stateManager.update(deltaTime)
  
  // Check if game should run
  if (stateManager.shouldPauseGameLoop()) {
    return
  }
  
  // Update game systems...
  
  // Sync state from game objects
  syncHelpers.camera.pushToState()
  syncHelpers.ui.pushToState()
  
  // Multiplayer sync (if connected)
  if (stateManager.getMultiplayerState().isConnected) {
    const dirtySubsystems = stateManager.getDirtySubsystems()
    if (dirtySubsystems.length > 0) {
      const delta = syncHelpers.multiplayer.getStateDelta()
      sendToPeer(delta)
      stateManager.markAllClean()
    }
  }
}
```

## Benefits

### 1. **Single Source of Truth**
- All state in one place
- No scattered state across objects
- Easy to inspect and debug

### 2. **Change Tracking**
- Know exactly what changed
- Efficient multiplayer sync
- State history for debugging

### 3. **Type Safety**
- Full TypeScript support
- Compile-time validation
- Autocomplete in IDE

### 4. **Multiplayer Ready**
- Built-in serialization
- Dirty tracking for efficiency
- Delta updates

### 5. **Testability**
- State can be mocked
- Snapshots for testing
- Deterministic behavior

### 6. **Debugging**
- State history
- Change events
- Debug info API

## Migration Guide

### Before (Scattered State)
```typescript
class Game {
  private photoCount = 0
  private totalScore = 0
  // State scattered everywhere
}

class Camera {
  private mode = 'ride'
  private position = new Vector3()
  // More scattered state
}
```

### After (Centralized State)
```typescript
// Single state manager
const stateManager = new IntegratedStateManager()

// Update state
stateManager.updateUIState({ photoCount: 1 })
stateManager.updateCameraState({ mode: 'freeroam' })

// Read state
const ui = stateManager.getUIState()
const camera = stateManager.getCameraState()
```

## Best Practices

1. **Always use state manager** - Don't maintain parallel state
2. **Sync regularly** - Push game object state to state manager
3. **Use callbacks** - React to state changes, don't poll
4. **Batch updates** - Use `batchUpdate()` for multiple changes
5. **Clean dirty flags** - Mark as clean after syncing to peers
6. **Use snapshots** - For save/load and rollback features

## API Reference

See `examples/subsystem-state-usage.ts` for comprehensive examples.

### IntegratedStateManager

#### Flow State Methods
- `getFlowState()` - Get current flow state
- `setFlowState(state)` - Transition to new flow state
- `isInFlowState(state)` - Check if in specific state
- `shouldPauseGameLoop()` - Check if game loop should pause

#### Subsystem State Methods
- `getCameraState()` - Get camera state
- `getUIState()` - Get UI state
- `getCreaturesState()` - Get creatures state
- `getMultiplayerState()` - Get multiplayer state
- `getPhotoSystemState()` - Get photo system state
- `getAudioSystemState()` - Get audio system state

#### Update Methods
- `updateCameraState(updates)` - Update camera state
- `updateUIState(updates)` - Update UI state
- `updateCreaturesState(updates)` - Update creatures state
- `updateMultiplayerState(updates)` - Update multiplayer state
- `updatePhotoSystemState(updates)` - Update photo system state
- `updateAudioSystemState(updates)` - Update audio system state

#### Callback Methods
- `onFlowStateChange(callback)` - Listen to flow state changes
- `onSubsystemChange(subsystem, callback)` - Listen to subsystem changes
- `onAnySubsystemChange(callback)` - Listen to all changes

#### Utility Methods
- `update(deltaTime)` - Update state machine
- `reset()` - Reset all state
- `resetSubsystem(subsystem)` - Reset specific subsystem
- `serialize()` - Serialize state to JSON
- `deserialize(json)` - Deserialize state from JSON
- `createSnapshot()` - Create state snapshot
- `restoreSnapshot(snapshot)` - Restore from snapshot
- `getDirtySubsystems()` - Get changed subsystems
- `markClean(subsystem)` - Mark subsystem as synced
- `markAllClean()` - Mark all as synced
- `getDebugInfo()` - Get debug information
- `getHistory()` - Get state change history
