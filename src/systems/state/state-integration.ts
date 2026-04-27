/**
 * State Integration Layer
 * Connects subsystem state manager with game flow state machine
 * Provides unified state management interface
 */

import { GameStateManager } from '@game/GameStateManager'
import type { GameStateType } from './state-machine'
import { SubsystemStateManager } from './subsystem-state-manager'
import type { GameSubsystemState } from './subsystem-states'

export class IntegratedStateManager {
  private flowStateManager: GameStateManager
  private subsystemStateManager: SubsystemStateManager

  constructor() {
    this.flowStateManager = new GameStateManager()
    this.subsystemStateManager = new SubsystemStateManager()
    this.setupIntegration()
  }

  /**
   * Setup integration between flow state and subsystem state
   */
  private setupIntegration(): void {
    // When game flow state changes, update relevant subsystem states
    this.flowStateManager.onStateChange((flowState, previousFlowState) => {
      this.handleFlowStateChange(flowState, previousFlowState)
    })

    // When subsystem states change, validate against flow state
    this.subsystemStateManager.onAnyChange((event) => {
      this.validateSubsystemChange(event.subsystem)
    })
  }

  /**
   * Handle game flow state changes
   */
  private handleFlowStateChange(
    flowState: GameStateType,
    previousFlowState: GameStateType | null
  ): void {
    // Update audio state based on flow state
    if (this.flowStateManager.shouldPauseAudio()) {
      this.subsystemStateManager.updateAudioSystemState({
        isPlaying: false,
        ambientVolume: 0,
      })
    } else {
      this.subsystemStateManager.updateAudioSystemState({
        isPlaying: true,
        ambientVolume: 0.5,
      })
    }

    // Update camera state based on flow state
    if (!this.flowStateManager.isCameraMovementAllowed()) {
      this.subsystemStateManager.updateCameraState({
        isPaused: true,
      })
    } else {
      this.subsystemStateManager.updateCameraState({
        isPaused: false,
      })
    }

    // Handle multiplayer state transitions
    if (flowState === 'multiplayer_connecting') {
      this.subsystemStateManager.updateMultiplayerState({
        connectionStatus: 'connecting',
      })
    } else if (flowState === 'multiplayer_connected') {
      this.subsystemStateManager.updateMultiplayerState({
        connectionStatus: 'connected',
        isConnected: true,
      })
    } else if (previousFlowState?.includes('multiplayer') && !flowState.includes('multiplayer')) {
      this.subsystemStateManager.updateMultiplayerState({
        connectionStatus: 'disconnected',
        isConnected: false,
      })
    }

    // Reset UI panels when entering playing state
    if (flowState === 'playing' && previousFlowState !== 'paused') {
      this.subsystemStateManager.updateUIState({
        isGalleryOpen: false,
        isSettingsOpen: false,
        isShortcutsOpen: false,
      })
    }
  }

  /**
   * Validate subsystem changes against flow state
   */
  private validateSubsystemChange(subsystem: keyof GameSubsystemState): void {
    const flowState = this.flowStateManager.getState()

    // Prevent photo capture in invalid states
    if (subsystem === 'photoSystem') {
      const photoState = this.subsystemStateManager.getPhotoSystemState()
      if (photoState.isCapturing && !this.flowStateManager.isPhotoAllowed()) {
        console.warn(`Photo capture not allowed in ${flowState} state`)
        this.subsystemStateManager.updatePhotoSystemState({
          isCapturing: false,
        })
      }
    }

    // Prevent camera movement in invalid states
    if (subsystem === 'camera') {
      const cameraState = this.subsystemStateManager.getCameraState()
      if (cameraState.mode === 'freeroam' && !this.flowStateManager.isCameraMovementAllowed()) {
        console.warn(`Camera movement not allowed in ${flowState} state`)
        this.subsystemStateManager.updateCameraState({
          isPaused: true,
        })
      }
    }
  }

  // ===== Flow State Methods =====

  public getFlowState(): GameStateType {
    return this.flowStateManager.getState()
  }

  public setFlowState(state: GameStateType, force?: boolean): boolean {
    return this.flowStateManager.setState(state, force)
  }

  public isInFlowState(state: GameStateType): boolean {
    return this.flowStateManager.isInState(state)
  }

  public shouldPauseGameLoop(): boolean {
    return this.flowStateManager.shouldPauseGameLoop()
  }

  public isPhotoAllowed(): boolean {
    return this.flowStateManager.isPhotoAllowed()
  }

  public isCameraMovementAllowed(): boolean {
    return this.flowStateManager.isCameraMovementAllowed()
  }

