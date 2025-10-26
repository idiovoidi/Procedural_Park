# Object Pooling Guide

Object pooling is a performance optimization technique that reuses objects instead of constantly creating and destroying them. This reduces garbage collection pressure and improves frame rates.

## Overview

The game now includes three pooling systems:

1. **Basic Object Pools** - For Three.js primitives (Vector3, Vector2, Color)
2. **Creature Pool** - For efficient creature spawning/despawning
3. **Particle System** - For visual effects with automatic pooling

## Basic Object Pools

Located in `src/utils.ts`, these pools handle common Three.js objects.

### Usage

```typescript
import { getPooledVector3, releaseVector3 } from './utils'

// Get a vector from the pool
const velocity = getPooledVector3(1, 2, 3)

// Use it
position.add(velocity)

// Release it back to the pool when done
releaseVector3(velocity)
```

### Available Pools

- `vector3Pool` - THREE.Vector3 objects
- `vector2Pool` - THREE.Vector2 objects  
- `colorPool` - THREE.Color objects

### Helper Functions

```typescript
// Get pooled objects
const vec3 = getPooledVector3(x, y, z)
const vec2 = getPooledVector2(x, y)
const color = getPooledColor(r, g, b)

// Release back to pool
releaseVector3(vec3)
releaseVector2(vec2)
// Note: No release function for colors yet
```

## Creature Pool

Located in `src/creature-pool.ts`, manages creature lifecycle efficiently.

### Setup

```typescript
import { CreaturePool } from './creature-pool'

const creaturePool = new CreaturePool(
  scene,
  20,   // Initial pool size
  100   // Maximum pool size
)
```

### Spawning Creatures

```typescript
// Spawn at specific position
const creature = creaturePool.spawn(
  new THREE.Vector3(10, 0, 10),
  12345  // Optional seed for deterministic generation
)

// Spawn multiple creatures
for (let i = 0; i < 10; i++) {
  const pos = new THREE.Vector3(
    Math.random() * 100 - 50,
    0,
    Math.random() * 100 - 50
  )
  creaturePool.spawn(pos)
}
```

### Despawning Creatures

```typescript
// Despawn specific creature
creaturePool.despawn(creature)

// Despawn all creatures
creaturePool.despawnAll()
```

### Updating Creatures

```typescript
function gameLoop(dt: number, tSec: number, camera: THREE.Camera) {
  // Updates all active creatures
  creaturePool.update(dt, tSec, camera)
}
```

### Getting Creature Data

```typescript
// Get all active creature instances
const allCreatures = creaturePool.getAllInstances()

// Get count
const count = creaturePool.getActiveCount()

// Get statistics
const stats = creaturePool.getStats()
console.log(stats)
// { active: 15, pooled: 5, total: 20 }
```

## Particle System

Located in `src/particle-system.ts`, provides visual effects with automatic pooling.

### Setup

```typescript
import { ParticleSystem } from './particle-system'

const particleSystem = new ParticleSystem(
  scene,
  100,  // Initial pool size
  500   // Maximum pool size
)
```

### Particle Types

- `dust` - Ground dust clouds
- `splash` - Water splashes
- `sparkle` - Magical sparkles
- `leaf` - Falling leaves
- `feather` - Floating feathers

### Emitting Particles

```typescript
// Emit a burst of particles
particleSystem.emitBurst(
  'sparkle',                    // Particle type
  new THREE.Vector3(0, 2, 0),  // Position
  20                            // Count
)

// Emit with custom options
particleSystem.emitBurst('splash', position, 15, {
  velocity: new THREE.Vector3(0, 5, 0),
  color: new THREE.Color(0x00ffff),
  size: 0.2,
  lifetime: 2.0
})

// Emit single particle with full control
particleSystem.emit({
  position: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(1, 2, 0),
  color: new THREE.Color(0xff0000),
  size: 0.15,
  lifetime: 1.5,
  gravity: -9.8,
  fadeOut: true
})
```

### Updating Particles

```typescript
function gameLoop(dt: number) {
  // Updates all active particles
  particleSystem.update(dt)
}
```

### Particle Statistics

```typescript
const stats = particleSystem.getStats()
console.log(stats)
// { active: 45, pooled: 55, total: 100 }
```

### Cleanup

```typescript
// Clear all active particles
particleSystem.clear()

// Full cleanup (removes from scene)
particleSystem.dispose()
```

## Performance Best Practices

### 1. Pool Size Configuration

```typescript
// Start with reasonable initial size
// Set max size based on expected peak usage
const pool = new CreaturePool(
  scene,
  20,   // Covers normal gameplay
  100   // Handles intense moments
)
```

### 2. Release Objects Promptly

```typescript
// BAD - holding reference too long
const temp = getPooledVector3(1, 2, 3)
// ... lots of code ...
releaseVector3(temp)

// GOOD - release immediately after use
const temp = getPooledVector3(1, 2, 3)
position.add(temp)
releaseVector3(temp)
```

### 3. Avoid Creating New Objects in Loops

