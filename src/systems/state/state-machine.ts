/**
 * Game State Machine
 * Manages game states and transitions with validation and callbacks
 */

export type GameStateType =
  | 'loading'
  | 'menu'
  | 'playing'
  | 'paused'
  | 'photo_mode'
  | 'gallery'
  | 'settings'
  | 'multiplayer_connecting'
  | 'multiplayer_connected'
  | 'game_over'

export interface StateTransition {
  from: GameStateType
  to: GameStateType
  timestamp: number
}

export interface StateCallbacks {
  onEnter?: (previousState: GameStateType) => void
  onExit?: (nextState: GameStateType) => void
  onUpdate?: (deltaTime: number) => void
}

export class GameStateMachine {
  private currentState: GameStateType
  private previousState: GameStateType | null = null
  private stateCallbacks: Map<GameStateType, StateCallbacks> = new Map()
  private transitionHistory: StateTransition[] = []
  private allowedTransitions: Map<GameStateType, Set<GameStateType>> = new Map()
  private stateStartTime: number = 0

  constructor(initialState: GameStateType = 'loading') {
    this.currentState = initialState
    this.stateStartTime = performance.now()
    this.setupAllowedTransitions()
  }

  /**
   * Define valid state transitions
   */
  private setupAllowedTransitions(): void {
    this.allowedTransitions.set('loading', new Set(['menu', 'playing']))
    this.allowedTransitions.set('menu', new Set(['playing', 'settings', 'multiplayer_connecting']))
    this.allowedTransitions.set(
      'playing',
      new Set(['paused', 'photo_mode', 'gallery', 'settings', 'game_over'])
    )
    this.allowedTransitions.set('paused', new Set(['playing', 'menu', 'settings']))
    this.allowedTransitions.set('photo_mode', new Set(['playing']))
    this.allowedTransitions.set('gallery', new Set(['playing', 'paused']))
    this.allowedTransitions.set('settings', new Set(['playing', 'paused', 'menu']))
    this.allowedTransitions.set(
      'multiplayer_connecting',
      new Set(['multiplayer_connected', 'menu', 'playing'])
    )
    this.allowedTransitions.set('multiplayer_connected', new Set(['playing', 'paused']))
    this.allowedTransitions.set('game_over', new Set(['menu', 'playing']))
  }

  /**
   * Register callbacks for a specific state
   */
  public registerState(state: GameStateType, callbacks: StateCallbacks): void {
    this.stateCallbacks.set(state, callbacks)
  }

  /**
   * Transition to a new state
   */
  public transition(newState: GameStateType, force: boolean = false): boolean {
    if (this.currentState === newState) {
      console.warn(`Already in state: ${newState}`)
      return false
    }

    // Check if transition is allowed
    if (!force && !this.isTransitionAllowed(this.currentState, newState)) {
      console.error(`Invalid transition: ${this.currentState} -> ${newState}`)
      return false
    }

    // Execute exit callback for current state
    const currentCallbacks = this.stateCallbacks.get(this.currentState)
    currentCallbacks?.onExit?.(newState)

    // Record transition
    this.transitionHistory.push({
      from: this.currentState,
      to: newState,
      timestamp: performance.now(),
    })

    // Update state
    this.previousState = this.currentState
    this.currentState = newState
    this.stateStartTime = performance.now()

    // Execute enter callback for new state
    const newCallbacks = this.stateCallbacks.get(newState)
    newCallbacks?.onEnter?.(this.previousState)

    console.log(`State transition: ${this.previousState} -> ${this.currentState}`)
    return true
  }

  /**
   * Check if a transition is allowed
   */
  public isTransitionAllowed(from: GameStateType, to: GameStateType): boolean {
    const allowedStates = this.allowedTransitions.get(from)
    return allowedStates?.has(to) ?? false
  }

  /**
   * Get current state
   */
  public getState(): GameStateType {
    return this.currentState
  }

  /**
   * Get previous state
   */
  public getPreviousState(): GameStateType | null {
    return this.previousState
  }

  /**
   * Check if in a specific state
   */
  public isInState(state: GameStateType): boolean {
    return this.currentState === state
  }

  /**
   * Check if in any of the provided states
   */
  public isInAnyState(...states: GameStateType[]): boolean {
    return states.includes(this.currentState)
  }

  /**
   * Get time spent in current state (milliseconds)
   */
  public getStateTime(): number {
    return performance.now() - this.stateStartTime
  }

  /**
   * Update current state (calls onUpdate callback)
   */
  public update(deltaTime: number): void {
    const callbacks = this.stateCallbacks.get(this.currentState)
    callbacks?.onUpdate?.(deltaTime)
  }

  /**
   * Get transition history
   */
  public getHistory(): StateTransition[] {
    return [...this.transitionHistory]
  }

  /**
   * Clear transition history
   */
  public clearHistory(): void {
    this.transitionHistory = []
  }

  /**
   * Get all possible transitions from current state
   */
  public getAvailableTransitions(): GameStateType[] {
    const allowed = this.allowedTransitions.get(this.currentState)
    return allowed ? Array.from(allowed) : []
  }

  /**
   * Add a custom transition rule
   */
  public addTransition(from: GameStateType, to: GameStateType): void {
    const transitions = this.allowedTransitions.get(from)
    if (transitions) {
      transitions.add(to)
    } else {
      this.allowedTransitions.set(from, new Set([to]))
    }
  }

  /**
   * Remove a transition rule
   */
  public removeTransition(from: GameStateType, to: GameStateType): void {
    const transitions = this.allowedTransitions.get(from)
    transitions?.delete(to)
  }

  /**
   * Reset to initial state
   */
  public reset(initialState: GameStateType = 'loading'): void {
    const currentCallbacks = this.stateCallbacks.get(this.currentState)
    currentCallbacks?.onExit?.(initialState)

    this.previousState = this.currentState
    this.currentState = initialState
    this.stateStartTime = performance.now()
    this.transitionHistory = []

    const newCallbacks = this.stateCallbacks.get(initialState)
    newCallbacks?.onEnter?.(this.previousState)
  }

  /**
   * Get state machine status for debugging
   */
  public getStatus(): {
    current: GameStateType
    previous: GameStateType | null
    timeInState: number
    availableTransitions: GameStateType[]
    historyCount: number
  } {
    return {
      current: this.currentState,
      previous: this.previousState,
      timeInState: this.getStateTime(),
      availableTransitions: this.getAvailableTransitions(),
      historyCount: this.transitionHistory.length,
    }
  }
}
