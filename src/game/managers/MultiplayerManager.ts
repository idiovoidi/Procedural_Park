import { log } from '@core/utils'
/**
 * MultiplayerManager
 * Manages multiplayer connections and state synchronization
 */

import { GAME_CONFIG } from '@core/constants'
import { DEFAULT_CONFIG, type GameEvent, type GameState } from '@multiplayer/types'
import { WebRTCMultiplayer } from '@multiplayer/WebRTCMultiplayer'
import type { AudioManager } from '@systems/audio'
import type { CameraController } from '@systems/camera'
import type { createStateSyncHelpers, IntegratedStateManager } from '@systems/state'
import type { UIManager } from '@ui/managers'
import type * as THREE from 'three'

export class MultiplayerManager {
  private multiplayer: WebRTCMultiplayer
  private stateManager: IntegratedStateManager
  private syncHelpers: ReturnType<typeof createStateSyncHelpers>
  private uiManager: UIManager
  private audioManager: AudioManager
  private camera: CameraController
  /** Told when the friend connects or leaves (the social layer resets on disconnect). */
  public onConnectionChanged: (connected: boolean) => void = () => {}

  constructor(
    scene: THREE.Scene,
    stateManager: IntegratedStateManager,
    syncHelpers: ReturnType<typeof createStateSyncHelpers>,
    uiManager: UIManager,
    audioManager: AudioManager,
    camera: CameraController
  ) {
    this.stateManager = stateManager
    this.syncHelpers = syncHelpers
    this.uiManager = uiManager
    this.audioManager = audioManager
    this.camera = camera

    // Initialize multiplayer system
    this.multiplayer = new WebRTCMultiplayer(scene, DEFAULT_CONFIG)
    this.setupCallbacks()
  }

  /**
   * Setup multiplayer callbacks
   */
  private setupCallbacks(): void {
    this.multiplayer.onConnected = () => {
      log.debug('Connected to peer!')
      this.uiManager.showToast('🌐 Connected to friend!')
      this.onConnectionChanged(true)
      this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)

      // Update multiplayer state
      this.stateManager.updateMultiplayerState({
        isConnected: true,
        connectionStatus: 'connected',
      })
    }

    this.multiplayer.onDisconnected = () => {
      log.debug('Disconnected from peer')
      this.uiManager.showToast('🌐 Disconnected from friend')
      this.onConnectionChanged(false)
      this.audioManager.playSoundEffect('ui_click', GAME_CONFIG.AUDIO_UI_CLICK)

      // Update multiplayer state
      this.stateManager.updateMultiplayerState({
        isConnected: false,
        connectionStatus: 'disconnected',
        peerId: null,
        peerPosition: null,
        peerRotation: null,
      })
    }

    this.multiplayer.onPeerStateUpdate = (state: GameState) => {
      // Update peer position in state
      this.stateManager.updateMultiplayerState({
        peerPosition: state.position,
        peerRotation: { yaw: state.rotation.y, pitch: state.rotation.x },
        lastSyncTime: state.timestamp,
      })
    }

    this.multiplayer.onGameEvent = (event: GameEvent) => {
      if (event.type === 'photo') {
        this.uiManager.showToast('📸 Friend took a photo!')
        this.audioManager.playSoundEffect('camera_shutter', GAME_CONFIG.AUDIO_PHOTO_SCORE)
      }
    }

    this.multiplayer.onError = (error: Error) => {
      console.error('Multiplayer error:', error)
      this.uiManager.showToast(`❌ Multiplayer error: ${error.message}`)

      // Update multiplayer state
      this.stateManager.updateMultiplayerState({
        connectionStatus: 'error',
      })
    }
  }

  /**
   * Update multiplayer system
   */
  public update(dt: number): void {
    if (this.multiplayer.isConnected()) {
      this.multiplayer.update(dt)
      this.syncStateToMultiplayer()
    }
  }

  /**
   * Sync state to multiplayer
   */
  private syncStateToMultiplayer(): void {
    if (!this.syncHelpers) return

    // Create lightweight sync packet
    const packet = this.syncHelpers.multiplayer.createSyncPacket()

    // Convert to old format for compatibility
    const cameraPos = packet.camera.position
    const cameraRot = packet.camera.rotation
    const cameraMode = this.camera.getMode()

    const state: GameState = {
      position: cameraPos,
      rotation: { x: cameraRot.pitch, y: cameraRot.yaw, z: 0 },
      cameraMode: cameraMode === 'freeroam' ? 'free' : 'ride',
      rideProgress: this.camera.getRideProgress(),
      timestamp: packet.timestamp,
    }

    this.multiplayer.sendGameState(state)
  }

  /** Send a social-channel text frame to the friend. */
  public sendSocial(text: string): void {
    this.multiplayer.sendSocial(text)
  }

  /** Receive the friend's social-channel text frames. */
  public setSocialReceiver(receiver: (text: string) => void): void {
    this.multiplayer.onSocial = receiver
  }

  /**
   * Send photo event to peer
   */
  public sendPhotoEvent(): void {
    if (this.multiplayer.isConnected()) {
      this.multiplayer.sendEvent({
        type: 'photo',
        timestamp: performance.now(),
      })
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.multiplayer.isConnected()
  }

  /**
   * Get multiplayer instance
   */
  public getMultiplayer(): WebRTCMultiplayer {
    return this.multiplayer
  }
}