```typescript
// BAD
for (let i = 0; i < 1000; i++) {
  const v = new THREE.Vector3(i, 0, 0)
  doSomething(v)
}

// GOOD
const v = getPooledVector3()
for (let i = 0; i < 1000; i++) {
  v.set(i, 0, 0)
  doSomething(v)
}
releaseVector3(v)
```

### 4. Monitor Pool Usage

```typescript
// Check if pools are sized correctly
setInterval(() => {
  const stats = creaturePool.getStats()
  
  if (stats.pooled === 0) {
    console.warn('Creature pool exhausted! Consider increasing max size')
  }
  
  if (stats.active < stats.total * 0.3) {
    console.log('Creature pool oversized, could reduce initial size')
  }
}, 5000)
```

### 5. Distance-Based Culling

```typescript
function cullDistantCreatures(
  pool: CreaturePool,
  playerPos: THREE.Vector3,
  maxDistance: number
) {
  const creatures = pool.getAllInstances()
  
  creatures.forEach((creature) => {
    const distance = creature.group.position.distanceTo(playerPos)
    if (distance > maxDistance) {
      // Despawn distant creatures
      // Note: Need to track PooledCreature wrapper
    }
  })
}
```

## Integration Examples

### Example 1: Creature Landing Effect

```typescript
function onCreatureLand(creature: CreatureInstance, particleSystem: ParticleSystem) {
  const position = creature.group.position.clone()
  position.y = 0 // Ground level
  
  particleSystem.emitBurst('dust', position, 10)
}
```

### Example 2: Water Interaction

```typescript
function onCreatureEnterWater(
  creature: CreatureInstance,
  particleSystem: ParticleSystem
) {
  const position = creature.group.position.clone()
  
  // Big splash
  particleSystem.emitBurst('splash', position, 20, {
    velocity: new THREE.Vector3(0, 4, 0)
  })
  
  // Play splash sound
  audioManager.playSoundEffect('creature_splash', 1.0, position)
}
```

### Example 3: Dynamic Spawning System

```typescript
class DynamicSpawner {
  private creaturePool: CreaturePool
  private spawnRadius = 50
  private maxCreatures = 30
  
  update(playerPosition: THREE.Vector3) {
    const active = this.creaturePool.getActiveCount()
    
    if (active < this.maxCreatures) {
      const spawnPos = this.getRandomSpawnPosition(playerPosition)
      this.creaturePool.spawn(spawnPos)
    }
  }
  
  private getRandomSpawnPosition(center: THREE.Vector3): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2
    const distance = this.spawnRadius
    
    return new THREE.Vector3(
      center.x + Math.cos(angle) * distance,
      0,
      center.z + Math.sin(angle) * distance
    )
  }
}
```

## Troubleshooting

### Pool Exhaustion

**Symptom**: New objects being created despite pool existing

**Solution**: Increase max pool size or improve object release

```typescript
// Check for leaks
const stats = pool.getStats()
if (stats.inUse > expectedMax) {
  console.error('Possible memory leak - objects not being released')
}
```

### Performance Not Improving

**Symptom**: No FPS improvement after adding pooling

**Possible causes**:
1. Pool size too small (constantly creating new objects)
2. Objects not being released properly
3. Bottleneck is elsewhere (rendering, physics, etc.)

**Debug**:
```typescript
// Monitor pool efficiency
const efficiency = stats.pooled / stats.total * 100
console.log(`Pool efficiency: ${efficiency}%`)
// Should be > 20% during normal gameplay
```

### Memory Usage Increasing

**Symptom**: Memory grows over time despite pooling

**Solution**: Ensure proper cleanup

```typescript
// On scene change or game restart
creaturePool.clear()
particleSystem.dispose()
```

## API Reference

### ObjectPool<T>

```typescript
class ObjectPool<T> {
  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    initialSize?: number,
    maxSize?: number
  )
  
  get(): T
  release(obj: T): void
  releaseAll(): void
  size(): number
  getInUseCount(): number
  getAvailableCount(): number
  clear(): void
}
```

### CreaturePool

```typescript
class CreaturePool {
  constructor(scene: THREE.Scene, initialSize?: number, maxSize?: number)
  
  spawn(position: THREE.Vector3, seed?: number): PooledCreature
  despawn(creature: PooledCreature): void
  despawnAll(): void
  update(dt: number, tSec: number, camera?: THREE.Camera): void
  getAllInstances(): CreatureInstance[]
  getActiveCount(): number
  getStats(): { active: number; pooled: number; total: number }
  clear(): void
}
```

### ParticleSystem

```typescript
class ParticleSystem {
  constructor(scene: THREE.Scene, poolSize?: number, maxSize?: number)
  
  emit(config: ParticleConfig): void
  emitBurst(
    type: ParticleType,
    position: THREE.Vector3,
    count?: number,
    options?: Partial<ParticleConfig>
  ): void
  update(dt: number): void
  clear(): void
  getStats(): { active: number; pooled: number; total: number }
  dispose(): void
}
```

## See Also

- [Performance Optimization Guide](./performance-optimization.md)
- [Creature System](./creatures.md)
- [Visual Effects](./visual-effects.md)
