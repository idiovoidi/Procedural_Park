# Core Module

## Overview

The `core` module provides foundational utilities, constants, and type definitions used throughout the application. It has zero dependencies on other application modules, making it the lowest level in the dependency hierarchy.

**Import Path**: `@core/*`

**Dependencies**: None

## Structure

```
core/
├── constants/
│   ├── index.ts           # Barrel export
│   ├── game-config.ts     # GAME_CONFIG object
│   ├── biome-config.ts    # BIOME_COLORS, biome definitions
│   └── physics.ts         # TAU, HALF_PI, physics constants
├── utils/
│   ├── index.ts           # Barrel export
│   ├── math.ts            # Math utilities, memoization
│   ├── pooling.ts         # Object pooling (Vector3, Color)
│   └── random.ts          # RNG utilities
└── types/
    ├── index.ts           # Barrel export
    ├── common.ts          # Common interfaces
    └── geometry.ts        # Geometry types
```

## Constants (`@core/constants`)

### game-config.ts

Contains the main `GAME_CONFIG` object with all game configuration values:

```typescript
export const GAME_CONFIG = {
  WORLD_SIZE: 1000,
  CREATURE_COUNT: 60,
  TERRAIN_SEGMENTS: 200,
  CAMERA_SPEED: 0.5,
  // ... and many more
}
```

**Usage**:
```typescript
import { GAME_CONFIG } from '@core/constants'

const worldSize = GAME_CONFIG.WORLD_SIZE
```

### biome-config.ts

Contains biome-related constants and color definitions:

```typescript
export const BIOME_COLORS = {
  forest: new Color(0x2d5016),
  meadow: new Color(0x7cb342),
  // ...
}
```

**Usage**:
```typescript
import { BIOME_COLORS } from '@core/constants'

const forestColor = BIOME_COLORS.forest
```

### physics.ts

Contains mathematical and physics constants:

```typescript
export const TAU = Math.PI * 2
export const HALF_PI = Math.PI / 2
export const GRAVITY = 9.81
```

**Usage**:
```typescript
import { TAU, HALF_PI } from '@core/constants'

const angle = TAU / 4
```

## Utils (`@core/utils`)

### math.ts

Mathematical utilities and memoization functions:

**Key Functions**:
- `memoizedSin(angle)` - Memoized sine function for performance
- `memoizedCos(angle)` - Memoized cosine function for performance
- `clamp(value, min, max)` - Clamp value between min and max
- `lerp(a, b, t)` - Linear interpolation
- `smoothstep(edge0, edge1, x)` - Smooth interpolation

**Usage**:
```typescript
import { memoizedSin, clamp, lerp } from '@core/utils'

const y = memoizedSin(angle)
const clamped = clamp(value, 0, 100)
const interpolated = lerp(start, end, 0.5)
```

### pooling.ts

Object pooling for performance-critical objects to reduce garbage collection:

**Key Functions**:
- `getPooledVector3()` - Get a Vector3 from the pool
- `releaseVector3(vector)` - Return a Vector3 to the pool
- `getPooledColor()` - Get a Color from the pool
- `releaseColor(color)` - Return a Color to the pool

**Usage**:
```typescript
import { getPooledVector3, releaseVector3 } from '@core/utils'

// Get from pool
const position = getPooledVector3()
position.set(x, y, z)

// Use it...

// Return to pool when done
releaseVector3(position)
```

### random.ts

Random number generation utilities with seeding support:

**Key Functions**:
- `createSeededRandom(seed)` - Create a seeded RNG
- `randomInRange(min, max)` - Random number in range
- `randomChoice(array)` - Random element from array
- `randomBool(probability)` - Random boolean with probability

**Usage**:
```typescript
import { createSeededRandom, randomInRange } from '@core/utils'

const rng = createSeededRandom(12345)
const value = randomInRange(0, 100, rng)
```

## Types (`@core/types`)

### common.ts

Common interfaces and types used across the application:

```typescript
export interface Position {
  x: number
  y: number
  z: number
}

export interface Rotation {
  x: number
  y: number
  z: number
}

export type BiomeType = 'forest' | 'meadow' | 'rocky' | 'wetland' | 'crystal' | 'floating'
```

### geometry.ts

Geometry-related type definitions:

```typescript
export interface BoundingBox {
  min: Vector3
  max: Vector3
}

export interface Ray {
  origin: Vector3
  direction: Vector3
}
```

## Best Practices

### Using Constants

Always import constants from `@core/constants` rather than hardcoding values:

```typescript
// ❌ Bad
const worldSize = 1000

// ✅ Good
import { GAME_CONFIG } from '@core/constants'
const worldSize = GAME_CONFIG.WORLD_SIZE
```

### Using Object Pooling

Use object pooling for frequently created/destroyed objects:

```typescript
// ❌ Bad (creates garbage)
function calculatePosition() {
  const temp = new Vector3()
  temp.set(x, y, z)
  return temp
}

// ✅ Good (uses pooling)
import { getPooledVector3, releaseVector3 } from '@core/utils'

function calculatePosition() {
  const temp = getPooledVector3()
  temp.set(x, y, z)
  // ... use temp ...
  releaseVector3(temp)
}
```

### Using Memoized Functions

Use memoized math functions for repeated calculations:

```typescript
// ❌ Bad (recalculates every time)
const y = Math.sin(angle)

// ✅ Good (uses memoization)
import { memoizedSin } from '@core/utils'
const y = memoizedSin(angle)
```

## Adding New Core Utilities

When adding new utilities to the core module:

1. **Choose the right location**:
   - Constants → `core/constants/`
   - Utilities → `core/utils/`
   - Types → `core/types/`

2. **Keep it pure**: Core utilities should have no side effects and no dependencies on other modules

3. **Export through barrel**: Add exports to the appropriate `index.ts`

4. **Document**: Add JSDoc comments for public APIs

Example:
```typescript
// core/utils/string.ts

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// core/utils/index.ts
export * from './string'
```
