/**
 * World State Manager
 * Handles saving and loading game progress to/from localStorage
 */

import type {
  WorldState,
  SaveSlotMetadata,
  PlayerProgress,
  SerializedPhoto,
  SerializedCameraState,
  WorldSettings,
} from './world-state-types'
import { GAME_CONFIG } from '@core/constants'

const STORAGE_PREFIX = 'aisnap_save_'
const METADATA_KEY = 'aisnap_save_metadata'
const CURRENT_VERSION = '1.0.0'
const MAX_SAVE_SLOTS = 5

export class WorldStateManager {
  private currentSlotId: string | null = null
  private autoSaveEnabled: boolean = true
  private autoSaveInterval: number = 60000 // 60 seconds
  private autoSaveTimer: number | null = null
  private playTimeStart: number = Date.now()

  constructor() {
    this.startAutoSave()
  }

  /**
   * Create a new save in a specific slot
   */
  public createSave(slotId: string, worldState: Partial<WorldState>): boolean {
    try {
      const fullState: WorldState = {
        version: CURRENT_VERSION,
        saveDate: Date.now(),
        worldSeed: worldState.worldSeed ?? GAME_CONFIG.WORLD_SEED,
        progress: worldState.progress ?? this.createDefaultProgress(),
        camera: worldState.camera ?? this.createDefaultCameraState(),
        photos: worldState.photos ?? [],
        settings: worldState.settings ?? this.createDefaultSettings(),
        creatures: worldState.creatures,
        experimentCreature: worldState.experimentCreature,
      }

      // Save to localStorage
      const key = STORAGE_PREFIX + slotId
      localStorage.setItem(key, JSON.stringify(fullState))

      // Update metadata
      this.updateMetadata(slotId, fullState)

      this.currentSlotId = slotId
      console.log(`✅ Game saved to slot: ${slotId}`)
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      return false
    }
  }

  /**
   * Load a save from a specific slot
   */
  public loadSave(slotId: string): WorldState | null {
    try {
      const key = STORAGE_PREFIX + slotId
      const data = localStorage.getItem(key)

      if (!data) {
        console.warn(`No save found in slot: ${slotId}`)
        return null
      }

      const state = JSON.parse(data) as WorldState

      // Version migration (if needed in future)
      const migratedState = this.migrateVersion(state)

      this.currentSlotId = slotId
      console.log(`✅ Game loaded from slot: ${slotId}`)
      return migratedState
    } catch (error) {
      console.error('Failed to load game:', error)
      return null
    }
  }

  /**
   * Delete a save slot
   */
  public deleteSave(slotId: string): boolean {
    try {
      const key = STORAGE_PREFIX + slotId
      localStorage.removeItem(key)

      // Update metadata
      const metadata = this.getAllMetadata()
      const filtered = metadata.filter((m) => m.slotId !== slotId)
      localStorage.setItem(METADATA_KEY, JSON.stringify(filtered))

      if (this.currentSlotId === slotId) {
        this.currentSlotId = null
      }

      console.log(`🗑️ Deleted save slot: ${slotId}`)
      return true
    } catch (error) {
      console.error('Failed to delete save:', error)
      return false
    }
  }

  /**
   * Get all save slot metadata
   */
  public getAllMetadata(): SaveSlotMetadata[] {
    try {
      const data = localStorage.getItem(METADATA_KEY)
      if (!data) return []
      return JSON.parse(data) as SaveSlotMetadata[]
    } catch (error) {
      console.error('Failed to load metadata:', error)
      return []
    }
  }

  /**
   * Get metadata for a specific slot
   */
  public getMetadata(slotId: string): SaveSlotMetadata | null {
    const metadata = this.getAllMetadata()
    return metadata.find((m) => m.slotId === slotId) ?? null
  }

  /**
   * Check if a slot has a save
   */
  public hasSave(slotId: string): boolean {
    const key = STORAGE_PREFIX + slotId
    return localStorage.getItem(key) !== null
  }

