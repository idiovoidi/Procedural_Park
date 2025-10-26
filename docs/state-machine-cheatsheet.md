# State Machine Cheatsheet

## Setup
```typescript
import { GameStateManager } from './game-state-manager'
const sm = new GameStateManager()
```

## Transitions
```typescript
sm.setState('playing')              // Change state
sm.setState('menu', true)           // Force transition
```

## Queries
```typescript
sm.getState()                       // Current state
sm.getPreviousState()               // Previous state
sm.isInState('playing')             // Check single state
sm.isInAnyState('playing', 'paused') // Check multiple
sm.getStateTime()                   // Time in state (ms)
```

## Configuration
```typescript
sm.shouldPauseGameLoop()            // Pause game?
sm.shouldPauseAudio()               // Pause audio?
sm.isCameraMovementAllowed()        // Camera enabled?
sm.isPhotoAllowed()                 // Photos enabled?
sm.isInputAllowed()                 // Input enabled?
```

## Callbacks
```typescript
sm.onStateChange((newState, prevState) => {
  console.log(`${prevState} → ${newState}`)
})
```

## States
| State | Loop | Audio | Camera | Photos |
|-------|------|-------|--------|--------|
| loading | ⏸ | 🔇 | ✗ | ✗ |
| menu | ⏸ | 🔊 | ✗ | ✗ |
| playing | ▶ | 🔊 | ✓ | ✓ |
| paused | ⏸ | 🔇 | ✗ | ✗ |
| photo_mode | ⏸ | 🔊 | ✓ | ✓ |
| gallery | ⏸ | 🔊 | ✗ | ✗ |
| settings | ⏸ | 🔊 | ✗ | ✗ |

## Game Loop
```typescript
private gameLoop = (now: number): void => {
  const dt = (now - this.lastTime) / 1000
  sm.update(dt)
  
  if (!sm.shouldPauseGameLoop()) {
    this.updateGame(dt)
  }
  
  this.render()
  requestAnimationFrame(this.gameLoop)
}
```

## Input
```typescript
if (sm.isInputAllowed()) {
  if (key === 'p') {
    sm.setState(sm.isInState('playing') ? 'paused' : 'playing')
  }
  if (key === 'space' && sm.isPhotoAllowed()) {
    this.takePhoto()
  }
}
```

## Debug
```typescript
console.log(sm.getStatus())
sm.getAvailableTransitions()
sm.getStateMachine().getHistory()
```
