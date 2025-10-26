# Object Pooling Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Loop                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Update     │  │   Render     │  │   Cleanup    │      │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘      │
└─────────┼──────────────────────────────────────┼────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pooling Systems                           │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  CreaturePool    │  │  ParticleSystem  │                │
│  │                  │  │                  │                │
│  │  - spawn()       │  │  - emit()        │                │
│  │  - despawn()     │  │  - emitBurst()   │                │
│  │  - update()      │  │  - update()      │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                           │
│           ▼                     ▼                           │
│  ┌─────────────────────────────────────────┐               │
│  │         ObjectPool<T>                    │               │
│  │                                          │               │
│  │  ┌──────────┐      ┌──────────┐        │               │
│  │  │Available │      │ In Use   │        │               │
│  │  │  Queue   │◄────►│   Set    │        │               │
│  │  └──────────┘      └──────────┘        │               │
│  │                                          │               │
│  │  - get()                                 │               │
│  │  - release()                             │               │
│  │  - releaseAll()                          │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Object Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Object Lifecycle                          │
└─────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  Create  │  (Only once, during pool initialization)
    └────┬─────┘
         │
         ▼
    ┌──────────┐
    │Available │◄──────────────────┐
    │  Pool    │                   │
    └────┬─────┘                   │
         │                         │
         │ get()                   │ release()
         │                         │
         ▼                         │
    ┌──────────┐              ┌───┴────┐
    │ In Use   │─────────────►│ Reset  │
    │  (Active)│   done       │        │
    └──────────┘              └────────┘
         │
         │ update()
         │
         ▼
    ┌──────────┐
    │  Render  │
    └──────────┘
```

## Creature Pool Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CreaturePool                             │
└─────────────────────────────────────────────────────────────┘

                    spawn(position, seed)
                            │
                            ▼
                    ┌───────────────┐
                    │ Get from Pool │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Initialize   │
                    │  - Position   │
                    │  - Anatomy    │
                    │  - Behavior   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Add to Scene  │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Track Active  │
                    └───────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Active Creatures                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Creature 1│  │Creature 2│  │Creature 3│  │Creature N│   │
│  │          │  │          │  │          │  │          │   │
│  │ update() │  │ update() │  │ update() │  │ update() │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘

                    despawn(creature)
                            │
                            ▼
                    ┌───────────────┐
                    │Remove from    │
                    │Scene          │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Reset State   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │Return to Pool │
                    └───────────────┘
```

## Particle System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   ParticleSystem                             │
└─────────────────────────────────────────────────────────────┘

            emitBurst(type, position, count)
                            │
                            ▼
                    ┌───────────────┐
                    │  For each     │
                    │  particle     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Get from Pool │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Configure    │
                    │  - Type       │
                    │  - Position   │
                    │  - Velocity   │
                    │  - Color      │
                    │  - Lifetime   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Add to Active │
                    └───────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Active Particles                            │
│                                                              │
│  Each frame:                                                 │
│  1. Update position (velocity + gravity)                     │
│  2. Update lifetime                                          │
│  3. Update opacity (fade out)                                │
│  4. Check if expired                                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Particle 1│  │Particle 2│  │Particle 3│  │Particle N│   │
│  │ ●        │  │ ●        │  │ ●        │  │ ●        │   │
│  │lifetime: │  │lifetime: │  │lifetime: │  │lifetime: │   │
│  │  0.8s    │  │  0.3s    │  │  1.2s    │  │  0.1s    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘

                    Lifetime expires
                            │
                            ▼
                    ┌───────────────┐
                    │ Hide Mesh     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Reset State   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │Return to Pool │
                    └───────────────┘
```

## Memory Layout

```
┌─────────────────────────────────────────────────────────────┐
│                      Memory Layout                           │
└─────────────────────────────────────────────────────────────┘

Without Pooling:
┌────────────────────────────────────────────────────────────┐
│  Heap Memory                                                │
│                                                             │
│  [Obj1] [Obj2] [Obj3] [GAP] [Obj4] [GAP] [Obj5] [GAP]     │
│                                                             │
│  - Fragmented memory                                        │
│  - Frequent allocations/deallocations                       │
│  - GC pressure                                              │
└────────────────────────────────────────────────────────────┘

