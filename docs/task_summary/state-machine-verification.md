# State Machine Integration Verification

Checklist to verify the state machine is working correctly in the game.

## Pre-Flight Checks

### 1. TypeScript Compilation
```bash
npm run type-check
```
✅ Should complete with no errors

### 2. Development Server
```bash
npm run dev
```
✅ Should start without errors

## In-Game Verification

### 3. Initial State
Open browser console and check:
```javascript
stateManager.getState()
```
✅ Should return `'playing'` after loading screen

### 4. Debug Panel (Dev Mode Only)
Look for debug panel in top-left corner showing:
- Current state: playing
- Previous state: loading
- Time in state: (counting up)
- Config showing game loop running

✅ Debug panel should be visible and updating

### 5. Pause Functionality

**Test A: Keyboard Pause**
1. Press `P` key
2. Check console: Should log "Game state: playing → paused"
3. Observe: Creatures should freeze, audio should mute
4. Check debug panel: Should show "Loop: ⏸ Paused"

**Test B: Console Pause**
```javascript
stateManager.setState('paused')
```
✅ Game should pause, audio should mute

**Test C: Resume**
```javascript
stateManager.setState('playing')
```
✅ Game should resume, audio should restore

### 6. Photo Restrictions

**Test A: Photos in Playing State**
1. Ensure in playing state: `stateManager.getState()` → `'playing'`
2. Press `Space` to take photo
✅ Photo should be captured successfully

**Test B: Photos in Paused State**
1. Pause game: `stateManager.setState('paused')`
2. Press `Space` to take photo
✅ Should show toast: "Cannot take photos right now"

### 7. State Configuration

**Test A: Playing State Config**
```javascript
stateManager.setState('playing')
stateManager.getCurrentConfig()
```
✅ Should return:
```javascript
{
  pauseGameLoop: false,
  pauseAudio: false,
  showUI: true,
  allowInput: true,
  allowCameraMovement: true,
  allowPhotoCapture: true
}
```

**Test B: Paused State Config**
```javascript
stateManager.setState('paused')
stateManager.getCurrentConfig()
```
✅ Should return:
```javascript
{
  pauseGameLoop: true,
  pauseAudio: true,
  showUI: true,
  allowInput: true,
  allowCameraMovement: false,
  allowPhotoCapture: false
}
```

### 8. State Queries

```javascript
// Should work in any state
stateManager.getState()              // Current state
stateManager.getPreviousState()      // Previous state
stateManager.getStateTime()          // Time in ms
stateManager.getAvailableTransitions() // Valid next states
```
✅ All should return appropriate values

### 9. Transition Validation

**Test A: Valid Transition**
```javascript
stateManager.setState('playing')
stateManager.setState('paused')
```
✅ Should succeed, console logs transition

**Test B: Invalid Transition**
```javascript
stateManager.setState('playing')
stateManager.setState('loading')
```
✅ Should fail, console logs error, state remains 'playing'

**Test C: Force Transition**
```javascript
stateManager.setState('loading', true)
```
✅ Should succeed even though invalid

### 10. Audio Control

**Test A: Audio in Playing State**
1. Ensure in playing state
2. Listen for ambient sounds (forest, wind, birds)
✅ Should hear ambient audio

**Test B: Audio in Paused State**
1. Pause game: `stateManager.setState('paused')`
2. Listen for ambient sounds
✅ Ambient sounds should be muted

**Test C: Audio Resume**
1. Resume game: `stateManager.setState('playing')`
✅ Ambient sounds should restore

### 11. Game Loop Behavior

**Test A: Game Loop Running**
```javascript
stateManager.setState('playing')
stateManager.shouldPauseGameLoop()
```
✅ Should return `false`
✅ Creatures should be moving
✅ Camera should respond to input

**Test B: Game Loop Paused**
```javascript
stateManager.setState('paused')
stateManager.shouldPauseGameLoop()
```
✅ Should return `true`
✅ Creatures should be frozen
✅ Camera should not move

### 12. Transition History

