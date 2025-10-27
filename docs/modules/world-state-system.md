# World State System

The World State System provides save/load functionality for AI Snap, allowing players to persist their progress across sessions.

## Overview

The system consists of three main components:

1. **WorldStateManager** - Handles save/load operations with localStorage
2. **Serialization Helpers** - Convert game objects to/from JSON
3. **Save/Load UI** - User interface for managing save slots

## Features

- **Multiple Save Slots** - Up to 5 save slots plus quick save
- **Auto-Save** - Configurable automatic saving
- **Import/Export** - Save files can be exported/imported as JSON
- **Progress Tracking** - Photos, scores, creatures discovered, play time
- **Storage Management** - Monitor localStorage usage
- **Version Migration** - Support for future save format changes

## What Gets Saved

### Player Progress
- Photo count and total score
- Best photo score
- Creatures discovered (by name)
- Rarity tier statistics (common, uncommon, rare, epic, legendary)
- Total play time
- Last played timestamp

### World State
- World seed (for procedural generation)
- Camera position, rotation, and mode
- Ride progress

### Gallery
- Photo data URLs
- Photo scores and creature names
- Photo timestamps

### Settings
- Day/night mode
- Audio enabled/disabled
- Ambient volume
- Shader enabled/disabled
- Show creature info preference

### Optional: Creature State
- Creature positions and anatomy (if preserving exact world state)
- Experiment creature data

## Usage

### Basic Setup

```typescript
import { WorldStateManager } from '@systems/state'

// Initialize manager
const worldStateManager = new WorldStateManager()

// Enable auto-save (every 60 seconds by default)
worldStateManager.setAutoSaveEnabled(true)
worldStateManager.setAutoSaveInterval(120000) // 2 minutes
```

### Saving Game

```typescript
import { createWorldStateSnapshot } from '@systems/state'

// Create snapshot of current game state
const snapshot = createWorldStateSnapshot({
  worldSeed: GAME_CONFIG.WORLD_SEED,
  creatures: creatureSystem.getAllCreatures(),
  experimentCreature: creatureSystem.getExperimentCreature(),
  progress: playerProgress,
  camera: cameraController.camera,
  cameraMode: cameraController.getMode(),
  rideProgress: cameraController.getRideProgress(),
  photos: galleryPhotos,
  settings: {
    dayNightMode: sceneManager.getDayNightMode(),
    audioEnabled: audioSystem.isEnabled(),
    ambientVolume: audioSystem.getAmbientVolume(),
    shaderEnabled: shaderManager.isEnabled(),
    showCreatureInfo: uiManager.getShowCreatureInfo(),
  },
})

// Save to slot
worldStateManager.createSave('slot_1', snapshot)
```

### Loading Game

```typescript
// Load from slot
const state = worldStateManager.loadSave('slot_1')

if (state) {
  // Restore world seed
  regenerateWorld(state.worldSeed)
  
  // Restore camera
  cameraController.setPosition(state.camera.position)
  cameraController.setRotation(state.camera.rotation)
  cameraController.setMode(state.camera.mode)
  
  // Restore progress
  playerProgress = state.progress
  
  // Restore gallery
  galleryPhotos = state.photos
  
  // Restore settings
  sceneManager.setDayNightMode(state.settings.dayNightMode)
  audioSystem.setEnabled(state.settings.audioEnabled)
  shaderManager.setEnabled(state.settings.shaderEnabled)
}
```

### Quick Save/Load

```typescript
// Quick save (uses 'quicksave' slot)
worldStateManager.quickSave(snapshot)

// Quick load
const state = worldStateManager.quickLoad()
```

### Managing Slots

```typescript
// Get all save metadata
const metadata = worldStateManager.getAllMetadata()
metadata.forEach(meta => {
  console.log(`Slot: ${meta.slotId}`)
  console.log(`Photos: ${meta.photoCount}`)
  console.log(`Score: ${meta.totalScore}`)
})

// Check if slot has save
if (worldStateManager.hasSave('slot_1')) {
  // Load it
}

// Delete save
worldStateManager.deleteSave('slot_2')

// Clear all saves
worldStateManager.clearAllSaves()
```

### Import/Export

```typescript
// Export save to JSON
const jsonData = worldStateManager.exportSave('slot_1')
if (jsonData) {
  // Download as file
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `save_${Date.now()}.json`
  a.click()
}

// Import save from JSON
const success = worldStateManager.importSave('slot_3', jsonString)
```