With Pooling:
┌────────────────────────────────────────────────────────────┐
│  Heap Memory                                                │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │  Pool (Pre-allocated)                             │     │
│  │  [Obj1][Obj2][Obj3][Obj4][Obj5][Obj6][Obj7]...  │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  - Contiguous memory                                        │
│  - No allocations during gameplay                           │
│  - Minimal GC pressure                                      │
└────────────────────────────────────────────────────────────┘
```

## Performance Comparison

```
┌─────────────────────────────────────────────────────────────┐
│              Performance Characteristics                     │
└─────────────────────────────────────────────────────────────┘

Operation          │ Without Pool │ With Pool │ Improvement
───────────────────┼──────────────┼───────────┼─────────────
Create Object      │   ~1000ns    │   ~50ns   │   20x faster
Destroy Object     │   ~500ns     │   ~10ns   │   50x faster
Memory Allocation  │   Every time │   Once    │   ∞
GC Pauses          │   Frequent   │   Rare    │   10x less
Memory Fragmentation│   High      │   Low     │   Much better
Frame Rate Stability│   Variable  │   Stable  │   Smoother

Typical Scenario (60 FPS game):
- 100 particles spawned/destroyed per second
- Without pooling: 100 allocations + 100 deallocations = 200 GC events
- With pooling: 0 allocations + 0 deallocations = 0 GC events
```

## Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Integration Flow                            │
└─────────────────────────────────────────────────────────────┘

Game Initialization
        │
        ▼
┌───────────────┐
│ Create Pools  │
│ - Creatures   │
│ - Particles   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Game Loop    │
└───────┬───────┘
        │
        ├─────────────────────────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────┐                    ┌───────────────┐
│ Update Pools  │                    │ Render Scene  │
│ - Creatures   │                    │               │
│ - Particles   │                    └───────────────┘
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Handle Events │
│ - Photo taken │──► Emit particles
│ - Creature    │──► Spawn/despawn
│   interaction │
└───────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Data Flow                               │
└─────────────────────────────────────────────────────────────┘

User Action
    │
    ▼
┌─────────────┐
│ Game Event  │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Creature │      │ Particle │      │  Audio   │
│  Pool    │      │  System  │      │  System  │
└────┬─────┘      └────┬─────┘      └──────────┘
     │                 │
     ▼                 ▼
┌──────────┐      ┌──────────┐
│  Scene   │      │  Scene   │
│  Update  │      │  Update  │
└────┬─────┘      └────┬─────┘
     │                 │
     └────────┬────────┘
              │
              ▼
        ┌──────────┐
        │  Render  │
        └──────────┘
```

## Pool Size Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  Pool Sizing Strategy                        │
└─────────────────────────────────────────────────────────────┘

Initial Size:
    │
    ├─ Based on typical usage
    │  Example: 20 creatures for normal gameplay
    │
    └─ Pre-allocates objects to avoid startup lag

Max Size:
    │
    ├─ Based on peak usage
    │  Example: 100 creatures for intense moments
    │
    └─ Prevents unbounded growth

Dynamic Behavior:
    │
    ├─ Pool grows as needed (up to max)
    ├─ Objects released back to pool
    └─ Excess objects discarded (beyond max)

Monitoring:
    │
    ├─ Track active vs pooled ratio
    ├─ Adjust sizes based on metrics
    └─ Alert on pool exhaustion
```

## Best Practices Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Best Practices                            │
└─────────────────────────────────────────────────────────────┘

✓ DO:
    ├─ Release objects immediately after use
    ├─ Size pools based on profiling
    ├─ Monitor pool statistics
    ├─ Clear pools on scene changes
    └─ Use pooling for frequently created objects

✗ DON'T:
    ├─ Hold references to pooled objects
    ├─ Modify objects after release
    ├─ Create pools for rarely used objects
    ├─ Forget to call update()
    └─ Ignore pool exhaustion warnings
```

## See Also

- [Object Pooling Guide](./object-pooling-guide.md)
- [Quick Reference](./object-pooling-quick-reference.md)
- [Integration Guide](./object-pooling-integration.md)
- [Performance Optimization](./performance-optimization.md)
