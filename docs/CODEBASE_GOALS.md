# AI Snap - Codebase Goals & Vision

## Project Vision

AI Snap is a 3D wildlife photography game where players explore a procedurally generated safari park, observe creatures in their natural habitat, capture stunning photos, and interact with wildlife through feeding mechanics. The game emphasizes discovery, photography scoring, and creature collection in a relaxing, exploration-focused experience.

## Core Design Principles

### 1. Modular Architecture

- **Self-contained systems**: Each major feature (camera, creatures, audio, terrain) operates independently
- **Centralized coordination**: The `Game` class orchestrates all systems without tight coupling
- **Event-driven communication**: Systems communicate via callbacks and event handlers, not direct method calls

### 2. Configuration-Driven Development

- **No magic numbers**: All constants live in `src/core/constants/game-config.ts`
- **Easy tuning**: Game balance adjustments require only config changes
- **Consistent values**: Shared constants prevent desynchronization

### 3. Performance Optimization

- **Object pooling**: Reuse Vector3, Color, and frequently allocated objects
- **Deterministic generation**: Seeded RNG ensures reproducible procedural content
- **Efficient rendering**: Post-processing pipeline with performance monitoring

### 4. Extensibility

- **Plugin-ready systems**: New features integrate without modifying core systems
- **Type-safe interfaces**: TypeScript ensures contract compliance
- **Barrel exports**: Clean module boundaries with index.ts files

## Game Systems Overview

### Core Gameplay Loop

1. **Exploration**: Players ride through or freely roam the procedurally generated park
2. **Discovery**: Encounter 60+ unique creatures with varied behaviors and rarities
3. **Photography**: Capture photos scored on distance, framing, and creature rarity
4. **Economy**: Earn Safari Coins from photos and feeding to purchase food
5. **Feeding**: Use food items to make creatures pose for better photos
6. **Collection**: Build a creature collection through photography

### Major Systems

#### Camera System (`src/systems/camera/`)`

