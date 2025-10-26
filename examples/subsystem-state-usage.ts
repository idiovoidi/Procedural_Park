/**
 * Subsystem State Management - Usage Examples
 * 
 * This file demonstrates how to use the extended state management system
 * that manages both game flow states and subsystem states.
 */

import { IntegratedStateManager } from '../src/state-integration'
import { createStateSyncHelpers } from '../src/state-sync-helpers'
import type { CameraController } from '../src/camera'
import type { UIManager } from '../src/ui'

// ============================================================================
// Example 1: Basic Setup
// ============================================================================

export function example1_BasicSetup() {
  console.log('=== Example 1: Basic Setup ===')
  
  // Create the integrated state manager
  const stateManager = new IntegratedStateManager()
  
  // Check initial states
  console.log('Flow state:', stateManager.getFlowState()) // 'loading'
  console.log('Camera state:', stateManager.getCameraState())
  console.log('UI state:', stateManager.getUIState())
  
  // Transition to playing
  stateManager.setFlowState('playing')
  console.log('Flow state:', stateManager.getFlowState()) // 'playing'
}

// ============================================================================
// Example 2: Updating Subsystem States
// ============================================================================

export function example2_UpdatingSubsystemStates() {
  console.log('=== Example 2: Updating Subsystem States ===')
  
  const stateManager = new IntegratedStateManager()
  
  // Update camera state
  stateManager.updateCameraState({
    mode: 'freeroam',
    position: { x: 10, y: 2, z: 15 },
    isSprinting: true,
  })
  
  console.log('Updated camera:', stateManager.getCameraState())
  
  // Update UI state
  stateManager.updateUIState({
    photoCount: 5,
    totalScore: 1250,
    lastScore: 250,
  })
  
  console.log('Updated UI:', stateManager.getUIState())
  
  // Update multiplayer state
  stateManager.updateMultiplayerState({
    isConnected: true,
    connectionStatus: 'connected',
    peerId: 'peer-123',
    latency: 45,
  })
  
  console.log('Updated multiplayer:', stateManager.getMultiplayerState())
}

// ============================================================================
// Example 3: State Change Callbacks
// ============================================================================

export function example3_StateChangeCallbacks() {
  console.log('=== Example 3: State Change Callbacks ===')
  
  const stateManager = new IntegratedStateManager()
  
  // Listen to flow state changes
  stateManager.onFlowStateChange((newState, prevState) => {
    console.log(`Flow state changed: ${prevState} -> ${newState}`)
  })
  
  // Listen to specific subsystem changes
  const unsubCamera = stateManager.onSubsystemChange('camera', (event) => {
    console.log('Camera state changed:', event.newState)
  })
  
  const unsubUI = stateManager.onSubsystemChange('ui', (event) => {
    console.log('UI state changed:', event.newState)
  })
  
  // Listen to all subsystem changes
  const unsubAll = stateManager.onAnySubsystemChange((event) => {
    console.log(`${event.subsystem} changed at ${event.timestamp}`)
  })
  
  // Make some changes
  stateManager.setFlowState('playing')
  stateManager.updateCameraState({ mode: 'freeroam' })
  stateManager.updateUIState({ photoCount: 1 })
  
  // Cleanup
  unsubCamera()
  unsubUI()
  unsubAll()
}

// ============================================================================
// Example 4: Integration with Game Objects
// ============================================================================

export function example4_GameObjectIntegration(
  camera: CameraController,
  ui: UIManager
) {
  console.log('=== Example 4: Game Object Integration ===')
  
  const stateManager = new IntegratedStateManager()
  
  // Create sync helpers
  const syncHelpers = createStateSyncHelpers(
    stateManager.getSubsystemStateManager(),
    camera,
    ui
  )
  
  // Push camera state to state manager
  syncHelpers.camera?.pushToState()
  console.log('Camera state synced:', stateManager.getCameraState())
  
  // Setup automatic camera sync every 100ms
  const stopCameraSync = syncHelpers.camera?.setupAutoSync(100)
  
  // Push UI state
  syncHelpers.ui?.pushToState()
  console.log('UI state synced:', stateManager.getUIState())
  
  // Later: stop auto sync
  // stopCameraSync?.()
}

