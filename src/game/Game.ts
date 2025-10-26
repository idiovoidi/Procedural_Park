/**
 * Game
 * Main game class - now simplified and modular
 */

import { SystemsCoordinator, type GameSystems } from './SystemsCoordinator'
import { GameLoop } from './GameLoop'
import { InputHandler, type InputHandlerCallbacks } from './InputHandler'
import { GAME_CONFIG } from '../constants'
import type { IntegratedStateManager } from '../state-integration'

export class Game {
  private systems!: GameSystems
  private gameLoop!: GameLoop
  private inputHandler!: InputHandler
  private recordingIndicator: HTMLElement | null = null
  private container: HTMLElement
  private initPromise: Promise<void>

  constructor(container: HTMLElement) {
    this.container = container
    this.initPromise = this.initialize()
  }

  /**
   * Initialize the game
   */
  private async initialize(): Promise<void> {
    // Show loading screen
    const loadingEl = document.getElementById('loading')
    loadingEl?.classList.remove('hidden')

    // Initialize all systems
    const coordinator = new SystemsCoordinator(this.container)
    this.systems = await coordinator.initialize()

    // Initialize game loop
    this.gameLoop = new GameLoop(this.systems)

    // Setup input handler
    this.setupInputHandler()

    // Setup recording indicator
    this.setupRecordingIndicator()

    // Initialize state machine debug panel in development
    if (import.meta.env.DEV) {
      this.initializeStateDebugPanel()
    }

    // Spawn creatures
    this.systems.creatures.spawnCreatures()
    this.systems.creatures.spawnExperimentCreature()

    // Update lab sign with experiment creature name
    this.updateLabSign()

    // Start ambient sounds
    this.systems.audio.startAmbientSound('forest_ambient', 0.5)

    // Setup UI callbacks
    this.setupUICallbacks()

    // Hide loading screen and transition to playing state
    setTimeout(() => {
      loadingEl?.classList.add('hidden')
      this.systems.state.setFlowState('playing')
    }, GAME_CONFIG.LOADING_SCREEN_DELAY_MS)
  }

  /**
   * Setup UI callbacks
   */
  private setupUICallbacks(): void {
    const { ui, scene } = this.systems

    ui.onRideSpeedChange = (speed) => {
      // TODO: Implement ride speed change
    }

    ui.onClearGallery = () => {
      ui.clearGallery()
    }

    ui.onRestartRide = () => {
      this.restartRide()
    }

    ui.onDayNightToggle = (mode) => {
      scene.setDayNightMode(mode)
    }

    ui.onToggleMultiplayer = () => {
      ui.toggleMultiplayer()
    }
  }

  /**
   * Setup input handler with callbacks
   */
  private setupInputHandler(): void {
    const callbacks: InputHandlerCallbacks = {
      onTakePhoto: () => this.takePhoto(),
      onToggleCamera: () => this.toggleCamera(),
      onRestartRide: () => this.restartRide(),
      onTogglePause: () => this.togglePause(),
      onToggleRecording: () => this.toggleRecording(),
      onToggleShader: () => this.toggleShader(),
      onToggleCreatureInfo: () => {
        // TODO: Implement toggle creature info
      },
      onToggleGallery: () => this.systems.ui.toggleGallery(),
      onToggleMultiplayer: () => this.systems.ui.toggleMultiplayer(),
      onToggleSettings: () => this.systems.ui.toggleSettings(),
      onToggleShortcuts: () => this.systems.ui.toggleShortcuts(),
      onToggleDebug: () => this.systems.debug.toggle(),
      onJump: () => this.systems.camera.jump(),
    }

    this.inputHandler = new InputHandler(
      this.systems.input,
      this.systems.camera,
      this.systems.state,
      this.systems.ui,
      this.systems.video,
      this.systems.scene,
      callbacks
    )
  }

  /**
   * Take a photo
   */
  private takePhoto(): void {
    const { state, photo, scene, ui, creatures, multiplayer } = this.systems

    // Check if photos are allowed
    if (!state.isPhotoAllowed()) {
      ui.showToast('Cannot take photos right now')
      return
    }

    // Take photo
    const result = photo.takePhoto(
      creatures.getAllCreatures(),
      this.systems.camera.camera,
      scene.scene
    )

    // Capture the photo
    const dataUrl = scene.capturePhoto()

    // Add to gallery
    ui.addPhotoToGallery(dataUrl, result.score, result.creatureName)

    // Show score feedback
    ui.showScoreToast(result.score)

    // Update UI state
    const currentUI = state.getUIState()
    state.updateUIState({
      photoCount: currentUI.photoCount + 1,
      totalScore: currentUI.totalScore + result.score,
      lastScore: result.score,
    })

    // Log detailed score breakdown
    if (result.creature) {
      const breakdown = photo.getScoreBreakdown(result.creature, this.systems.camera.camera)
      console.log(`Photo of ${result.creatureName}:`, breakdown)
    }

    // Send photo event to peer
    multiplayer.sendPhotoEvent()
  }

