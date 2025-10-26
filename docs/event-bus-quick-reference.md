# Event Bus Quick Reference

## Import

```typescript
import { EventBus } from './event-bus'
```

## Core Methods

| Method | Description | Example |
|--------|-------------|---------|
| `on(event, handler)` | Subscribe to event | `EventBus.on('photoTaken', handler)` |
| `once(event, handler)` | Subscribe once (auto-unsubscribe) | `EventBus.once('gameStarted', handler)` |
| `off(event, handler)` | Unsubscribe from event | `EventBus.off('photoTaken', handler)` |
| `emit(event, data)` | Emit event to all subscribers | `EventBus.emit('photoTaken', data)` |
| `clear(event)` | Remove all handlers for event | `EventBus.clear('photoTaken')` |
| `clearAll()` | Remove all handlers | `EventBus.clearAll()` |

## Debug Methods

| Method | Description |
|--------|-------------|
| `setDebugMode(enabled)` | Enable/disable debug logging |
| `getHandlerCount(event)` | Get number of handlers for event |
| `getRegisteredEvents()` | Get all registered event names |
| `getDebugInfo()` | Get debug info about all events |

## Common Patterns

### Subscribe
```typescript
EventBus.on('photoTaken', (data) => {
  console.log(data.score, data.creature)
})
```

### Emit
```typescript
EventBus.emit('photoTaken', {
  score: 85,
  creature: 'Deer',
  dataUrl: 'data:image/png;base64,...'
})
```

### Unsubscribe
```typescript
const handler = (data) => console.log(data)
EventBus.on('photoTaken', handler)
EventBus.off('photoTaken', handler)
```

### One-Time Handler
```typescript
EventBus.once('gameStarted', () => {
  console.log('Game started!')
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

## Event Categories

### Photo System
- `photoTaken`
- `photoScoreCalculated`

### Camera
- `cameraModeSwitched`
- `cameraSpeedChanged`

### Creatures
- `creatureSpawned`
- `creatureNearby`
- `creatureBehaviorChanged`

### UI
- `uiPanelToggled`
- `settingChanged`

### Game State
- `gameStarted`
- `gamePaused`
- `gameResumed`
- `rideRestarted`

### Multiplayer
- `peerConnected`
- `peerDisconnected`
- `peerStateReceived`

### Visual Effects
- `shaderEnabled`
- `effectIntensityChanged`

### Environment
- `timeOfDayChanged`
- `biomeEntered`

### Performance
- `fpsChanged`
- `performanceWarning`

### Audio
- `audioPlayed`
- `audioVolumeChanged`

## Tips

✅ **DO:**
- Use specific event names
- Keep event data minimal
- Clean up handlers on dispose
- Use `once()` for initialization
- Enable debug mode during development

❌ **DON'T:**
- Use generic event names like 'update'
- Pass large objects in event data
- Forget to unsubscribe
- Emit events in tight loops
- Throw errors in handlers (they're caught but logged)
