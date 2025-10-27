# World State Integration Guide

This guide shows how to integrate the world state save/load system into the existing AI Snap game.

## Step 1: Add WorldStateManager to Game

Update `src/game/Game.ts`:

```typescript
import { WorldStateManager, createWorldStateSnapshot } from '@systems/state'

export class Game {
  private worldStateManager: WorldStateManager
  
  constructor(container: HTMLElement) {
    // ... existing code ...
    
    // Initialize world state manager
    this.worldStateManager = new WorldStateManager()
    this.worldStateManager.setAutoSaveEnabled(true)
    this.worldStateManager.setAutoSaveInterval(120000) // 2 minutes
  }
  
  // Add getter for external access
  public getWorldStateManager(): WorldStateManager {
    return this.worldStateManager
  }
}
```

## Step 2: Add Save/Load UI

Update `src/ui/managers/UIManager.ts`:

```typescript
import { SaveLoadMenu } from '@ui/components'

export class UIManager {
  private saveLoadMenu: SaveLoadMenu
  
  constructor() {
    // ... existing code ...
    this.saveLoadMenu = new SaveLoadMenu()
  }
  
  public initializeSaveLoadMenu(worldStateManager: WorldStateManager): void {
    this.saveLoadMenu.setWorldStateManager(worldStateManager)
    this.saveLoadMenu.setAudioCallbacks(this.audioCallbacks)
    this.saveLoadMenu.setCallbacks({
      onSave: (slotId) => this.handleSave(slotId),
      onLoad: (slotId) => this.handleLoad(slotId),
      onDelete: (slotId) => this.handleDelete(slotId),
      onExport: (slotId) => this.handleExport(slotId),
      onImport: (slotId, data) => this.handleImport(slotId, data),
    })
  }
  
  public toggleSaveLoadMenu(): void {
    this.saveLoadMenu.toggle()
  }
  
  private handleSave(slotId: string): void {
    this.onSaveGame?.(slotId)
  }
  
  private handleLoad(slotId: string): void {
    this.onLoadGame?.(slotId)
  }
  
  private handleDelete(slotId: string): void {
    // Handled by WorldStateManager
  }
  
  private handleExport(slotId: string): void {
    this.onExportSave?.(slotId)
  }
  
  private handleImport(slotId: string, data: string): void {
    this.onImportSave?.(slotId, data)
  }
  
  // Callbacks to be set by Game
  public onSaveGame?: (slotId: string) => void
  public onLoadGame?: (slotId: string) => void
  public onExportSave?: (slotId: string) => void
  public onImportSave?: (slotId: string, data: string) => void
}
```

## Step 3: Implement Save Logic in Game

Add to `src/game/Game.ts`:

```typescript
private setupSaveLoadCallbacks(): void {
  const { ui, state } = this.systems
  
  ui.onSaveGame = (slotId) => {
    this.saveGame(slotId)
  }
  
  ui.onLoadGame = (slotId) => {
    this.loadGame(slotId)
  }
  
  ui.onExportSave = (slotId) => {
    this.exportSave(slotId)
  }
  
  ui.onImportSave = (slotId, data) => {
    this.importSave(slotId, data)
  }
}

private saveGame(slotId: string): void {
  const snapshot = createWorldStateSnapshot({
    worldSeed: GAME_CONFIG.WORLD_SEED,
    creatures: this.systems.creatures.getAllCreatures(),
    experimentCreature: this.systems.creatures.getExperimentCreature(),
    progress: this.getPlayerProgress(),
    camera: this.systems.camera.camera,
    cameraMode: this.systems.camera.getMode(),
    rideProgress: this.systems.camera.getRideProgress?.() ?? 0,
    photos: this.getGalleryPhotos(),
    settings: {
      dayNightMode: this.systems.scene.getDayNightMode?.() ?? 'day',
      audioEnabled: this.systems.audio.isEnabled?.() ?? true,
      ambientVolume: this.systems.audio.getAmbientVolume?.() ?? 0.5,
      shaderEnabled: this.systems.shaders.isEnabled(),
      showCreatureInfo: true,
    },
  })
  
  const success = this.worldStateManager.createSave(slotId, snapshot)
  
  if (success) {
    this.systems.ui.showToast('💾 Game saved!')
  } else {
    this.systems.ui.showToast('❌ Save failed!')
  }
}

private loadGame(slotId: string): void {
  const state = this.worldStateManager.loadSave(slotId)
  
  if (!state) {
    this.systems.ui.showToast('❌ Load failed!')
    return
  }
  
  // Restore game state
  this.restoreGameState(state)
  this.systems.ui.showToast('📂 Game loaded!')
}

private restoreGameState(state: WorldState): void {
  // Restore camera
  this.systems.camera.camera.position.set(
    state.camera.position.x,
    state.camera.position.y,
    state.camera.position.z
  )
  this.systems.camera.camera.rotation.set(
    state.camera.rotation.x,
    state.camera.rotation.y,
    state.camera.rotation.z
  )
  
  // Restore progress
  this.setPlayerProgress(state.progress)
  
  // Restore gallery
  this.loadGalleryPhotos(state.photos)
  
  // Restore settings
  if (state.settings.dayNightMode) {
    this.systems.scene.setDayNightMode?.(state.settings.dayNightMode)
  }
  
  // Respawn creatures (they'll regenerate from seed)
  this.systems.creatures.respawnCreatures()
}

private getPlayerProgress(): PlayerProgress {
  const uiState = this.systems.state.getUIState()
  return {
    photoCount: uiState.photoCount,
    totalScore: uiState.totalScore,
    bestScore: uiState.lastScore, // Track this separately
    creaturesDiscovered: new Set(), // Track this separately
    rarityTiers: {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    },
    playTime: this.worldStateManager.getSessionPlayTime(),
    lastPlayed: Date.now(),
  }
}

private setPlayerProgress(progress: PlayerProgress): void {
  this.systems.state.updateUIState({
    photoCount: progress.photoCount,
    totalScore: progress.totalScore,
    lastScore: progress.bestScore,
  })
}

private getGalleryPhotos(): SerializedPhoto[] {
  // Get photos from gallery component
  return [] // Implement based on your gallery structure
}

private loadGalleryPhotos(photos: SerializedPhoto[]): void {
  // Load photos into gallery
  photos.forEach(photo => {
    this.systems.ui.addPhotoToGallery(
      photo.dataUrl,
      photo.score,
      photo.creatureName
    )
  })
}

private exportSave(slotId: string): void {
  const jsonData = this.worldStateManager.exportSave(slotId)
  if (!jsonData) return
  
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aisnap_save_${slotId}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  this.systems.ui.showToast('📤 Save exported!')
}

private importSave(slotId: string, data: string): void {
  const success = this.worldStateManager.importSave(slotId, data)
  if (success) {
    this.systems.ui.showToast('📥 Save imported!')
  } else {
    this.systems.ui.showToast('❌ Import failed!')
  }
}
```

