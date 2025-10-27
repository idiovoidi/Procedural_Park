# Migration Guide: Modular Codebase Restructure

## Overview

This guide explains the changes made during the modular codebase restructure and how to navigate the new structure. The restructure organizes code by domain and responsibility, making the codebase more maintainable and easier to understand.

## What Changed

The codebase has been reorganized from a flat `src/` directory structure into a hierarchical module-based architecture with clear domain boundaries and dependencies.

### Key Changes

1. **Module Organization**: Code is now organized into domain-based modules (`core/`, `systems/`, `rendering/`, `ui/`, `multiplayer/`, `game/`)
2. **Path Aliases**: New import paths using `@domain/module` format
3. **Barrel Exports**: Each module has an `index.ts` that exports its public API
4. **File Splitting**: Large files have been refactored into smaller, focused modules
5. **Clear Dependencies**: Unidirectional dependency flow from low-level to high-level modules

## Import Path Mappings

### Core Utilities

| Old Path | New Path | Notes |
|----------|----------|-------|
| `./constants` | `@core/constants` | Split into game-config, biome-config, physics |
| `./utils` | `@core/utils` | Split into math, pooling, random |
| `./types/*` | `@core/types` | Shared type definitions |

**Example**:
```typescript
// Before
import { GAME_CONFIG, TAU } from './constants'
import { getPooledVector3, memoizedSin } from './utils'

// After
import { GAME_CONFIG } from '@core/constants/game-config'
import { TAU } from '@core/constants/physics'
import { getPooledVector3 } from '@core/utils/pooling'
import { memoizedSin } from '@core/utils/math'

// Or use barrel exports
import { GAME_CONFIG, TAU } from '@core/constants'
import { getPooledVector3, memoizedSin } from '@core/utils'
```

### Game Systems

| Old Path | New Path | Notes |
|----------|----------|-------|
| `./creatures` | `@systems/creatures` | Refactored into multiple files |
| `./creature_behaviour` | `@systems/creatures` | Now creature-behavior.ts |
| `./terrain-system` | `@systems/terrain` | Moved to systems module |
| `./audio` | `@systems/audio` | Refactored into AudioManager + sound-generator |
| `./camera` | `@systems/camera` | Moved to systems module |
| `./photo-system` | `@systems/photo` | Refactored into PhotoSystem + scoring |
| `./input-manager` | `@systems/input` | Moved to systems module |
| `./state-machine` | `@systems/state` | All state files moved here |
| `./state-integration` | `@systems/state` | All state files moved here |
| `./subsystem-state-manager` | `@systems/state` | All state files moved here |

**Example**:
```typescript
// Before
import { CreatureManager } from './creatures'
import { TerrainSystem } from './terrain-system'
import { AudioManager } from './audio'
import { CameraController } from './camera'

// After
import { CreatureManager } from '@systems/creatures'
import { TerrainSystem } from '@systems/terrain'
import { AudioManager } from '@systems/audio'
import { CameraController } from '@systems/camera'
```

### Rendering Systems

| Old Path | New Path | Notes |
|----------|----------|-------|
| `./scene` | `@rendering/scene` | Moved to rendering module |
| `./environment-interactions` | `@rendering/scene` | Now part of scene module |
| `./park-structures` | `@rendering/scene` | Now part of scene module |
| `./shaders/*` | `@rendering/shaders` | Moved to rendering module |
| `./visual-effects/*` | `@rendering/visual-effects` | Moved to rendering module |
| `./textures` | `@rendering/textures` | Moved to rendering module |

**Example**:
```typescript
// Before
import { SceneManager } from './scene'
import { ShaderManager } from './shaders/ShaderManager'
import { VisualEffectsManager } from './visual-effects/VisualEffectsManager'

// After
import { SceneManager } from '@rendering/scene'
import { ShaderManager } from '@rendering/shaders'
import { VisualEffectsManager } from '@rendering/visual-effects'
```

### UI Systems

