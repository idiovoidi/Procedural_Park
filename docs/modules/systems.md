# Systems Module

## Overview

The `systems` module contains domain-specific game systems that implement core functionality. Each system is self-contained with clear responsibilities and communicates through well-defined APIs.

**Import Path**: `@systems/*`

**Dependencies**: `@core/*`

## Structure

```
systems/
├── creatures/       # Creature generation and behavior
├── terrain/         # Terrain and biome generation
├── audio/           # Audio management
├── camera/          # Camera control
├── photo/           # Photography system
├── input/           # Input handling
└── state/           # State management
```

## Creatures System (`@systems/creatures`)

Handles procedural creature generation, mesh building, AI behavior, and pooling.

### Key Components

- **creature-generator.ts**: Anatomy generation with seeded randomization
- **creature-builder.ts**: Three.js mesh building from anatomy
- **creature-behavior.ts**: AI behavior patterns and movement
- **creature-pool.ts**: Creature object pooling for performance
- **types.ts**: Creature-related type definitions

### Usage

```typescript
import { generateAnatomy, buildCreature } from '@systems/creatures'
import type { Anatomy, CreatureInstance } from '@systems/creatures'

// Generate creature anatomy
const anatomy = generateAnatomy(seed, rarity)

// Build Three.js mesh
const creature = buildCreature(anatomy, scene)
```

## Terrain System (`@systems/terrain`)

Manages procedural terrain generation and biome distribution.

### Key Components

- **TerrainSystem.ts**: Main terrain system class
- **biome-generator.ts**: Biome generation and distribution logic
- **types.ts**: Terrain-related type definitions

### Usage

```typescript
import { TerrainSystem } from '@systems/terrain'

const terrain = new TerrainSystem(scene, seed)
terrain.generate()
```

## Audio System (`@systems/audio`)

Handles audio management and procedural sound generation.

### Key Components

- **AudioManager.ts**: Main audio manager class
- **sound-generator.ts**: Procedural sound generation using Web Audio API
- **types.ts**: Audio-related type definitions

### Usage

```typescript
import { AudioManager } from '@systems/audio'

const audio = new AudioManager()
audio.playShutterSound()
audio.playAmbientSound(biomeType)
```

## Camera System (`@systems/camera`)

Controls camera movement in both ride mode and free roam mode.

### Key Components

- **CameraController.ts**: Camera controller with multiple modes
- **types.ts**: Camera-related type definitions

### Usage

```typescript
import { CameraController } from '@systems/camera'

const camera = new CameraController(threeCamera)
camera.setMode('ride') // or 'free-roam'
camera.update(deltaTime)
```

## Photo System (`@systems/photo`)

Manages photo capture, scoring, and evaluation.

### Key Components

- **PhotoSystem.ts**: Photo capture and management
- **scoring.ts**: Photo scoring algorithm (distance, framing, rarity)
- **types.ts**: Photo-related type definitions

### Usage

```typescript
import { PhotoSystem } from '@systems/photo'

const photoSystem = new PhotoSystem(camera, scene)
const photo = photoSystem.capturePhoto()
console.log(`Score: ${photo.score}`)
```

## Input System (`@systems/input`)

Centralized input handling with action-based bindings and priority system.

### Key Components

- **InputManager.ts**: Main input manager with context awareness
- **types.ts**: Input-related type definitions

### Usage

```typescript
import { InputManager } from '@systems/input'

const input = new InputManager()

// Register action
input.registerAction('move-forward', ['KeyW', 'ArrowUp'])

// Check if action is active
if (input.isActionActive('move-forward')) {
  // Move forward
}
```

## State System (`@systems/state`)

State management and synchronization for game and subsystems.

### Key Components

- **state-machine.ts**: State machine implementation
- **state-integration.ts**: Integrated state manager
- **subsystem-state-manager.ts**: Subsystem state management
- **subsystem-states.ts**: State definitions
- **state-sync-helpers.ts**: State synchronization utilities

### Usage

```typescript
import { StateMachine, SubsystemStateManager } from '@systems/state'

// State machine
const stateMachine = new StateMachine('idle')
stateMachine.transition('running')

// Subsystem state
const subsystemState = new SubsystemStateManager()
subsystemState.setState('camera', { mode: 'ride' })
```

## Best Practices

### System Initialization

Initialize systems in the correct order based on dependencies:

```typescript
// 1. Core systems (no dependencies)
const input = new InputManager()
const audio = new AudioManager()

// 2. Systems that depend on core
const terrain = new TerrainSystem(scene, seed)
const camera = new CameraController(threeCamera)

// 3. Systems that depend on other systems
const photoSystem = new PhotoSystem(camera, scene)
```

### System Communication

Systems should communicate through:
- **Public APIs**: Well-defined methods and properties
- **Events/Callbacks**: For loose coupling
- **Shared State**: Through the state system

```typescript
// ✅ Good: Using callbacks
photoSystem.onPhotoTaken((photo) => {
  audio.playShutterSound()
  ui.showPhotoPreview(photo)
})

// ❌ Bad: Direct coupling
photoSystem.audio = audio // Don't do this
```

### System Updates

Systems that need per-frame updates should have an `update()` method:

```typescript
class GameLoop {
  update(deltaTime: number) {
    camera.update(deltaTime)
    creatures.update(deltaTime)
    terrain.update(deltaTime)
  }
}
```

## Adding New Systems

When adding a new system:

1. **Create system directory**: `src/systems/my-system/`
2. **Create main class**: `MySystem.ts`
3. **Create types**: `types.ts`
4. **Create barrel export**: `index.ts`
5. **Add to path aliases**: Update `tsconfig.json` and `vite.config.ts`
6. **Document**: Add to this documentation

Example structure:
```
systems/my-system/
├── index.ts           # export { MySystem } from './MySystem'
├── MySystem.ts        # Main system class
├── helper.ts          # Helper functions
└── types.ts           # Type definitions
```
