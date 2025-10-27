/**
 * World State Demo
 * Simple demonstration of save/load functionality
 */

import {
  WorldStateManager,
  type PlayerProgress,
  type WorldState,
  updateProgressWithPhoto,
  formatPlayTime,
  formatSaveDate,
} from '@systems/state'

// Demo: Create and use world state manager
export function demoWorldState() {
  console.log('=== World State Demo ===\n')

  // 1. Initialize manager
  const manager = new WorldStateManager()
  console.log('✅ WorldStateManager initialized')

  // 2. Create initial progress
  let progress: PlayerProgress = {
    photoCount: 0,
    totalScore: 0,
    bestScore: 0,
    creaturesDiscovered: new Set(),
    rarityTiers: {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    },
    playTime: 0,
    lastPlayed: Date.now(),
  }

  // 3. Simulate taking photos
  console.log('\n📸 Taking photos...')
  progress = updateProgressWithPhoto(progress, 85, 'Sparkle Hopper', 0.8)
  progress = updateProgressWithPhoto(progress, 62, 'Crystal Wing', 0.95)
  progress = updateProgressWithPhoto(progress, 45, 'Fuzzy Blob', 0.2)

  console.log(`Photos taken: ${progress.photoCount}`)
  console.log(`Total score: ${progress.totalScore}`)
  console.log(`Best score: ${progress.bestScore}`)
  console.log(`Creatures discovered: ${progress.creaturesDiscovered.size}`)
  console.log(`Rarity breakdown:`, progress.rarityTiers)

  // 4. Create save
  console.log('\n💾 Saving game...')
  const saveSuccess = manager.createSave('slot_1', {
    worldSeed: 1337,
    progress,
    camera: {
      mode: 'freeroam',
      position: { x: 10, y: 5, z: 20 },
      rotation: { x: 0, y: Math.PI / 4, z: 0 },
      rideProgress: 0.5,
    },
    photos: [
      {
        dataUrl: 'data:image/png;base64,...',
        score: 85,
        creatureName: 'Sparkle Hopper',
        timestamp: Date.now(),
      },
    ],
    settings: {
      seed: 1337,
      dayNightMode: 'day',
      audioEnabled: true,
      ambientVolume: 0.5,
      shaderEnabled: true,
      showCreatureInfo: true,
    },
  })

  if (saveSuccess) {
    console.log('✅ Game saved to slot_1')
  }

  // 5. View save metadata
  console.log('\n📋 Save metadata:')
  const metadata = manager.getAllMetadata()
  metadata.forEach((meta) => {
    console.log(`  Slot: ${meta.slotId}`)
    console.log(`  Date: ${formatSaveDate(meta.saveDate)}`)
    console.log(`  Photos: ${meta.photoCount}`)
    console.log(`  Score: ${meta.totalScore}`)
    console.log(`  Play Time: ${formatPlayTime(meta.playTime)}`)
  })

  // 6. Load save
  console.log('\n📂 Loading game...')
  const loadedState = manager.loadSave('slot_1')

  if (loadedState) {
    console.log('✅ Game loaded from slot_1')
    console.log(`  World Seed: ${loadedState.worldSeed}`)
    console.log(`  Photos: ${loadedState.progress.photoCount}`)
    console.log(`  Score: ${loadedState.progress.totalScore}`)
    console.log(`  Camera Mode: ${loadedState.camera.mode}`)
    console.log(`  Camera Position:`, loadedState.camera.position)
  }

  // 7. Quick save/load
  console.log('\n⚡ Quick save...')
  manager.quickSave({
    worldSeed: 1337,
    progress: {
      ...progress,
      photoCount: progress.photoCount + 1,
      totalScore: progress.totalScore + 100,
    },
    camera: loadedState!.camera,
    photos: loadedState!.photos,
    settings: loadedState!.settings,
  })
  console.log('✅ Quick saved')

  const quickLoaded = manager.quickLoad()
  if (quickLoaded) {
    console.log('✅ Quick loaded')
    console.log(`  Photos: ${quickLoaded.progress.photoCount}`)
    console.log(`  Score: ${quickLoaded.progress.totalScore}`)
  }

  // 8. Storage info
  console.log('\n💾 Storage info:')
  const storageInfo = manager.getStorageInfo()
  console.log(`  Used: ${storageInfo.used} KB`)
  console.log(`  Available: ${storageInfo.available} KB`)
  console.log(`  Percentage: ${storageInfo.percentage}%`)

  // 9. Export save
  console.log('\n📤 Exporting save...')
  const exportedJson = manager.exportSave('slot_1')
  if (exportedJson) {
    console.log('✅ Save exported')
    console.log(`  Size: ${(exportedJson.length / 1024).toFixed(2)} KB`)
  }

  // 10. List all slots
  console.log('\n📁 Available slots:')
  const slots = manager.getAvailableSlots()
  slots.forEach((slotId) => {
    const hasSave = manager.hasSave(slotId)
    console.log(`  ${slotId}: ${hasSave ? '✅ Has save' : '❌ Empty'}`)
  })

  // 11. Cleanup
  console.log('\n🧹 Cleaning up demo saves...')
  manager.deleteSave('slot_1')
  manager.deleteSave('quicksave')
  console.log('✅ Demo complete!')

  return manager
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demoWorldState()
}