| Old Path | New Path | Notes |
|----------|----------|-------|
| `./ui` | `@ui/managers` | Refactored into components + managers |
| `./debug` | `@ui/debug` | Moved to ui/debug |
| `./shaders/ShaderDebugUI` | `@ui/debug` | Moved to ui/debug |

**Example**:
```typescript
// Before
import { UIManager } from './ui'
import { DebugPanel } from './debug'

// After
import { UIManager } from '@ui/managers'
import { DebugPanel } from '@ui/debug'
```

### Multiplayer Systems

| Old Path | New Path | Notes |
|----------|----------|-------|
| `./multiplayer/WebRTCPeer` | `@multiplayer/webrtc` | Reorganized into submodules |
| `./multiplayer/ConnectionUI` | `@multiplayer/webrtc` | Reorganized into submodules |
| `./multiplayer/StateSync` | `@multiplayer/state-sync` | Reorganized into submodules |
| `./multiplayer/PeerAvatar` | `@multiplayer/peer-avatar` | Reorganized into submodules |

**Example**:
```typescript
// Before
import { WebRTCPeer } from './multiplayer/WebRTCPeer'
import { StateSync } from './multiplayer/StateSync'
import { PeerAvatar } from './multiplayer/PeerAvatar'

// After
import { WebRTCPeer } from '@multiplayer/webrtc'
import { StateSync } from '@multiplayer/state-sync'
import { PeerAvatar } from '@multiplayer/peer-avatar'
```

### Game Orchestration

| Old Path | New Path | Notes |
|----------|----------|-------|
| `./game` | `@game` | Remains in game directory |
| `./GameLoop` | `@game` | Remains in game directory |
| `./SystemsCoordinator` | `@game` | Remains in game directory |
| `./InputHandler` | `@game` | Remains in game directory |

**Example**:
```typescript
// Before
import { Game } from './game'
import { GameLoop } from './GameLoop'

// After
import { Game } from '@game'
import { GameLoop } from '@game'
```

## Finding Files in the New Structure

### By Functionality

**Looking for creature-related code?**
- Generation logic: `src/systems/creatures/creature-generator.ts`
- Mesh building: `src/systems/creatures/creature-builder.ts`
- AI behavior: `src/systems/creatures/creature-behavior.ts`
- Pooling: `src/systems/creatures/creature-pool.ts`
- Types: `src/systems/creatures/types.ts`

**Looking for rendering code?**
- Scene management: `src/rendering/scene/SceneManager.ts`
- Shaders: `src/rendering/shaders/`
- Visual effects: `src/rendering/visual-effects/`
- Textures: `src/rendering/textures/`

**Looking for UI code?**
- UI components: `src/ui/components/`
- UI manager: `src/ui/managers/UIManager.ts`
- Debug panels: `src/ui/debug/`

**Looking for multiplayer code?**
- WebRTC: `src/multiplayer/webrtc/`
- State sync: `src/multiplayer/state-sync/`
- Peer avatars: `src/multiplayer/peer-avatar/`

**Looking for utilities?**
- Math utilities: `src/core/utils/math.ts`
- Object pooling: `src/core/utils/pooling.ts`
- Random utilities: `src/core/utils/random.ts`

**Looking for constants?**
- Game config: `src/core/constants/game-config.ts`
- Biome config: `src/core/constants/biome-config.ts`
- Physics constants: `src/core/constants/physics.ts`

### By Module

```
src/
├── core/           → Utilities, constants, types (no dependencies)
├── systems/        → Game systems (creatures, terrain, audio, camera, etc.)
├── rendering/      → Rendering systems (scene, shaders, effects, textures)
├── ui/             → User interface (components, managers, debug)
├── multiplayer/    → Multiplayer systems (webrtc, state-sync, peer-avatar)
├── game/           → Game orchestration (Game, GameLoop, coordinators)
└── main.ts         → Entry point
```

## Common Migration Patterns

### Pattern 1: Updating Imports in Existing Files

```typescript
// Before
import { GAME_CONFIG } from './constants'
import { TerrainSystem } from './terrain-system'
import { CameraController } from './camera'
import { getPooledVector3 } from './utils'

// After
import { GAME_CONFIG } from '@core/constants'
import { TerrainSystem } from '@systems/terrain'
import { CameraController } from '@systems/camera'
import { getPooledVector3 } from '@core/utils'
```