### Storage Management

```typescript
// Get storage info
const info = worldStateManager.getStorageInfo()
console.log(`Used: ${info.used} KB`)
console.log(`Available: ${info.available} KB`)
console.log(`Percentage: ${info.percentage}%`)
```

## UI Integration

### Save/Load Menu

```typescript
import { SaveLoadMenu } from '@ui/components/save-load-menu'

// Create menu
const saveLoadMenu = new SaveLoadMenu()
saveLoadMenu.setWorldStateManager(worldStateManager)

// Set callbacks
saveLoadMenu.setCallbacks({
  onSave: (slotId) => {
    const snapshot = createWorldStateSnapshot(/* ... */)
    worldStateManager.createSave(slotId, snapshot)
  },
  onLoad: (slotId) => {
    const state = worldStateManager.loadSave(slotId)
    if (state) restoreGameState(state)
  },
  onDelete: (slotId) => {
    worldStateManager.deleteSave(slotId)
  },
  onExport: (slotId) => {
    exportSaveToFile(worldStateManager, slotId)
  },
  onImport: (slotId, data) => {
    worldStateManager.importSave(slotId, data)
  },
})

// Open menu
saveLoadMenu.open()
```

### Keyboard Shortcuts

```typescript
// F5 - Quick Save
// F9 - Quick Load
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5') {
    e.preventDefault()
    worldStateManager.quickSave(createSnapshot())
  }
  if (e.key === 'F9') {
    e.preventDefault()
    const state = worldStateManager.quickLoad()
    if (state) restoreGameState(state)
  }
})
```

## Progress Tracking

### Update Progress on Photo

```typescript
import { updateProgressWithPhoto } from '@systems/state'

// When player takes photo
const result = photoSystem.takePhoto(creatures, camera, scene)

// Update progress
playerProgress = updateProgressWithPhoto(
  playerProgress,
  result.score,
  result.creatureName,
  result.creature.rarity
)
```

### Track Play Time

```typescript
// Get session play time
const sessionTime = worldStateManager.getSessionPlayTime()

// Add to total when saving
const totalPlayTime = playerProgress.playTime + sessionTime

// Reset tracker after save
worldStateManager.resetPlayTimeTracker()
```

## Serialization Helpers

### Serialize Creature

```typescript
import { serializeCreature } from '@systems/state'

const serialized = serializeCreature(creatureInstance)
// Returns SerializedCreature (no Three.js objects)
```

### Serialize Camera

```typescript
import { serializeCameraState } from '@systems/state'

const cameraState = serializeCameraState(
  camera,
  'freeroam',
  rideProgress
)
```

### Format Helpers

```typescript
import { formatPlayTime, formatSaveDate } from '@systems/state'

// Format seconds to readable time
formatPlayTime(3665) // "1h 1m"

// Format timestamp to relative time
formatSaveDate(Date.now() - 3600000) // "1 hour ago"
```

## Best Practices

1. **Save Frequently** - Enable auto-save or prompt users to save regularly
2. **Validate on Load** - Check loaded state for corruption or version mismatches
3. **Handle Errors** - Wrap save/load in try-catch blocks
4. **Inform Users** - Show toast notifications for save/load operations
5. **Backup Important Saves** - Encourage users to export critical saves
6. **Monitor Storage** - Warn users when approaching storage limits
7. **Version Migration** - Plan for future save format changes

## Limitations

- **localStorage Limit** - Typically 5-10MB per domain
- **No Cloud Sync** - Saves are local to browser/device
- **Browser Clearing** - Saves lost if user clears browser data
- **No Encryption** - Save data is stored as plain JSON
- **Creature Regeneration** - Creatures are regenerated from seed, not exact state (unless explicitly saved)

## Future Enhancements

- Cloud save integration
- Save file compression
- Encrypted saves
- Save file validation/checksums
- Undo/redo system
- Save state diffing for multiplayer
- Screenshot thumbnails for saves
- Achievement tracking
- Statistics dashboard

## Example: Full Integration

See `examples/world-state-integration.ts` for complete integration examples including:
- Initialization
- Save/load operations
- Auto-save setup
- Import/export
- Keyboard shortcuts
- Progress tracking
- State restoration
