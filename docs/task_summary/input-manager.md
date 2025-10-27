# Input Manager

The Input Manager is a centralized system for handling all keyboard, mouse, and pointer input in the game. It resolves input conflicts, provides a priority system, and decouples input handling from game logic.

## Features

- **Centralized Input Handling**: All input goes through one system
- **Action-Based API**: Map inputs to semantic actions instead of raw keys
- **Priority System**: Higher priority actions take precedence when keys conflict
- **Context Awareness**: Different input contexts (game, UI, menu) can have different bindings
- **UI Blocking**: Prevents game input when typing in text fields
- **Pointer Lock Support**: Manages pointer lock for first-person camera
- **Frame-Based State**: Tracks pressed/released states that clear each frame

## Architecture

### Input Flow

```
Raw Input (keyboard/mouse)
    ↓
Input Manager (filters, prioritizes)
    ↓
Action Callbacks (game systems respond)
```

### Key Concepts

**Actions**: Semantic game actions like `camera.moveForward` or `game.takePhoto`

**Bindings**: Map keys/buttons to actions with context and priority

**Contexts**: Different input modes (game, UI, menu) that can have different bindings

**State**: Tracks what's currently pressed, what was just pressed/released this frame

## Usage

### Basic Setup

```typescript
import { InputManager } from './input-manager'

// Create input manager
const inputManager = new InputManager()

// Register callbacks for actions
inputManager.on('game.takePhoto', () => {
  console.log('Taking photo!')
})

// In game loop
function update() {
  inputManager.update() // Clear pressed/released states
  // ... rest of update
}
```

### Querying Input State

```typescript
// Check if key is currently held down
if (inputManager.isKeyDown('w')) {
  moveForward()
}

// Check if key was just pressed this frame
if (inputManager.isKeyPressed('Space')) {
  jump()
}

// Check if key was just released this frame
if (inputManager.isKeyReleased('Shift')) {
  stopSprinting()
}

// Get mouse position
const { x, y } = inputManager.getMousePosition()

// Get mouse delta (for camera look)
const { x, y } = inputManager.getMouseDelta()
```

### Custom Bindings

```typescript
// Add a custom binding
inputManager.addBinding({
  action: 'game.customAction',
  key: 'e',
  contexts: ['game'],
  priority: 2
})

// Remove a binding
inputManager.removeBinding('game.customAction')
```

### Context Switching

```typescript
// Switch to UI context (disables game inputs)
inputManager.setContext('ui')

// Switch back to game context
inputManager.setContext('game')

// Block all input (e.g., during loading)
inputManager.setUIBlocking(true)
```

### Pointer Lock

```typescript
// Set canvas for pointer lock
inputManager.setCanvas(canvas)

// Request pointer lock (for first-person camera)
inputManager.requestPointerLock()

// Exit pointer lock
inputManager.exitPointerLock()

// Check if pointer is locked
if (inputManager.isPointerLocked()) {
  // Use mouse delta for camera
}
```

## Default Bindings

### Camera Controls
- `W` - Move forward (freeroam)
- `S` - Move backward (freeroam)
- `A` - Move left (freeroam)
- `D` - Move right (freeroam)
- `Shift` - Sprint (freeroam)
- `Space` - Jump (freeroam)
- `C` - Toggle camera mode (ride/freeroam)
- `Arrow Keys` - Look around (ride mode)

### Game Actions
- `F` - Take photo
- `R` - Restart ride
- `P` - Pause/Resume
- `+/=` - Increase speed
- `-/_` - Decrease speed
- `X` - Randomize experiment creature

### UI Actions
- `G` - Toggle gallery
- `Escape` - Toggle settings
- `H` - Toggle shortcuts
- `M` - Toggle multiplayer
- `N` - Toggle day/night

### Shader Actions
- `V` - Toggle shader on/off
- `[` - Decrease luminance threshold
- `]` - Increase luminance threshold
- `{` - Decrease intensity
- `}` - Increase intensity

### Video Actions
- `;` - Toggle video recording

## Priority System

Actions have priorities to resolve conflicts:

- **Priority 1**: Movement (WASD, arrow keys)
- **Priority 2**: Game actions (photo, pause, etc.)
- **Priority 3**: UI toggles (gallery, settings, etc.)

When multiple bindings match the same key, the highest priority wins.

## Context System

Different contexts allow the same key to do different things:

- **game**: Normal gameplay (all game actions enabled)
- **ui**: UI is open (only UI actions enabled)
- **menu**: In menu (only menu navigation enabled)

Example: `Escape` closes settings in both `game` and `ui` contexts.

## Integration with Systems

### Camera Controller

The camera controller queries the input manager for movement keys:

```typescript
// In camera update
this.moveForward = inputManager.isKeyDown('w')
this.moveBackward = inputManager.isKeyDown('s')
// etc.
```

### Game Class

The game class registers callbacks for actions:

```typescript
inputManager.on('game.takePhoto', () => this.takePhoto())
inputManager.on('game.pause', () => this.togglePause())
// etc.
```

### UI Manager

UI elements still respond to clicks, but keyboard shortcuts go through the input manager.

## Benefits

### Before Input Manager

```typescript
// Scattered across multiple files
window.addEventListener('keydown', (e) => {
  if (e.key === 's') { // Conflicts with movement!
    toggleShader()
  }
})
```

### After Input Manager

```typescript
// Centralized, no conflicts
inputManager.on('shader.toggle', () => toggleShader())
```

### Key Improvements

1. **No More Conflicts**: Priority system resolves key conflicts
2. **Easier Rebinding**: Change key bindings in one place
3. **Better Testing**: Mock input manager for tests
4. **Cleaner Code**: Game logic doesn't know about keys
5. **Context Awareness**: Different modes can use same keys differently

## Future Enhancements

- **Gamepad Support**: Add gamepad input handling
- **Input Recording**: Record and replay input for debugging
- **Rebindable Keys**: Let users customize key bindings
- **Input Hints**: Show available actions in current context
- **Combo System**: Support key combinations (Ctrl+S, etc.)

## Performance

The input manager is highly optimized:

- Uses `Set` for O(1) key lookups
- Minimal allocations per frame
- Event-driven (no polling overhead)
- Clears transient state efficiently

Typical overhead: < 0.1ms per frame
