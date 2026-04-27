/**
 * Subsystem State Manager
 * Centralized state management for all game subsystems
 * Provides single source of truth with change tracking and synchronization
 */

import type {
  AudioSystemState,
  CameraState,
  CreaturesState,
  GameSubsystemState,
  MultiplayerState,
  PhotoSystemState,
  StateChangeEvent,
  UIState,
} from './subsystem-states'
import {
  createDefaultAudioSystemState,
  createDefaultCameraState,
  createDefaultCreaturesState,
  createDefaultGameSubsystemState,
  createDefaultMultiplayerState,
  createDefaultPhotoSystemState,
  createDefaultUIState,
} from './subsystem-states'

type SubsystemKey = keyof GameSubsystemState
type StateChangeCallback<T = any> = (event: StateChangeEvent<T>) => void

export class SubsystemStateManager {
  private state: GameSubsystemState
  private changeCallbacks: Map<SubsystemKey, Set<StateChangeCallback>> = new Map()
  private globalCallbacks: Set<StateChangeCallback> = new Set()
  private stateHistory: StateChangeEvent[] = []
  private maxHistorySize = 100
  private isDirty: Set<SubsystemKey> = new Set()

  constructor(initialState?: Partial<GameSubsystemState>) {
    this.state = {
      ...createDefaultGameSubsystemState(),
      ...initialState,
    }
  }

  /**
   * Get complete state snapshot
   */
  public getState(): Readonly<GameSubsystemState> {
    return { ...this.state }
  }

  /**
   * Get specific subsystem state
   */
  public getCameraState(): Readonly<CameraState> {
    return { ...this.state.camera }
  }

  public getUIState(): Readonly<UIState> {
    return { ...this.state.ui }
  }

  public getCreaturesState(): Readonly<CreaturesState> {
    return {
      creatures: new Map(this.state.creatures.creatures),
      activeCount: this.state.creatures.activeCount,
      lastUpdateTime: this.state.creatures.lastUpdateTime,
    }
  }

  public getMultiplayerState(): Readonly<MultiplayerState> {
    return { ...this.state.multiplayer }
  }

  public getPhotoSystemState(): Readonly<PhotoSystemState> {
    return { ...this.state.photoSystem }
  }

  public getAudioSystemState(): Readonly<AudioSystemState> {
    return { ...this.state.audio }
  }

  /**
   * Update camera state
   */
  public updateCameraState(updates: Partial<CameraState>): void {
    this.updateSubsystem('camera', updates)
  }

  /**
   * Update UI state
   */
  public updateUIState(updates: Partial<UIState>): void {
    this.updateSubsystem('ui', updates)
  }

  /**
   * Update creatures state
   */
  public updateCreaturesState(updates: Partial<CreaturesState>): void {
    this.updateSubsystem('creatures', updates)
  }

  /**
   * Update multiplayer state
   */
  public updateMultiplayerState(updates: Partial<MultiplayerState>): void {
    this.updateSubsystem('multiplayer', updates)
  }

  /**
   * Update photo system state
   */
  public updatePhotoSystemState(updates: Partial<PhotoSystemState>): void {
    this.updateSubsystem('photoSystem', updates)
  }

  /**
   * Update audio system state
   */
  public updateAudioSystemState(updates: Partial<AudioSystemState>): void {
    this.updateSubsystem('audio', updates)
  }

  /**
   * Generic subsystem update with change tracking
   */
  private updateSubsystem<K extends SubsystemKey>(
    subsystem: K,
    updates: Partial<GameSubsystemState[K]>
  ): void {
    const previousState = JSON.parse(JSON.stringify(this.state[subsystem]))
    const newState = Object.assign({}, this.state[subsystem], updates)

    // Check if state actually changed
    if (JSON.stringify(previousState) === JSON.stringify(newState)) {
      return
    }

    this.state[subsystem] = newState as any
    this.state.timestamp = Date.now()
    this.isDirty.add(subsystem)

    // Create change event
    const event: StateChangeEvent = {
      subsystem,
      previousState,
      newState,
      timestamp: this.state.timestamp,
    }

    // Add to history
    this.stateHistory.push(event)
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift()
    }

