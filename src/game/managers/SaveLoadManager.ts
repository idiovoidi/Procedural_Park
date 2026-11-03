import { GAME_CONFIG } from '@core/constants'
import { log } from '@core/utils'
import { awayMinutes, capturePark, restorePark } from '@systems/savegame'
import {
  createWorldStateSnapshot,
  type PlayerProgress,
  type WorldState,
  WorldStateManager,
} from '@systems/state'
import type { GameSystems } from '../SystemsCoordinator'
import type { PhotoManager } from './PhotoManager'

const AUTOSAVE_SLOT = 'autosave'

/**
 * SaveLoadManager
 * Owns the world state manager and all save/load/import/export handling.
 * Error convention: failures are logged via log.error and surfaced to the player as a toast.
 */
export class SaveLoadManager {
  private worldStateManager = new WorldStateManager()

  private systems: GameSystems
  private photos: PhotoManager
  private onStateRestored: () => void

  constructor(systems: GameSystems, photos: PhotoManager, onStateRestored: () => void) {
    this.systems = systems
    this.photos = photos
    this.onStateRestored = onStateRestored
  }

  /**
   * Initialize world state manager and save/load system
   */
  public initialize(): void {
    this.worldStateManager.setAutoSaveEnabled(true)
    this.worldStateManager.setAutoSaveInterval(GAME_CONFIG.AUTO_SAVE_INTERVAL_MS)

    // Setup save/load menu
    const saveLoadMenu = this.systems.ui.getSaveLoadMenu()
    saveLoadMenu.setWorldStateManager(this.worldStateManager)
    saveLoadMenu.setCallbacks({
      onSave: (slotId) => this.handleSave(slotId),
      onLoad: (slotId) => this.handleLoad(slotId),
      onDelete: (_slotId) => {
        this.systems.ui.showToast('🗑️ Save deleted')
      },
      onExport: (slotId) => this.handleExport(slotId),
      onImport: (slotId, data) => this.handleImport(slotId, data),
    })

    // Setup keyboard shortcuts
    this.setupSaveLoadShortcuts()

    // Keep the ranch safe: save on a timer, and whenever the page is hidden or closed.
    window.setInterval(() => this.autosave(), GAME_CONFIG.AUTO_SAVE_INTERVAL_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.autosave()
    })
    window.addEventListener('pagehide', () => this.autosave())
  }

  /**
   * Setup save/load keyboard shortcuts
   */
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

  /**
   * Handle save to slot
   */
  private handleSave(slotId: string): void {
    try {
      const snapshot = this.buildSnapshot(true)
      const success = this.worldStateManager.createSave(slotId, snapshot)

      if (success) {
        const displayName =
          slotId === 'quicksave' ? 'Quick Save' : `Slot ${slotId.replace('slot_', '')}`
        this.systems.ui.showToast(`💾 ${displayName} saved!`)
      } else {
        this.systems.ui.showToast('❌ Save failed!')
      }
    } catch (error) {
      log.error('Save error:', error)
      this.systems.ui.showToast('❌ Save error!')
    }
  }

  /**
   * Build a save of the current game. Autosaves leave out the photo gallery: its image data
   * is large and would risk filling browser storage; manual saves keep it.
   */
  private buildSnapshot(includePhotos: boolean): WorldState {
    const snapshot = createWorldStateSnapshot({
      worldSeed: GAME_CONFIG.WORLD_SEED,
      progress: this.getPlayerProgress(),
      camera: this.systems.camera.camera,
      cameraMode: this.systems.camera.getMode(),
      photos: includePhotos ? this.photos.getGalleryPhotos() : [],
      settings: {
        dayNightMode: this.systems.scene.getDayNightMode(),
        audioEnabled: true,
        ambientVolume: 0.5,
        shaderEnabled: this.systems.shaders.isEnabled(),
        showCreatureInfo: true,
      },
    })
    snapshot.park = capturePark(this.parkTargets(), this.systems.capture.getCapturedSeeds())
    return snapshot
  }

  private parkTargets() {
    const s = this.systems
    return {
      clock: s.simClock,
      roster: s.roster,
      grid: s.park,
      care: s.care,
      breeding: s.breeding,
      codex: s.codex,
      production: s.production,
      resources: s.resources,
      market: s.market,
      currency: s.currency,
      food: s.food,
    }
  }

  /** Quietly save the ranch to the autosave slot. Safe to call at any time. */
  public autosave(): void {
    try {
      this.worldStateManager.createSave(AUTOSAVE_SLOT, this.buildSnapshot(false))
    } catch (error) {
      log.error('Autosave error:', error)
    }
  }

  /**
   * Bring the ranch back from the autosave on page load. Returns true if there was one.
   * Photos and the camera are not restored here; only the ranch and the score counters.
   */
  public restoreOnStartup(): boolean {
    const state = this.worldStateManager.loadSave(AUTOSAVE_SLOT)
    if (!state?.park) return false

    this.systems.state.updateUIState({
      photoCount: state.progress.photoCount,
      totalScore: state.progress.totalScore,
      lastScore: state.progress.bestScore,
    })
    this.applyPark(state.park, 'Welcome back')
    return true
  }

  /** Restore ranch data into the live systems and tell the player what happened. */
  private applyPark(data: unknown, greeting: string): void {
    const result = restorePark(this.parkTargets(), data)
    if (!result.ok) {
      this.systems.ui.showToast('⚠️ Ranch data could not be read')
      return
    }
    this.systems.capture.restoreCaptured(result.capturedSeeds)
    this.systems.ui.updateFoodInventory(this.systems.food.getInventory())

    const minutes = awayMinutes(result)
    const away = minutes >= 1 ? `, the park ran ${minutes} min while you were away` : ''
    const failed =
      result.failed.length > 0 ? ` (could not restore: ${result.failed.join(', ')})` : ''
    this.systems.ui.showToast(`🏡 ${greeting}${away}${failed}`, 3500)
  }

  /**
   * Handle load from slot
   */
  private handleLoad(slotId: string): void {
    try {
      const state = this.worldStateManager.loadSave(slotId)

      if (!state) {
        this.systems.ui.showToast('❌ No save found!')
        return
      }

      this.restoreGameState(state)
      if (state.park) this.applyPark(state.park, 'Ranch restored')

      const displayName =
        slotId === 'quicksave' ? 'Quick Save' : `Slot ${slotId.replace('slot_', '')}`
      this.systems.ui.showToast(`📂 ${displayName} loaded!`)
    } catch (error) {
      log.error('Load error:', error)
      this.systems.ui.showToast('❌ Load error!')
    }
  }

  /**
   * Handle export save
   */
  private handleExport(slotId: string): void {
    try {
      const jsonData = this.worldStateManager.exportSave(slotId)
      if (!jsonData) {
        this.systems.ui.showToast('❌ Export failed!')
        return
      }

      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aisnap_save_${slotId}_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      this.systems.ui.showToast('📤 Save exported!')
    } catch (error) {
      log.error('Export error:', error)
      this.systems.ui.showToast('❌ Export error!')
    }
  }

  /**
   * Handle import save
   */
  private handleImport(slotId: string, data: string): void {
    try {
      const success = this.worldStateManager.importSave(slotId, data)
      if (success) {
        this.systems.ui.showToast('📥 Save imported!')
      } else {
        this.systems.ui.showToast('❌ Import failed!')
      }
    } catch (error) {
      log.error('Import error:', error)
      this.systems.ui.showToast('❌ Import error!')
    }
  }

  /**
   * Get current player progress
   */
  public getPlayerProgress(): PlayerProgress {
    const uiState = this.systems.state.getUIState()
    return {
      photoCount: uiState.photoCount,
      totalScore: uiState.totalScore,
      bestScore: uiState.lastScore,
      creaturesDiscovered: new Set(),
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

  /**
   * Restore game state from loaded data
   */
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
    this.systems.state.updateUIState({
      photoCount: state.progress.photoCount,
      totalScore: state.progress.totalScore,
      lastScore: state.progress.bestScore,
    })

    // Restore gallery photos
    this.photos.setGalleryPhotos(state.photos)
    this.systems.ui.clearGallery()
    state.photos.forEach((photo) => {
      this.systems.ui.addPhotoToGallery(photo.dataUrl, photo.score, photo.creatureName)
    })

    // Respawn creatures (they regenerate from seed)
    this.systems.creatures.respawnCreatures()
    this.onStateRestored()

    // Reset play time tracker
    this.worldStateManager.resetPlayTimeTracker()
  }
}
