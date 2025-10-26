# State Machine Migration Guide

Guide for integrating the state machine into the existing AI Snap game.

## Overview

This guide shows how to replace implicit state management (boolean flags) with the explicit state machine system.

## Current State Management

The game currently uses implicit states:

```typescript
// game.ts
private isRunning = false

// Implicit states through UI visibility
galleryEl.classList.toggle('hidden')
settingsPanel.classList.toggle('hidden')

// Implicit pause through camera controller
this.cameraController.togglePause()
```

## Migration Steps

### Step 1: Add State Manager to Game Class

**File:** `src/game.ts`

```typescript
import { GameStateManager } from './game-state-manager'

export class Game {
  // Add state manager
  private stateManager: GameStateManager
  
  // Remove these flags
  // private isRunning = false  // ← Remove
  
  constructor(container: HTMLElement) {
    // Initialize state manager early
    this.stateManager = new GameStateManager()
    
    // Setup state handlers
    this.setupStateHandlers()
    
    // ... rest of initialization
  }
  
  private setupStateHandlers(): void {
    this.stateManager.onStateChange((newState, prevState) => {
      console.log(`Game state: ${prevState} → ${newState}`)
      this.handleStateChange(newState, prevState)
    })
  }
  
  private handleStateChange(newState: GameStateType, prevState: GameStateType | null): void {
    // Handle state-specific logic
    switch (newState) {
      case 'playing':
        this.onEnterPlaying()
        break
      case 'paused':
        this.onEnterPaused()
        break
      case 'gallery':
        this.onEnterGallery()
        break
      case 'settings':
        this.onEnterSettings()
        break
    }
  }
}
```

### Step 2: Update Game Loop

**File:** `src/game.ts`

Replace `isRunning` checks with state machine:

```typescript
// BEFORE
private gameLoop = (now = performance.now()) => {
  if (!this.isRunning) return
  
  const dt = (now - this.lastTime) / 1000
  this.lastTime = now
  
  // Update everything
  this.cameraController.update(dt)
  this.updateCreatures(dt)
  // ...
  
  requestAnimationFrame(this.gameLoop)
}

// AFTER
private gameLoop = (now = performance.now()) => {
  const dt = (now - this.lastTime) / 1000
  this.lastTime = now
  
  // Always update state machine
  this.stateManager.update(dt)
  
  // Conditionally update game systems
  if (!this.stateManager.shouldPauseGameLoop()) {
    this.cameraController.update(dt)
    this.updateCreatures(dt)
    this.updateMiniMap()
    this.sceneManager.update(now / 1000)
  }
  
  // Always update multiplayer and render
  if (this.multiplayer?.isConnected()) {
    this.multiplayer.update(dt)
  }
  
  this.sceneManager.render(this.cameraController.camera, dt)
  this.inputManager.update()
  
  requestAnimationFrame(this.gameLoop)
}
```

### Step 3: Update Start/Stop Methods

**File:** `src/game.ts`

```typescript
// BEFORE
public start() {
  if (this.isRunning) return
  this.isRunning = true
  this.lastTime = performance.now()
  this.gameLoop()
}

public stop() {
  this.isRunning = false
  this.audioManager.stopAllAmbientSounds()
}

// AFTER
public start() {
  // Transition from loading to playing
  this.stateManager.setState('playing')
  this.lastTime = performance.now()
  this.gameLoop()
}

public stop() {
  // Transition to a stopped state (could be menu or game_over)
  this.stateManager.setState('menu')
  this.audioManager.stopAllAmbientSounds()
}
```

### Step 4: Update Input Handlers

**File:** `src/game.ts`

Replace direct state changes with state machine transitions:

```typescript
// BEFORE
private togglePause() {
  const isPaused = this.cameraController.togglePause()
  this.uiManager.showToast(isPaused ? '⏸ Paused' : '▶ Resumed')
}

// AFTER
private togglePause() {
  const currentState = this.stateManager.getState()
  
  if (currentState === 'playing') {
    this.stateManager.setState('paused')
    this.uiManager.showToast('⏸ Paused')
  } else if (currentState === 'paused') {
    this.stateManager.setState('playing')
    this.uiManager.showToast('▶ Resumed')
  }
}
```