  // ===== Subsystem State Methods =====

  public getSubsystemState(): Readonly<GameSubsystemState> {
    return this.subsystemStateManager.getState()
  }

  public getCameraState() {
    return this.subsystemStateManager.getCameraState()
  }

  public getUIState() {
    return this.subsystemStateManager.getUIState()
  }

  public getCreaturesState() {
    return this.subsystemStateManager.getCreaturesState()
  }

  public getMultiplayerState() {
    return this.subsystemStateManager.getMultiplayerState()
  }

  public getPhotoSystemState() {
    return this.subsystemStateManager.getPhotoSystemState()
  }

  public getAudioSystemState() {
    return this.subsystemStateManager.getAudioSystemState()
  }

  public updateCameraState(updates: Parameters<SubsystemStateManager['updateCameraState']>[0]) {
    this.subsystemStateManager.updateCameraState(updates)
  }

  public updateUIState(updates: Parameters<SubsystemStateManager['updateUIState']>[0]) {
    this.subsystemStateManager.updateUIState(updates)
  }

  public updateCreaturesState(
    updates: Parameters<SubsystemStateManager['updateCreaturesState']>[0]
  ) {
    this.subsystemStateManager.updateCreaturesState(updates)
  }

  public updateMultiplayerState(
    updates: Parameters<SubsystemStateManager['updateMultiplayerState']>[0]
  ) {
    this.subsystemStateManager.updateMultiplayerState(updates)
  }

  public updatePhotoSystemState(
    updates: Parameters<SubsystemStateManager['updatePhotoSystemState']>[0]
  ) {
    this.subsystemStateManager.updatePhotoSystemState(updates)
  }

  public updateAudioSystemState(
    updates: Parameters<SubsystemStateManager['updateAudioSystemState']>[0]
  ) {
    this.subsystemStateManager.updateAudioSystemState(updates)
  }

  // ===== Callback Registration =====

  public onFlowStateChange(callback: Parameters<GameStateManager['onStateChange']>[0]) {
    this.flowStateManager.onStateChange(callback)
  }

  public onSubsystemChange<K extends keyof GameSubsystemState>(
    subsystem: K,
    callback: Parameters<SubsystemStateManager['onSubsystemChange']>[1]
  ) {
    return this.subsystemStateManager.onSubsystemChange(subsystem, callback)
  }

  public onAnySubsystemChange(callback: Parameters<SubsystemStateManager['onAnyChange']>[0]) {
    return this.subsystemStateManager.onAnyChange(callback)
  }

  // ===== Utility Methods =====

  public update(deltaTime: number): void {
    this.flowStateManager.update(deltaTime)
  }

  public reset(): void {
    this.flowStateManager.reset()
    this.subsystemStateManager.resetAll()
  }

  public resetSubsystem(subsystem: keyof GameSubsystemState): void {
    this.subsystemStateManager.resetSubsystem(subsystem)
  }

  // ===== Serialization for Multiplayer =====

  public serializeSubsystemState(): string {
    return this.subsystemStateManager.serialize()
  }

  public deserializeSubsystemState(json: string): void {
    this.subsystemStateManager.deserialize(json)
  }

  public createSnapshot(): string {
    return this.subsystemStateManager.createSnapshot()
  }

  public restoreSnapshot(snapshot: string): void {
    this.subsystemStateManager.restoreSnapshot(snapshot)
  }

  // ===== Dirty Tracking for Multiplayer =====

  public isDirtySubsystem(subsystem: keyof GameSubsystemState): boolean {
    return this.subsystemStateManager.isDirtySubsystem(subsystem)
  }

  public getDirtySubsystems(): (keyof GameSubsystemState)[] {
    return this.subsystemStateManager.getDirtySubsystems()
  }

  public markClean(subsystem: keyof GameSubsystemState): void {
    this.subsystemStateManager.markClean(subsystem)
  }

  public markAllClean(): void {
    this.subsystemStateManager.markAllClean()
  }

  // ===== Debug Methods =====

  public getDebugInfo() {
    return {
      flowState: this.flowStateManager.getStatus(),
      subsystemState: this.subsystemStateManager.getDebugInfo(),
    }
  }

  public getHistory() {
    return {
      flowHistory: this.flowStateManager.getStateMachine().getHistory(),
      subsystemHistory: this.subsystemStateManager.getHistory(),
    }
  }

  // ===== Direct Access (for advanced usage) =====

  public getFlowStateManager(): GameStateManager {
    return this.flowStateManager
  }

  public getSubsystemStateManager(): SubsystemStateManager {
    return this.subsystemStateManager
  }
}
