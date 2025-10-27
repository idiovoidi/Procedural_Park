/**
 * World State Integration Example
 * Demonstrates how to integrate save/load functionality into the game
 */

import {
  WorldStateManager,
  createWorldStateSnapshot,
  updateProgressWithPhoto,
  createSerializedPhoto,
  type PlayerProgress,
  type WorldState,
} from '@systems/state'
import type { Game } from '@game/Game'
import type { CreatureInstance } from '@systems/creatures'
import * as THREE from 'three'

/**
 * Example: Initialize world state manager in game
 */
export function initializeWorldState(game: Game): WorldStateManager {
  const worldStateManager = new WorldStateManager()

  // Enable auto-save every 2 minutes
  worldStateManager.setAutoSaveEnabled(true)
  worldStateManager.setAutoSaveInterval(120000) // 2 minutes

  return worldStateManager
}

/**
 * Example: Save current game state
 */
export function saveGameState(
  worldStateManager: WorldStateManager,
  slotId: string,
  gameData: {
    worldSeed: number
    creatures: CreatureInstance[]
    experimentCreature: CreatureInstance | null
    camera: THREE.Camera
    cameraMode: 'ride' | 'freeroam'
    rideProgress: number
    progress: PlayerProgress
    photos: Array<{ dataUrl: string; score: number; creatureName: string }>
    settings: {
      dayNightMode: 'day' | 'night'
      audioEnabled: boolean
      ambientVolume: number
      shaderEnabled: boolean
      showCreatureInfo: boolean
    }
  }
): boolean {
  // Create snapshot
  const snapshot = createWorldStateSnapshot({
    worldSeed: gameData.worldSeed,
    creatures: gameData.creatures,
    experimentCreature: gameData.experimentCreature ?? undefined,
    progress: {
      ...gameData.progress,
      playTime: gameData.progress.playTime + worldStateManager.getSessionPlayTime(),
    },
    camera: gameData.camera,
    cameraMode: gameData.cameraMode,
    rideProgress: gameData.rideProgress,
    photos: gameData.photos.map((p) =>
      createSerializedPhoto(p.dataUrl, p.score, p.creatureName)
    ),
    settings: gameData.settings,
  })

  // Save to slot
  return worldStateManager.createSave(slotId, snapshot)
}

/**
 * Example: Load game state
 */
export function loadGameState(
  worldStateManager: WorldStateManager,
  slotId: string
): WorldState | null {
  const state = worldStateManager.loadSave(slotId)

  if (state) {
    console.log('Loaded game state:', {
      seed: state.worldSeed,
      photoCount: state.progress.photoCount,
      totalScore: state.progress.totalScore,
      playTime: state.progress.playTime,
    })

    // Reset play time tracker for new session
    worldStateManager.resetPlayTimeTracker()
  }

  return state
}

/**
 * Example: Handle photo capture with progress tracking
 */
export function handlePhotoCapture(
  progress: PlayerProgress,
  score: number,
  creatureName: string,
  rarity: number
): PlayerProgress {
  return updateProgressWithPhoto(progress, score, creatureName, rarity)
}

/**
 * Example: Auto-save on interval
 */
export function setupAutoSave(
  worldStateManager: WorldStateManager,
  getGameData: () => Parameters<typeof saveGameState>[2]
): void {
  // Auto-save every 2 minutes
  setInterval(() => {
    const currentSlot = worldStateManager.getCurrentSlotId()
    if (currentSlot) {
      console.log('Auto-saving...')
      saveGameState(worldStateManager, currentSlot, getGameData())
    }
  }, 120000)
}

/**
 * Example: Export save to file
 */
export function exportSaveToFile(
  worldStateManager: WorldStateManager,
  slotId: string
): void {
  const jsonData = worldStateManager.exportSave(slotId)
  if (!jsonData) {
    console.error('Failed to export save')
    return
  }

  // Create download link
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aisnap_save_${slotId}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)

  console.log('Save exported successfully')
}

/**
 * Example: Import save from file
 */
export function importSaveFromFile(
  worldStateManager: WorldStateManager,
  slotId: string,
  file: File
): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const jsonData = e.target?.result as string
      const success = worldStateManager.importSave(slotId, jsonData)
      resolve(success)
    }

    reader.onerror = () => {
      console.error('Failed to read file')
      resolve(false)
    }

    reader.readAsText(file)
  })
}

/**
 * Example: Quick save/load shortcuts
 */
export function setupQuickSaveShortcuts(
  worldStateManager: WorldStateManager,
  getGameData: () => Parameters<typeof saveGameState>[2],
  onLoad: (state: WorldState) => void
): void {
  document.addEventListener('keydown', (e) => {
    // F5 - Quick Save
    if (e.key === 'F5') {
      e.preventDefault()
      const success = saveGameState(worldStateManager, 'quicksave', getGameData())
      if (success) {
        console.log('✅ Quick saved!')
      }
    }

    // F9 - Quick Load
    if (e.key === 'F9') {
      e.preventDefault()
      const state = loadGameState(worldStateManager, 'quicksave')
      if (state) {
        onLoad(state)
        console.log('✅ Quick loaded!')
      } else {
        console.warn('No quick save found')
      }
    }
  })
}

/**
 * Example: Display save slot information
 */
export function displaySaveSlots(worldStateManager: WorldStateManager): void {
  const metadata = worldStateManager.getAllMetadata()

  console.log('=== Save Slots ===')
  metadata.forEach((meta) => {
    console.log(`Slot: ${meta.slotId}`)
    console.log(`  Date: ${new Date(meta.saveDate).toLocaleString()}`)
    console.log(`  Photos: ${meta.photoCount}`)
    console.log(`  Score: ${meta.totalScore}`)
    console.log(`  Play Time: ${Math.floor(meta.playTime / 60)}m`)
    console.log(`  Seed: ${meta.worldSeed}`)
    console.log('---')
  })

  const storageInfo = worldStateManager.getStorageInfo()
  console.log(`Storage: ${storageInfo.used}KB / ${storageInfo.available}KB (${storageInfo.percentage}%)`)
}

/**
 * Example: Restore game from loaded state
 */
export function restoreGameFromState(
  state: WorldState,
  game: {
    setWorldSeed: (seed: number) => void
    setCameraState: (position: THREE.Vector3, rotation: THREE.Euler) => void
    setCameraMode: (mode: 'ride' | 'freeroam') => void
    setProgress: (progress: PlayerProgress) => void
    loadPhotos: (photos: Array<{ dataUrl: string; score: number; creatureName: string }>) => void
    applySettings: (settings: WorldState['settings']) => void
  }
): void {
  // Restore world seed
  game.setWorldSeed(state.worldSeed)

  // Restore camera
  const camPos = new THREE.Vector3(
    state.camera.position.x,
    state.camera.position.y,
    state.camera.position.z
  )
  const camRot = new THREE.Euler(
    state.camera.rotation.x,
    state.camera.rotation.y,
    state.camera.rotation.z
  )
  game.setCameraState(camPos, camRot)
  game.setCameraMode(state.camera.mode)

  // Restore progress
  game.setProgress(state.progress)

  // Restore photos
  game.loadPhotos(state.photos)

  // Restore settings
  game.applySettings(state.settings)

  console.log('✅ Game state restored')
}
