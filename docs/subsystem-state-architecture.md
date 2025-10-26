# Subsystem State Management - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     IntegratedStateManager                      │
│                    (Unified Public Interface)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌──────────────────┐                    ┌──────────────────────┐
│ GameStateManager │                    │ SubsystemStateManager│
│  (Flow States)   │                    │  (Subsystem States)  │
└──────────────────┘                    └──────────────────────┘
        │                                           │
        │                                           │
        ▼                                           ▼
┌──────────────────┐                    ┌──────────────────────┐
│ • loading        │                    │ • camera             │
│ • menu           │                    │ • ui                 │
│ • playing        │                    │ • creatures          │
│ • paused         │                    │ • multiplayer        │
│ • photo_mode     │                    │ • photoSystem        │
│ • gallery        │                    │ • audio              │
│ • settings       │                    └──────────────────────┘
│ • multiplayer_*  │
│ • game_over      │
└──────────────────┘
```

## Data Flow

### State Update Flow

```
User Action
    │
    ▼
Game Code calls:
stateManager.updateCameraState({ mode: 'freeroam' })
    │
    ▼
SubsystemStateManager
    ├─ Validates change
    ├─ Updates internal state
    ├─ Marks subsystem as dirty
    ├─ Records in history
    └─ Triggers callbacks
        │
        ▼
    Callbacks Execute
        ├─ Subsystem-specific callbacks
        └─ Global callbacks
            │
            ▼
        Game Systems React
            ├─ UI updates
            ├─ Audio adjusts
            └─ Multiplayer syncs
```

### Flow State Integration

```
Flow State Change
    │
    ▼
stateManager.setFlowState('paused')
    │
    ▼
GameStateManager
    ├─ Validates transition
    ├─ Updates flow state
    └─ Triggers flow callbacks
        │
        ▼
    IntegratedStateManager
        ├─ Detects flow change
        └─ Updates subsystem states
            │
            ▼
        Subsystem Updates
            ├─ Audio: isPlaying = false
            ├─ Camera: isPaused = true
            └─ PhotoSystem: blocked
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                         Game Class                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           IntegratedStateManager                      │ │
│  │                                                       │ │
│  │  ┌─────────────────┐    ┌──────────────────────┐    │ │
│  │  │ Flow States     │    │ Subsystem States     │    │ │
│  │  │ - loading       │◄───┤ - camera             │    │ │
│  │  │ - playing       │    │ - ui                 │    │ │
│  │  │ - paused        │───►│ - creatures          │    │ │
│  │  └─────────────────┘    │ - multiplayer        │    │ │
│  │                         │ - photoSystem        │    │ │
│  │                         │ - audio              │    │ │
│  │                         └──────────────────────┘    │ │
│  └───────────────────────────────────────────────────────┘ │
│                              │                              │
│                              │                              │
│  ┌───────────────────────────┴───────────────────────────┐ │
│  │              State Sync Helpers                       │ │
│  │                                                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │ Camera   │  │ UI       │  │ Creature │          │ │
│  │  │ Sync     │  │ Sync     │  │ Sync     │          │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │ │
│  │       │             │             │                 │ │
│  └───────┼─────────────┼─────────────┼─────────────────┘ │
│          │             │             │                   │
└──────────┼─────────────┼─────────────┼───────────────────┘
           │             │             │
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Camera   │  │ UI       │  │ Creature │
    │ Object   │  │ Manager  │  │ Meshes   │
    └──────────┘  └──────────┘  └──────────┘
```

## State Synchronization

### Local Sync (Game Objects ↔ State)

```
┌──────────────┐                    ┌──────────────────┐
│ Camera       │                    │ Camera State     │
│ Object       │                    │                  │
│              │  pushToState()     │ position: {...}  │
│ position: {} │───────────────────►│ rotation: {...}  │
│ rotation: {} │                    │ mode: 'freeroam' │
│              │  pullFromState()   │                  │
│              │◄───────────────────│                  │
└──────────────┘                    └──────────────────┘
```

### Multiplayer Sync (Peer ↔ Peer)

```
┌──────────────┐                    ┌──────────────┐
│   Local      │                    │   Remote     │
│   State      │                    │   State      │
│              │                    │              │
│ camera: {...}│  createSyncPacket()│              │
│ ui: {...}    │────────┐           │              │
│              │        │           │              │
└──────────────┘        │           └──────────────┘
                        │
                        ▼
                ┌───────────────┐
                │ Sync Packet   │
                │ (JSON)        │
                │ - camera pos  │
                │ - ui state    │
                │ - timestamp   │
                └───────┬───────┘
                        │
                        │ Network
                        │
                        ▼
┌──────────────┐        │           ┌──────────────┐
│   Local      │        │           │   Remote     │
│   State      │        │           │   State      │
│              │        │           │              │
│              │        └──────────►│ camera: {...}│
│              │  applySyncPacket() │ ui: {...}    │
│              │                    │              │
└──────────────┘                    └──────────────┘
```

## Change Tracking

```
State Update
    │
    ▼
