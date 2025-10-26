/**
 * State Machine Demo
 * Simple demonstration of state machine functionality
 */

import { GameStateManager } from '../src/game-state-manager'
import { GameStateMachine } from '../src/state-machine'

/**
 * Demo 1: Basic state transitions
 */
export function demoBasicTransitions(): void {
  console.log('=== Demo 1: Basic State Transitions ===\n')

  const stateManager = new GameStateManager()

  console.log('Initial state:', stateManager.getState()) // 'loading'

  // Valid transition
  console.log('\nTransitioning to playing...')
  const success1 = stateManager.setState('playing')
  console.log('Success:', success1)
  console.log('Current state:', stateManager.getState())

  // Valid transition
  console.log('\nTransitioning to paused...')
  const success2 = stateManager.setState('paused')
  console.log('Success:', success2)
  console.log('Current state:', stateManager.getState())

  // Invalid transition (paused cannot go to loading)
  console.log('\nAttempting invalid transition to loading...')
  const success3 = stateManager.setState('loading')
  console.log('Success:', success3)
  console.log('Current state:', stateManager.getState()) // Still 'paused'

  // Force invalid transition
  console.log('\nForcing transition to loading...')
  const success4 = stateManager.setState('loading', true)
  console.log('Success:', success4)
  console.log('Current state:', stateManager.getState())
}

/**
 * Demo 2: State configuration
 */
export function demoStateConfiguration(): void {
  console.log('\n=== Demo 2: State Configuration ===\n')

  const stateManager = new GameStateManager()

  // Check different state configurations
  const states = ['loading', 'playing', 'paused', 'gallery']

  states.forEach(state => {
    stateManager.setState(state as any, true) // Force for demo
    const config = stateManager.getCurrentConfig()

    console.log(`\nState: ${state}`)
    console.log('  Pause game loop:', config.pauseGameLoop)
    console.log('  Pause audio:', config.pauseAudio)
    console.log('  Allow camera:', config.allowCameraMovement)
    console.log('  Allow photos:', config.allowPhotoCapture)
  })
}

/**
 * Demo 3: State callbacks
 */
export function demoStateCallbacks(): void {
  console.log('\n=== Demo 3: State Callbacks ===\n')

  const stateMachine = new GameStateMachine('loading')

  // Register callbacks
  stateMachine.registerState('playing', {
    onEnter: (prev) => console.log(`▶ Entered playing from ${prev}`),
    onExit: (next) => console.log(`◀ Exiting playing to ${next}`),
    onUpdate: (dt) => console.log(`  Updating playing (dt: ${dt.toFixed(3)}s)`)
  })

  stateMachine.registerState('paused', {
    onEnter: (prev) => console.log(`⏸ Entered paused from ${prev}`),
    onExit: (next) => console.log(`◀ Exiting paused to ${next}`)
  })

  // Perform transitions
  console.log('Transition: loading → playing')
  stateMachine.transition('playing')

  console.log('\nUpdate playing state')
  stateMachine.update(0.016)

  console.log('\nTransition: playing → paused')
  stateMachine.transition('paused')

  console.log('\nTransition: paused → playing')
  stateMachine.transition('playing')
}

/**
 * Demo 4: State queries
 */
export function demoStateQueries(): void {
  console.log('\n=== Demo 4: State Queries ===\n')

  const stateManager = new GameStateManager()
  stateManager.setState('playing', true)

  console.log('Current state:', stateManager.getState())
  console.log('Is in playing?', stateManager.isInState('playing'))
  console.log('Is in paused?', stateManager.isInState('paused'))
  console.log('Is in playing or paused?', stateManager.isInAnyState('playing', 'paused'))

  console.log('\nAvailable transitions:', stateManager.getAvailableTransitions())

  console.log('\nTransitioning to paused...')
  stateManager.setState('paused')

  console.log('Previous state:', stateManager.getPreviousState())
  console.log('Time in state:', stateManager.getStateTime().toFixed(2), 'ms')
}

