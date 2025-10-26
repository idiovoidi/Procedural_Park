# Object Pooling Integration Guide

This guide shows how to integrate the new pooling systems into the existing game architecture.

## Integration with CreatureManager

The `CreatureManager` class currently manages creatures directly. Here's how to integrate pooling:

### Option 1: Gradual Migration (Recommended)

Keep existing system working while adding pooling for new features:

```typescript
// src/game/CreatureManager.ts
import { CreaturePool } from '../creature-pool'

export class CreatureManager {
  private creatures: CreatureInstance[] = []
  private creaturePool: CreaturePool // NEW
  
  constructor(scene: THREE.Scene, curve: THREE.CatmullRomCurve3) {
    this.scene = scene
    this.curve = curve
    
    // Initialize pool for dynamic spawning
    this.creaturePool = new CreaturePool(scene, 10, 50)
  }
  
  // Keep existing spawn methods for main creatures
  public spawnCreatures(): void {
    const randWorld = createRng(GAME_CONFIG.WORLD_SEED)
    this.creatures = Array.from({ length: GAME_CONFIG.CREATURE_COUNT }, () =>
      spawnCreatureNearPath(this.scene, this.curve, randWorld)
    )
  }
  
  // NEW: Add dynamic spawning using pool
  public spawnDynamicCreature(position: THREE.Vector3): void {
    this.creaturePool.spawn(position)
  }
  
  // Update both systems
  public update(dt: number, tSec: number, camera: THREE.Camera): void {
    // Update static creatures
    this.creatures.forEach(creature => {
      creature.update(dt, tSec, camera, this.creatures)
    })
    
    // Update pooled creatures
    this.creaturePool.update(dt, tSec, camera)
  }
  
  // Get all creatures for photo system
  public getAllCreatures(): CreatureInstance[] {
    return [
      ...this.creatures,
      ...this.creaturePool.getAllInstances(),
      ...(this.experimentCreature ? [this.experimentCreature] : [])
    ]
  }
  
  // Enhanced cleanup
  public clearCreatures(): void {
    this.creatures.forEach(creature => {
      this.scene.remove(creature.group)
      // TODO: Add proper disposal of geometries/materials
    })
    this.creatures = []
    
    // Clear pooled creatures
    this.creaturePool.despawnAll()
  }
}
```

### Option 2: Full Migration

Replace the entire creature management with pooling:

```typescript
export class CreatureManager {
  private creaturePool: CreaturePool
  private staticCreatures: PooledCreature[] = []
  
  constructor(scene: THREE.Scene, curve: THREE.CatmullRomCurve3) {
    this.scene = scene
    this.curve = curve
    this.creaturePool = new CreaturePool(scene, 60, 150)
  }
  
  public spawnCreatures(): void {
    const randWorld = createRng(GAME_CONFIG.WORLD_SEED)
    
    // Spawn using pool
    for (let i = 0; i < GAME_CONFIG.CREATURE_COUNT; i++) {
      const t = randWorld()
      const pos = this.curve.getPointAt(t)
      const tangent = this.curve.getTangentAt(t)
      const side = new THREE.Vector3()
        .crossVectors(tangent, new THREE.Vector3(0, 1, 0))
        .normalize()
      const offset = (randWorld() * 2 + 4) * (randWorld() > 0.5 ? 1 : -1)
      
      pos.addScaledVector(side, offset)
      pos.add(new THREE.Vector3(0, -0.2 + randWorld() * 1.6, 0))
      
      const creature = this.creaturePool.spawn(pos, GAME_CONFIG.WORLD_SEED + i)
      this.staticCreatures.push(creature)
    }
  }
  
  public respawnCreatures(): void {
    this.clearCreatures()
    this.spawnCreatures()
  }
  
  public clearCreatures(): void {
    this.creaturePool.despawnAll()
    this.staticCreatures = []
  }
  
  public update(dt: number, tSec: number, camera: THREE.Camera): void {
    this.creaturePool.update(dt, tSec, camera)
  }
  
  public getAllCreatures(): CreatureInstance[] {
    return this.creaturePool.getAllInstances()
  }
}
```

## Integration with Game Loop

Add particle system to the main game class:

```typescript
// src/game/Game.ts
import { ParticleSystem } from '../particle-system'

export class Game {
  private particleSystem: ParticleSystem
  
  constructor(container: HTMLDivElement) {
    // ... existing setup ...
    
    // Initialize particle system
    this.particleSystem = new ParticleSystem(this.scene, 100, 500)
  }
  
  private update(dt: number): void {
    // ... existing updates ...
    
    // Update particles
    this.particleSystem.update(dt)
  }
  
  public getParticleSystem(): ParticleSystem {
    return this.particleSystem
  }
  
  public stop(): void {
    // ... existing cleanup ...
    
    // Cleanup particles
    this.particleSystem.dispose()
  }
}
```

## Integration with Photo System

Add visual feedback when taking photos:

```typescript
// src/photo-system.ts
import { ParticleSystem } from './particle-system'

export class PhotoSystem {
  private particleSystem?: ParticleSystem
  
  public setParticleSystem(system: ParticleSystem): void {
    this.particleSystem = system
  }
  
  public takePhoto(
    creatures: CreatureInstance[],
    camera: THREE.Camera,
    scene: THREE.Scene
  ): PhotoResult {
    const result = this.calculatePhotoScore(creatures, camera, scene)
    
    // Add particle effects based on score
    if (this.particleSystem && result.score > 0) {
      creatures.forEach(creature => {
        if (creature.group.visible) {
          const position = creature.group.position.clone()
          position.y += 1
          
          // More sparkles for higher scores
          const sparkleCount = Math.floor(result.score / 10)
          this.particleSystem!.emitBurst('sparkle', position, sparkleCount)
        }
      })
    }
    
    return result
  }
}
```