// ============================================================================
// Example 5: Creature State Management
// ============================================================================

export function example5_CreatureStateManagement() {
  console.log('=== Example 5: Creature State Management ===')
  
  const stateManager = new IntegratedStateManager()
  const syncHelpers = createStateSyncHelpers(
    stateManager.getSubsystemStateManager()
  )
  
  // Add a creature (simulated mesh)
  const mockMesh = {
    position: { x: 5, y: 0, z: 10 },
    rotation: { y: 0 },
    visible: true,
  } as any
  
  syncHelpers.creatures.pushCreature('creature-1', mockMesh, {
    name: 'Spotted Deer',
    behaviorState: 'walking',
    rarity: 2,
  })
  
  console.log('Creatures:', stateManager.getCreaturesState())
  
  // Update creature behavior
  syncHelpers.creatures.updateCreatureBehavior('creature-1', 'eating')
  
  // Batch update multiple creatures
  const updates = new Map([
    ['creature-1', { behaviorState: 'running' as const }],
  ])
  syncHelpers.creatures.batchUpdateCreatures(updates)
  
  console.log('Updated creatures:', stateManager.getCreaturesState())
  
  // Remove creature
  syncHelpers.creatures.removeCreature('creature-1')
  console.log('After removal:', stateManager.getCreaturesState())
}

// ============================================================================
// Example 6: Multiplayer State Synchronization
// ============================================================================

export function example6_MultiplayerSync() {
  console.log('=== Example 6: Multiplayer Sync ===')
  
  const stateManager = new IntegratedStateManager()
  const syncHelpers = createStateSyncHelpers(
    stateManager.getSubsystemStateManager()
  )
  
  // Update some state
  stateManager.updateCameraState({
    position: { x: 10, y: 2, z: 15 },
    rotation: { yaw: 0.5, pitch: 0.1 },
  })
  stateManager.updateUIState({
    photoCount: 3,
    totalScore: 750,
  })
  
  // Create lightweight sync packet
  const syncPacket = syncHelpers.multiplayer.createSyncPacket()
  console.log('Sync packet:', syncPacket)
  
  // Simulate sending over network...
  const packetJson = JSON.stringify(syncPacket)
  console.log('Packet size:', packetJson.length, 'bytes')
  
  // Simulate receiving from peer
  const receivedPacket = JSON.parse(packetJson)
  syncHelpers.multiplayer.applySyncPacket(receivedPacket)
  
  console.log('Peer state:', stateManager.getMultiplayerState())
}

// ============================================================================
// Example 7: Dirty Tracking for Efficient Sync
// ============================================================================

export function example7_DirtyTracking() {
  console.log('=== Example 7: Dirty Tracking ===')
  
  const stateManager = new IntegratedStateManager()
  
  // Make some changes
  stateManager.updateCameraState({ mode: 'freeroam' })
  stateManager.updateUIState({ photoCount: 1 })
  
  // Check what changed
  console.log('Dirty subsystems:', stateManager.getDirtySubsystems())
  console.log('Is camera dirty?', stateManager.isDirtySubsystem('camera'))
  console.log('Is audio dirty?', stateManager.isDirtySubsystem('audio'))
  
  // Get only changed state (for efficient network sync)
  const syncHelpers = createStateSyncHelpers(
    stateManager.getSubsystemStateManager()
  )
  const delta = syncHelpers.multiplayer.getStateDelta()
  console.log('State delta:', delta)
  
  // Mark as synced
  stateManager.markClean('camera')
  stateManager.markClean('ui')
  console.log('After marking clean:', stateManager.getDirtySubsystems())
}

// ============================================================================
// Example 8: State Snapshots and Rollback
// ============================================================================

export function example8_SnapshotsAndRollback() {
  console.log('=== Example 8: Snapshots and Rollback ===')
  
  const stateManager = new IntegratedStateManager()
  
  // Set initial state
  stateManager.updateUIState({ photoCount: 5, totalScore: 1000 })
  console.log('Initial UI:', stateManager.getUIState())
  
  // Create snapshot
  const snapshot = stateManager.createSnapshot()
  console.log('Snapshot created')
  
  // Make changes
  stateManager.updateUIState({ photoCount: 10, totalScore: 2000 })
  console.log('Modified UI:', stateManager.getUIState())
  
  // Rollback to snapshot
  stateManager.restoreSnapshot(snapshot)
  console.log('After rollback:', stateManager.getUIState())
}