/**
 * Demo 5: Transition history
 */
export function demoTransitionHistory(): void {
  console.log('\n=== Demo 5: Transition History ===\n')

  const stateMachine = new GameStateMachine('loading')

  // Perform several transitions
  stateMachine.transition('playing')
  stateMachine.transition('paused')
  stateMachine.transition('playing')
  stateMachine.transition('gallery')
  stateMachine.transition('playing')

  // Get history
  const history = stateMachine.getHistory()

  console.log(`Total transitions: ${history.length}\n`)

  history.forEach((transition, index) => {
    console.log(`${index + 1}. ${transition.from} → ${transition.to}`)
  })
}

/**
 * Demo 6: State change listeners
 */
export function demoStateChangeListeners(): void {
  console.log('\n=== Demo 6: State Change Listeners ===\n')

  const stateManager = new GameStateManager()

  // Register multiple listeners
  stateManager.onStateChange((newState, prevState) => {
    console.log(`[Listener 1] State changed: ${prevState} → ${newState}`)
  })

  stateManager.onStateChange((newState) => {
    console.log(`[Listener 2] Now in ${newState} state`)
  })

  stateManager.onStateChange((newState) => {
    const config = stateManager.getCurrentConfig()
    console.log(`[Listener 3] Game loop: ${config.pauseGameLoop ? 'paused' : 'running'}`)
  })

  // Trigger transitions
  console.log('Transitioning to playing...\n')
  stateManager.setState('playing', true)

  console.log('\nTransitioning to paused...\n')
  stateManager.setState('paused')
}

/**
 * Demo 7: Custom transitions
 */
export function demoCustomTransitions(): void {
  console.log('\n=== Demo 7: Custom Transitions ===\n')

  const stateMachine = new GameStateMachine('playing')

  console.log('Available transitions from playing:')
  console.log(stateMachine.getAvailableTransitions())

  // Try invalid transition
  console.log('\nAttempting playing → loading (invalid)')
  const success1 = stateMachine.transition('loading')
  console.log('Success:', success1)

  // Add custom transition
  console.log('\nAdding custom transition: playing → loading')
  stateMachine.addTransition('playing', 'loading')

  console.log('Available transitions from playing:')
  console.log(stateMachine.getAvailableTransitions())

  // Try again
  console.log('\nAttempting playing → loading (now valid)')
  const success2 = stateMachine.transition('loading')
  console.log('Success:', success2)
  console.log('Current state:', stateMachine.getState())
}

/**
 * Demo 8: State machine status
 */
export function demoStateMachineStatus(): void {
  console.log('\n=== Demo 8: State Machine Status ===\n')

  const stateManager = new GameStateManager()
  stateManager.setState('playing', true)

  // Wait a bit
  setTimeout(() => {
    const status = stateManager.getStatus()

    console.log('State Machine Status:')
    console.log('  Current:', status.current)
    console.log('  Previous:', status.previous)
    console.log('  Time in state:', (status.timeInState / 1000).toFixed(2), 's')
    console.log('  Available transitions:', status.availableTransitions)
    console.log('  History count:', status.historyCount)
    console.log('\nState Configuration:')
    console.log('  Pause game loop:', status.config.pauseGameLoop)
    console.log('  Pause audio:', status.config.pauseAudio)
    console.log('  Allow camera:', status.config.allowCameraMovement)
    console.log('  Allow photos:', status.config.allowPhotoCapture)
  }, 100)
}

/**
 * Run all demos
 */
export function runAllDemos(): void {
  demoBasicTransitions()
  demoStateConfiguration()
  demoStateCallbacks()
  demoStateQueries()
  demoTransitionHistory()
  demoStateChangeListeners()
  demoCustomTransitions()
  demoStateMachineStatus()

  console.log('\n=== All Demos Complete ===')
}

// Run demos if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemos()
}
