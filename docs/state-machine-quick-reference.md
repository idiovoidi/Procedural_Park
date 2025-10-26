# State Machine Quick Reference

## Setup

```typescript
import { GameStateManager } from './game-state-manager'

const stateManager = new GameStateManager()
```

## Common Operations

### Transitions

```typescript
// Change state
stateManager.setState('playing')

// Force transition (bypass validation)
stateManager.setState('menu', true)
```

### Queries

```typescript
// Get current state
const state = stateManager.getState()

// Check state
if (stateManager.isInState('playing')) { }

// Check multiple states
if (stateManager.isInAnyState('playing', 'paused')) { }

// Get previous state
const prev = stateManager.getPreviousState()

// Get time in state (ms)
const time = stateManager.getStateTime()
```

### Configuration

```typescript
// Get current config
const config = stateManager.getCurrentConfig()

// Convenience methods
if (stateManager.shouldPauseGameLoop()) { }
if (stateManager.shouldPauseAudio()) { }
if (stateManager.isCameraMovementAllowed()) { }
if (stateManager.isPhotoAllowed()) { }
if (stateManager.isInputAllowed()) { }
```

### Callbacks

```typescript
// Listen for state changes
stateManager.onStateChange((newState, prevState) => {
  console.log(`${prevState} → ${newState}`)
})

// Register state-specific callbacks
const stateMachine = stateManager.getStateMachine()
stateMachine.registerState('playing', {
  onEnter: (prev) => { },
  onExit: (next) => { },
  onUpdate: (dt) => { }
})
```

## Game States

| State | Game Loop | Audio | Camera | Photos |
|-------|-----------|-------|--------|--------|
| loading | ⏸ Paused | 🔇 Muted | ✗ Disabled | ✗ Disabled |
| menu | ⏸ Paused | 🔊 Playing | ✗ Disabled | ✗ Disabled |
| playing | ▶ Running | 🔊 Playing | ✓ Enabled | ✓ Enabled |
| paused | ⏸ Paused | 🔇 Muted | ✗ Disabled | ✗ Disabled |
| photo_mode | ⏸ Paused | 🔊 Playing | ✓ Enabled | ✓ Enabled |
| gallery | ⏸ Paused | 🔊 Playing | ✗ Disabled | ✗ Disabled |
| settings | ⏸ Paused | 🔊 Playing | ✗ Disabled | ✗ Disabled |
| multiplayer_connecting | ⏸ Paused | 🔊 Playing | ✗ Disabled | ✗ Disabled |
| multiplayer_connected | ▶ Running | 🔊 Playing | ✓ Enabled | ✓ Enabled |
| game_over | ⏸ Paused | 🔊 Playing | ✗ Disabled | ✗ Disabled |

## Valid Transitions

```
loading → menu, playing
menu → playing, settings, multiplayer_connecting
playing → paused, photo_mode, gallery, settings, game_over
paused → playing, menu, settings
photo_mode → playing
gallery → playing, paused
settings → playing, paused, menu
multiplayer_connecting → multiplayer_connected, menu, playing
multiplayer_connected → playing, paused
game_over → menu, playing
```

## Integration Patterns

### Game Loop

```typescript
private gameLoop = (now: number): void => {
  const dt = (now - this.lastTime) / 1000
  
  // Update state machine
  this.stateManager.update(dt)
  
  // Conditional updates
  if (!this.stateManager.shouldPauseGameLoop()) {
    this.updateGame(dt)
  }
  
  this.render()
  requestAnimationFrame(this.gameLoop)
}
```

### Input Handling

```typescript
private handleInput(action: string): void {
  if (!this.stateManager.isInputAllowed()) return
  
  switch (action) {
    case 'pause':
      const state = this.stateManager.getState()
      this.stateManager.setState(
        state === 'playing' ? 'paused' : 'playing'
      )
      break
      
    case 'photo':
      if (this.stateManager.isPhotoAllowed()) {
        this.takePhoto()
      }
      break
  }
}
```

### UI Updates

```typescript
this.stateManager.onStateChange((newState) => {
  switch (newState) {
    case 'playing':
      this.showGameHUD()
      break
    case 'paused':
      this.showPauseMenu()
      break
    case 'gallery':
      this.showGallery()
      break
  }
})
```

## Debug

```typescript
// Get status
const status = stateManager.getStatus()
console.log(status)

// Get available transitions
const transitions = stateManager.getAvailableTransitions()

// Get history
const history = stateManager.getStateMachine().getHistory()

// Enable debug panel (in dev mode)
import { StateDebugPanel } from '../examples/state-machine-integration'
new StateDebugPanel(stateManager)
```

## Custom Transitions

```typescript
const stateMachine = stateManager.getStateMachine()

// Add transition
stateMachine.addTransition('gallery', 'settings')

// Remove transition
stateMachine.removeTransition('playing', 'game_over')

// Check if allowed
if (stateMachine.isTransitionAllowed('playing', 'menu')) {
  stateManager.setState('menu')
}
```