```javascript
// Perform several transitions
stateManager.setState('paused')
stateManager.setState('playing')
stateManager.setState('paused')

// Check history
const history = stateManager.getStateMachine().getHistory()
console.log(history)
```
✅ Should show array of transitions with timestamps

### 13. State Manager Access

**Test A: Via Window**
```javascript
stateManager
```
✅ Should be accessible

**Test B: Via Game Instance**
```javascript
game.getStateManager()
```
✅ Should return state manager

**Test C: Game Stats**
```javascript
game.getStats()
```
✅ Should include `gameState` property

### 14. Multiple Pause/Resume Cycles

```javascript
// Cycle 5 times
for (let i = 0; i < 5; i++) {
  stateManager.setState('paused')
  console.log('Paused', i+1)
  await new Promise(r => setTimeout(r, 500))
  stateManager.setState('playing')
  console.log('Resumed', i+1)
  await new Promise(r => setTimeout(r, 500))
}
```
✅ Should cycle smoothly without errors

### 15. State Persistence Across Actions

1. Take a photo in playing state
2. Pause game
3. Resume game
4. Take another photo
✅ Both photos should work, pause should work

## Performance Checks

### 16. State Transition Performance

```javascript
console.time('transition')
stateManager.setState('paused')
console.timeEnd('transition')
```
✅ Should complete in < 1ms

### 17. State Query Performance

```javascript
console.time('query')
for (let i = 0; i < 1000; i++) {
  stateManager.getState()
}
console.timeEnd('query')
```
✅ Should complete in < 5ms for 1000 queries

### 18. Game Loop Performance

Check FPS in debug panel:
- In playing state: Should maintain 60 FPS
- In paused state: Should maintain 60 FPS (still rendering)
✅ No performance degradation

## Edge Cases

### 19. Rapid State Changes

```javascript
// Rapid transitions
stateManager.setState('paused')
stateManager.setState('playing')
stateManager.setState('paused')
stateManager.setState('playing')
```
✅ Should handle without errors

### 20. State During Loading

Refresh page and immediately check:
```javascript
stateManager.getState()
```
✅ Should be `'loading'` initially, then transition to `'playing'`

## Console Output Verification

### 21. State Change Logging

Watch console during state changes:
```javascript
stateManager.setState('paused')
```
✅ Should log: "Game state: playing → paused"

### 22. Invalid Transition Logging

```javascript
stateManager.setState('loading')
```
✅ Should log error: "Invalid transition: playing -> loading"

## Final Integration Check

### 23. All Systems Working Together

1. Start game (loading → playing)
2. Move camera around
3. Take a photo
4. Pause game (P key)
5. Try to take photo (should fail)
6. Resume game (P key)
7. Take another photo (should work)
8. Check stats: `game.getStats()`

✅ All actions should work as expected
✅ State should be reflected in stats
✅ No console errors

## Verification Summary

Total Checks: 23

- [ ] Pre-flight checks (2)
- [ ] Initial state (1)
- [ ] Debug panel (1)
- [ ] Pause functionality (3)
- [ ] Photo restrictions (2)
- [ ] State configuration (2)
- [ ] State queries (1)
- [ ] Transition validation (3)
- [ ] Audio control (3)
- [ ] Game loop behavior (2)
- [ ] Transition history (1)
- [ ] State manager access (3)
- [ ] Multiple cycles (1)
- [ ] State persistence (1)
- [ ] Performance checks (3)
- [ ] Edge cases (2)
- [ ] Console output (2)
- [ ] Final integration (1)

## Success Criteria

✅ All 23 checks pass
✅ No TypeScript errors
✅ No console errors during normal operation
✅ Game plays smoothly with state machine
✅ Pause/resume works correctly
✅ Photo restrictions enforced
✅ Audio control working
✅ Debug panel shows correct info

## Troubleshooting

If any check fails, see:
- `docs/state-machine-console-guide.md` for debugging commands
- `docs/state-machine.md` for API reference
- `docs/state-machine-migration-guide.md` for integration details

## Report Issues

If you find issues:
1. Note which check failed
2. Check browser console for errors
3. Verify TypeScript compilation
4. Check state manager status: `stateManager.getStatus()`
