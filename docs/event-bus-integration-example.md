# Event Bus Integration Example

How to integrate the Event Bus into your existing game architecture.

## Step 1: Import in Main Systems

### game.ts
```typescript
import { EventBus } from './event-bus'

export class Game {
  constructor() {
    // Subscribe to game-level events
    EventBus.on('gamePaused', this.handlePause.bind(this))
    EventBus.on('gameResumed', this.handleResume.bind(this))
    EventBus.on('performanceWarning', this.handlePerformanceWarning.bind(this))
  }

  start(): void {
    // Emit game started event
    EventBus.emit('gameStarted', undefined)
  }

  private handlePause(): void {
    this.isPaused = true
  }

  private handleResume(): void {
    this.isPaused = false
  }

  private handlePerformanceWarning(data: { message: string; severity: string }): void {
    console.warn(`Performance warning: ${data.message}`)
  }
}
```

### photo-system.ts
```typescript
import { EventBus } from './event-bus'

export class PhotoSystem {
  takePhoto(creature: string, distance: number): void {
    const score = this.calculateScore(distance)
    
    // Emit events instead of callbacks
    EventBus.emit('photoScoreCalculated', {
      score,
      distance,
      framing: this.calculateFraming(),
      rarity: this.getCreatureRarity(creature)
    })

    EventBus.emit('photoTaken', {
      score,
      creature,
      dataUrl: this.captureScreenshot()
    })
  }
}
```

### camera.ts
```typescript
import { EventBus } from './event-bus'

export class CameraController {
  switchMode(mode: 'ride' | 'free'): void {
    this.currentMode = mode
    EventBus.emit('cameraModeSwitched', { mode })
  }

  setRideSpeed(speed: number): void {
    this.rideSpeed = speed
    EventBus.emit('cameraSpeedChanged', { speed })
  }
}
```

### audio.ts
```typescript
import { EventBus } from './event-bus'

export class AudioSystem {
  constructor() {
    // Listen to various events and play sounds
    EventBus.on('photoTaken', this.handlePhotoTaken.bind(this))
    EventBus.on('uiPanelToggled', this.handleUIClick.bind(this))
    EventBus.on('creatureNearby', this.handleCreatureNearby.bind(this))
    EventBus.on('cameraModeSwitched', this.handleCameraSwitch.bind(this))
  }

  private handlePhotoTaken(data: { score: number }): void {
    const volume = data.score > 80 ? 1.0 : 0.8
    this.playShutterSound(volume)
    EventBus.emit('audioPlayed', { type: 'shutter', volume })
  }

  private handleUIClick(): void {
    this.playUIClick()
    EventBus.emit('audioPlayed', { type: 'ui_click', volume: 0.5 })
  }

  private handleCreatureNearby(data: { distance: number }): void {
    const volume = Math.max(0.1, 1 - data.distance / 25)
    this.playCreatureSound(volume)
  }

  private handleCameraSwitch(): void {
    this.playTransitionSound()
  }
}
```

### ui.ts
```typescript
import { EventBus } from './event-bus'

export class UI {
  constructor() {
    // Listen to events to update UI
    EventBus.on('photoTaken', this.handlePhotoTaken.bind(this))
    EventBus.on('photoScoreCalculated', this.handleScoreCalculated.bind(this))
    EventBus.on('creatureNearby', this.handleCreatureNearby.bind(this))
    EventBus.on('fpsChanged', this.handleFPSChanged.bind(this))
  }

  private handlePhotoTaken(data: { score: number; creature: string; dataUrl: string }): void {
    this.addPhotoToGallery(data.dataUrl, data.score, data.creature)
    this.showToast(`Photo captured! Score: ${data.score}`)
  }

  private handleScoreCalculated(data: { score: number }): void {
    this.updateScoreDisplay(data.score)
  }

  private handleCreatureNearby(data: { name: string; distance: number }): void {
    if (this.showCreatureInfoEnabled) {
      this.showCreatureInfo(data.name, data.distance)
    }
  }

  private handleFPSChanged(data: { fps: number }): void {
    this.updateFPSDisplay(data.fps)
  }

  toggleGallery(): void {
    this.galleryVisible = !this.galleryVisible
    EventBus.emit('uiPanelToggled', {
      panel: 'gallery',
      visible: this.galleryVisible
    })
  }

  toggleSettings(): void {
    this.settingsVisible = !this.settingsVisible
    EventBus.emit('uiPanelToggled', {
      panel: 'settings',
      visible: this.settingsVisible
    })
  }

  updateSetting(key: string, value: any): void {
    EventBus.emit('settingChanged', { key, value })
  }
}
```

