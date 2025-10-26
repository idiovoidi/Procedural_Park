# Input Manager Migration Guide

This guide helps you migrate from the old scattered input handling to the new centralized Input Manager.

## Overview

**Before**: Input handling was scattered across Game, Camera, and UI classes with direct `addEventListener` calls.

**After**: All input goes through a centralized InputManager with action-based callbacks.

## Benefits of Migration

✅ **No more key conflicts** - Priority system resolves conflicts automatically  
✅ **Easier to rebind keys** - Change bindings in one place  
✅ **Better testability** - Mock input manager for tests  
✅ **Cleaner code** - Game logic doesn't know about specific keys  
✅ **Context awareness** - Different modes can use same keys differently  

## Migration Steps

### Step 1: Remove Old Event Listeners

**Before:**
```typescript
window.addEventListener('keydown', (e) => {
  if (e.key === 'f') {
    this.takePhoto()
  }
  if (e.key === 'p') {
    this.togglePause()
  }
})
```

**After:**
```typescript
// Remove the addEventListener calls
// Input manager handles this now
```

### Step 2: Create Input Manager Instance

**Before:**
```typescript
export class Game {
  private cameraController: CameraController
  
  constructor() {
    this.cameraController = new CameraController(curve)
  }
}
```

**After:**
```typescript
export class Game {
  private inputManager: InputManager
  private cameraController: CameraController
  
  constructor() {
    // Create input manager first
    this.inputManager = new InputManager()
    
    // Pass to systems that need it
    this.cameraController = new CameraController(curve, this.inputManager)
  }
}
```

### Step 3: Register Action Callbacks

**Before:**
```typescript
window.addEventListener('keydown', (e) => {
  if (e.key === 'f') {
    this.takePhoto()
  }
})
```

**After:**
```typescript
this.inputManager.on('game.takePhoto', () => {
  this.takePhoto()
})
```

### Step 4: Query Input State

**Before:**
```typescript
// In camera controller
window.addEventListener('keydown', (e) => {
  if (e.key === 'w') this.moveForward = true
})

window.addEventListener('keyup', (e) => {
  if (e.key === 'w') this.moveForward = false
})
```

**After:**
```typescript
// In camera update method
update(dt: number) {
  if (this.inputManager) {
    this.moveForward = this.inputManager.isKeyDown('w')
    this.moveBackward = this.inputManager.isKeyDown('s')
    // etc.
  }
}
```

### Step 5: Update Game Loop

**Before:**
```typescript
private gameLoop() {
  this.cameraController.update(dt)
  this.render()
  requestAnimationFrame(this.gameLoop)
}
```

**After:**
```typescript
private gameLoop() {
  this.inputManager.update() // Clear pressed/released states
  this.cameraController.update(dt)
  this.render()
  requestAnimationFrame(this.gameLoop)
}
```

### Step 6: Cleanup on Dispose

**Before:**
```typescript
public stop() {
  this.isRunning = false
  // No cleanup needed
}
```

**After:**
```typescript
public stop() {
  this.isRunning = false
  this.inputManager.dispose() // Clean up event listeners
}
```

## Common Patterns

### Pattern 1: Continuous Input (Movement)

**Before:**
```typescript
private moveForward = false

constructor() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'w') this.moveForward = true
  })
  window.addEventListener('keyup', (e) => {
    if (e.key === 'w') this.moveForward = false
  })
}

update() {
  if (this.moveForward) {
    // Move forward
  }
}
```

**After:**
```typescript
update() {
  if (this.inputManager.isKeyDown('w')) {
    // Move forward
  }
}
```

### Pattern 2: One-Time Actions (Jump, Shoot)

**Before:**
```typescript
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    this.jump()
  }
})
```

**After:**
```typescript
// Option A: Use action callback
this.inputManager.on('camera.jump', () => {
  this.jump()
})

// Option B: Query pressed state
update() {
  if (this.inputManager.isKeyPressed(' ')) {
    this.jump()
  }
}
```

### Pattern 3: Mouse Look

