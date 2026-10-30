# World State Quick Start

Get the save/load system running in 5 minutes.

## 1. Initialize Manager (30 seconds)

```typescript
// In Game.ts constructor
import { WorldStateManager } from '@systems/state'

this.worldStateManager = new WorldStateManager()
this.worldStateManager.setAutoSaveEnabled(true)
```

## 2. Create Save Function (2 minutes)

```typescript
// In Game.ts
import { createWorldStateSnapshot } from '@systems/state'

private saveGame(slotId: string): void {
  const snapshot = createWorldStateSnapshot({
    worldSeed: GAME_CONFIG.WORLD_SEED,
    progress: {
      photoCount: this.systems.ui.getPhotoCount(),
      totalScore: this.systems.ui.getTotalScore(),
      bestScore: 0,
      creaturesDiscovered: new Set(),
      rarityTiers: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
      playTime: this.worldStateManager.getSessionPlayTime(),
      lastPlayed: Date.now(),
    },
    camera: this.systems.camera.camera,
    cameraMode: this.systems.camera.getMode(),
    photos: [],
    settings: {
      dayNightMode: 'day',
      audioEnabled: true,
      ambientVolume: 0.5,
      shaderEnabled: this.systems.shaders.isEnabled(),
      showCreatureInfo: true,
    },
  })
  
  this.worldStateManager.createSave(slotId, snapshot)
  this.systems.ui.showToast('💾 Saved!')
}
```

## 3. Create Load Function (1 minute)

```typescript
// In Game.ts
private loadGame(slotId: string): void {
  const state = this.worldStateManager.loadSave(slotId)
  if (!state) return
  
  // Restore camera
  this.systems.camera.camera.position.copy(state.camera.position)
  this.systems.camera.camera.rotation.set(
    state.camera.rotation.x,
    state.camera.rotation.y,
    state.camera.rotation.z
  )
  
  this.systems.ui.showToast('📂 Loaded!')
}
```

## 4. Add Keyboard Shortcuts (1 minute)

```typescript
// In InputHandler.ts or Game.ts
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5') {
    e.preventDefault()
    this.saveGame('quicksave')
  }
  if (e.key === 'F9') {
    e.preventDefault()
    this.loadGame('quicksave')
  }
})
```

## 5. Test It (30 seconds)

1. Start game
2. Press F5 to save
3. Move camera
4. Press F9 to load
5. Camera should return to saved position

## Done! 🎉

You now have basic save/load working. 

## Next Steps

- Add UI menu: See `docs/WORLD-STATE-INTEGRATION-GUIDE.md`
- Track progress: Use `updateProgressWithPhoto()`
- Save photos: Add to snapshot
- Full integration: Follow checklist in `docs/WORLD-STATE-CHECKLIST.md`

## Common Issues

**Save not working?**
```typescript
// Check console for errors
console.log('Save result:', this.worldStateManager.createSave('test', snapshot))
```

**Load not working?**
```typescript
// Check if save exists
console.log('Has save:', this.worldStateManager.hasSave('quicksave'))
console.log('Loaded state:', this.worldStateManager.loadSave('quicksave'))
```

**Storage full?**
```typescript
// Check storage
const info = this.worldStateManager.getStorageInfo()
console.log(`Storage: ${info.percentage}% used`)
```

## Minimal Example

```typescript
import { WorldStateManager, createWorldStateSnapshot } from '@systems/state'

// Init
const manager = new WorldStateManager()

// Save
const snapshot = createWorldStateSnapshot({
  worldSeed: 1337,
  progress: { /* minimal progress */ },
  camera: camera,
  cameraMode: 'freeroam',
  photos: [],
  settings: { /* minimal settings */ },
})
manager.quickSave(snapshot)

// Load
const state = manager.quickLoad()
if (state) {
  camera.position.copy(state.camera.position)
}
```

That's it! You're ready to go. 🚀