// ============================================================================
// Example 9: Flow State and Subsystem State Integration
// ============================================================================

export function example9_FlowAndSubsystemIntegration() {
  console.log('=== Example 9: Flow and Subsystem Integration ===')
  
  const stateManager = new IntegratedStateManager()
  
  // Start playing
  stateManager.setFlowState('playing')
  console.log('Audio playing:', stateManager.getAudioSystemState().isPlaying)
  console.log('Camera paused:', stateManager.getCameraState().isPaused)
  
  // Pause game
  stateManager.setFlowState('paused')
  console.log('After pause:')
  console.log('  Audio playing:', stateManager.getAudioSystemState().isPlaying)
  console.log('  Camera paused:', stateManager.getCameraState().isPaused)
  console.log('  Game loop paused:', stateManager.shouldPauseGameLoop())
  
  // Resume
  stateManager.setFlowState('playing')
  console.log('After resume:')
  console.log('  Audio playing:', stateManager.getAudioSystemState().isPlaying)
  console.log('  Camera paused:', stateManager.getCameraState().isPaused)
}

// ============================================================================
// Example 10: Complete Game Loop Integration
// ============================================================================

export function example10_GameLoopIntegration() {
  console.log('=== Example 10: Game Loop Integration ===')
  
  const stateManager = new IntegratedStateManager()
  const syncHelpers = createStateSyncHelpers(
    stateManager.getSubsystemStateManager()
  )
  
  // Simulate game loop
  let frameCount = 0
  const maxFrames = 5
  
  const gameLoop = (deltaTime: number) => {
    frameCount++
    
    // Update state machine
    stateManager.update(deltaTime)
    
    // Check if game loop should run
    if (stateManager.shouldPauseGameLoop()) {
      console.log('Game loop paused')
      return
    }
    
    // Simulate camera movement
    const camera = stateManager.getCameraState()
    stateManager.updateCameraState({
      position: {
        x: camera.position.x + 0.1,
        y: camera.position.y,
        z: camera.position.z,
      },
    })
    
    // Check for multiplayer sync (every 100ms)
    if (frameCount % 6 === 0) {
      const dirtySubsystems = stateManager.getDirtySubsystems()
      if (dirtySubsystems.length > 0) {
        console.log('Syncing to peers:', dirtySubsystems)
        const delta = syncHelpers.multiplayer.getStateDelta()
        // Send delta to peers...
        stateManager.markAllClean()
      }
    }
    
    console.log(`Frame ${frameCount}: Camera at`, camera.position)
    
    // Continue loop
    if (frameCount < maxFrames) {
      setTimeout(() => gameLoop(16), 16) // ~60fps
    }
  }
  
  // Start game
  stateManager.setFlowState('playing')
  gameLoop(16)
}

// ============================================================================
// Example 11: Debug Information
// ============================================================================

export function example11_DebugInfo() {
  console.log('=== Example 11: Debug Information ===')
  
  const stateManager = new IntegratedStateManager()
  
  // Make some changes
  stateManager.setFlowState('playing')
  stateManager.updateCameraState({ mode: 'freeroam' })
  stateManager.updateUIState({ photoCount: 3 })
  
  // Get debug info
  const debugInfo = stateManager.getDebugInfo()
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2))
  
  // Get history
  const history = stateManager.getHistory()
  console.log('Flow history:', history.flowHistory)
  console.log('Subsystem history:', history.subsystemHistory)
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  example1_BasicSetup()
  example2_UpdatingSubsystemStates()
  example3_StateChangeCallbacks()
  // example4_GameObjectIntegration() // Requires actual game objects
  example5_CreatureStateManagement()
  example6_MultiplayerSync()
  example7_DirtyTracking()
  example8_SnapshotsAndRollback()
  example9_FlowAndSubsystemIntegration()
  example10_GameLoopIntegration()
  example11_DebugInfo()
}

// Uncomment to run:
// runAllExamples()