  /**
   * Get available save slots
   */
  public getAvailableSlots(): string[] {
    const slots: string[] = []
    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      slots.push(`slot_${i}`)
    }
    return slots
  }

  /**
   * Quick save to current slot (or create new if none)
   */
  public quickSave(worldState: Partial<WorldState>): boolean {
    const slotId = this.currentSlotId ?? 'quicksave'
    return this.createSave(slotId, worldState)
  }

  /**
   * Quick load from current slot
   */
  public quickLoad(): WorldState | null {
    const slotId = this.currentSlotId ?? 'quicksave'
    return this.loadSave(slotId)
  }

  /**
   * Auto-save functionality
   */
  public startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }

    if (this.autoSaveEnabled) {
      this.autoSaveTimer = window.setInterval(() => {
        if (this.currentSlotId) {
          console.log('🔄 Auto-saving...')
          // Auto-save will be triggered by game with current state
        }
      }, this.autoSaveInterval)
    }
  }

  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  public setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled
    if (enabled) {
      this.startAutoSave()
    } else {
      this.stopAutoSave()
    }
  }

  public setAutoSaveInterval(intervalMs: number): void {
    this.autoSaveInterval = intervalMs
    if (this.autoSaveEnabled) {
      this.startAutoSave()
    }
  }

  /**
   * Export save to JSON file
   */
  public exportSave(slotId: string): string | null {
    const state = this.loadSave(slotId)
    if (!state) return null
    return JSON.stringify(state, null, 2)
  }

  /**
   * Import save from JSON string
   */
  public importSave(slotId: string, jsonData: string): boolean {
    try {
      const state = JSON.parse(jsonData) as WorldState
      return this.createSave(slotId, state)
    } catch (error) {
      console.error('Failed to import save:', error)
      return false
    }
  }

  /**
   * Get current slot ID
   */
  public getCurrentSlotId(): string | null {
    return this.currentSlotId
  }

  /**
   * Get total play time for current session
   */
  public getSessionPlayTime(): number {
    return Math.floor((Date.now() - this.playTimeStart) / 1000)
  }

  /**
   * Reset play time tracker
   */
  public resetPlayTimeTracker(): void {
    this.playTimeStart = Date.now()
  }

  // ===== Private Helper Methods =====

  private updateMetadata(slotId: string, state: WorldState): void {
    const metadata = this.getAllMetadata()
    const existing = metadata.findIndex((m) => m.slotId === slotId)

    const newMetadata: SaveSlotMetadata = {
      slotId,
      saveDate: state.saveDate,
      playTime: state.progress.playTime,
      photoCount: state.progress.photoCount,
      totalScore: state.progress.totalScore,
      worldSeed: state.worldSeed,
    }

    if (existing >= 0) {
      metadata[existing] = newMetadata
    } else {
      metadata.push(newMetadata)
    }

    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata))
  }

  private migrateVersion(state: WorldState): WorldState {
    // Future version migrations go here
    if (state.version !== CURRENT_VERSION) {
      console.log(`Migrating save from ${state.version} to ${CURRENT_VERSION}`)
      // Add migration logic as needed
    }
    return state
  }

  private createDefaultProgress(): PlayerProgress {
    return {
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
  }

  private createDefaultCameraState(): SerializedCameraState {
    return {
      mode: 'ride',
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      rideProgress: 0,
    }
  }

  private createDefaultSettings(): WorldSettings {
    return {
      seed: GAME_CONFIG.WORLD_SEED,
      dayNightMode: 'day',
      audioEnabled: true,
      ambientVolume: 0.5,
      shaderEnabled: true,
      showCreatureInfo: true,
    }
  }

  /**
   * Clear all saves (use with caution!)
   */
  public clearAllSaves(): boolean {
    try {
      const slots = this.getAvailableSlots()
      slots.forEach((slot) => this.deleteSave(slot))
      this.deleteSave('quicksave')
      localStorage.removeItem(METADATA_KEY)
      this.currentSlotId = null
      console.log('🗑️ All saves cleared')
      return true
    } catch (error) {
      console.error('Failed to clear saves:', error)
      return false
    }
  }

  /**
   * Get storage usage info
   */
  public getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let used = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_PREFIX) || key === METADATA_KEY) {
          const value = localStorage.getItem(key)
          used += (key.length + (value?.length ?? 0)) * 2 // UTF-16 encoding
        }
      }

      // Most browsers allow ~5-10MB for localStorage
      const available = 5 * 1024 * 1024 // 5MB estimate
      const percentage = (used / available) * 100

      return {
        used: Math.round(used / 1024), // KB
        available: Math.round(available / 1024), // KB
        percentage: Math.round(percentage * 100) / 100,
      }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return { used: 0, available: 0, percentage: 0 }
    }
  }

  /**
   * Cleanup on destroy
   */
  public dispose(): void {
    this.stopAutoSave()
  }
}