### creatures.ts
```typescript
import { EventBus } from './event-bus'

export class CreatureSystem {
  spawnCreature(type: string, position: Vector3): void {
    const creature = this.createCreature(type, position)
    
    EventBus.emit('creatureSpawned', {
      id: creature.id,
      type: creature.type,
      position: { x: position.x, y: position.y, z: position.z }
    })
  }

  update(cameraPosition: Vector3): void {
    this.creatures.forEach(creature => {
      const distance = creature.position.distanceTo(cameraPosition)
      
      if (distance < 25) {
        EventBus.emit('creatureNearby', {
          id: creature.id,
          name: creature.name,
          distance
        })
      }
    })
  }
}
```

### multiplayer/WebRTCMultiplayer.ts
```typescript
import { EventBus } from '../event-bus'

export class WebRTCMultiplayer {
  constructor() {
    // Listen to game events to sync with peers
    EventBus.on('photoTaken', this.syncPhotoWithPeers.bind(this))
    EventBus.on('cameraModeSwitched', this.syncCameraMode.bind(this))
  }

  private handlePeerConnected(peerId: string): void {
    EventBus.emit('peerConnected', { peerId })
  }

  private handlePeerDisconnected(peerId: string): void {
    EventBus.emit('peerDisconnected', { peerId })
  }

  private handlePeerState(peerId: string, state: any): void {
    EventBus.emit('peerStateReceived', { peerId, state })
  }

  private syncPhotoWithPeers(data: { score: number; creature: string }): void {
    this.peers.forEach(peer => {
      peer.send({ type: 'photo', data })
    })
  }

  private syncCameraMode(data: { mode: string }): void {
    this.peers.forEach(peer => {
      peer.send({ type: 'camera', data })
    })
  }
}
```

## Step 2: Enable Debug Mode (Development)

```typescript
// main.ts
import { EventBus } from './event-bus'

if (import.meta.env.DEV) {
  EventBus.setDebugMode(true)
  console.log('Event Bus debug mode enabled')
}
```

## Step 3: Add to Debug Panel

```typescript
// debug.ts
import { EventBus } from './event-bus'

export class DebugPanel {
  updateEventBusInfo(): void {
    const events = EventBus.getRegisteredEvents()
    const debugInfo = EventBus.getDebugInfo()
    
    this.debugEl.innerHTML = `
      <h3>Event Bus</h3>
      <p>Registered Events: ${events.length}</p>
      <ul>
        ${debugInfo.map(info => 
          `<li>${info.event}: ${info.handlerCount} handlers</li>`
        ).join('')}
      </ul>
    `
  }
}
```

## Step 4: Test Integration

```typescript
// In browser console
import { runEventBusTests } from './examples/event-bus-test'
runEventBusTests()
```

## Benefits

After integration, your systems will:
- ✅ Be loosely coupled (no direct dependencies)
- ✅ Be easier to test (mock events instead of complex setups)
- ✅ Be more maintainable (add features without modifying existing code)
- ✅ Have better type safety (TypeScript autocomplete for all events)
- ✅ Be easier to debug (centralized event logging)

## Next Steps

1. Start with one system (e.g., photo system)
2. Migrate callbacks to events
3. Test thoroughly
4. Gradually migrate other systems
5. Remove old callback code once migration is complete
