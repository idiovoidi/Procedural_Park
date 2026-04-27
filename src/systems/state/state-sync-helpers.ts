/**
 * State Sync Helpers
 * Utilities for synchronizing subsystem state with actual game objects
 */

import type { CameraController } from '@systems/camera'
import type { UIManager } from '@ui/managers'
import type * as THREE from 'three'
import type { SubsystemStateManager } from './subsystem-state-manager'
import type { CameraState, CreatureState, UIState } from './subsystem-states'

/**
 * Camera State Synchronizer
 * Syncs CameraController with CameraState
 */
export class CameraStateSync {
  private camera: CameraController
  private stateManager: SubsystemStateManager

  constructor(camera: CameraController, stateManager: SubsystemStateManager) {
    this.camera = camera
    this.stateManager = stateManager
  }

  /**
   * Push camera state to state manager
   */
  public pushToState(): void {
    const pos = this.camera.camera.position
    const updates: Partial<CameraState> = {
      position: { x: pos.x, y: pos.y, z: pos.z },
    }
    this.stateManager.updateCameraState(updates)
  }

  /**
   * Pull camera state from state manager
   */
  public pullFromState(): void {
    const state = this.stateManager.getCameraState()

    // Update camera position
    this.camera.camera.position.set(state.position.x, state.position.y, state.position.z)
  }

  /**
   * Setup automatic sync on camera changes
   */
  public setupAutoSync(intervalMs: number = 100): () => void {
    const interval = setInterval(() => {
      this.pushToState()
    }, intervalMs)

    return () => clearInterval(interval)
  }
}

/**
 * UI State Synchronizer
 * Syncs UIManager with UIState
 */
export class UIStateSync {
  private ui: UIManager
  private stateManager: SubsystemStateManager

  constructor(ui: UIManager, stateManager: SubsystemStateManager) {
    this.ui = ui
    this.stateManager = stateManager
    this.setupListeners()
  }

  /**
   * Setup listeners for UI changes
   */
  private setupListeners(): void {
    // Listen for state changes and update UI
    this.stateManager.onSubsystemChange('ui', (event) => {
      const newState = event.newState as UIState
      this.updateUIFromState(newState)
    })
  }

  /**
   * Push UI state to state manager
   */
  public pushToState(): void {
    const updates: Partial<UIState> = {
      photoCount: this.ui.getPhotoCount(),
      totalScore: this.ui.getTotalScore(),
    }
    this.stateManager.updateUIState(updates)
  }

  /**
   * Update UI from state
   */
  private updateUIFromState(_state: UIState): void {
    // Update UI elements - implementation depends on UIManager API
    // This is a placeholder for actual UI update logic
  }
}

/**
 * Creature State Synchronizer
 * Syncs creature objects with CreatureState
 */
export class CreatureStateSync {
  private stateManager: SubsystemStateManager

  constructor(stateManager: SubsystemStateManager) {
    this.stateManager = stateManager
  }

  /**
   * Push creature to state
   */
  public pushCreature(
    id: string,
    mesh: THREE.Object3D,
    additionalData: Partial<CreatureState>
  ): void {
    const creatures = this.stateManager.getCreaturesState().creatures
    const newCreatures = new Map(creatures)

    const state: CreatureState = {
      id,
      name: additionalData.name || `Creature_${id}`,
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      rotation: mesh.rotation.y,
      behaviorState: additionalData.behaviorState || 'idle',
      animationTime: additionalData.animationTime || 0,
      isVisible: mesh.visible,
      rarity: additionalData.rarity || 1,
    }

    newCreatures.set(id, state)

    this.stateManager.updateCreaturesState({
      creatures: newCreatures,
      activeCount: newCreatures.size,
      lastUpdateTime: Date.now(),
    })
  }

  /**
   * Remove creature from state
   */
  public removeCreature(id: string): void {
    const creatures = this.stateManager.getCreaturesState().creatures
    const newCreatures = new Map(creatures)
    newCreatures.delete(id)

    this.stateManager.updateCreaturesState({
      creatures: newCreatures,
      activeCount: newCreatures.size,
      lastUpdateTime: Date.now(),
    })
  }