  /**
   * Toggle camera mode
   */
  private toggleCamera(): void {
    this.systems.camera.toggleMode()
    const mode = this.systems.camera.getMode()
    this.systems.ui.showToast(mode === 'freeroam' ? '🎮 Free Roam Mode' : '🎢 Ride Mode')
  }

  /**
   * Restart ride
   */
  private restartRide(): void {
    // Respawn creatures
    this.systems.creatures.respawnCreatures()

    // Update lab sign
    this.updateLabSign()

    // Reset camera (create new instance)
    // TODO: Add reset method to CameraController instead
    this.systems.ui.showToast('🔄 Ride restarted')
  }

  /**
   * Toggle pause
   */
  private togglePause(): void {
    const currentState = this.systems.state.getFlowState()

    if (currentState === 'playing') {
      this.systems.state.setFlowState('paused')
      this.systems.ui.showToast('⏸ Paused')
    } else if (currentState === 'paused') {
      this.systems.state.setFlowState('playing')
      this.systems.ui.showToast('▶ Resumed')
    }
  }

  /**
   * Toggle recording
   */
  private toggleRecording(): void {
    const { video, ui } = this.systems

    if ((video as any).isRecording) {
      video.stopRecording()
      ui.showToast('⏹ Recording stopped')
    } else {
      video.startRecording()
      ui.showToast('⏺ Recording started (30s max)')
    }

    this.updateRecordingIndicator()
  }

  /**
   * Toggle shader
   */
  private toggleShader(): void {
    this.systems.shaderConfig.enabled = !this.systems.shaderConfig.enabled
    this.systems.scene.updateShaderConfig(this.systems.shaderConfig)
    this.systems.ui.showToast(this.systems.shaderConfig.enabled ? '🎨 Shader ON' : '🎨 Shader OFF')
  }

  /**
   * Setup recording indicator
   */
  private setupRecordingIndicator(): void {
    this.recordingIndicator = document.getElementById('recording-indicator')
  }

  /**
   * Update recording indicator
   */
  private updateRecordingIndicator(): void {
    if (!this.recordingIndicator) return

    if ((this.systems.video as any).isRecording) {
      this.recordingIndicator.classList.remove('hidden')
    } else {
      this.recordingIndicator.classList.add('hidden')
    }
  }

  /**
   * Update lab sign with experiment creature name
   */
  private updateLabSign(): void {
    const experimentCreature = this.systems.creatures.getExperimentCreature()
    if (experimentCreature) {
      const creatureName = this.systems.photo.generateCreatureName(experimentCreature)
      this.systems.scene.parkStructures.updateLabSign(creatureName)
    }
  }

  /**
   * Initialize state debug panel
   */
  private initializeStateDebugPanel(): void {
    const panel = document.createElement('div')
    panel.id = 'state-debug-panel'
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #4ade80;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      z-index: 10000;
      min-width: 220px;
      border: 1px solid rgba(74, 222, 128, 0.3);
    `
    document.body.appendChild(panel)

    // Update panel every 100ms
    setInterval(() => {
      const flowManager = this.systems.state.getFlowStateManager()
      const status = flowManager.getStatus()
      const config = flowManager.getCurrentConfig()

      panel.innerHTML = `
        <div style="margin-bottom: 8px; color: #60a5fa; font-weight: bold;">🎮 State Machine</div>
        <div><strong>State:</strong> ${status.current}</div>
        <div><strong>Previous:</strong> ${status.previous || 'none'}</div>
        <div><strong>Time:</strong> ${(status.timeInState / 1000).toFixed(1)}s</div>
        <div style="margin-top: 8px; color: #fbbf24;">Config:</div>
        <div style="margin-left: 10px; font-size: 10px;">
          <div>Loop: ${config.pauseGameLoop ? '⏸ Paused' : '▶ Running'}</div>
          <div>Audio: ${config.pauseAudio ? '🔇 Muted' : '🔊 Playing'}</div>
          <div>Camera: ${config.allowCameraMovement ? '✓' : '✗'}</div>
          <div>Photos: ${config.allowPhotoCapture ? '✓' : '✗'}</div>
        </div>
      `
    }, 100)
  }

  /**
   * Start the game
   */
  public async start(): Promise<void> {
    await this.initPromise
    this.gameLoop.start()
  }

  /**
   * Stop the game
   */
  public stop(): void {
    this.gameLoop.stop()
    this.systems.state.setFlowState('menu', true)
    this.systems.audio.stopAllAmbientSounds()
  }

  /**
   * Get state manager (for console debugging)
   */
  public getStateManager(): IntegratedStateManager {
    return this.systems.state
  }

  /**
   * Get debug info
   */
  public getDebugInfo() {
    return {
      state: this.systems.state.getDebugInfo(),
      creatures: {
        count: this.systems.creatures.getCreatures().length,
        hasExperiment: this.systems.creatures.getExperimentCreature() !== null,
      },
      multiplayer: {
        connected: this.systems.multiplayer.isConnected(),
      },
      camera: {
        mode: this.systems.camera.getMode(),
        position: this.systems.camera.camera.position,
      },
    }
  }
}
