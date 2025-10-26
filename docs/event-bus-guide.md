# Event Bus Guide

A centralized pub/sub system for decoupled communication between game systems.

## Quick Start

```typescript
import { EventBus } from './event-bus'

// Subscribe to events
EventBus.on('photoTaken', (data) => {
  console.log(`Photo score: ${data.score}`)
})

// Emit events
EventBus.emit('photoTaken', {
  score: 85,
  creature: 'Deer',
  dataUrl: 'data:image/png;base64,...'
})

// Unsubscribe
EventBus.off('photoTaken', handler)
```

## Benefits

- **Decoupling**: Systems don't need direct references to each other
- **Type Safety**: Full TypeScript support with autocomplete
- **Flexibility**: Easy to add new listeners without modifying emitters
- **Debugging**: Built-in debug mode to trace event flow
- **Error Handling**: Isolated error handling prevents one handler from breaking others

## Available Events

### Photo System
- `photoTaken` - When a photo is captured
- `photoScoreCalculated` - When photo score is computed

### Camera
- `cameraModeSwitched` - When switching between ride/free mode
- `cameraSpeedChanged` - When ride speed changes

### Creatures
- `creatureSpawned` - When a creature is generated
- `creatureNearby` - When a creature is within detection range
- `creatureBehaviorChanged` - When creature AI changes behavior

### UI
- `uiPanelToggled` - When any UI panel opens/closes
- `settingChanged` - When a setting is modified

### Game State
- `gameStarted` - Game initialization complete
- `gamePaused` / `gameResumed` - Pause state changes
- `rideRestarted` - When ride path restarts

### Multiplayer
- `peerConnected` / `peerDisconnected` - Peer connection changes
- `peerStateReceived` - When peer state update arrives

### Visual Effects
- `shaderEnabled` - When shader is toggled
- `effectIntensityChanged` - When effect intensity changes

### Environment
- `timeOfDayChanged` - Day/night cycle changes
- `biomeEntered` - When entering a new biome

### Performance
- `fpsChanged` - FPS updates
- `performanceWarning` - Performance issues detected

### Audio
- `audioPlayed` - When sound is played
- `audioVolumeChanged` - Volume adjustments

## Usage Patterns

### Basic Subscription

```typescript
EventBus.on('photoTaken', (data) => {
  console.log(data.score, data.creature)
})
```

### One-Time Handler

```typescript
EventBus.once('gameStarted', () => {
  console.log('This runs only once')
})
```

### Cleanup Pattern

```typescript
class MySystem {
  private handler = this.handleEvent.bind(this)

  constructor() {
    EventBus.on('photoTaken', this.handler)
  }

  private handleEvent(data: any) {
    // Handle event
  }

  dispose() {
    EventBus.off('photoTaken', this.handler)
  }
}
```

### Cross-System Communication

```typescript
// Photo system emits
EventBus.emit('photoTaken', { score: 85, creature: 'Deer', dataUrl: '...' })

// Audio system listens
EventBus.on('photoTaken', (data) => {
  playShutterSound(data.score > 80 ? 1.0 : 0.8)
})

// UI system listens
EventBus.on('photoTaken', (data) => {
  addPhotoToGallery(data)
})

// Multiplayer system listens
EventBus.on('photoTaken', (data) => {
  syncWithPeers(data)
})
```

## Debug Mode

```typescript
// Enable debug logging
EventBus.setDebugMode(true)

// View registered events
console.log(EventBus.getRegisteredEvents())

// View handler counts
console.log(EventBus.getDebugInfo())
```

## Integration Examples

See `src/examples/event-bus-usage.ts` for detailed integration examples with:
- Photo system
- Audio system
- UI system
- Multiplayer system
- Performance monitoring

## Adding New Events

1. Add event type to `GameEvents` interface in `src/event-bus.ts`
2. Emit the event where appropriate
3. Subscribe to the event in systems that need to react

```typescript
// 1. Add to GameEvents interface
export interface GameEvents {
  myNewEvent: { data: string }
}

// 2. Emit the event
EventBus.emit('myNewEvent', { data: 'hello' })

// 3. Subscribe
EventBus.on('myNewEvent', (data) => {
  console.log(data.data)
})
```

## Best Practices

- Use specific event names (avoid generic names like 'update')
- Keep event data minimal and serializable
- Clean up handlers when systems are destroyed
- Use `once()` for initialization events
- Enable debug mode during development
- Document new events in this guide
