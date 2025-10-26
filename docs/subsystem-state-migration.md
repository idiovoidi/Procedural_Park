# Subsystem State Management - Migration Guide

## Overview

This guide shows how to migrate from scattered state to centralized subsystem state management.

## Step 1: Replace State Manager in Game Class

### Before
```typescript
import { GameStateManager } from './game-state-manager'

class Game {
  private stateManager: GameStateManager
  
  constructor() {
    this.stateManager = new GameStateManager()
  }
}
```

### After
```typescript
import { IntegratedStateManager } from './state-integration'
import { createStateSyncHelpers } from './state-sync-helpers'

class Game {
  private stateManager: IntegratedStateManager
  private syncHelpers: ReturnType<typeof createStateSyncHelpers>
  
  constructor() {
    this.stateManager = new IntegratedStateManager()
  }
  
  private initializeSyncHelpers() {
    this.syncHelpers = createStateSyncHelpers(
      this.stateManager.getSubsystemStateManager(),
      this.camera,
      this.ui
    )
  }
}
```

## Step 2: Remove Scattered State Variables

### Before
```typescript
class Game {
  private photoCount = 0
  private totalScore = 0
  private isMultiplayerConnected = false
  // etc...
}
```

### After
```typescript
class Game {
  // Remove these variables - use state manager instead
  
  getPhotoCount() {
    return this.stateManager.getUIState().photoCount
  }
  
  getTotalScore() {
    return this.stateManager.getUIState().totalScore
  }
  
  isMultiplayerConnected() {
    return this.stateManager.getMultiplayerState().isConnected
  }
}
```

## Step 3: Update State Changes

### Before
```typescript
class Game {
  private capturePhoto() {
    this.photoCount++
    this.totalScore += score
    this.ui.updateStats(this.photoCount, this.totalScore)
  }
}
```

### After
```typescript
class Game {
  private capturePhoto() {
    const ui = this.stateManager.getUIState()
    this.stateManager.updateUIState({
      photoCount: ui.photoCount + 1,
      totalScore: ui.totalScore + score
    })
    // UI will update automatically via callback
  }
}
```

## Step 4: Setup State Change Callbacks

### In Game Constructor
```typescript
constructor() {
  this.stateManager = new IntegratedStateManager()
  this.setupStateCallbacks()
}

private setupStateCallbacks() {
  // Update UI when UI state changes
  this.stateManager.onSubsystemChange('ui', (event) => {
    const state = event.newState
    // Update UI elements
    this.ui.updatePhotoCount(state.photoCount)
    this.ui.updateScore(state.totalScore)
  })
  
  // Update audio when audio state changes
  this.stateManager.onSubsystemChange('audio', (event) => {
    const state = event.newState
    if (state.isMuted) {
      this.audio.mute()
    } else {
      this.audio.unmute()
      this.audio.setVolume(state.masterVolume)
    }
  })
  
  // Handle multiplayer state changes
  this.stateManager.onSubsystemChange('multiplayer', (event) => {
    const state = event.newState
    if (state.isConnected) {
      this.onMultiplayerConnected()
    } else {
      this.onMultiplayerDisconnected()
    }
  })
}
```

## Step 5: Integrate Camera Sync

### In Game Update Loop
```typescript
private update(deltaTime: number) {
  // Update state machine
  this.stateManager.update(deltaTime)
  
  // Check if game should run
  if (this.stateManager.shouldPauseGameLoop()) {
    return
  }
  
  // Update camera
  this.camera.update(deltaTime)
  
  // Sync camera state
  this.syncHelpers.camera?.pushToState()
  
  // Rest of update logic...
}
```

### Or Setup Auto-Sync
```typescript
private initializeSyncHelpers() {
  this.syncHelpers = createStateSyncHelpers(
    this.stateManager.getSubsystemStateManager(),
    this.camera,
    this.ui
  )
  
  // Auto-sync camera every 100ms
  this.syncHelpers.camera?.setupAutoSync(100)
}
```

## Step 6: Integrate Creature State

### When Creating Creatures
```typescript
private spawnCreature(id: string, mesh: THREE.Object3D, data: any) {
  this.scene.add(mesh)
  
  // Add to state
  this.syncHelpers.creatures.pushCreature(id, mesh, {
    name: data.name,
    behaviorState: 'idle',
    rarity: data.rarity
  })
}
```

### When Updating Creatures
```typescript
private updateCreatures(deltaTime: number) {
  const creaturesState = this.stateManager.getCreaturesState()
  
  creaturesState.creatures.forEach((state, id) => {
    const mesh = this.creatureMeshes.get(id)
    if (mesh) {
      // Update mesh from state
      mesh.position.set(state.position.x, state.position.y, state.position.z)
      mesh.rotation.y = state.rotation
      
      // Update behavior...
      
      // Push changes back to state
      this.syncHelpers.creatures.updateCreaturePosition(id, mesh.position)
    }
  })
}
```

### When Removing Creatures
```typescript
private removeCreature(id: string) {
  const mesh = this.creatureMeshes.get(id)
  if (mesh) {
    this.scene.remove(mesh)
    this.creatureMeshes.delete(id)
  }
  
  // Remove from state
  this.syncHelpers.creatures.removeCreature(id)
}
```

## Step 7: Integrate Multiplayer Sync

### Setup Multiplayer Callbacks
```typescript
private setupMultiplayer() {
  this.multiplayer = new WebRTCMultiplayer(this.scene, config)
  
  this.multiplayer.onConnected = () => {
    this.stateManager.updateMultiplayerState({
      isConnected: true,
      connectionStatus: 'connected'
    })
  }
  
  this.multiplayer.onDisconnected = () => {
    this.stateManager.updateMultiplayerState({
      isConnected: false,
      connectionStatus: 'disconnected'
    })
  }
}
```

