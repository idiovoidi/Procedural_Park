# Event Bus Migration Guide

How to migrate existing callback-based systems to use the Event Bus.

## Before: Callback Pattern

```typescript
// photo-system.ts (OLD)
export class PhotoSystem {
  private onPhotoTaken?: (score: number, creature: string) => void
  private onScoreCalculated?: (score: number) => void

  constructor(callbacks: {
    onPhotoTaken?: (score: number, creature: string) => void
    onScoreCalculated?: (score: number) => void
  }) {
    this.onPhotoTaken = callbacks.onPhotoTaken
    this.onScoreCalculated = callbacks.onScoreCalculated
  }

  takePhoto(creature: string): void {
    const score = this.calculateScore()
    this.onScoreCalculated?.(score)
    this.onPhotoTaken?.(score, creature)
  }
}

// game.ts (OLD)
const photoSystem = new PhotoSystem({
  onPhotoTaken: (score, creature) => {
    audioSystem.playShutter()
    ui.addToGallery(score, creature)
    multiplayer.syncPhoto(score, creature)
  },
  onScoreCalculated: (score) => {
    ui.showScore(score)
  }
})
```

## After: Event Bus Pattern

```typescript
// photo-system.ts (NEW)
import { EventBus } from './event-bus'

export class PhotoSystem {
  takePhoto(creature: string, dataUrl: string): void {
    const score = this.calculateScore()
    
    EventBus.emit('photoScoreCalculated', {
      score,
      distance: 10,
      framing: 0.8,
      rarity: 0.5
    })
    
    EventBus.emit('photoTaken', {
      score,
      creature,
      dataUrl
    })
  }
}

// audio.ts (NEW)
import { EventBus } from './event-bus'

export class AudioSystem {
  constructor() {
    EventBus.on('photoTaken', this.handlePhotoTaken.bind(this))
  }

  private handlePhotoTaken(data: { score: number }): void {
    this.playShutter(data.score > 80 ? 1.0 : 0.8)
  }
}

// ui.ts (NEW)
import { EventBus } from './event-bus'

export class UI {
  constructor() {
    EventBus.on('photoTaken', this.handlePhotoTaken.bind(this))
    EventBus.on('photoScoreCalculated', this.handleScoreCalculated.bind(this))
  }

  private handlePhotoTaken(data: { score: number; creature: string; dataUrl: string }): void {
    this.addToGallery(data.score, data.creature, data.dataUrl)
  }

  private handleScoreCalculated(data: { score: number }): void {
    this.showScore(data.score)
  }
}

// multiplayer.ts (NEW)
import { EventBus } from './event-bus'

export class Multiplayer {
  constructor() {
    EventBus.on('photoTaken', this.handlePhotoTaken.bind(this))
  }

  private handlePhotoTaken(data: { score: number; creature: string }): void {
    this.syncPhoto(data.score, data.creature)
  }
}

// game.ts (NEW)
const photoSystem = new PhotoSystem()
const audioSystem = new AudioSystem()
const ui = new UI()
const multiplayer = new Multiplayer()
```

## Migration Steps

### Step 1: Identify Callback Chains

Look for patterns like:
- Constructor callbacks: `onSomething?: () => void`
- Method callbacks: `doSomething(callback: () => void)`
- Property callbacks: `this.onEvent = callback`

### Step 2: Define Event Types

Add event types to `GameEvents` interface:

```typescript
export interface GameEvents {
  photoTaken: { score: number; creature: string; dataUrl: string }
  // ... more events
}
```

### Step 3: Replace Callback Invocations

Replace:
```typescript
this.onPhotoTaken?.(score, creature)
```

With:
```typescript
EventBus.emit('photoTaken', { score, creature, dataUrl })
```

### Step 4: Replace Callback Subscriptions

Replace:
```typescript
const system = new System({
  onEvent: (data) => handleEvent(data)
})
```

With:
```typescript
const system = new System()
EventBus.on('event', (data) => handleEvent(data))
```

### Step 5: Add Cleanup

Add cleanup methods to prevent memory leaks:

```typescript
class System {
  private handlers = {
    photoTaken: this.handlePhotoTaken.bind(this)
  }

  constructor() {
    EventBus.on('photoTaken', this.handlers.photoTaken)
  }

  dispose() {
    EventBus.off('photoTaken', this.handlers.photoTaken)
  }
}
```

## Common Patterns

### Pattern 1: UI Button Clicks

**Before:**
```typescript
button.addEventListener('click', () => {
  this.onButtonClick?.()
})
```

**After:**
```typescript
button.addEventListener('click', () => {
  EventBus.emit('uiPanelToggled', { panel: 'settings', visible: true })
})
```

### Pattern 2: Settings Changes

**Before:**
```typescript
slider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value)
  this.onSpeedChange?.(value)
})
```

**After:**
```typescript
slider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value)
  EventBus.emit('cameraSpeedChanged', { speed: value })
})
```

### Pattern 3: Game State Changes

**Before:**
```typescript
startGame() {
  this.isRunning = true
  this.onGameStart?.()
}
```

**After:**
```typescript
startGame() {
  this.isRunning = true
  EventBus.emit('gameStarted', undefined)
}
```

## Gradual Migration

You can migrate gradually by supporting both patterns:

```typescript
class PhotoSystem {
  // Keep old callbacks for backward compatibility
  private onPhotoTaken?: (score: number) => void

  constructor(callbacks?: { onPhotoTaken?: (score: number) => void }) {
    this.onPhotoTaken = callbacks?.onPhotoTaken
  }

  takePhoto(creature: string): void {
    const score = this.calculateScore()
    
    // Emit event (new)
    EventBus.emit('photoTaken', { score, creature, dataUrl: '...' })
    
    // Call callback (old - for backward compatibility)
    this.onPhotoTaken?.(score)
  }
}
```

Then gradually remove old callbacks as systems migrate.

## Testing

Test event flow with debug mode:

```typescript
EventBus.setDebugMode(true)

// Trigger action
photoSystem.takePhoto('Deer')

// Check console for event flow:
// [EventBus] Emitting 'photoTaken' { score: 85, creature: 'Deer' }
// [EventBus] Handler called for 'photoTaken'
```

## Benefits of Migration

- **Reduced Coupling**: Systems don't need references to each other
- **Easier Testing**: Mock events instead of complex callback chains
- **Better Scalability**: Add new listeners without modifying emitters
- **Cleaner Code**: No more callback parameter drilling
- **Type Safety**: Full TypeScript support with autocomplete
