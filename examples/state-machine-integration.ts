/**
 * State Machine Integration Example
 * Shows how to integrate the state machine into the existing Game class
 */

import { GameStateManager } from '../src/game-state-manager'
import type { GameStateType } from '../src/state-machine'

/**
 * Example: Basic integration with Game class
 */
export class GameWithStateMachine {
  private stateManager: GameStateManager
  private isRunning = false

  constructor() {
    this.stateManager = new GameStateManager()
    this.setupStateHandlers()
  }

  /**
   * Setup handlers for state changes
   */
  private setupStateHandlers(): void {
    this.stateManager.onStateChange((newState, previousState) => {
      console.log(`State changed: ${previousState} -> ${newState}`)
      
      // Handle state-specific logic
      switch (newState) {
        case 'playing':
          this.onEnterPlaying()
          break
        case 'paused':
          this.onEnterPaused()
          break
        case 'gallery':
          this.onEnterGallery()
          break
        case 'settings':
          this.onEnterSettings()
          break
        case 'photo_mode':
          this.onEnterPhotoMode()
          break
      }
    })
  }

  /**
   * State-specific enter handlers
   */
  private onEnterPlaying(): void {
    // Resume game loop
    this.isRunning = true
    // Resume audio
    // Show game UI
    // Enable camera controls
  }

  private onEnterPaused(): void {
    // Pause game loop
    this.isRunning = false
    // Pause audio
    // Show pause menu
  }

  private onEnterGallery(): void {
    // Pause game
    // Show gallery UI
    // Disable camera movement
  }

  private onEnterSettings(): void {
    // Pause game
    // Show settings UI
  }

  private onEnterPhotoMode(): void {
    // Slow down time
    // Enable photo controls
    // Show photo UI
  }

  /**
   * Game loop with state machine integration
   */
  private gameLoop = (now: number): void => {
    if (!this.isRunning) return

    const deltaTime = 0.016 // Simplified

    // Update state machine
    this.stateManager.update(deltaTime)

    // Only update game systems if not paused
    if (!this.stateManager.shouldPauseGameLoop()) {
      this.updateGameSystems(deltaTime)
    }

    requestAnimationFrame(this.gameLoop)
  }

  private updateGameSystems(deltaTime: number): void {
    // Update camera (only if allowed)
    if (this.stateManager.isCameraMovementAllowed()) {
      // Update camera
    }

    // Update creatures
    // Update audio
    // Render scene
  }

  /**
   * Input handling with state machine
   */
  public handleInput(action: string): void {
    // Check if input is allowed in current state
    if (!this.stateManager.isInputAllowed()) {
      return
    }

    const currentState = this.stateManager.getState()

    switch (action) {
      case 'pause':
        if (currentState === 'playing') {
          this.stateManager.setState('paused')
        } else if (currentState === 'paused') {
          this.stateManager.setState('playing')
        }
        break

      case 'takePhoto':
        if (this.stateManager.isPhotoAllowed()) {
          // Take photo
        }
        break

      case 'openGallery':
        if (currentState === 'playing') {
          this.stateManager.setState('gallery')
        }
        break

      case 'closeGallery':
        if (currentState === 'gallery') {
          const prevState = this.stateManager.getPreviousState()
          this.stateManager.setState(prevState === 'paused' ? 'paused' : 'playing')
        }
        break

      case 'openSettings':
        if (this.stateManager.isInAnyState('playing', 'paused', 'menu')) {
          this.stateManager.setState('settings')
        }
        break
    }
  }

  /**
   * Start the game
   */
  public start(): void {
    // Transition from loading to playing
    this.stateManager.setState('playing')
    this.isRunning = true
    this.gameLoop(performance.now())
  }

  /**
   * Get state manager for debugging
   */
  public getStateManager(): GameStateManager {
    return this.stateManager
  }
}

/**
 * Example: Using state machine for UI updates
 */
export class UIWithStateMachine {
  private stateManager: GameStateManager

  constructor(stateManager: GameStateManager) {
    this.stateManager = stateManager
    this.setupUIStateHandlers()
  }

  private setupUIStateHandlers(): void {
    this.stateManager.onStateChange((newState) => {
      this.updateUIForState(newState)
    })
  }