┌─────────────────────────────────┐
│ SubsystemStateManager           │
│                                 │
│ state: {                        │
│   camera: {...},                │
│   ui: {...}                     │
│ }                               │
│                                 │
│ isDirty: Set(['camera', 'ui'])  │◄─── Tracks changes
│                                 │
│ history: [                      │◄─── Records history
│   { subsystem: 'camera', ... }, │
│   { subsystem: 'ui', ... }      │
│ ]                               │
└─────────────────────────────────┘
    │
    │ getDirtySubsystems()
    ▼
['camera', 'ui']
    │
    │ getStateDelta()
    ▼
{ camera: {...}, ui: {...} }  ◄─── Only changed data
    │
    │ Send to peer
    ▼
Network
    │
    │ markAllClean()
    ▼
isDirty: Set([])  ◄─── Clear after sync
```

## Callback System

```
State Change
    │
    ▼
┌─────────────────────────────────────────┐
│ SubsystemStateManager                   │
│                                         │
│ changeCallbacks: Map {                  │
│   'camera' => Set([callback1, ...]),    │
│   'ui' => Set([callback2, ...])         │
│ }                                       │
│                                         │
│ globalCallbacks: Set([callback3, ...])  │
└─────────────────────────────────────────┘
    │
    │ Notify all callbacks
    ▼
┌─────────────────────────────────────────┐
│ Callbacks Execute                       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Subsystem-Specific Callbacks        │ │
│ │ - Update UI elements                │ │
│ │ - Adjust audio                      │ │
│ │ - Sync to multiplayer               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Global Callbacks                    │ │
│ │ - Log changes                       │ │
│ │ - Update debug UI                   │ │
│ │ - Analytics                         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Validation Flow

```
User Action: Take Photo
    │
    ▼
Game Code:
stateManager.updatePhotoSystemState({ isCapturing: true })
    │
    ▼
IntegratedStateManager
    │
    ├─ Check flow state
    │  └─ isPhotoAllowed()?
    │      ├─ playing: ✓ allowed
    │      ├─ paused: ✗ blocked
    │      └─ menu: ✗ blocked
    │
    ▼
If allowed:
    └─ SubsystemStateManager
        └─ Update photoSystem state
            └─ Trigger callbacks
                └─ Capture photo

If blocked:
    └─ Log warning
    └─ Revert state
    └─ No photo captured
```

## Memory Layout

```
IntegratedStateManager
├─ flowStateManager: GameStateManager
│  ├─ stateMachine: GameStateMachine
│  │  ├─ currentState: 'playing'
│  │  ├─ previousState: 'loading'
│  │  └─ transitionHistory: [...]
│  └─ stateConfigs: Map<GameStateType, Config>
│
└─ subsystemStateManager: SubsystemStateManager
   ├─ state: GameSubsystemState
   │  ├─ camera: CameraState
   │  ├─ ui: UIState
   │  ├─ creatures: CreaturesState
   │  ├─ multiplayer: MultiplayerState
   │  ├─ photoSystem: PhotoSystemState
   │  └─ audio: AudioSystemState
   │
   ├─ changeCallbacks: Map<SubsystemKey, Set<Callback>>
   ├─ globalCallbacks: Set<Callback>
   ├─ stateHistory: StateChangeEvent[]
   └─ isDirty: Set<SubsystemKey>
```

## Performance Considerations

### Efficient Updates

```
Frame 1:
  camera.update()
  syncHelpers.camera.pushToState()  ◄─── Marks 'camera' dirty

Frame 2:
  camera.update()
  syncHelpers.camera.pushToState()  ◄─── Marks 'camera' dirty

Frame 3:
  camera.update()
  syncHelpers.camera.pushToState()  ◄─── Marks 'camera' dirty

Frame 6 (100ms):
  if (getDirtySubsystems().length > 0) {
    delta = getStateDelta()         ◄─── Only 'camera' data
    sendToPeer(delta)                ◄─── Send once, not every frame
    markAllClean()                   ◄─── Clear dirty flags
  }
```

### Memory Efficiency

```
Full State Sync (Inefficient):
  Size: ~10KB per sync
  Frequency: 60 times/second
  Bandwidth: 600KB/s

Delta Sync (Efficient):
  Size: ~1KB per sync (only changes)
  Frequency: 10 times/second
  Bandwidth: 10KB/s

Savings: 98% reduction
```

## Type Safety

```typescript
// Compile-time type checking

// ✓ Valid
stateManager.updateCameraState({
  mode: 'freeroam', // Valid CameraMode
  position: { x: 1, y: 2, z: 3 }, // Valid position
})

// ✗ Compile error
stateManager.updateCameraState({
  mode: 'invalid', // Error: not a valid CameraMode
  position: { x: 1 }, // Error: missing y and z
})

// ✓ Autocomplete works
const camera = stateManager.getCameraState()
camera.position.camera.mode // IDE shows: x, y, z // IDE shows: 'ride' | 'freeroam'
```

## Summary

The architecture provides:

1. **Separation of Concerns** - Flow states vs subsystem states
2. **Single Source of Truth** - All state in one place
3. **Change Tracking** - Know what changed and when
4. **Efficient Sync** - Only send changes
5. **Type Safety** - Compile-time validation
6. **Flexibility** - Easy to extend with new subsystems
7. **Debugging** - History and debug info
8. **Performance** - Dirty tracking and batching
