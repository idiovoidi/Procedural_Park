/**
 * Game State Manager
 * High-level wrapper that integrates the state machine with game systems
 */

import { GameStateMachine, type GameStateType } from '@systems/state'

export interface GameStateConfig {
  pauseGameLoop?: boolean
  pauseAudio?: boolean
  showUI?: boolean
  allowInput?: boolean
  allowCameraMovement?: boolean
  allowPhotoCapture?: boolean
}

export class GameStateManager {
  private stateMachine: GameStateMachine
  private stateConfigs: Map<GameStateType, GameStateConfig> = new Map()
  private onStateChangeCallbacks: Array<
    (state: GameStateType, previous: GameStateType | null) => void
  > = []

  constructor() {
    this.stateMachine = new GameStateMachine('loading')
    this.setupStateConfigs()
    this.setupStateCallbacks()
  }

  /**
   * Define configuration for each state
   */
  private setupStateConfigs(): void {
    this.stateConfigs.set('loading', {
      pauseGameLoop: true,
      pauseAudio: true,
      showUI: false,
      allowInput: false,
      allowCameraMovement: false,
      allowPhotoCapture: false,
    })

    this.stateConfigs.set('menu', {
      pauseGameLoop: true,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: false,
      allowPhotoCapture: false,
    })

    this.stateConfigs.set('playing', {
      pauseGameLoop: false,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: true,
      allowPhotoCapture: true,
    })

    this.stateConfigs.set('paused', {
      pauseGameLoop: true,
      pauseAudio: true,
      showUI: true,
      allowInput: true,
      allowCameraMovement: false,
      allowPhotoCapture: false,
    })

    this.stateConfigs.set('photo_mode', {
      pauseGameLoop: true,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: true,
      allowPhotoCapture: true,
    })

    this.stateConfigs.set('gallery', {
      pauseGameLoop: true,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: false,
      allowPhotoCapture: false,
    })

    this.stateConfigs.set('settings', {
      pauseGameLoop: true,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: false,
      allowPhotoCapture: false,
    })

    this.stateConfigs.set('multiplayer_connecting', {
      pauseGameLoop: true,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: false,
      allowPhotoCapture: false,
    })

    this.stateConfigs.set('multiplayer_connected', {
      pauseGameLoop: false,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: true,
      allowPhotoCapture: true,
    })

    this.stateConfigs.set('game_over', {
      pauseGameLoop: true,
      pauseAudio: false,
      showUI: true,
      allowInput: true,
      allowCameraMovement: false,
      allowPhotoCapture: false,
    })
  }

  /**
   * Setup state machine callbacks
   */
  private setupStateCallbacks(): void {
    // Loading state
    this.stateMachine.registerState('loading', {
      onEnter: () => console.log('Entering loading state'),
      onExit: () => console.log('Exiting loading state'),
    })

    // Menu state
    this.stateMachine.registerState('menu', {
      onEnter: () => console.log('Entering menu state'),
      onExit: () => console.log('Exiting menu state'),
    })

    // Playing state
    this.stateMachine.registerState('playing', {
      onEnter: (prev) => {
        console.log(`Entering playing state from ${prev}`)
      },
      onExit: (next) => {
        console.log(`Exiting playing state to ${next}`)
      },
    })

    // Paused state
    this.stateMachine.registerState('paused', {
      onEnter: () => console.log('Game paused'),
      onExit: () => console.log('Game resumed'),
    })

    // Photo mode state
    this.stateMachine.registerState('photo_mode', {
      onEnter: () => console.log('Entering photo mode'),
      onExit: () => console.log('Exiting photo mode'),
    })

    // Gallery state
    this.stateMachine.registerState('gallery', {
      onEnter: () => console.log('Opening gallery'),
      onExit: () => console.log('Closing gallery'),
    })

    // Settings state
    this.stateMachine.registerState('settings', {
      onEnter: () => console.log('Opening settings'),
      onExit: () => console.log('Closing settings'),
    })

    // Multiplayer states
    this.stateMachine.registerState('multiplayer_connecting', {
      onEnter: () => console.log('Connecting to multiplayer...'),
      onExit: () => console.log('Multiplayer connection attempt ended'),
    })

    this.stateMachine.registerState('multiplayer_connected', {
      onEnter: () => console.log('Multiplayer connected!'),
      onExit: () => console.log('Multiplayer disconnected'),
    })

    // Game over state
    this.stateMachine.registerState('game_over', {
      onEnter: () => console.log('Game over'),
      onExit: () => console.log('Restarting game'),
    })
  }

  /**
   * Transition to a new state
   */
  public setState(newState: GameStateType, force: boolean = false): boolean {
    const previousState = this.stateMachine.getPreviousState()
    const success = this.stateMachine.transition(newState, force)

    if (success) {
      // Notify all callbacks
      this.onStateChangeCallbacks.forEach((callback) => {
        callback(newState, previousState)
      })
    }

    return success
  }

  /**
   * Get current state
   */
  public getState(): GameStateType {
    return this.stateMachine.getState()
  }

  /**
   * Get previous state
   */
  public getPreviousState(): GameStateType | null {
    return this.stateMachine.getPreviousState()
  }

  /**
   * Check if in a specific state
   */
  public isInState(state: GameStateType): boolean {
    return this.stateMachine.isInState(state)
  }

  /**
   * Check if in any of the provided states
   */
  public isInAnyState(...states: GameStateType[]): boolean {
    return this.stateMachine.isInAnyState(...states)
  }

  /**
   * Get configuration for current state
   */
  public getCurrentConfig(): GameStateConfig {
    return this.stateConfigs.get(this.getState()) || {}
  }

  /**
   * Check if game loop should be paused
   */
  public shouldPauseGameLoop(): boolean {
    return this.getCurrentConfig().pauseGameLoop ?? false
  }

  /**
   * Check if audio should be paused
   */
  public shouldPauseAudio(): boolean {
    return this.getCurrentConfig().pauseAudio ?? false
  }

  /**
   * Check if UI should be shown
   */
  public shouldShowUI(): boolean {
    return this.getCurrentConfig().showUI ?? true
  }

  /**
   * Check if input is allowed
   */
  public isInputAllowed(): boolean {
    return this.getCurrentConfig().allowInput ?? true
  }

  /**
   * Check if camera movement is allowed
   */
  public isCameraMovementAllowed(): boolean {
    return this.getCurrentConfig().allowCameraMovement ?? false
  }

  /**
   * Check if photo capture is allowed
   */
  public isPhotoAllowed(): boolean {
    return this.getCurrentConfig().allowPhotoCapture ?? false
  }

  /**
   * Update state machine
   */
  public update(deltaTime: number): void {
    this.stateMachine.update(deltaTime)
  }

  /**
   * Register a callback for state changes
   */
  public onStateChange(
    callback: (state: GameStateType, previous: GameStateType | null) => void
  ): void {
    this.onStateChangeCallbacks.push(callback)
  }

  /**
   * Get available transitions from current state
   */
  public getAvailableTransitions(): GameStateType[] {
    return this.stateMachine.getAvailableTransitions()
  }

  /**
   * Get state machine status for debugging
   */
  public getStatus() {
    return {
      ...this.stateMachine.getStatus(),
      config: this.getCurrentConfig(),
    }
  }

  /**
   * Get time in current state
   */
  public getStateTime(): number {
    return this.stateMachine.getStateTime()
  }

  /**
   * Reset state machine
   */
  public reset(): void {
    this.stateMachine.reset('loading')
  }

  /**
   * Get the underlying state machine (for advanced usage)
   */
  public getStateMachine(): GameStateMachine {
    return this.stateMachine
  }
}
