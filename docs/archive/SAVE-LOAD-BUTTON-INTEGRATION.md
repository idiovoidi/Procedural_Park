# Save/Load Button Integration

The save/load button (💾) has been added to the top bar and is ready to use!

## What Was Added

### HTML (index.html)
- ✅ Added `💾` button to topbar (first button in controls-group)
- ✅ Added save/load shortcuts to keyboard shortcuts panel (F5/F9)

### UIManager (src/ui/managers/UIManager.ts)
- ✅ Imported `SaveLoadMenu` component
- ✅ Created `saveLoadMenu` instance
- ✅ Added button click handler
- ✅ Added `toggleSaveLoadMenu()` method
- ✅ Added `getSaveLoadMenu()` getter
- ✅ Wired up audio callbacks

## How to Complete Integration

### Step 1: Initialize in Game.ts

```typescript
import { WorldStateManager } from '@systems/state'

export class Game {
  private worldStateManager: WorldStateManager
  
  private async initialize(): Promise<void> {
    // ... existing initialization ...
    
    // Initialize world state manager
    this.worldStateManager = new WorldStateManager()
    this.worldStateManager.setAutoSaveEnabled(true)
    
    // Setup save/load menu
    this.setupSaveLoadMenu()
  }
  
  private setupSaveLoadMenu(): void {
    const saveLoadMenu = this.systems.ui.getSaveLoadMenu()
    
    // Set the world state manager
    saveLoadMenu.setWorldStateManager(this.worldStateManager)
    
    // Set callbacks
    saveLoadMenu.setCallbacks({
      onSave: (slotId) => this.handleSave(slotId),
      onLoad: (slotId) => this.handleLoad(slotId),
      onDelete: (slotId) => {
        // Handled by WorldStateManager
        this.systems.ui.showToast('🗑️ Save deleted')
      },
      onExport: (slotId) => this.handleExport(slotId),
      onImport: (slotId, data) => this.handleImport(slotId, data),
    })
  }
}
```

### Step 2: Implement Save/Load Handlers

```typescript
import { createWorldStateSnapshot } from '@systems/state'

private handleSave(slotId: string): void {
  const snapshot = createWorldStateSnapshot({
    worldSeed: GAME_CONFIG.WORLD_SEED,
    progress: this.getPlayerProgress(),
    camera: this.systems.camera.camera,
    cameraMode: this.systems.camera.getMode(),
    photos: this.getGalleryPhotos(),
    settings: this.getGameSettings(),
  })
  
  const success = this.worldStateManager.createSave(slotId, snapshot)
  
  if (success) {
    this.systems.ui.showToast('💾 Game saved!')
  } else {
    this.systems.ui.showToast('❌ Save failed!')
  }
}

private handleLoad(slotId: string): void {
  const state = this.worldStateManager.loadSave(slotId)
  
  if (!state) {
    this.systems.ui.showToast('❌ Load failed!')
    return
  }
  
  this.restoreGameState(state)
  this.systems.ui.showToast('📂 Game loaded!')
}

private handleExport(slotId: string): void {
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

private handleImport(slotId: string, data: string): void {
  const success = this.worldStateManager.importSave(slotId, data)
  if (success) {
    this.systems.ui.showToast('📥 Save imported!')
  } else {
    this.systems.ui.showToast('❌ Import failed!')
  }
}
```

### Step 3: Add Keyboard Shortcuts (Optional)

Add to `InputHandler.ts` or `Game.ts`:

```typescript
private setupSaveLoadShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // F5 - Quick Save
    if (e.key === 'F5') {
      e.preventDefault()
      this.handleSave('quicksave')
    }
    
    // F9 - Quick Load
    if (e.key === 'F9') {
      e.preventDefault()
      this.handleLoad('quicksave')
    }
  })
}
```

## Testing

1. **Start the game**
2. **Click the 💾 button** in the top bar
3. **Save/Load menu should open** with 5 empty slots
4. **Click "💾 Save Here"** on any slot
5. **Verify save appears** with metadata
6. **Click "📂 Load"** to restore
7. **Try F5** for quick save
8. **Try F9** for quick load

## UI Preview

The button appears in the top bar:
```
[💾] [🌙 Night Mode] [🌐] [⚙️] [⌨️] [📷] [🔄]
```

Clicking it opens the save/load menu with:
- 5 save slots
- Quick save/load buttons
- Storage usage indicator
- Save/load/delete/export actions

## Next Steps

1. Follow the integration steps above
2. Implement helper methods (getPlayerProgress, getGalleryPhotos, etc.)
3. Test all functionality
4. See [WORLD-STATE-INTEGRATION-GUIDE.md](WORLD-STATE-INTEGRATION-GUIDE.md) for complete details

## Files Modified

- ✅ `index.html` - Added button and shortcuts
- ✅ `src/ui/managers/UIManager.ts` - Added menu integration
- ✅ `src/ui/components/save-load-menu.ts` - Already created
- ✅ `src/style.css` - Styles already added

## Ready to Use!

The UI is complete. Just add the Game.ts integration code above and you're done! 🎉
