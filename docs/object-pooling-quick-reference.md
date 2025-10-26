# Object Pooling Quick Reference

## Basic Vectors & Colors

```typescript
import { getPooledVector3, releaseVector3 } from './utils'

// Get
const v = getPooledVector3(x, y, z)

// Use
position.add(v)

// Release
releaseVector3(v)
```

## Creature Pool

```typescript
import { CreaturePool } from './creature-pool'

// Setup
const pool = new CreaturePool(scene, 20, 100)

// Spawn
const creature = pool.spawn(position, seed)

// Update (in game loop)
pool.update(dt, tSec, camera)

// Despawn
pool.despawn(creature)
pool.despawnAll()

// Stats
const stats = pool.getStats()
```

## Particle System

```typescript
import { ParticleSystem } from './particle-system'

// Setup
const particles = new ParticleSystem(scene, 100, 500)

// Emit
particles.emitBurst('sparkle', position, 20)
particles.emitBurst('splash', position, 15, { velocity, color })

// Update (in game loop)
particles.update(dt)

// Clear
particles.clear()
particles.dispose()
```

## Particle Types

- `dust` - Ground dust
- `splash` - Water splash
- `sparkle` - Magic sparkles
- `leaf` - Falling leaves
- `feather` - Floating feathers

## Common Patterns

### Temporary Vector

```typescript
const temp = getPooledVector3()
temp.copy(a).add(b)
doSomething(temp)
releaseVector3(temp)
```

### Creature Landing Effect

```typescript
particleSystem.emitBurst('dust', creature.group.position, 10)
```

### Water Splash

```typescript
particleSystem.emitBurst('splash', position, 20, {
  velocity: new THREE.Vector3(0, 4, 0)
})
```

### Check Pool Health

```typescript
const stats = pool.getStats()
console.log(`Active: ${stats.active}, Pooled: ${stats.pooled}`)
```

## Performance Tips

1. Release objects immediately after use
2. Don't create objects in loops
3. Monitor pool stats regularly
4. Set appropriate max sizes
5. Clear pools on scene changes
