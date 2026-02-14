# AI Snap - Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Game Class                          │
│  (Main coordinator, initializes and connects all systems)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SystemsCoordinator                        │
│         (Initializes and wires up all subsystems)          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Rendering  │    │  Game Logic  │    │   Systems    │
│   Systems    │    │   Systems    │    │  Management  │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Core Systems

### 1. Game Loop (`src/game/GameLoop.ts`)
**Responsibility**: Main update cycle coordination

```typescript
┌─────────────────────────────────────┐
│          GameLoop.update()          │
├─────────────────────────────────────┤
│ 1. Calculate deltaTime              │
│ 2. Check state (paused?)            │
│ 3. Update input manager             │
│ 4. Update camera controller         │
│ 5. Update creatures                 │
│ 6. Update food manager              │
│ 7. Update scene (animations)        │
│ 8. Update multiplayer               │
│ 9. Update debug panel               │
│ 10. Render scene                    │
└─────────────────────────────────────┘
```

### 2. State Management (`src/systems/state/`)
**Responsibility**: Centralized game state with flow and subsystem states

```
IntegratedStateManager
├── FlowStateManager (game states: loading, playing, paused, etc.)
├── SubsystemStateManager
│   ├── UIState (photos, scores, UI visibility)
│   ├── CameraState (position, mode, settings)
│   └── MultiplayerState (connection, peers)
└── WorldStateManager (save/load system)
```

**State Flow**:
```
loading → menu → playing ⇄ paused
                    ↓
              photo_mode
                    ↓
                gallery
```

### 3. Input System (`src/systems/input/`)
**Responsibility**: Centralized input handling with priority system

```
InputManager
├── Action Bindings (key → action mapping)
├── Context System (game, ui, menu)
├── Priority Queue (higher priority = processed first)
└── Event Callbacks (action → handler)
```

**Input Flow**:
```
Keyboard/Mouse Event
    ↓
InputManager.handleEvent()
    ↓
Check Context & Priority
    ↓
Trigger Action Callbacks
    ↓
System Handlers Execute
```

## Rendering Pipeline

### Scene Graph Structure

```
Scene
├── Terrain (procedurally generated)
├── ParkStructures
│   ├── MainGate
│   ├── RangerStation
│   ├── ExperimentLab
│   ├── FoodStore
│   └── BoundaryFence
├── Creatures (60+ instances)
│   └── CreatureGroup
│       ├── Body Parts (procedural geometry)
│       ├── Materials (color variations)
│       └── Animations (behavior-driven)
├── Lighting
│   ├── DirectionalLight (sun)
│   ├── AmbientLight (global)
│   └── PointLights (structures)
└── Camera (PerspectiveCamera)
```

### Post-Processing Pipeline

```
Raw Scene
    ↓
EffectComposer
    ↓
RenderPass (base scene)
    ↓
ShaderPass (custom effects)
    ├── CRT Simulation
    ├── Film Grain
    ├── Chromatic Aberration
    └── Pixelation
    ↓
Final Output
```

## Data Flow Patterns

### Photography System Flow

```
Player presses 'T'
    ↓
InputManager triggers 'game.takePhoto'
    ↓
Game.takePhoto()
    ↓
PhotoSystem.takePhoto(creatures, camera, scene)
    ├── Find creatures in view
    ├── Calculate distance score
    ├── Calculate framing score
    ├── Calculate rarity bonus
    └── Return PhotoResult
    ↓
SceneManager.capturePhoto() → dataUrl
    ↓
UIManager.addPhotoToGallery(dataUrl, score, name)
    ↓
CurrencyManager.addMoney(reward)
    ↓
UIManager.updateCurrency(balance)
```

### Feeding System Flow

