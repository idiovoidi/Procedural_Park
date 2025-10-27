---
inclusion: always
---

# Project Structure & Architecture

## Core Architecture Principles

- **Modular System Design**: Each system (camera, creatures, audio, terrain) is self-contained. The `Game` class in `src/game.ts` coordinates all systems.
- **Centralized Configuration**: All magic numbers and settings live in `src/constants.ts` via the `GAME_CONFIG` object. Never hardcode values.
- **Object Pooling**: Reuse Vector3, Color, and other frequently allocated objects via pools in `src/utils.ts` to minimize GC pressure.
- **Event-Driven Communication**: Systems use callbacks and event handlers, not direct coupling. Example: photo system triggers audio via callbacks.
- **Deterministic Generation**: Use seeded RNG for procedural content to ensure reproducibility.

## File Organization

### Core Systems (`src/`)

- `main.ts` - Entry point, initializes game
- `game.ts` - Main loop, system coordinator
- `scene.ts` - Three.js scene management
- `camera.ts` - Camera controller (ride/free roam modes)
- `input-manager.ts` - Centralized input with action bindings and priority
- `constants.ts` - All configuration constants

### Game Systems (`src/`)

- `creatures.ts` - Creature generation and animation
- `creature_behaviour.ts` - AI behavior patterns
- `terrain-system.ts` - Procedural terrain
- `park-structures.ts` - Buildings and landmarks
- `photo-system.ts` - Photography scoring (distance, framing, rarity)
- `audio.ts` - Web Audio API procedural generation
- `video-recorder.ts` - Screen recording (30s max)
- `environment-interactions.ts` - Creature-environment logic

### Visual Systems

- `src/visual-effects/` - Post-processing (CRT, film grain, chromatic aberration)
- `src/shaders/` - GLSL shaders with ShaderManager
- `src/textures.ts` - Texture management

### Multiplayer (`src/multiplayer/`)

- `WebRTCMultiplayer.ts` - Main coordinator
- `WebRTCPeer.ts` - Peer connection wrapper
- `StateSync.ts` - Binary state synchronization
- `PeerAvatar.ts` - Peer rendering
- `ConnectionUI.ts` - UI components
- `webrtc/` - WebRTC implementation
- `colyseus/` - Legacy (avoid for new features)

### UI & Utilities (`src/`)

- `ui.ts` - HUD and interface
- `debug.ts` - Debug panel and performance monitoring
- `utils.ts` - Pools, memoization, math helpers

## Naming Conventions

- **Files**: kebab-case (`input-manager.ts`, `creature-behaviour.ts`)
- **Classes**: PascalCase (`InputManager`, `CameraController`, `WebRTCPeer`)
- **Constants**: SCREAMING_SNAKE_CASE in `GAME_CONFIG` object
- **Exports**: Named exports only (no default exports)

## Code Style Rules

- Place type definitions in `src/types/` for shared interfaces
- Store GLSL shaders in `src/shaders/` folder
- Access config via `GAME_CONFIG` from `constants.ts`
- Use object pools from `utils.ts` for Vector3, Color, etc.
- Handle input through `InputManager` action bindings, not raw event listeners
- Communicate between systems via callbacks, not direct method calls

## When Adding Features

- New game systems go in `src/` root (e.g., `weather-system.ts`)
- Visual effects go in `src/visual-effects/`
- Multiplayer features go in `src/multiplayer/`
- Add configuration to `GAME_CONFIG` in `constants.ts`
- Register input actions in `InputManager` if needed
- Use seeded RNG for any procedural generation
