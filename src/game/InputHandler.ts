/**
 * InputHandler
 * Centralizes all input handling and bindings
 */

import type { InputManager } from '../input-manager'
import type { CameraController } from '../camera'
import type { IntegratedStateManager } from '../state-integration'
import type { UIManager } from '../ui'
import type { VideoRecorder } from '../video-recorder'
import type { ShaderConfig } from '../shaders/ShaderManager'
import type { SceneManager } from '../scene'

export interface InputHandlerCallbacks {
  onTakePhoto: () => void
  onToggleCamera: () => void
  onRestartRide: () => void
  onTogglePause: () => void
  onToggleRecording: () => void
  onToggleShader: () => void
  onToggleCreatureInfo: () => void
  onToggleGallery: () => void
  onToggleMultiplayer: () => void
  onToggleSettings: () => void
  onToggleShortcuts: () => void
  onToggleDebug: () => void
}

export class InputHandler {
  private inputManager: InputManager
  private camera: CameraController
  private stateManager: IntegratedStateManager
  private uiManager: UIManager
  private videoRecorder: VideoRecorder
  private sceneManager: SceneManager
  private callbacks: InputHandlerCallbacks

  constructor(
    inputManager: InputManager,
    camera: CameraController,
    stateManager: IntegratedStateManager,
    uiManager: UIManager,
    videoRecorder: VideoRecorder,
    sceneManager: SceneManager,
    callbacks: InputHandlerCallbacks
  ) {
    this.inputManager = inputManager
    this.camera = camera
    this.stateManager = stateManager
    this.uiManager = uiManager
    this.videoRecorder = videoRecorder
    this.sceneManager = sceneManager
    this.callbacks = callbacks

    this.setupInputBindings()
  }

  /**
   * Setup all input bindings
   */
  private setupInputBindings(): void {
    // Camera actions
    this.inputManager.on('camera.toggleMode', () => this.callbacks.onToggleCamera())

    // Game actions
    this.inputManager.on('game.takePhoto', () => this.callbacks.onTakePhoto())
    this.inputManager.on('game.restartRide', () => this.callbacks.onRestartRide())
    this.inputManager.on('game.pause', () => this.callbacks.onTogglePause())

    // Video actions
    this.inputManager.on('video.toggleRecording', () => this.callbacks.onToggleRecording())

    // Shader actions
    this.inputManager.on('shader.toggle', () => this.callbacks.onToggleShader())

    // UI toggles
    this.inputManager.on('ui.toggleGallery', () => this.callbacks.onToggleGallery())
    this.inputManager.on('ui.toggleMultiplayer', () => this.callbacks.onToggleMultiplayer())
    this.inputManager.on('ui.toggleSettings', () => this.callbacks.onToggleSettings())
    this.inputManager.on('ui.toggleShortcuts', () => this.callbacks.onToggleShortcuts())
  }

  /**
   * Update input manager (call at end of frame)
   */
  public update(): void {
    this.inputManager.update()
  }
}