```typescript
// BEFORE
private takePhoto() {
  // Always allow photos
  const result = this.photoSystem.takePhoto(...)
  // ...
}

// AFTER
private takePhoto() {
  // Check if photos are allowed in current state
  if (!this.stateManager.isPhotoAllowed()) {
    this.uiManager.showToast('Cannot take photos in this state')
    return
  }
  
  const result = this.photoSystem.takePhoto(...)
  // ...
}
```

### Step 5: Update UI Manager

**File:** `src/ui.ts`

Add state manager integration:

```typescript
export class UIManager {
  private stateManager?: GameStateManager
  
  public setStateManager(stateManager: GameStateManager): void {
    this.stateManager = stateManager
    this.setupStateHandlers()
  }
  
  private setupStateHandlers(): void {
    if (!this.stateManager) return
    
    this.stateManager.onStateChange((newState) => {
      this.updateUIForState(newState)
    })
  }
  
  private updateUIForState(state: GameStateType): void {
    // Hide all panels first
    this.galleryEl.classList.add('hidden')
    this.settingsPanel.classList.add('hidden')
    this.shortcutsPanel.classList.add('hidden')
    
    // Show appropriate UI
    switch (state) {
      case 'gallery':
        this.galleryEl.classList.remove('hidden')
        break
      case 'settings':
        this.settingsPanel.classList.remove('hidden')
        break
      case 'paused':
        // Show pause overlay
        break
    }
  }
  
  // Update toggle methods to use state manager
  public toggleGallery() {
    if (!this.stateManager) {
      // Fallback to old behavior
      this.galleryEl.classList.toggle('hidden')
      return
    }
    
    const state = this.stateManager.getState()
    if (state === 'gallery') {
      const prev = this.stateManager.getPreviousState()
      this.stateManager.setState(prev === 'paused' ? 'paused' : 'playing')
    } else if (state === 'playing') {
      this.stateManager.setState('gallery')
    }
  }
}
```

### Step 6: Update Game Constructor

**File:** `src/game.ts`

Connect UI manager to state manager:

```typescript
constructor(container: HTMLElement) {
  // Initialize state manager first
  this.stateManager = new GameStateManager()
  
  // ... other initialization
  
  this.uiManager = new UIManager()
  
  // Connect UI to state manager
  this.uiManager.setStateManager(this.stateManager)
  
  // ... rest of initialization
}
```

### Step 7: Add State-Specific Handlers

**File:** `src/game.ts`

```typescript
private onEnterPlaying(): void {
  // Resume camera
  this.cameraController.setPaused(false)
  
  // Resume audio
  if (this.stateManager.getPreviousState() === 'paused') {
    this.audioManager.resumeAll()
  }
  
  // Hide menus
  this.uiManager.hideAllMenus()
}

private onEnterPaused(): void {
  // Pause camera
  this.cameraController.setPaused(true)
  
  // Pause audio
  this.audioManager.pauseAll()
  
  // Show pause menu
  this.uiManager.showPauseMenu()
}

private onEnterGallery(): void {
  // Pause game
  this.cameraController.setPaused(true)
  
  // Keep audio playing
  // Gallery UI is handled by UIManager
}

private onEnterSettings(): void {
  // Pause game
  this.cameraController.setPaused(true)
  
  // Settings UI is handled by UIManager
}
```

### Step 8: Update Camera Controller

**File:** `src/camera.ts`

Add explicit pause method if not present:

```typescript
export class CameraController {
  private isPaused = false
  
  public setPaused(paused: boolean): void {
    this.isPaused = paused
  }
  
  public getPaused(): boolean {
    return this.isPaused
  }
  
  public update(dt: number): void {
    if (this.isPaused) return
    
    // ... normal update logic
  }
}
```

### Step 9: Update Audio Manager

**File:** `src/audio.ts`

Add pause/resume methods if not present:

