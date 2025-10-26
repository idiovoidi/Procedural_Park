# Project Structure

## Source Organization

```
src/
├── Core Systems
│   ├── main.ts              # Entry point, game initialization
│   ├── game.ts              # Main game loop, system coordination
│   ├── scene.ts             # 3D scene management
│   ├── camera.ts            # Camera controller (ride + free roam)
│   ├── input-manager.ts     # Centralized input handling
│   └── constants.ts         # Game configuration constants
│
├── Game Systems
│   ├── creatures.ts         # Creature generation and animation
│   ├── creature_behaviour.ts # AI behavior patterns
│   ├── terrain-system.ts    # Procedural terrain generation
│   ├── park-structures.ts   # Buildings and landmarks
│   ├── photo-system.ts      # Photography mechanics and scoring
│   ├── audio.ts             # Audio generation and management
│   ├── video-recorder.ts    # Screen recording
│   └── environment-interactions.ts # Creature-environment interactions
│
├── Visual Systems
│   ├── visual-effects/      # Post-processing effects
│   │   ├── VisualEffectsManager.ts
│   │   ├── CRTFilter.ts
│   │   ├── FilmGrainFilter.ts
│   │   └── ChromaticAberrationFilter.ts
│   ├── shaders/             # GLSL shader programs
│   │   ├── ShaderManager.ts
│   │   ├── InscryptionShader.ts
│   │   └── ShaderDebugUI.ts
│   └── textures.ts          # Texture management
│
├── Multiplayer
│   ├── multiplayer/
│   │   ├── types.ts         # Shared types and interfaces
│   │   ├── WebRTCPeer.ts    # WebRTC connection wrapper
│   │   ├── StateSync.ts     # Binary state synchronization
│   │   ├── PeerAvatar.ts    # Peer rendering in 3D scene
│   │   ├── ConnectionUI.ts  # Connection UI components
│   │   └── WebRTCMultiplayer.ts # Main multiplayer coordinator
│   │   ├── webrtc/          # WebRTC implementation
│   │   ├── colyseus/        # Legacy Colyseus implementation
│   │   └── common/          # Shared multiplayer utilities
│
├── UI & Utilities
│   ├── ui.ts                # User interface and HUD
│   ├── debug.ts             # Debug panel and performance monitoring
│   ├── utils.ts             # Object pools, memoization, math helpers
│   └── counter.ts           # Utility counter
│
└── Types & Assets
    ├── types/               # TypeScript type definitions
    ├── polyfills.ts         # Browser compatibility polyfills
    ├── style.css            # Global styles
    └── vite-env.d.ts        # Vite environment types
```

## Architecture Patterns

### Modular System Design
Each major system (camera, creatures, audio, etc.) is encapsulated in its own module with clear responsibilities. The `Game` class coordinates all systems.

### Input Management
Centralized input handling through `InputManager` with action-based bindings, priority system, and context awareness (game/ui/menu).

### Event-Driven Communication
Systems communicate via callbacks and event handlers rather than direct coupling. Example: photo system triggers audio callbacks on shutter.

### Object Pooling
Performance-critical objects (Vector3, Color) use pooling to reduce garbage collection pressure (see `utils.ts`).

### Configuration Constants
All magic numbers and configuration values centralized in `constants.ts` using `GAME_CONFIG` object.

### Procedural Generation
Seeded random number generators ensure deterministic creature and world generation for consistency.

## Key Conventions

- **File naming**: kebab-case for files (e.g., `input-manager.ts`)
- **Class naming**: PascalCase (e.g., `InputManager`, `CameraController`)
- **Constants**: SCREAMING_SNAKE_CASE in `GAME_CONFIG` object
- **Type definitions**: Separate `types/` folder for shared interfaces
- **Shader code**: GLSL shaders in dedicated `shaders/` folder
- **No default exports**: Use named exports for better refactoring