  private updateUIForState(state: GameStateType): void {
    // Hide all panels first
    this.hideAllPanels()

    // Show appropriate UI for state
    switch (state) {
      case 'loading':
        this.showLoadingScreen()
        break
      case 'menu':
        this.showMainMenu()
        break
      case 'playing':
        this.showGameHUD()
        break
      case 'paused':
        this.showPauseMenu()
        break
      case 'gallery':
        this.showGallery()
        break
      case 'settings':
        this.showSettings()
        break
      case 'photo_mode':
        this.showPhotoModeUI()
        break
      case 'multiplayer_connecting':
        this.showConnectingScreen()
        break
      case 'game_over':
        this.showGameOverScreen()
        break
    }
  }

  private hideAllPanels(): void {
    // Hide all UI panels
  }

  private showLoadingScreen(): void {
    console.log('Showing loading screen')
  }

  private showMainMenu(): void {
    console.log('Showing main menu')
  }

  private showGameHUD(): void {
    console.log('Showing game HUD')
  }

  private showPauseMenu(): void {
    console.log('Showing pause menu')
  }

  private showGallery(): void {
    console.log('Showing gallery')
  }

  private showSettings(): void {
    console.log('Showing settings')
  }

  private showPhotoModeUI(): void {
    console.log('Showing photo mode UI')
  }

  private showConnectingScreen(): void {
    console.log('Showing connecting screen')
  }

  private showGameOverScreen(): void {
    console.log('Showing game over screen')
  }
}

/**
 * Example: State-based audio management
 */
export class AudioWithStateMachine {
  private stateManager: GameStateManager

  constructor(stateManager: GameStateManager) {
    this.stateManager = stateManager
    this.setupAudioStateHandlers()
  }

  private setupAudioStateHandlers(): void {
    this.stateManager.onStateChange((newState) => {
      if (this.stateManager.shouldPauseAudio()) {
        this.pauseAllAudio()
      } else {
        this.resumeAudio()
      }

      // State-specific audio
      this.playStateTransitionSound(newState)
    })
  }

  private pauseAllAudio(): void {
    console.log('Pausing all audio')
    // Pause ambient sounds
    // Pause music
  }

  private resumeAudio(): void {
    console.log('Resuming audio')
    // Resume ambient sounds
    // Resume music
  }

  private playStateTransitionSound(state: GameStateType): void {
    switch (state) {
      case 'paused':
        // Play pause sound
        break
      case 'playing':
        // Play resume sound
        break
      case 'photo_mode':
        // Play camera shutter sound
        break
    }
  }
}

/**
 * Example: Debug panel for state machine
 */
export class StateDebugPanel {
  private stateManager: GameStateManager
  private panelElement: HTMLDivElement

  constructor(stateManager: GameStateManager) {
    this.stateManager = stateManager
    this.panelElement = this.createPanel()
    this.setupUpdateLoop()
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.id = 'state-debug-panel'
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 250px;
    `
    document.body.appendChild(panel)
    return panel
  }

  private setupUpdateLoop(): void {
    setInterval(() => {
      this.updatePanel()
    }, 100)
  }

  private updatePanel(): void {
    const status = this.stateManager.getStatus()
    const config = this.stateManager.getCurrentConfig()

    this.panelElement.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #4ade80;">State Machine Debug</h3>
      <div><strong>Current State:</strong> ${status.current}</div>
      <div><strong>Previous State:</strong> ${status.previous || 'none'}</div>
      <div><strong>Time in State:</strong> ${(status.timeInState / 1000).toFixed(2)}s</div>
      <div style="margin-top: 10px;"><strong>Config:</strong></div>
      <div style="margin-left: 10px;">
        <div>Game Loop: ${config.pauseGameLoop ? '⏸ Paused' : '▶ Running'}</div>
        <div>Audio: ${config.pauseAudio ? '🔇 Muted' : '🔊 Playing'}</div>
        <div>Camera: ${config.allowCameraMovement ? '✓ Enabled' : '✗ Disabled'}</div>
        <div>Photos: ${config.allowPhotoCapture ? '✓ Enabled' : '✗ Disabled'}</div>
      </div>
      <div style="margin-top: 10px;"><strong>Available Transitions:</strong></div>
      <div style="margin-left: 10px; color: #60a5fa;">
        ${status.availableTransitions.join(', ')}
      </div>
      <div style="margin-top: 10px;"><strong>History:</strong> ${status.historyCount} transitions</div>
    `
  }

  public destroy(): void {
    document.body.removeChild(this.panelElement)
  }
}
