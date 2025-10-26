# Subsystem State Management - Quick Start

## 30-Second Overview

Centralized state management for all game subsystems. Single source of truth with change tracking, multiplayer sync, and type safety.

## Installation

Already installed! Files are in `src/` folder.

## Basic Usage

```typescript
import { IntegratedStateManager } from './src/state-integration'

// 1. Create manager
const stateManager = new IntegratedStateManager()

// 2. Update state
stateManager.updateCameraState({
  mode: 'freeroam',
  position: { x: 10, y: 2, z: 15 }
})

// 3. Read state
const camera = stateManager.getCameraState()
console.log(camera.position) // { x: 10, y: 2, z: 15 }

// 4. Listen to changes
stateManager.onSubsystemChange('camera', (event) => {
  console.log('Camera changed!', event.newState)
})
```

## What It Manages

- **Camera** - position, mode, rotation
- **UI** - photo count, score, panels
- **Creatures** - positions, behaviors
- **Multiplayer** - connection, peer info
- **Photo System** - film count, cooldown
- **Audio** - volume, muted state

## Common Operations

### Update State
```typescript
stateManager.updateUIState({ photoCount: 5, totalScore: 1250 })
stateManager.updateMultiplayerState({ isConnected: true })
```

### Read State
```typescript
const ui = stateManager.getUIState()
const multiplayer = stateManager.getMultiplayerState()
```

### Listen to Changes
```typescript
stateManager.onSubsystemChange('ui', (event) => {
  console.log('UI changed:', event.newState)
})
```

### Sync with Game Objects
```typescript
import { createStateSyncHelpers } from './src/state-sync-helpers'

const syncHelpers = createStateSyncHelpers(
  stateManager.getSubsystemStateManager(),
  camera,
  ui
)

// Push camera position to state
syncHelpers.camera.pushToState()

// Auto-sync every 100ms
syncHelpers.camera.setupAutoSync(100)
```

### Multiplayer Sync
```typescript
// Create packet
const packet = syncHelpers.multiplayer.createSyncPacket()

// Send to peer
peer.send(JSON.stringify(packet))

// Receive from peer
const received = JSON.parse(data)
syncHelpers.multiplayer.applySyncPacket(received)
```

## Game Loop Integration

```typescript
function gameLoop(deltaTime: number) {
  // Update state machine
  stateManager.update(deltaTime)
  
  // Check if paused
  if (stateManager.shouldPauseGameLoop()) {
    return
  }
  
  // Update game...
  camera.update(deltaTime)
  
  // Sync state
  syncHelpers.camera.pushToState()
  
  // Multiplayer sync (if connected)
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

## Benefits

✅ Single source of truth
✅ Type-safe state access
✅ Change tracking
✅ Multiplayer ready
✅ Easy debugging
✅ State history
✅ Snapshots/rollback

## Learn More

- **Full Guide:** `docs/subsystem-state-management.md`
- **Quick Reference:** `docs/subsystem-state-quick-reference.md`
- **Migration Guide:** `docs/subsystem-state-migration.md`
- **Examples:** `examples/subsystem-state-usage.ts`
- **Index:** `SUBSYSTEM-STATE-INDEX.md`

## Console Debug

```javascript
// In browser console (if exposed)
stateManager.getDebugInfo()
stateManager.getCameraState()
stateManager.getHistory()
```

## That's It!

You now have centralized state management for all game subsystems. No more scattered state!
