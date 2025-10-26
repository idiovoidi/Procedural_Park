# Creature Behaviour Refactor

## Overview

Extracted all creature AI and behavior logic into a separate `creature_behaviour.ts` module for better code organization and maintainability.

## What Changed

### New File: `src/creature_behaviour.ts`

A dedicated module for all creature behavior and AI logic:

#### Core Functions:

1. **`updateBehaviorState()`**
   - Main behavior update function
   - Handles all decision-making logic
   - Takes behavior context and updates state

2. **`handleCameraInteractions()`**
   - Manages creature reactions to camera/player
   - Different reactions based on temperament:
     - **Shy**: Moves away when camera is close
     - **Curious**: Looks at camera when centered
     - **Aggressive**: Becomes territorial when close
     - **Playful**: Plays when camera is nearby

3. **`handleSocialBehaviors()`**
   - Manages creature-to-creature interactions
   - **Territorial**: Defends territory from intruders
   - **Playful**: Seeks out other playful creatures
   - **Curious**: Approaches other creatures

4. **`handleIdleWandering()`** ✨ NEW
   - Implements wandering behavior for idle creatures
   - Different wandering frequencies by temperament:
     - **Curious**: 60% chance to wander
     - **Playful**: 70% chance to wander
     - **Territorial**: 30% chance to wander
   - Picks random direction and distance
   - Updates facing direction

5. **`getMouthOpenAmount()`**
   - Returns mouth open amount based on behavior state
   - Centralized animation values

6. **`getWingFlapSpeedMultiplier()`**
   - Returns wing flap speed based on behavior
   - Faster flapping for active behaviors (posing, playing, wandering)

7. **`applyBehaviorEffects()`**
   - Applies visual effects for specific behaviors
   - **Wandering**: Adds bobbing motion

#### Types:

- **`BehaviorContext`**: Contains all data needed for behavior decisions
  - Group, anchor, anatomy, random function
  - Territory info, distance calculation
- **`BehaviorState_Internal`**: Internal state tracking
  - Current state, timer, facing angles, pose timer

## New Behavior: Wandering

### How It Works:

1. When a creature's behavior timer expires and it's idle
2. Based on temperament, it may choose to wander
3. Picks a random direction (0-360°)
4. Picks a random distance (3-11 units)
5. Moves anchor point in that direction
6. Turns to face the direction
7. Wanders for 4-10 seconds

### Visual Effects:

- Mouth slightly open (0.2)
- Wings flap faster (1.5x speed)
- Slight bobbing motion while moving
- Smooth rotation toward wander direction

### Temperament Behavior:

- **Curious** (60% wander): Explores frequently
- **Playful** (70% wander): Most active wanderers
- **Territorial** (30% wander): Patrols territory occasionally
- **Shy**: Doesn't wander (stays hidden)
- **Aggressive**: Doesn't wander (guards position)

## Benefits of Refactor

### Code Organization:

- ✅ Separated concerns (rendering vs AI)
- ✅ Easier to find and modify behavior logic
- ✅ Reduced complexity in creatures.ts
- ✅ Better testability

### Maintainability:

- ✅ All AI logic in one place
- ✅ Clear function names and documentation
- ✅ Type-safe interfaces
- ✅ Easy to add new behaviors

### Extensibility:

- ✅ Easy to add new behavior states
- ✅ Simple to modify existing behaviors
- ✅ Can add behavior modifiers/buffs
- ✅ Ready for more complex AI systems

## Future Enhancements

Possible additions to the behavior system:

1. **Flocking Behavior**: Group movement for herding creatures
2. **Hunting/Fleeing**: Predator-prey dynamics
3. **Nesting**: Return to home location
4. **Feeding**: Interact with environment objects
5. **Day/Night Cycles**: Different behaviors at different times
6. **Weather Reactions**: Respond to environmental changes
7. **Learning**: Creatures remember player interactions
8. **Mood System**: Emotional states affecting behavior
9. **Communication**: Creatures signal to each other
10. **Pathfinding**: Navigate around obstacles

## Usage Example

```typescript
// In creatures.ts
const behaviorContext: BehaviorContext = {
  group,
  anchor,
  anatomy,
  rand,
  territoryCenter,
  territoryRadius,
  getDistanceTo,
}

const internalBehaviorState: BehaviorState_Internal = {
  state: behaviorState,
  timer: behaviorTimer,
  facingYaw,
  targetYaw,
  poseTimer,
}

// Update behavior
updateBehaviorStateLogic(behaviorContext, internalBehaviorState, dt, camera, allCreatures)

// Apply animations
setMouthOpen(getMouthOpenAmount(behaviorState))
applyBehaviorEffects(behaviorState, group, tSec)
```

## Testing

To test the new wandering behavior:

1. Start the game
2. Observe creatures with curious/playful temperaments
3. They should periodically wander to new locations
4. Watch for bobbing motion and faster wing flaps
5. Territorial creatures wander less frequently

## Performance

No performance impact - same logic, just reorganized into cleaner structure.
