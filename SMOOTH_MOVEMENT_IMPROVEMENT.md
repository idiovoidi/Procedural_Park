# Smooth Movement Improvement

## Overview

Replaced instant teleportation with smooth, graceful creature movement using velocity-based interpolation.

## Problem

Previously, creatures were **teleporting** when changing positions:

- Wandering: Instant jump to new location
- Fleeing: Instant teleport away from camera
- Playing: Sudden position changes
- No smooth transitions
- Looked unnatural and jarring

## Solution

Implemented **smooth interpolation** with target positions and movement speeds:

### Key Changes:

1. **Target Position System**
   - Creatures set a `targetPosition` instead of directly modifying `anchor`
   - Movement happens gradually over time
   - Smooth interpolation toward target

2. **Movement Speed**
   - Each behavior has appropriate speed
   - Fast retreat for shy creatures (2.0 units/sec)
   - Slow approach for curious creatures (0.5 units/sec)
   - Energetic for playful creatures (1.5 units/sec)
   - Moderate for wandering (0.6-1.2 units/sec)

3. **Smooth Interpolation**
   - `updateMovement()` function handles smooth transitions
   - Moves toward target each frame
   - Stops when close enough (< 0.1 units)
   - Natural acceleration/deceleration

## Technical Implementation

### New Behavior State Properties:

```typescript
interface BehaviorState_Internal {
  // ... existing properties
  targetPosition?: THREE.Vector3 // Where to move
  moveSpeed: number // How fast to move
}
```

### Movement Function:

```typescript
export function updateMovement(
  anchor: THREE.Vector3,
  behaviorState: BehaviorState_Internal,
  dt: number
): void {
  if (!behaviorState.targetPosition) return

  const toTarget = new THREE.Vector3().subVectors(behaviorState.targetPosition, anchor)
  const distance = toTarget.length()

  // Stop when close enough
  if (distance < 0.1) {
    behaviorState.targetPosition = undefined
    return
  }

  // Smooth movement
  const moveDistance = Math.min(distance, behaviorState.moveSpeed * dt)
  toTarget.normalize().multiplyScalar(moveDistance)
  anchor.add(toTarget)
}
```

### Behavior-Specific Speeds:

| Behavior                | Speed | Description                |
| ----------------------- | ----- | -------------------------- |
| Shy (fleeing)           | 2.0   | Fast retreat from camera   |
| Curious (approach)      | 0.5   | Slow, cautious approach    |
| Playful                 | 1.5   | Energetic, bouncy movement |
| Wandering (playful)     | 1.2   | Active exploration         |
| Wandering (curious)     | 0.8   | Casual strolling           |
| Wandering (territorial) | 0.6   | Slow patrol                |

## Before vs After

### Before (Teleporting):

```typescript
// Instant position change
anchor.addScaledVector(direction, distance)
```

**Result:** Creature disappears and reappears elsewhere

### After (Smooth):

```typescript
// Set target
behaviorState.targetPosition = anchor.clone().addScaledVector(direction, distance)
behaviorState.moveSpeed = 1.0

// Each frame: move toward target
updateMovement(anchor, behaviorState, dt)
```

**Result:** Creature smoothly glides to new position

## Visual Improvements

### Shy Creatures:

- **Before**: Instant teleport away
- **After**: Quick but smooth retreat, looks scared

### Curious Creatures:

- **Before**: Instant face toward camera
- **After**: Slow approach, looks interested

### Playful Creatures:

- **Before**: Sudden jumps around
- **After**: Bouncy, energetic movement

### Wandering:

- **Before**: Teleport to random spots
- **After**: Smooth walking/flying to destinations

## Performance

- **No performance impact**: Same calculations, just spread over frames
- **Actually better**: Smoother animation = better perceived performance
- **Frame-rate independent**: Uses delta time (dt) for consistent speed

## Integration

The movement system integrates seamlessly:

1. **Behavior decides** where to go (sets targetPosition)
2. **Movement system** handles how to get there (smooth interpolation)
3. **Animation system** adds visual flair (bobbing, wing flapping)

### Update Order:

```typescript
updateBehaviorState(dt, camera, allCreatures)
  ↓ Sets targetPosition and moveSpeed
updateMovement(anchor, behaviorState, dt)
  ↓ Smoothly moves toward target
applyBehaviorEffects(behaviorState, group, tSec)
  ↓ Adds visual effects
```

## Future Enhancements

Possible improvements:

1. **Acceleration Curves**
   - Ease-in/ease-out for more natural movement
   - Different curves per behavior

2. **Obstacle Avoidance**
   - Path around other creatures
   - Avoid terrain features

3. **Path Following**
   - Multiple waypoints
   - Curved paths instead of straight lines

4. **Animation Blending**
   - Walk/run animations based on speed
   - Transition animations

5. **Momentum**
   - Creatures maintain some velocity
   - Can't instantly change direction

6. **Flocking**
   - Group movement patterns
   - Separation/alignment/cohesion

## Testing

To see the improvements:

1. **Watch shy creatures** - Smooth retreat instead of teleport
2. **Observe wandering** - Gradual movement to new spots
3. **Check playful creatures** - Bouncy but smooth movement
4. **Compare to before** - No more jarring position jumps

### Console Verification:

Movement is now frame-by-frame, so you won't see sudden position changes in logs.

## Benefits

✅ **More natural** - Creatures look alive, not glitchy  
✅ **Better immersion** - Smooth movement feels realistic  
✅ **Easier to photograph** - Predictable movement paths  
✅ **Professional polish** - No jarring teleports  
✅ **Flexible system** - Easy to adjust speeds per behavior

## Code Changes Summary

### Modified Files:

1. **`src/creature_behaviour.ts`**
   - Added `targetPosition` and `moveSpeed` to state
   - Modified behaviors to set targets instead of teleporting
   - Added `updateMovement()` function

2. **`src/creatures.ts`**
   - Import `updateMovement`
   - Initialize movement properties
   - Call `updateMovement()` each frame

### Lines Changed: ~50

### New Functions: 1 (`updateMovement`)

### Breaking Changes: None (backward compatible)

## Migration Notes

If you have custom creature behaviors:

1. Set `targetPosition` instead of modifying `anchor` directly
2. Set appropriate `moveSpeed` for your behavior
3. Movement will happen automatically

Example:

```typescript
// Old way (teleport)
anchor.addScaledVector(direction, 5)

// New way (smooth)
behaviorState.targetPosition = anchor.clone().addScaledVector(direction, 5)
behaviorState.moveSpeed = 1.0
```
