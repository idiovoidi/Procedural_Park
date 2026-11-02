/**
 * InputHandler
 * Centralizes all input handling and bindings
 */

import type { CameraController } from '@systems/camera'
import type { InputManager } from '@systems/input'
import type { IntegratedStateManager } from '@systems/state'
import type { UIManager } from '@ui/managers'

export interface InputHandlerCallbacks {
  onTakePhoto: () => void
  onExportCreatureCard: () => void
  onToggleCamera: () => void
  onJump: () => void
  onRestartRide: () => void
  onTogglePause: () => void
  onToggleRecording: () => void
  onToggleShader: () => void
  onToggleCreatureInfo: () => void
  onToggleGallery: () => void
  onToggleCollection: () => void
  onToggleMultiplayer: () => void
  onToggleSettings: () => void
  onToggleShortcuts: () => void
  onTogglePlayerStats: () => void
  onToggleDebug: () => void
  onToggleFoodInventory: () => void
  onFeedCreature: () => void
  onRandomizeCreature: () => void
  onToggleFoodStore: () => void
  onToggleMarket: () => void
}

export class InputHandler {
  private inputManager: InputManager
  private callbacks: InputHandlerCallbacks

  constructor(
    inputManager: InputManager,
    _camera: CameraController,
    _stateManager: IntegratedStateManager,
    _uiManager: UIManager,
    callbacks: InputHandlerCallbacks
  ) {
    this.inputManager = inputManager
    this.callbacks = callbacks

    this.setupInputBindings()
  }

  /**
   * Setup all input bindings
   */
  private setupInputBindings(): void {
    // Camera actions
    this.inputManager.on('camera.toggleMode', () => this.callbacks.onToggleCamera())
    this.inputManager.on('camera.jump', () => this.callbacks.onJump())

    // Game actions
    this.inputManager.on('game.takePhoto', () => this.callbacks.onTakePhoto())
    this.inputManager.on('game.exportCreatureCard', () => this.callbacks.onExportCreatureCard())
    this.inputManager.on('game.restartRide', () => this.callbacks.onRestartRide())
    this.inputManager.on('game.pause', () => this.callbacks.onTogglePause())
    this.inputManager.on('game.randomizeCreature', () => this.callbacks.onRandomizeCreature())

    // Video actions
    this.inputManager.on('video.toggleRecording', () => this.callbacks.onToggleRecording())

    // Shader actions
    this.inputManager.on('shader.toggle', () => this.callbacks.onToggleShader())

    // UI toggles
    this.inputManager.on('ui.toggleGallery', () => this.callbacks.onToggleGallery())
    this.inputManager.on('ui.toggleCollection', () => this.callbacks.onToggleCollection())
    this.inputManager.on('ui.toggleMultiplayer', () => this.callbacks.onToggleMultiplayer())
    this.inputManager.on('ui.toggleSettings', () => this.callbacks.onToggleSettings())
    this.inputManager.on('ui.toggleShortcuts', () => this.callbacks.onToggleShortcuts())
    this.inputManager.on('ui.togglePlayerStats', () => this.callbacks.onTogglePlayerStats())

    // Food actions
    this.inputManager.on('food.toggleInventory', () => this.callbacks.onToggleFoodInventory())
    this.inputManager.on('food.feedCreature', () => this.callbacks.onFeedCreature())
    this.inputManager.on('food.toggleStore', () => this.callbacks.onToggleFoodStore())

    // Market actions
    this.inputManager.on('market.toggle', () => this.callbacks.onToggleMarket())
  }

  /**
   * Update input manager (call at end of frame)
   */
  public update(): void {
    this.inputManager.update()
  }
}