### Pattern 2: Importing from Refactored Modules

Some large files have been split into multiple smaller files. Use barrel exports to import:

```typescript
// Before (creatures.ts had everything)
import { CreatureManager, generateAnatomy, buildCreature } from './creatures'

// After (split into multiple files, but barrel export provides same API)
import { CreatureManager, generateAnatomy, buildCreature } from '@systems/creatures'

// Or import from specific files if needed
import { generateAnatomy } from '@systems/creatures/creature-generator'
import { buildCreature } from '@systems/creatures/creature-builder'
```

### Pattern 3: Importing Types

```typescript
// Before
import { Anatomy, CreatureInstance } from './creatures'

// After (use type imports for better tree-shaking)
import type { Anatomy, CreatureInstance } from '@systems/creatures'
```

### Pattern 4: Relative Imports Within a Module

Within a module, you can still use relative imports:

```typescript
// In src/systems/creatures/creature-builder.ts
import { generateAnatomy } from './creature-generator'
import type { Anatomy } from './types'

// Or use the path alias
import { generateAnatomy } from '@systems/creatures/creature-generator'
import type { Anatomy } from '@systems/creatures/types'
```

## Module Dependencies

Understanding the dependency hierarchy helps you know what you can import:

```
Level 0: core/              → No dependencies
Level 1: systems/           → Can import from: core/
Level 2: rendering/         → Can import from: core/, systems/
Level 2: ui/                → Can import from: core/, systems/
Level 2: multiplayer/       → Can import from: core/, systems/
Level 3: game/              → Can import from: anywhere
```

**Rule**: Lower-level modules cannot import from higher-level modules. This prevents circular dependencies.

## Troubleshooting

### Import Not Found

If you get an import error:

1. **Check the path alias**: Make sure you're using `@domain/module` format
2. **Check the barrel export**: The item might not be exported from `index.ts`
3. **Import from specific file**: Try importing directly from the file: `@systems/creatures/creature-generator`

### Circular Dependency

If you encounter a circular dependency:

1. **Check dependency levels**: You might be importing from a higher-level module
2. **Extract shared code**: Move shared code to a lower-level module (usually `core/`)
3. **Use dependency injection**: Pass dependencies as parameters instead of importing

### Type Errors After Migration

If you get type errors:

1. **Update type imports**: Use `import type` for type-only imports
2. **Check barrel exports**: Make sure types are exported from `index.ts`
3. **Rebuild**: Run `npm run build` to ensure TypeScript picks up changes

### Module Not Resolved

If Vite can't resolve a module:

1. **Check `vite.config.ts`**: Ensure path aliases are configured
2. **Check `tsconfig.json`**: Ensure TypeScript paths are configured
3. **Restart dev server**: Sometimes Vite needs a restart to pick up config changes

## Benefits of the New Structure

### Improved Discoverability
- Files are organized by domain, making them easier to find
- Clear module boundaries help you understand what each part does

### Better Maintainability
- Smaller, focused files are easier to understand and modify
- Clear dependencies make it easier to reason about changes

### Reduced Coupling
- Modules have minimal public APIs through barrel exports
- Unidirectional dependencies prevent tangled code

### Easier Testing
- Smaller modules are easier to test in isolation
- Clear dependencies make mocking easier

### Better Performance
- Tree-shaking works better with explicit exports
- Code splitting opportunities for lazy loading

## Next Steps

1. **Read the structure documentation**: See `docs/structure.md` for detailed module descriptions
2. **Explore the modules**: Browse the new directory structure to familiarize yourself
3. **Update your code**: Use this guide to update any custom code or branches
4. **Check module docs**: See `docs/modules/` for detailed documentation on each module

## Questions?

If you have questions about the new structure or need help migrating code:

1. Check `docs/structure.md` for module details
2. Check `docs/modules/` for specific module documentation
3. Look at existing code for examples of the new patterns
4. The barrel exports (`index.ts` files) show what's public in each module