## Step 4: Add Keyboard Shortcuts

Update `src/game/InputHandler.ts`:

```typescript
private setupKeyboardShortcuts(): void {
  // ... existing shortcuts ...
  
  // F5 - Quick Save
  this.inputManager.registerAction('quicksave', {
    keys: ['F5'],
    callback: () => {
      this.callbacks.onQuickSave?.()
    },
  })
  
  // F9 - Quick Load
  this.inputManager.registerAction('quickload', {
    keys: ['F9'],
    callback: () => {
      this.callbacks.onQuickLoad?.()
    },
  })
  
  // Escape - Open Save/Load Menu
  this.inputManager.registerAction('saveloadmenu', {
    keys: ['Escape'],
    callback: () => {
      this.callbacks.onToggleSaveLoadMenu?.()
    },
  })
}
```

## Step 5: Add UI Button

Update `index.html`:

```html
<div id="topbar">
  <!-- ... existing buttons ... -->
  <button id="saveLoadBtn" title="Save/Load (Esc)">💾</button>
</div>
```

Add event listener in `src/ui/managers/UIManager.ts`:

```typescript
private setupEventListeners() {
  // ... existing listeners ...
  
  const saveLoadBtn = document.getElementById('saveLoadBtn')
  saveLoadBtn?.addEventListener('click', () => {
    this.audioCallbacks.onClick?.()
    this.toggleSaveLoadMenu()
  })
}
```

## Step 6: Track Progress

Update photo capture to track progress:

```typescript
import { updateProgressWithPhoto } from '@systems/state'

private takePhoto(): void {
  // ... existing photo code ...
  
  // Update progress
  const currentProgress = this.getPlayerProgress()
  const updatedProgress = updateProgressWithPhoto(
    currentProgress,
    result.score,
    result.creatureName,
    result.creature.rarity
  )
  this.setPlayerProgress(updatedProgress)
}
```

## Step 7: Initialize in Game Constructor

```typescript
private async initialize(): Promise<void> {
  // ... existing initialization ...
  
  // Initialize save/load UI
  this.systems.ui.initializeSaveLoadMenu(this.worldStateManager)
  this.setupSaveLoadCallbacks()
}
```

## Testing

1. Start the game
2. Take some photos
3. Press F5 to quick save
4. Take more photos
5. Press F9 to quick load (should restore previous state)
6. Press Escape to open save/load menu
7. Try saving to different slots
8. Export a save and verify JSON format
9. Delete a save and verify it's gone
10. Clear browser data and verify saves are lost (expected behavior)

## Optional Enhancements

### Auto-save on Photo
```typescript
private takePhoto(): void {
  // ... existing code ...
  
  // Auto-save after every 5 photos
  if (this.getPlayerProgress().photoCount % 5 === 0) {
    this.worldStateManager.quickSave(this.createSnapshot())
  }
}
```

### Save on Page Unload
```typescript
window.addEventListener('beforeunload', () => {
  this.worldStateManager.quickSave(this.createSnapshot())
})
```

### Progress Persistence
Create a separate `PlayerProgressManager` to track:
- Creatures discovered
- Best scores per creature
- Achievements
- Statistics

## Troubleshooting

**Save not working?**
- Check browser console for errors
- Verify localStorage is enabled
- Check storage quota

**Load not restoring correctly?**
- Verify all state is being captured in snapshot
- Check for missing properties in WorldState
- Ensure proper deserialization

**Storage full?**
- Reduce photo data URL quality
- Limit number of photos saved
- Implement photo compression
- Clear old saves

## Next Steps

- Add cloud save integration
- Implement save file compression
- Add save thumbnails
- Create statistics dashboard
- Add achievement system