    // Notify callbacks
    this.notifyCallbacks(subsystem, event)
  }

  /**
   * Batch update multiple subsystems
   */
  public batchUpdate(updates: Partial<GameSubsystemState>): void {
    const keys = Object.keys(updates) as SubsystemKey[]

    keys.forEach((key) => {
      if (updates[key]) {
        this.updateSubsystem(key, updates[key] as any)
      }
    })
  }

  /**
   * Reset specific subsystem to default
   */
  public resetSubsystem(subsystem: SubsystemKey): void {
    const defaults: Record<SubsystemKey, any> = {
      camera: createDefaultCameraState(),
      ui: createDefaultUIState(),
      creatures: createDefaultCreaturesState(),
      multiplayer: createDefaultMultiplayerState(),
      photoSystem: createDefaultPhotoSystemState(),
      audio: createDefaultAudioSystemState(),
      timestamp: Date.now(),
    }

    this.updateSubsystem(subsystem, defaults[subsystem])
  }

  /**
   * Reset all subsystems to default
   */
  public resetAll(): void {
    const previousState = { ...this.state }
    this.state = createDefaultGameSubsystemState()

    // Notify all subsystems changed
    const subsystems: SubsystemKey[] = [
      'camera',
      'ui',
      'creatures',
      'multiplayer',
      'photoSystem',
      'audio',
    ]

    subsystems.forEach((subsystem) => {
      const event: StateChangeEvent = {
        subsystem,
        previousState: (previousState as any)[subsystem],
        newState: (this.state as any)[subsystem],
        timestamp: this.state.timestamp,
      }
      this.notifyCallbacks(subsystem, event)
    })

    this.isDirty.clear()
    this.stateHistory = []
  }

  /**
   * Register callback for specific subsystem changes
   */
  public onSubsystemChange<K extends SubsystemKey>(
    subsystem: K,
    callback: StateChangeCallback<GameSubsystemState[K]>
  ): () => void {
    if (!this.changeCallbacks.has(subsystem)) {
      this.changeCallbacks.set(subsystem, new Set())
    }
    this.changeCallbacks.get(subsystem)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.changeCallbacks.get(subsystem)?.delete(callback)
    }
  }

  /**
   * Register callback for any state change
   */
  public onAnyChange(callback: StateChangeCallback): () => void {
    this.globalCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.globalCallbacks.delete(callback)
    }
  }

  /**
   * Notify callbacks of state change
   */
  private notifyCallbacks(subsystem: SubsystemKey, event: StateChangeEvent): void {
    // Notify subsystem-specific callbacks
    const callbacks = this.changeCallbacks.get(subsystem)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event)
        } catch (error) {
          console.error(`Error in ${subsystem} state change callback:`, error)
        }
      })
    }

    // Notify global callbacks
    this.globalCallbacks.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in global state change callback:', error)
      }
    })
  }

  /**
   * Check if subsystem has changed since last sync
   */
  public isDirtySubsystem(subsystem: SubsystemKey): boolean {
    return this.isDirty.has(subsystem)
  }

  /**
   * Get all dirty subsystems
   */
  public getDirtySubsystems(): SubsystemKey[] {
    return Array.from(this.isDirty)
  }

  /**
   * Mark subsystem as clean (synced)
   */
  public markClean(subsystem: SubsystemKey): void {
    this.isDirty.delete(subsystem)
  }

  /**
   * Mark all subsystems as clean
   */
  public markAllClean(): void {
    this.isDirty.clear()
  }

  /**
   * Get state change history
   */
  public getHistory(): StateChangeEvent[] {
    return [...this.stateHistory]
  }

  /**
   * Get recent changes for specific subsystem
   */
  public getSubsystemHistory(subsystem: SubsystemKey, limit: number = 10): StateChangeEvent[] {
    return this.stateHistory.filter((event) => event.subsystem === subsystem).slice(-limit)
  }

  /**
   * Clear state history
   */
  public clearHistory(): void {
    this.stateHistory = []
  }

  /**
   * Serialize state to JSON (for saving/multiplayer)
   */
  public serialize(): string {
    const serializableState = {
      ...this.state,
      creatures: {
        ...this.state.creatures,
        creatures: Array.from(this.state.creatures.creatures.entries()),
      },
    }
    return JSON.stringify(serializableState)
  }

  /**
   * Deserialize state from JSON
   */
  public deserialize(json: string): void {
    try {
      const parsed = JSON.parse(json)

      // Restore Map for creatures
      if (parsed.creatures?.creatures) {
        parsed.creatures.creatures = new Map(parsed.creatures.creatures)
      }

      this.state = parsed
      this.isDirty.clear()
    } catch (error) {
      console.error('Failed to deserialize state:', error)
    }
  }

  /**
   * Create a state snapshot for rollback
   */
  public createSnapshot(): string {
    return this.serialize()
  }

  /**
   * Restore from a snapshot
   */
  public restoreSnapshot(snapshot: string): void {
    this.deserialize(snapshot)
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): {
    timestamp: number
    dirtySubsystems: SubsystemKey[]
    historySize: number
    callbackCounts: Record<string, number>
  } {
    const callbackCounts: Record<string, number> = {}
    this.changeCallbacks.forEach((callbacks, subsystem) => {
      callbackCounts[subsystem] = callbacks.size
    })
    callbackCounts['global'] = this.globalCallbacks.size

    return {
      timestamp: this.state.timestamp,
      dirtySubsystems: this.getDirtySubsystems(),
      historySize: this.stateHistory.length,
      callbackCounts,
    }
  }
}
