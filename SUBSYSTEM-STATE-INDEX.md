# Subsystem State Management - Complete Index

## Overview

Extended state management system that manages both game flow states and subsystem states (camera, UI, creatures, multiplayer, photo system, audio) with a single source of truth.

## Quick Start

```typescript
import { IntegratedStateManager } from './src/state-integration'

const stateManager = new IntegratedStateManager()

// Update state
stateManager.updateCameraState({ mode: 'freeroam' })
stateManager.updateUIState({ photoCount: 5 })

// Read state
const camera = stateManager.getCameraState()
const ui = stateManager.getUIState()

// Listen to changes
stateManager.onSubsystemChange('camera', (event) => {
  console.log('Camera changed:', event.newState)
})
```

## Core Files

### Source Code (4 files)

1. **src/subsystem-states.ts**
   - Type definitions for all subsystem states
   - Default state factories
   - ~200 lines

2. **src/subsystem-state-manager.ts**
   - Centralized state manager
   - Change tracking and callbacks
   - Dirty tracking for sync
   - Serialization support
   - ~400 lines

3. **src/state-integration.ts**
   - Integration layer
   - Connects flow states with subsystem states
   - Unified API
   - ~300 lines

4. **src/state-sync-helpers.ts**
   - Sync utilities for game objects
   - Camera, UI, Creature, Multiplayer sync
   - Bidirectional sync support
   - ~300 lines

### Type Definitions (1 file)

5. **src/types/state-machine.d.ts**
   - Extended with subsystem state types
   - Re-exports for convenience

## Documentation (3 files)

6. **docs/subsystem-state-management.md**
   - Complete guide
   - Architecture overview
   - API reference
   - Usage examples
   - Best practices

7. **docs/subsystem-state-quick-reference.md**
   - Quick reference cheat sheet
   - Common operations
   - Code snippets

8. **docs/subsystem-state-migration.md**
   - Step-by-step migration guide
   - Before/after examples
   - Integration patterns
   - Troubleshooting

## Examples (1 file)

9. **examples/subsystem-state-usage.ts**
   - 11 comprehensive examples
   - Basic setup
   - State updates
   - Callbacks
   - Game object integration
   - Creature management
   - Multiplayer sync
   - Dirty tracking
   - Snapshots
   - Game loop integration
   - Debug info

## Summary (1 file)

10. **docs/task_summary/subsystem-state-extension.md**
    - Implementation summary
    - Features delivered
    - Benefits
    - Verification checklist

## Index (1 file)

11. **SUBSYSTEM-STATE-INDEX.md** (this file)
    - Complete file listing
    - Quick navigation

## Total Deliverables

- **Source files:** 4 (~1,200 lines)
- **Type files:** 1 (updated)
- **Documentation:** 3 (~1,000 lines)
- **Examples:** 1 (~400 lines)
- **Summary:** 1
- **Index:** 1

**Total: 11 files, ~2,600 lines**

## Key Features

### Subsystem States Managed
- ✅ Camera (mode, position, rotation, sprint, jump)
- ✅ UI (photo count, score, panels, gallery)
- ✅ Creatures (positions, behaviors, animations)
- ✅ Multiplayer (connection, peer info, latency)
- ✅ Photo System (film count, cooldown, capture)
- ✅ Audio (volume, muted, playing)

### Capabilities
- ✅ Single source of truth
- ✅ Change tracking with callbacks
- ✅ State history
- ✅ Dirty tracking for efficient sync
- ✅ Serialization/deserialization
- ✅ Snapshots and rollback
- ✅ Type-safe API
- ✅ Multiplayer ready
- ✅ Integration with flow states
- ✅ Debug utilities

## Architecture

```
IntegratedStateManager (Unified Interface)
├── GameStateManager (Flow States)
│   ├── loading
│   ├── playing
│   ├── paused
│   └── ... (10 states)
│
└── SubsystemStateManager (Subsystem States)
    ├── camera
    ├── ui
    ├── creatures
    ├── multiplayer
    ├── photoSystem
    └── audio
```

## Usage Patterns

### Basic State Management
```typescript
// Update
stateManager.updateCameraState({ mode: 'freeroam' })

// Read
const camera = stateManager.getCameraState()

// Listen
stateManager.onSubsystemChange('camera', callback)
```

### Game Object Sync
```typescript
const syncHelpers = createStateSyncHelpers(
  stateManager.getSubsystemStateManager(),
  camera,
  ui
)

syncHelpers.camera.pushToState()
syncHelpers.camera.setupAutoSync(100)
```

### Multiplayer Sync
```typescript
// Send
const packet = syncHelpers.multiplayer.createSyncPacket()
peer.send(JSON.stringify(packet))

// Receive
syncHelpers.multiplayer.applySyncPacket(receivedPacket)
```

### Dirty Tracking
```typescript
const dirty = stateManager.getDirtySubsystems()
const delta = syncHelpers.multiplayer.getStateDelta()
stateManager.markAllClean()
```

## Navigation

### For Learning
1. Start with: `docs/subsystem-state-management.md`
2. Quick reference: `docs/subsystem-state-quick-reference.md`
3. Examples: `examples/subsystem-state-usage.ts`

### For Integration
1. Migration guide: `docs/subsystem-state-migration.md`
2. Examples: `examples/subsystem-state-usage.ts`
3. API reference: `docs/subsystem-state-management.md`

### For Development
1. Types: `src/subsystem-states.ts`
2. Core: `src/subsystem-state-manager.ts`
3. Integration: `src/state-integration.ts`
4. Sync: `src/state-sync-helpers.ts`

## Console Debug Commands

```javascript
// Get state
stateManager.getDebugInfo()
stateManager.getCameraState()
stateManager.getUIState()

// Update state
stateManager.updateUIState({ photoCount: 10 })

// History
stateManager.getHistory()

// Dirty tracking
stateManager.getDirtySubsystems()
```

## Benefits

1. **Single Source of Truth** - All state centralized
2. **Type Safety** - Full TypeScript support
3. **Change Tracking** - Know what changed and when
4. **Multiplayer Ready** - Built-in sync support
5. **Testability** - Easy to mock and test
6. **Debugging** - State history and debug info
7. **Performance** - Dirty tracking for efficiency
8. **Validation** - Flow state integration prevents invalid operations

## Verification

✅ TypeScript compiles without errors
✅ All subsystem states defined
✅ Change tracking functional
✅ Callbacks working
✅ Serialization operational
✅ Dirty tracking working
✅ Integration with flow states
✅ Multiplayer sync ready
✅ Examples comprehensive
✅ Documentation complete

## Next Steps

To integrate into your game:

1. Replace `GameStateManager` with `IntegratedStateManager`
2. Setup sync helpers for camera and UI
3. Update creature system to use state sync
4. Integrate multiplayer state sync
5. Remove scattered state variables
6. Use state manager as single source of truth

See `docs/subsystem-state-migration.md` for detailed steps.

## Support

- Full documentation in `docs/` folder
- 11 examples in `examples/subsystem-state-usage.ts`
- Migration guide in `docs/subsystem-state-migration.md`
- Quick reference in `docs/subsystem-state-quick-reference.md`