### Send State Updates
```typescript
private sendStateToMultiplayer() {
  if (!this.stateManager.getMultiplayerState().isConnected) {
    return
  }
  
  // Get only changed state
  const dirtySubsystems = this.stateManager.getDirtySubsystems()
  
  if (dirtySubsystems.length > 0) {
    // Create lightweight packet
    const packet = this.syncHelpers.multiplayer.createSyncPacket()
    
    // Send to peer
    this.multiplayer.send(JSON.stringify(packet))
    
    // Mark as synced
    this.stateManager.markAllClean()
  }
}
```

### Receive State Updates
```typescript
private onMultiplayerData(data: string) {
  try {
    const packet = JSON.parse(data)
    this.syncHelpers.multiplayer.applySyncPacket(packet)
  } catch (error) {
    console.error('Failed to parse multiplayer packet:', error)
  }
}
```

### In Update Loop
```typescript
private update(deltaTime: number) {
  // ... other updates
  
  // Multiplayer sync (every 100ms)
  if (this.frameCount % 6 === 0) {
    this.sendStateToMultiplayer()
  }
}
```

## Step 8: Update Photo System

### Before
```typescript
class PhotoSystem {
  private filmRemaining = 36
  private isCapturing = false
  
  capture() {
    if (this.filmRemaining <= 0) return
    this.filmRemaining--
    this.isCapturing = true
    // ...
  }
}
```

### After
```typescript
class PhotoSystem {
  constructor(private stateManager: IntegratedStateManager) {}
  
  capture() {
    const state = this.stateManager.getPhotoSystemState()
    
    if (state.filmRemaining <= 0) return
    
    this.stateManager.updatePhotoSystemState({
      filmRemaining: state.filmRemaining - 1,
      isCapturing: true,
      lastCaptureTime: Date.now()
    })
    
    // ... capture logic
  }
}
```

## Step 9: Update Audio System

### Before
```typescript
class AudioManager {
  private isMuted = false
  private volume = 1.0
  
  setVolume(v: number) {
    this.volume = v
    // update audio nodes...
  }
}
```

### After
```typescript
class AudioManager {
  constructor(private stateManager: IntegratedStateManager) {
    this.setupStateListener()
  }
  
  private setupStateListener() {
    this.stateManager.onSubsystemChange('audio', (event) => {
      const state = event.newState
      this.applyAudioState(state)
    })
  }
  
  private applyAudioState(state: AudioSystemState) {
    // Update audio nodes from state
    this.masterGain.gain.value = state.masterVolume
    this.ambientGain.gain.value = state.ambientVolume
    // ...
  }
  
  setVolume(v: number) {
    this.stateManager.updateAudioSystemState({
      masterVolume: v
    })
  }
}
```

## Step 10: Expose to Console (Debug)

### In main.ts
```typescript
import { IntegratedStateManager } from './state-integration'

const game = new Game()

// Expose for debugging
if (import.meta.env.DEV) {
  ;(window as any).stateManager = game.getStateManager()
  ;(window as any).getState = () => game.getStateManager().getSubsystemState()
}
```

### Console Usage
```javascript
// Check state
stateManager.getDebugInfo()
stateManager.getCameraState()
stateManager.getUIState()

// Update state
stateManager.updateUIState({ photoCount: 10 })

// Check history
stateManager.getHistory()
```

## Common Patterns

### Pattern 1: Read-Modify-Write
```typescript
// Get current state
const ui = this.stateManager.getUIState()

// Modify
const newScore = ui.totalScore + points

// Write back
this.stateManager.updateUIState({
  totalScore: newScore
})
```

### Pattern 2: Batch Updates
```typescript
this.stateManager.getSubsystemStateManager().batchUpdate({
  ui: { photoCount: 5, totalScore: 1000 },
  camera: { mode: 'freeroam' },
  audio: { masterVolume: 0.8 }
})
```

### Pattern 3: Conditional Updates
```typescript
if (this.stateManager.isPhotoAllowed()) {
  this.stateManager.updatePhotoSystemState({
    isCapturing: true
  })
}
```

## Testing

### Unit Tests
```typescript
describe('Game State', () => {
  it('should update photo count', () => {
    const stateManager = new IntegratedStateManager()
    
    stateManager.updateUIState({ photoCount: 5 })
    
    expect(stateManager.getUIState().photoCount).toBe(5)
  })
  
  it('should track changes', () => {
    const stateManager = new IntegratedStateManager()
    const changes: any[] = []
    
    stateManager.onSubsystemChange('ui', (event) => {
      changes.push(event)
    })
    
    stateManager.updateUIState({ photoCount: 1 })
    
    expect(changes).toHaveLength(1)
  })
})
```

## Troubleshooting

### State Not Updating
- Check if you're calling `update()` methods
- Verify callbacks are registered
- Check console for errors

### Multiplayer Sync Issues
- Verify dirty tracking is working
- Check network packets are being sent
- Ensure `markClean()` is called after sync

### Performance Issues
- Use dirty tracking to avoid unnecessary updates
- Batch updates when possible
- Consider sync frequency (don't sync every frame)

## Benefits After Migration

1. ✅ Single source of truth
2. ✅ No scattered state
3. ✅ Easy multiplayer sync
4. ✅ Type-safe state access
5. ✅ Change tracking
6. ✅ Better debugging
7. ✅ Easier testing
8. ✅ State history
9. ✅ Snapshots/rollback
10. ✅ Validation built-in