  private updateCreature(id: string, update: Partial<CreatureState>): void {
    const creatures = this.stateManager.getCreaturesState().creatures
    const creature = creatures.get(id)

    if (creature) {
      const newCreatures = new Map(creatures)
      newCreatures.set(id, { ...creature, ...update })

      this.stateManager.updateCreaturesState({
        creatures: newCreatures,
        lastUpdateTime: Date.now(),
      })
    }
  }

  /**
   * Update creature position
   */
  public updateCreaturePosition(id: string, position: THREE.Vector3): void {
    this.updateCreature(id, {
      position: { x: position.x, y: position.y, z: position.z },
    })
  }

  /**
   * Update creature behavior
   */
  public updateCreatureBehavior(id: string, behaviorState: CreatureState['behaviorState']): void {
    this.updateCreature(id, { behaviorState })
  }

  /**
   * Batch update all creatures
   */
  public batchUpdateCreatures(updates: Map<string, Partial<CreatureState>>): void {
    const creatures = this.stateManager.getCreaturesState().creatures
    const newCreatures = new Map(creatures)

    updates.forEach((update, id) => {
      const existing = newCreatures.get(id)
      if (existing) {
        newCreatures.set(id, { ...existing, ...update })
      }
    })

    this.stateManager.updateCreaturesState({
      creatures: newCreatures,
      lastUpdateTime: Date.now(),
    })
  }

  /**
   * Clear all creatures
   */
  public clearAllCreatures(): void {
    this.stateManager.updateCreaturesState({
      creatures: new Map(),
      activeCount: 0,
      lastUpdateTime: Date.now(),
    })
  }
}

/**
 * Multiplayer State Synchronizer
 * Handles state synchronization for multiplayer
 */
export class MultiplayerStateSync {
  private stateManager: SubsystemStateManager

  constructor(stateManager: SubsystemStateManager) {
    this.stateManager = stateManager
  }

  /**
   * Get state delta (only dirty subsystems)
   */
  public getStateDelta(): Partial<ReturnType<SubsystemStateManager['getState']>> {
    const dirtySubsystems = this.stateManager.getDirtySubsystems()
    const fullState = this.stateManager.getState()
    const delta: Record<string, unknown> = {}

    dirtySubsystems.forEach((subsystem) => {
      delta[subsystem] = fullState[subsystem]
    })

    delta.timestamp = fullState.timestamp

    return delta
  }

  /**
   * Apply state delta from peer
   */
  public applyStateDelta(delta: Partial<ReturnType<SubsystemStateManager['getState']>>): void {
    this.stateManager.batchUpdate(delta)
  }

  /**
   * Serialize state for network transmission
   */
  public serializeForNetwork(): ArrayBuffer {
    const json = this.stateManager.serialize()
    const encoder = new TextEncoder()
    return encoder.encode(json).buffer
  }

  /**
   * Deserialize state from network
   */
  public deserializeFromNetwork(buffer: ArrayBuffer): void {
    const decoder = new TextDecoder()
    const json = decoder.decode(buffer)
    this.stateManager.deserialize(json)
  }

  /**
   * Create lightweight sync packet (only essential data)
   */
  public createSyncPacket(): {
    camera: {
      position: { x: number; y: number; z: number }
      rotation: { yaw: number; pitch: number }
    }
    ui: { photoCount: number; totalScore: number }
    timestamp: number
  } {
    const camera = this.stateManager.getCameraState()
    const ui = this.stateManager.getUIState()

    return {
      camera: {
        position: camera.position,
        rotation: camera.rotation,
      },
      ui: {
        photoCount: ui.photoCount,
        totalScore: ui.totalScore,
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Apply sync packet from peer
   */
  public applySyncPacket(packet: ReturnType<MultiplayerStateSync['createSyncPacket']>): void {
    this.stateManager.updateMultiplayerState({
      peerPosition: packet.camera.position,
      peerRotation: packet.camera.rotation,
      lastSyncTime: packet.timestamp,
    })
  }
}

/**
 * Create all sync helpers
 */
export function createStateSyncHelpers(
  stateManager: SubsystemStateManager,
  camera?: CameraController,
  ui?: UIManager
) {
  return {
    camera: camera ? new CameraStateSync(camera, stateManager) : null,
    ui: ui ? new UIStateSync(ui, stateManager) : null,
    creatures: new CreatureStateSync(stateManager),
    multiplayer: new MultiplayerStateSync(stateManager),
  }
}
