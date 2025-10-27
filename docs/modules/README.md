# Module Documentation

This directory contains detailed documentation for each module in the AI Snap codebase.

## Module Overview

The codebase is organized into six main modules, each with specific responsibilities and dependencies:

```
┌─────────────────────────────────────────────────────────┐
│                        main.ts                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      game/ (Level 3)                    │
│  Game orchestration, coordination, high-level managers  │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ rendering/   │   │     ui/      │   │ multiplayer/ │
│  (Level 2)   │   │  (Level 2)   │   │  (Level 2)   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                   ┌──────────────┐
                   │   systems/   │
                   │  (Level 1)   │
                   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │    core/     │
                   │  (Level 0)   │
                   └──────────────┘
```

## Module Documentation

### [Core Module](./core.md)
**Level 0 - No Dependencies**

Foundational utilities, constants, and type definitions.

- Constants (game config, biome config, physics)
- Utilities (math, pooling, random)
- Types (common interfaces, geometry)

**Import**: `@core/*`

---

### [Systems Module](./systems.md)
**Level 1 - Depends on: core**

Domain-specific game systems implementing core functionality.

- Creatures (generation, behavior, pooling)
- Terrain (generation, biomes)
- Audio (management, sound generation)
- Camera (control, modes)
- Photo (capture, scoring)
- Input (handling, bindings)
- State (management, synchronization)

**Import**: `@systems/*`

---

### [Rendering Module](./rendering.md)
**Level 2 - Depends on: core, systems**

Rendering systems including scene management, shaders, and effects.

- Scene (management, interactions, structures)
- Shaders (management, custom shaders)
- Visual Effects (CRT, film grain, chromatic aberration)
- Textures (procedural generation)

**Import**: `@rendering/*`

---

### [UI Module](./ui.md)
**Level 2 - Depends on: core, systems**

User interface components and management.

- Components (gallery, settings, shortcuts, mini-map, toast)
- Managers (UI coordination)
- Debug (debug panel, shader debug UI)

**Import**: `@ui/*`

---

### [Multiplayer Module](./multiplayer.md)
**Level 2 - Depends on: core, systems**

Peer-to-peer multiplayer functionality using WebRTC.

- WebRTC (peer connections, connection UI)
- State Sync (binary state synchronization)
- Peer Avatar (peer rendering in 3D)

**Import**: `@multiplayer/*`

---

### [Game Module](./game.md)
**Level 3 - Depends on: all modules**

Game orchestration and coordination layer.

- Game (main game class)
- GameLoop (fixed timestep loop)
- SystemsCoordinator (system initialization and coordination)
- InputHandler (high-level input handling)
- Managers (creature, multiplayer, shader managers)

**Import**: `@game/*`

---

## Quick Reference

### Import Paths

```typescript
// Core utilities
import { GAME_CONFIG } from '@core/constants'
import { getPooledVector3 } from '@core/utils'

// Game systems
import { CreatureManager } from '@systems/creatures'
import { TerrainSystem } from '@systems/terrain'
import { CameraController } from '@systems/camera'

// Rendering
import { SceneManager } from '@rendering/scene'
import { ShaderManager } from '@rendering/shaders'
import { VisualEffectsManager } from '@rendering/visual-effects'

// UI
import { UIManager } from '@ui/managers'
import { DebugPanel } from '@ui/debug'

// Multiplayer
import { WebRTCPeer } from '@multiplayer/webrtc'
import { StateSync } from '@multiplayer/state-sync'

// Game orchestration
import { Game } from '@game'
import { GameLoop } from '@game'
```

### Dependency Rules

1. **Level 0 (core)**: No dependencies on other modules
2. **Level 1 (systems)**: Can only depend on core
3. **Level 2 (rendering, ui, multiplayer)**: Can depend on core and systems
4. **Level 3 (game)**: Can depend on any module

**Rule**: Lower-level modules cannot import from higher-level modules.

### Module Responsibilities

| Module | Responsibility | Examples |
|--------|---------------|----------|
| **core** | Utilities, constants, types | Math utils, object pooling, game config |
| **systems** | Game logic and systems | Creatures, terrain, camera, audio |
| **rendering** | Visual rendering | Scene, shaders, effects, textures |
| **ui** | User interface | Gallery, settings, debug panel |
| **multiplayer** | P2P networking | WebRTC, state sync, peer avatars |
| **game** | Orchestration | Game loop, system coordination |

## Getting Started

1. **New to the codebase?** Start with [Core Module](./core.md) to understand the foundation
2. **Working on game logic?** See [Systems Module](./systems.md)
3. **Working on visuals?** See [Rendering Module](./rendering.md)
4. **Working on UI?** See [UI Module](./ui.md)
5. **Working on multiplayer?** See [Multiplayer Module](./multiplayer.md)
6. **Understanding the big picture?** See [Game Module](./game.md)

## Additional Resources

- [Project Structure](../structure.md) - Overall architecture and organization
- [Migration Guide](../migration-guide.md) - Guide for navigating the new structure
- [Architecture](../architecture.md) - Technical architecture and design decisions

## Contributing

When adding new functionality:

1. **Choose the right module** based on responsibility
2. **Follow dependency rules** (don't import from higher-level modules)
3. **Use barrel exports** to define public APIs
4. **Document your code** with JSDoc comments
5. **Update this documentation** when adding new modules or major features