**Before:**
```typescript
canvas.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    const dx = e.movementX
    const dy = e.movementY
    this.yaw -= dx * 0.002
    this.pitch -= dy * 0.002
  }
})
```

**After:**
```typescript
update() {
  if (this.inputManager.isPointerLocked()) {
    const delta = this.inputManager.getMouseDelta()
    this.yaw -= delta.x * 0.002
    this.pitch -= delta.y * 0.002
  }
}
```

### Pattern 4: UI Toggles

**Before:**
```typescript
window.addEventListener('keydown', (e) => {
  if (e.key === 'g') {
    this.toggleGallery()
  }
  if (e.key === 'Escape') {
    this.toggleSettings()
  }
})
```

**After:**
```typescript
this.inputManager.on('ui.toggleGallery', () => {
  this.toggleGallery()
})

this.inputManager.on('ui.toggleSettings', () => {
  this.toggleSettings()
})
```

## Resolving Key Conflicts

### Problem: Same Key, Different Actions

**Before:**
```typescript
// In game.ts
window.addEventListener('keydown', (e) => {
  if (e.key === 's') {
    this.toggleShader() // Conflicts with movement!
  }
})

// In camera.ts
window.addEventListener('keydown', (e) => {
  if (e.key === 's') {
    this.moveBackward = true
  }
})
```

**After:**
```typescript
// Input manager resolves this with priorities
// Movement has priority 1 (lower)
// Shader toggle has priority 2 (higher)
// When 's' is pressed, only shader toggle fires

// Or change the shader key to avoid conflict
this.inputManager.addBinding({
  action: 'shader.toggle',
  key: 'v', // Changed from 's' to 'v'
  contexts: ['game'],
  priority: 2
})
```

## Testing

### Before: Hard to Test

```typescript
// Can't easily test without simulating DOM events
it('should take photo on F key', () => {
  const event = new KeyboardEvent('keydown', { key: 'f' })
  window.dispatchEvent(event)
  // Hard to verify
})
```

### After: Easy to Test

```typescript
// Mock input manager
const mockInputManager = {
  on: jest.fn(),
  isKeyDown: jest.fn(),
  update: jest.fn(),
  dispose: jest.fn()
}

const game = new Game(container, mockInputManager)

// Verify callback was registered
expect(mockInputManager.on).toHaveBeenCalledWith(
  'game.takePhoto',
  expect.any(Function)
)

// Trigger action directly
const callback = mockInputManager.on.mock.calls[0][1]
callback()
// Verify photo was taken
```

## Troubleshooting

### Issue: Input Not Working

**Check:**
1. Is `inputManager.update()` called in game loop?
2. Is the action registered with `inputManager.on()`?
3. Is the correct context set? (`inputManager.setContext('game')`)
4. Is UI blocking enabled? (`inputManager.setUIBlocking(false)`)

### Issue: Key Conflict

**Solution:**
1. Check binding priorities
2. Change one of the conflicting keys
3. Use different contexts for different modes

### Issue: Mouse Look Not Working

**Check:**
1. Is canvas set? (`inputManager.setCanvas(canvas)`)
2. Is pointer locked? (`inputManager.isPointerLocked()`)
3. Are you reading `getMouseDelta()` not `getMousePosition()`?

## Checklist

- [ ] Remove all `window.addEventListener('keydown')` calls
- [ ] Remove all `window.addEventListener('keyup')` calls
- [ ] Remove all `window.addEventListener('mousemove')` calls
- [ ] Create InputManager instance
- [ ] Pass InputManager to systems that need it
- [ ] Register action callbacks with `inputManager.on()`
- [ ] Call `inputManager.update()` in game loop
- [ ] Call `inputManager.dispose()` on cleanup
- [ ] Test all input actions still work
- [ ] Verify no key conflicts

## Next Steps

After migration:
1. Consider adding custom key bindings UI
2. Add gamepad support
3. Implement input recording for debugging
4. Add input hints/tooltips in UI

## Questions?

See [Input Manager Documentation](./input-manager.md) for full API reference.