```
Player presses 'F'
    ↓
InputManager triggers 'food.feedCreature'
    ↓
Game.feedCreature()
    ↓
Find nearest creature (< 15m)
    ↓
FoodManager.feedCreature(creature, camera)
    ├── Check cooldown
    ├── Calculate effectiveness
    ├── Determine reaction
    ├── Apply behavior change
    └── Remove food from inventory
    ↓
CurrencyManager.addMoney(reward)
    ↓
UIManager.updateFoodInventory()
```

### Store Purchase Flow

```
Player presses 'O'
    ↓
UIManager.toggleFoodStore()
    ↓
FoodStore.open()
    ├── Load STORE_ITEMS
    ├── Update balance display
    └── Render item grid
    ↓
Player clicks item
    ↓
FoodStore.handlePurchase(itemId, price)
    ↓
CurrencyManager.purchase(price, itemName)
    ├── Check balance
    ├── Deduct money
    └── Record transaction
    ↓
FoodManager.addFood(itemId, quantity)
    ↓
UIManager.updateFoodInventory()
```

## System Dependencies

### Dependency Graph

```
Game
 ├─→ SystemsCoordinator
 │    ├─→ SceneManager
 │    │    ├─→ ParkStructures
 │    │    ├─→ ShaderManager
 │    │    └─→ TextureManager
 │    ├─→ CameraController
 │    │    └─→ InputManager
 │    ├─→ CreatureManager
 │    │    ├─→ AudioManager
 │    │    └─→ PhotoSystem
 │    ├─→ UIManager
 │    │    ├─→ Gallery
 │    │    ├─→ FoodStore
 │    │    ├─→ CurrencyDisplay
 │    │    └─→ [other components]
 │    ├─→ FoodManager
 │    ├─→ CurrencyManager
 │    └─→ MultiplayerManager
 └─→ GameLoop
      └─→ [updates all systems]
```

### Communication Patterns

#### 1. Direct Method Calls
Used for: Synchronous operations within same system
```typescript
this.systems.ui.showToast('Message')
```

#### 2. Callbacks
Used for: Async responses and event handling
```typescript
currency.onBalanceChange((balance) => {
  ui.updateCurrency(balance)
})
```

#### 3. Event Bus (State Manager)
Used for: Cross-system state changes
```typescript
state.onFlowStateChange((newState, prevState) => {
  // Handle state transition
})
```

## Module Organization

### File Structure Pattern

```
src/systems/[system-name]/
├── index.ts              # Barrel export
├── [System]Manager.ts    # Main system class
├── types.ts              # TypeScript interfaces
├── [system]-data.ts      # Static data/configuration
└── [subsystem].ts        # Additional components
```

### Example: Food System

```
src/systems/food/
├── index.ts              # exports FoodManager, types
├── FoodManager.ts        # Core feeding logic
├── types.ts              # FoodItem, FeedingResult
├── food-data.ts          # FOOD_ITEMS definitions
└── store-data.ts         # STORE_ITEMS for shop
```

## Performance Optimizations

### Object Pooling

```typescript
// Vector3 Pool
const vectorPool = {
  pool: [] as THREE.Vector3[],
  get(): THREE.Vector3 {
    return this.pool.pop() || new THREE.Vector3()
  },
  release(v: THREE.Vector3): void {
    v.set(0, 0, 0)
    this.pool.push(v)
  }
}
```

### Memoization

```typescript
// Cache expensive calculations
const memoizedNoise = memoize((x: number, y: number) => {
  return noise.simplex2(x, y)
})
```

### Lazy Loading

```typescript
// Dynamic imports for code splitting
import('@systems/currency/currency-rewards').then(({ calculatePhotoReward }) => {
  const reward = calculatePhotoReward(score)
})
```

## Configuration System

### Constants Hierarchy

```
GAME_CONFIG (src/core/constants/game-config.ts)
├── Creature spawning
│   ├── CREATURE_COUNT: 60
│   └── WORLD_SEED: 1337
├── Camera settings
│   ├── CAMERA_SPEED_DEFAULT: 0.025
│   └── CAMERA_SPEED_FAST: 0.05
├── Photo scoring
│   ├── PHOTO_SCORE_EXCELLENT: 80
│   └── PHOTO_SCORE_GOOD: 40
└── Audio volumes
    ├── AUDIO_CREATURE_BASE: 0.4
    └── AUDIO_FOREST_AMBIENT: 0.6
```

