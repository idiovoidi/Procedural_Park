# State Machine Console Guide

Quick reference for testing and debugging the state machine in the browser console.

## Access State Manager

```javascript
// Access via window
stateManager

// Or via game instance
game.getStateManager()
```

## Check Current State

```javascript
// Get current state
stateManager.getState()
// Returns: 'playing', 'paused', 'loading', etc.

// Check if in specific state
stateManager.isInState('playing')
// Returns: true or false

// Check if in any of multiple states
stateManager.isInAnyState('playing', 'paused')
// Returns: true or false
```

## Transition States

```javascript
// Pause the game
stateManager.setState('paused')

// Resume the game
stateManager.setState('playing')

// Force a transition (bypass validation)
stateManager.setState('loading', true)
```

## Get State Information

```javascript
// Get full status
stateManager.getStatus()
/* Returns:
{
  current: 'playing',
  previous: 'paused',
  timeInState: 5234,
  availableTransitions: ['paused', 'photo_mode', 'gallery', 'settings', 'game_over'],
  historyCount: 3,
  config: { pauseGameLoop: false, pauseAudio: false, ... }
}
*/

// Get previous state
stateManager.getPreviousState()

// Get time in current state (milliseconds)
stateManager.getStateTime()

// Get available transitions
stateManager.getAvailableTransitions()
```

## Check State Configuration

```javascript
// Get current state config
stateManager.getCurrentConfig()
/* Returns:
{
  pauseGameLoop: false,
  pauseAudio: false,
  showUI: true,
  allowInput: true,
  allowCameraMovement: true,
  allowPhotoCapture: true
}
*/

// Check specific permissions
stateManager.shouldPauseGameLoop()      // false in playing
stateManager.shouldPauseAudio()         // false in playing
stateManager.isCameraMovementAllowed()  // true in playing
stateManager.isPhotoAllowed()           // true in playing
stateManager.isInputAllowed()           // true in playing
```

## View Transition History

```javascript
// Get all transitions
stateManager.getStateMachine().getHistory()
/* Returns array:
[
  { from: 'loading', to: 'playing', timestamp: 1234567890 },
  { from: 'playing', to: 'paused', timestamp: 1234567900 },
  { from: 'paused', to: 'playing', timestamp: 1234567910 }
]
*/

// Clear history
stateManager.getStateMachine().clearHistory()
```

## Test State Transitions

```javascript
// Test pause/resume cycle
stateManager.setState('paused')
console.log('Paused:', stateManager.getState())
setTimeout(() => {
  stateManager.setState('playing')
  console.log('Resumed:', stateManager.getState())
}, 2000)

// Test invalid transition
stateManager.setState('loading')
// Should fail and log error

// Force invalid transition
stateManager.setState('loading', true)
// Should succeed
```

## Monitor State Changes

```javascript
// Add a listener
stateManager.onStateChange((newState, prevState) => {
  console.log(`State changed: ${prevState} → ${newState}`)
})

// Now any state change will log to console
```

## Check Transition Rules

```javascript
// Check if transition is allowed
const sm = stateManager.getStateMachine()
sm.isTransitionAllowed('playing', 'paused')  // true
sm.isTransitionAllowed('playing', 'loading') // false

// Add custom transition
sm.addTransition('playing', 'loading')
sm.isTransitionAllowed('playing', 'loading') // now true

// Remove transition
sm.removeTransition('playing', 'loading')
```

## Game Stats with State

```javascript
// Get game stats including state
game.getStats()
/* Returns:
{
  photoCount: 5,
  totalScore: 450,
  creatureCount: 60,
  rideProgress: 0.35,
  gameState: 'playing'
}
*/
```

## Common Test Scenarios

### Test Pause Functionality
```javascript
// Pause game
stateManager.setState('paused')
console.log('Game loop paused:', stateManager.shouldPauseGameLoop())
console.log('Audio muted:', stateManager.shouldPauseAudio())

// Resume
stateManager.setState('playing')
console.log('Game loop running:', !stateManager.shouldPauseGameLoop())
```

### Test Photo Restrictions
```javascript
// In playing state
console.log('Can take photos:', stateManager.isPhotoAllowed()) // true

// Pause game
stateManager.setState('paused')
console.log('Can take photos:', stateManager.isPhotoAllowed()) // false

// Try to take photo (will be blocked)
// Press spacebar - should show "Cannot take photos right now"
```

### Monitor State Duration
```javascript
// Check how long in current state
setInterval(() => {
  const time = stateManager.getStateTime()
  console.log(`In ${stateManager.getState()} for ${(time/1000).toFixed(1)}s`)
}, 1000)
```

### Test All States
```javascript
const states = ['loading', 'menu', 'playing', 'paused', 'photo_mode', 'gallery', 'settings']

states.forEach(state => {
  stateManager.setState(state, true) // Force
  console.log(`${state}:`, stateManager.getCurrentConfig())
})

// Return to playing
stateManager.setState('playing', true)
```

## Debug Panel

The debug panel (visible in dev mode) shows:
- Current state
- Previous state  
- Time in state
- State configuration
- Transition count

Toggle visibility:
```javascript
document.getElementById('state-debug-panel').style.display = 'none' // Hide
document.getElementById('state-debug-panel').style.display = 'block' // Show
```

## Troubleshooting

### State not changing
```javascript
// Check if transition is allowed
const current = stateManager.getState()
const target = 'paused'
console.log(`Can transition ${current} → ${target}:`, 
  stateManager.getStateMachine().isTransitionAllowed(current, target))

// Force if needed
stateManager.setState(target, true)
```

### Game still running when paused
```javascript
// Verify state
console.log('State:', stateManager.getState())
console.log('Should pause:', stateManager.shouldPauseGameLoop())

// Check game loop is respecting state
// Look for "Game state: playing → paused" in console
```

### Audio not muting
```javascript
// Check audio state
console.log('Should pause audio:', stateManager.shouldPauseAudio())

// Manually test audio control
game.audioManager.setAmbientVolume(0) // Mute
game.audioManager.setAmbientVolume(1) // Unmute
```

## Quick Commands

```javascript
// Pause
stateManager.setState('paused')

// Resume  
stateManager.setState('playing')

// Status
stateManager.getStatus()

// Config
stateManager.getCurrentConfig()

// History
stateManager.getStateMachine().getHistory()

// Available transitions
stateManager.getAvailableTransitions()
```