```typescript
export class AudioManager {
  private isPaused = false
  
  public pauseAll(): void {
    this.isPaused = true
    // Pause all sounds
  }
  
  public resumeAll(): void {
    this.isPaused = false
    // Resume all sounds
  }
}
```

### Step 10: Add Loading State

**File:** `src/main.ts`

```typescript
// Initialize the game
const app = document.getElementById('app') as HTMLDivElement
const game = new Game(app)

// Game starts in 'loading' state
// Transition to playing after initialization
setTimeout(() => {
  game.start() // This will transition to 'playing'
}, 100)
```

## Testing the Migration

### 1. Test Basic Transitions

```typescript
// In browser console
game.stateManager.setState('paused')
game.stateManager.setState('playing')
game.stateManager.setState('gallery')
```

### 2. Test Invalid Transitions

```typescript
// Should fail
game.stateManager.setState('loading') // From playing
```

### 3. Test State Queries

```typescript
console.log(game.stateManager.getState())
console.log(game.stateManager.isInState('playing'))
console.log(game.stateManager.shouldPauseGameLoop())
```

### 4. Enable Debug Panel

```typescript
// In game.ts constructor
if (import.meta.env.DEV) {
  import('../examples/state-machine-integration').then(({ StateDebugPanel }) => {
    new StateDebugPanel(this.stateManager)
  })
}
```

## Rollback Plan

If issues occur, the migration can be rolled back:

1. Keep old boolean flags commented out
2. Add feature flag for state machine:

```typescript
const USE_STATE_MACHINE = false

if (USE_STATE_MACHINE) {
  if (!this.stateManager.shouldPauseGameLoop()) {
    this.update(dt)
  }
} else {
  if (this.isRunning) {
    this.update(dt)
  }
}
```

## Common Issues

### Issue 1: Game Loop Stops

**Symptom:** Game freezes after migration

**Solution:** Ensure `requestAnimationFrame` is always called:

```typescript
private gameLoop = (now: number): void => {
  // ... updates
  
  // ALWAYS call this, even if paused
  requestAnimationFrame(this.gameLoop)
}
```

### Issue 2: UI Not Updating

**Symptom:** Menus don't show/hide correctly

**Solution:** Ensure UI manager is connected to state manager:

```typescript
this.uiManager.setStateManager(this.stateManager)
```

### Issue 3: Audio Continues When Paused

**Symptom:** Audio plays in paused state

**Solution:** Check audio pause in state handler:

```typescript
private onEnterPaused(): void {
  this.audioManager.pauseAll()
}
```

## Gradual Migration

You can migrate gradually:

### Phase 1: Add State Manager (No Changes)
- Add state manager to game
- Don't use it yet
- Test that game still works

### Phase 2: Add State Logging
- Log state changes
- Keep old code working
- Verify states match expectations

### Phase 3: Replace Game Loop
- Use state machine for pause logic
- Keep other code unchanged

### Phase 4: Replace Input Handlers
- Use state machine for input
- Remove boolean flags

### Phase 5: Full Integration
- Connect UI manager
- Add state-specific handlers
- Remove all old state code

## Verification Checklist

- [ ] Game starts in loading state
- [ ] Transitions to playing state
- [ ] Pause/resume works correctly
- [ ] Gallery opens and closes
- [ ] Settings opens and closes
- [ ] Photos only work in allowed states
- [ ] Camera only moves in allowed states
- [ ] Audio pauses in paused state
- [ ] Multiplayer states work
- [ ] Invalid transitions are blocked
- [ ] Debug panel shows correct info

## Next Steps

After successful migration:

1. Add more states as needed (e.g., `tutorial`, `cutscene`)
2. Add state-based analytics
3. Add state persistence (save/load)
4. Add state-based achievements
5. Optimize state-specific rendering

## Support

If you encounter issues:
1. Check [state-machine.md](./state-machine.md) for API reference
2. Review [examples](../examples/state-machine-integration.ts)
3. Enable debug panel to visualize states
4. Check browser console for state transition logs