### Usage Pattern

```typescript
import { GAME_CONFIG } from '@core/constants'

// ✅ Good: Use config
if (score >= GAME_CONFIG.PHOTO_SCORE_EXCELLENT) {
  // ...
}

// ❌ Bad: Magic number
if (score >= 80) {
  // ...
}
```

## Multiplayer Architecture

### WebRTC P2P Structure

```
Player A                    Player B
    │                           │
    ├─→ Create Offer ──────────→│
    │                           │
    │←────── Answer ────────────┤
    │                           │
    ├─→ ICE Candidates ←───────→│
    │                           │
    │←─→ Binary State Sync ←───→│
    │   (position, actions)     │
```

### State Synchronization

```typescript
// Binary protocol for efficiency
StateSync.encode(state)
    ↓
[type: 1 byte][data: variable]
    ↓
WebRTC DataChannel
    ↓
StateSync.decode(buffer)
    ↓
Apply to peer avatar
```

## Save/Load System

### World State Structure

```typescript
WorldState {
  version: string
  timestamp: number
  worldSeed: number
  progress: PlayerProgress {
    photoCount: number
    totalScore: number
    creaturesDiscovered: Set<string>
    rarityTiers: Record<Rarity, number>
  }
  camera: CameraState
  photos: SerializedPhoto[]
  settings: GameSettings
  currency: CurrencyData
  foodInventory: FoodItem[]
}
```

### Save Flow

```
Game.handleSave(slotId)
    ↓
createWorldStateSnapshot()
    ├── Gather player progress
    ├── Serialize camera state
    ├── Export photos
    └── Collect settings
    ↓
WorldStateManager.createSave(slotId, snapshot)
    ├── Compress data
    ├── Store in localStorage
    └── Update save list
```

## Error Handling Strategy

### Graceful Degradation

```typescript
try {
  // Attempt feature
  await initializeMultiplayer()
} catch (error) {
  console.error('Multiplayer failed:', error)
  // Continue without multiplayer
  ui.showToast('Multiplayer unavailable')
}
```

### Validation Layers

```
User Input
    ↓
Input Validation (InputManager)
    ↓
Business Logic Validation (System)
    ↓
State Validation (StateManager)
    ↓
Execution
```

## Testing Strategy

### Manual Testing Checklist
- [ ] All keyboard shortcuts work
- [ ] Camera modes switch smoothly
- [ ] Photos score correctly
- [ ] Currency updates properly
- [ ] Store purchases work
- [ ] Feeding mechanics function
- [ ] Save/load preserves state
- [ ] Multiplayer connects
- [ ] Performance stays at 60 FPS

### Debug Tools
- Debug panel (F12): FPS, memory, system status
- State machine panel (dev mode): Current state, transitions
- Console logging: System events, errors
- Browser DevTools: Network, performance profiling

## Deployment Pipeline

```
Development
    ↓
npm run build
    ↓
Vite Build Process
    ├── TypeScript compilation
    ├── Tree shaking
    ├── Code splitting
    ├── Minification
    └── Asset optimization
    ↓
dist/ folder
    ↓
Static Hosting (GitHub Pages, Vercel, Netlify)
```

## Future Architecture Considerations

### Scalability
- **More creatures**: Spatial partitioning for culling
- **Larger worlds**: Chunk-based loading
- **More players**: Relay server for > 4 players

### Extensibility
- **Plugin system**: Load custom creatures/biomes
- **Mod API**: Expose safe subset of game systems
- **Event hooks**: Allow mods to react to game events

### Performance
- **Web Workers**: Offload procedural generation
- **WASM**: Performance-critical calculations
- **Streaming**: Progressive asset loading