**Goal**: Provide smooth, intuitive camera controls for both guided and free exploration`

- **Ride Mode**: Automated path following with cinematic camera movement
- **Free Roam Mode**: WASD + mouse controls for manual exploration
- **Smooth transitions**: Seamless mode switching without jarring camera jumps

#### Creature System (`src/systems/creatures/`)

**Goal**: Generate diverse, believable wildlife with emergent behaviors

- **Procedural generation**: 60+ unique creatures from anatomy templates
- **Behavior AI**: Idle, wandering, curious, fleeing, posing states
- **Rarity tiers**: Common to legendary creatures with discovery rewards
- **Environment interaction**: Creatures respond to terrain and player presence

#### Photo System (`src/systems/photo/`)

**Goal**: Reward skillful photography with meaningful scoring

- **Multi-factor scoring**: Distance (40%), framing (40%), rarity (20%)
- **Instant feedback**: Visual score display with breakdown
- **Gallery system**: Persistent photo collection with metadata
- **Creature cards**: Exportable creature information cards

#### Food & Economy System (`src/systems/food/`, `src/systems/currency/`)

**Goal**: Create engaging creature interaction and resource management

- **Food types**: Berry, meat, fish, crystal, energy with archetype preferences
- **Feeding mechanics**: Creatures react based on food effectiveness
- **Pose bonus**: Well-fed creatures pose for better photos
- **Currency loop**: Earn coins from activities, spend at food store

#### Audio System (`src/systems/audio/`)

**Goal**: Immersive soundscape with procedural audio generation

- **Web Audio API**: Real-time sound synthesis
- **Creature sounds**: Unique audio profiles per creature
- **Ambient layers**: Forest, wind, birds create atmosphere
- **Spatial audio**: 3D positioning for creature sounds

#### Terrain System (`src/systems/terrain/`)

**Goal**: Varied, explorable environments with distinct biomes

- **Biome system**: Forest, meadow, rocky, wetland, crystal cave, floating islands
- **Procedural generation**: Noise-based terrain with smooth transitions
- **Visual variety**: Color palettes and vegetation per biome

#### Multiplayer System (`src/multiplayer/`)

**Goal**: Shared exploration without server infrastructure

- **WebRTC P2P**: Serverless peer-to-peer connections
- **State synchronization**: Binary protocol for efficient updates
- **Peer avatars**: See other players exploring the park
- **Photo events**: Share photography moments

#### UI System (`src/ui/`)

**Goal**: Clean, non-intrusive interface that enhances gameplay

- **Modular components**: Gallery, settings, shortcuts, stats, inventory
- **Context-aware**: UI adapts to game state
- **Accessibility**: Keyboard shortcuts for all actions
- **Visual feedback**: Toasts, animations, score displays

## Technical Goals

### Code Quality

- **TypeScript strict mode**: Catch errors at compile time
- **Consistent naming**: kebab-case files, PascalCase classes, SCREAMING_SNAKE_CASE constants
- **Documentation**: JSDoc comments for public APIs
- **No default exports**: Named exports only for better refactoring

### Performance Targets

- **60 FPS**: Maintain smooth framerate on modern hardware
- **Fast loading**: < 2 second initial load time
- **Memory efficiency**: Object pooling prevents GC pressure
- **Scalable rendering**: LOD and culling for large scenes

### Browser Compatibility

- **Modern browsers**: Chrome/Edge 90+, Firefox 88+, Safari 14+
- **WebGL 2.0**: Required for advanced rendering
- **ES2022**: Modern JavaScript features
- **Progressive enhancement**: Graceful degradation for older browsers

### Build & Deployment

- **Vite**: Fast HMR development, optimized production builds
- **Static hosting**: No server required (GitHub Pages, Vercel, Netlify)
- **Tree shaking**: Remove unused code
- **Code splitting**: Separate chunks for Three.js and post-processing

## Feature Roadmap

### Implemented ✅

- Procedural creature generation with 60+ unique species
- Dual camera modes (ride/free roam)
- Photography scoring system
- Creature collection and gallery
- Food system with feeding mechanics
- Currency economy with food store
- Multiplayer WebRTC support
- Visual effects pipeline (CRT, film grain, chromatic aberration)
- Save/load system with multiple slots
- Biome system with 6 distinct environments
- Video recording (30s clips)

### Planned 🎯

- **Achievements system**: Unlock rewards for milestones
- **Daily challenges**: Time-limited photography objectives
- **Creature behaviors**: More complex AI patterns (herding, hunting, nesting)
- **Weather system**: Dynamic weather affecting creature behavior
- **Time of day**: Day/night cycle with different creature spawns
- **Photo contests**: Compare scores with other players
- **Creature breeding**: Rare hybrid creatures
- **Park customization**: Place decorations and structures
- **Mobile support**: Touch controls and responsive UI

### Future Considerations 💭

- **VR support**: First-person photography in VR
- **Mod support**: Custom creatures and biomes
- **Seasonal events**: Limited-time creatures and items
- **Social features**: Share photos on social media
- **Creature AI learning**: Creatures remember player interactions
- **Ecosystem simulation**: Food chains and population dynamics

## Development Workflow

### Adding New Features

1. **Design**: Define feature goals and system boundaries
2. **Types**: Create TypeScript interfaces in `src/types/`
3. **Implementation**: Build system in appropriate `src/systems/` folder
4. **Integration**: Connect to `SystemsCoordinator` and `Game`
5. **Configuration**: Add constants to `game-config.ts`
6. **UI**: Create components in `src/ui/components/`
7. **Input**: Register actions in `InputManager`
8. **Testing**: Manual testing in development mode
9. **Documentation**: Update relevant docs

### Code Organization Rules

- **Core systems** → `src/systems/[system-name]/`
- **Rendering** → `src/rendering/[scene|shaders|textures]/`
- **Game logic** → `src/game/`
- **UI components** → `src/ui/components/`
- **UI managers** → `src/ui/managers/`
- **Types** → `src/types/` or `src/[system]/types.ts`
- **Constants** → `src/core/constants/`
- **Utilities** → `src/core/utils/`

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `creature-behavior.ts`)
- **Classes**: `PascalCase` (e.g., `CreatureManager`)
- **Interfaces**: `PascalCase` (e.g., `FoodItem`)
- **Constants**: `SCREAMING_SNAKE_CASE` in `GAME_CONFIG` object
- **Functions**: `camelCase` (e.g., `calculatePhotoReward`)
- **Private methods**: `camelCase` with `private` keyword

## Success Metrics

### Player Experience

- **Engagement**: Average session length > 15 minutes
- **Discovery**: Players photograph 80%+ of creature types
- **Retention**: 50%+ return for second session
- **Satisfaction**: Positive feedback on photography mechanics

### Technical Performance

- **Frame rate**: Maintain 60 FPS on target hardware
- **Load time**: < 2 seconds to playable state
- **Memory**: < 500MB RAM usage
- **Bundle size**: < 5MB gzipped

### Code Health

- **Type coverage**: 100% TypeScript strict mode
- **Build success**: Zero TypeScript errors
- **Maintainability**: New features integrate without refactoring
- **Documentation**: All public APIs documented

## Contributing Guidelines

### Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Keep functions focused and small (< 50 lines)
- Prefer composition over inheritance

### Pull Request Process

1. Create feature branch from `main`
2. Implement feature following architecture guidelines
3. Test thoroughly in development mode
4. Update documentation
5. Submit PR with clear description
6. Address review feedback

### Testing

- Manual testing in development mode
- Test all input methods (keyboard, mouse)
- Verify performance with debug panel
- Check browser console for errors
- Test save/load functionality

## Architecture Decisions

### Why Three.js?

- Industry-standard 3D library
- Excellent documentation and community
- WebGL abstraction without overhead
- Rich ecosystem of tools and examples

### Why Vite?

- Lightning-fast HMR for rapid development
- Optimized production builds
- Native ES modules support
- Simple configuration

### Why WebRTC for Multiplayer?

- No server infrastructure required
- Low latency peer-to-peer connections
- Suitable for small group exploration
- Reduces hosting costs

### Why Procedural Generation?

- Infinite variety from limited assets
- Smaller bundle size
- Deterministic with seeds for reproducibility
- Encourages exploration and discovery

### Why No Framework?

- Vanilla JavaScript for maximum control
- Smaller bundle size
- No framework lock-in
- Educational value for learning Three.js

## Conclusion

AI Snap aims to be a polished, performant wildlife photography game that demonstrates modern web game development techniques. The codebase prioritizes modularity, performance, and extensibility while maintaining clean architecture and developer-friendly patterns. Every system is designed to be understandable, maintainable, and fun to work with.