## Integration with Creature Behaviors

Add particle effects to creature interactions:

```typescript
// src/creature_behaviour.ts
import { ParticleSystem } from './particle-system'

export function applyBehaviorEffects(
  state: BehaviorState,
  group: THREE.Group,
  tSec: number,
  particleSystem?: ParticleSystem
): void {
  switch (state) {
    case 'playing':
      // Occasional sparkles when playing
      if (particleSystem && Math.random() < 0.01) {
        const pos = group.position.clone()
        pos.y += 1
        particleSystem.emitBurst('sparkle', pos, 3)
      }
      break
      
    case 'drinking':
      // Water ripples
      if (particleSystem && Math.random() < 0.05) {
        const pos = group.position.clone()
        pos.y = 0.2
        particleSystem.emitBurst('splash', pos, 5, {
          velocity: new THREE.Vector3(0, 1, 0)
        })
      }
      break
      
    case 'fleeing':
      // Dust trail
      if (particleSystem && Math.random() < 0.1) {
        const pos = group.position.clone()
        pos.y = 0.1
        particleSystem.emitBurst('dust', pos, 3)
      }
      break
  }
}
```

## Integration with Environment Interactions

Add effects for environmental interactions:

```typescript
// src/environment-interactions.ts
import { ParticleSystem } from './particle-system'

export function handleEnvironmentInteraction(
  creature: CreatureInstance,
  biome: string,
  particleSystem: ParticleSystem
): void {
  const position = creature.group.position.clone()
  
  switch (biome) {
    case 'wetland':
      // Splash when moving through water
      if (Math.random() < 0.05) {
        particleSystem.emitBurst('splash', position, 8)
      }
      break
      
    case 'forest':
      // Falling leaves
      if (Math.random() < 0.02) {
        position.y += 3
        particleSystem.emitBurst('leaf', position, 5)
      }
      break
      
    case 'crystal_cave':
      // Sparkles near crystals
      if (Math.random() < 0.03) {
        position.y += 1
        particleSystem.emitBurst('sparkle', position, 10)
      }
      break
  }
}
```

## Performance Monitoring

Add monitoring to debug panel:

```typescript
// src/debug.ts
export class DebugPanel {
  private updatePoolingStats(
    creaturePool: CreaturePool,
    particleSystem: ParticleSystem
  ): void {
    const creatureStats = creaturePool.getStats()
    const particleStats = particleSystem.getStats()
    
    this.addStat('Creatures (Active)', creatureStats.active)
    this.addStat('Creatures (Pooled)', creatureStats.pooled)
    this.addStat('Particles (Active)', particleStats.active)
    this.addStat('Particles (Pooled)', particleStats.pooled)
    
    // Calculate efficiency
    const totalPooled = creatureStats.pooled + particleStats.pooled
    const totalObjects = creatureStats.total + particleStats.total
    const efficiency = (totalPooled / totalObjects * 100).toFixed(1)
    
    this.addStat('Pool Efficiency', `${efficiency}%`)
  }
}
```

## Event Bus Integration

Connect pooling to event system:

```typescript
// Example: Emit particles on events
eventBus.on('photoTaken', (data) => {
  if (data.score > 50) {
    particleSystem.emitBurst('sparkle', data.position, 20)
  }
})

eventBus.on('creatureSpawned', (data) => {
  particleSystem.emitBurst('dust', data.position, 10)
})

eventBus.on('peerJoined', (data) => {
  particleSystem.emitBurst('sparkle', data.position, 30, {
    color: new THREE.Color(0x00ff00)
  })
})
```

## Migration Checklist

- [ ] Add CreaturePool to CreatureManager
- [ ] Add ParticleSystem to Game class
- [ ] Update game loop to call particle update
- [ ] Connect photo system to particles
- [ ] Add creature behavior effects
- [ ] Add environment interaction effects
- [ ] Update debug panel with pool stats
- [ ] Add event bus integration
- [ ] Test memory usage before/after
- [ ] Test frame rate improvement
- [ ] Add cleanup on scene transitions
- [ ] Document any breaking changes

## Testing

### Performance Testing

```typescript
// Before pooling
console.time('spawn-100-creatures')
for (let i = 0; i < 100; i++) {
  spawnCreatureAt(scene, position, createRng(i))
}
console.timeEnd('spawn-100-creatures')

// After pooling
console.time('spawn-100-creatures-pooled')
for (let i = 0; i < 100; i++) {
  creaturePool.spawn(position, i)
}
console.timeEnd('spawn-100-creatures-pooled')
```

### Memory Testing

```typescript
// Monitor memory usage
setInterval(() => {
  if (performance.memory) {
    console.log('Heap:', (performance.memory.usedJSHeapSize / 1048576).toFixed(2), 'MB')
  }
  console.log('Pool stats:', creaturePool.getStats())
}, 5000)
```

## Rollback Plan

If issues arise, the pooling system can be disabled without breaking existing code:

```typescript
// Disable pooling, use direct spawning
const USE_POOLING = false

if (USE_POOLING) {
  creature = creaturePool.spawn(position)
} else {
  creature = spawnCreatureAt(scene, position, createRng(seed))
}
```

## Next Steps

1. Start with particle system (lowest risk)
2. Add creature pool for dynamic spawning only
3. Monitor performance and memory
4. Gradually migrate static creatures
5. Add spatial partitioning for culling
6. Implement resource manager for disposal
