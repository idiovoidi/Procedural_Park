# Subsystem State Management - Quick Reference

## Setup

```typescript
import { IntegratedStateManager } from './state-integration'

const stateManager = new IntegratedStateManager()
```

## Flow States

```typescript
// Transition
stateManager.setFlowState('playing')

// Check
stateManager.getFlowState()
stateManager.isInFlowState('playing')
stateManager.shouldPauseGameLoop()
```

## Update Subsystem State

```typescript
// Camera
stateManager.updateCameraState({
  mode: 'freeroam',
  position: { x: 10, y: 2, z: 15 },
  isSprinting: true
})

// UI
stateManager.updateUIState({
  photoCount: 5,
  totalScore: 1250
})

// Creatures
stateManager.updateCreaturesState({
  activeCount: 10
})

// Multiplayer
stateManager.updateMultiplayerState({
  isConnected: true,
  latency: 45
})

// Photo System
stateManager.updatePhotoSystemState({
  filmRemaining: 30
})

// Audio
stateManager.updateAudioSystemState({
  masterVolume: 0.8
})
```

## Read Subsystem State

```typescript
const camera = stateManager.getCameraState()
const ui = stateManager.getUIState()
const creatures = stateManager.getCreaturesState()
const multiplayer = stateManager.getMultiplayerState()
const photo = stateManager.getPhotoSystemState()
const audio = stateManager.getAudioSystemState()
```

## Callbacks

```typescript
// Flow state changes
stateManager.onFlowStateChange((newState, prevState) => {
  console.log(`${prevState} -> ${newState}`)
})

// Specific subsystem
stateManager.onSubsystemChange('camera', (event) => {
  console.log('Camera changed:', event.newState)
})

// All subsystems
stateManager.onAnySubsystemChange((event) => {
  console.log(`${event.subsystem} changed`)
})
```

## Sync with Game Objects

```typescript
import { createStateSyncHelpers } from './state-sync-helpers'

const syncHelpers = createStateSyncHelpers(
  stateManager.getSubsystemStateManager(),
  camera,
  ui
)

// Push to state
syncHelpers.camera.pushToState()
syncHelpers.ui.pushToState()

// Auto sync
const stop = syncHelpers.camera.setupAutoSync(100)
```

## Creature Management

```typescript
// Add
syncHelpers.creatures.pushCreature('id', mesh, {
  name: 'Deer',
  behaviorState: 'walking',
  rarity: 2
})

// Update
syncHelpers.creatures.updateCreatureBehavior('id', 'eating')

// Remove
syncHelpers.creatures.removeCreature('id')

// Clear all
syncHelpers.creatures.clearAllCreatures()
```

## Multiplayer Sync

```typescript
// Create packet
const packet = syncHelpers.multiplayer.createSyncPacket()

// Send
peer.send(JSON.stringify(packet))

// Receive
const received = JSON.parse(data)
syncHelpers.multiplayer.applySyncPacket(received)
```

## Dirty Tracking

```typescript
// Check dirty
const dirty = stateManager.getDirtySubsystems()

// Get delta
const delta = syncHelpers.multiplayer.getStateDelta()

// Mark clean
stateManager.markAllClean()
```

## Snapshots

```typescript
// Create
const snapshot = stateManager.createSnapshot()

// Restore
stateManager.restoreSnapshot(snapshot)
```

## Game Loop Integration

```typescript
function gameLoop(deltaTime: number) {
  stateManager.update(deltaTime)
  
  if (stateManager.shouldPauseGameLoop()) {
    return
  }
  
  // Update game...
  
  // Sync state
  syncHelpers.camera.pushToState()
  
  // Multiplayer sync
  if (stateManager.getMultiplayerState().isConnected) {
    const dirty = stateManager.getDirtySubsystems()
    if (dirty.length > 0) {
      const delta = syncHelpers.multiplayer.getStateDelta()
      sendToPeer(delta)
      stateManager.markAllClean()
    }
  }
}
```

## Debug

```typescript
// Debug info
console.log(stateManager.getDebugInfo())

// History
console.log(stateManager.getHistory())

// Reset
stateManager.reset()
stateManager.resetSubsystem('camera')
```
