/**
 * CreatureManager
 * Manages creature spawning, updates, and lifecycle
 */

import * as THREE from 'three'
import {
  createRng,
  spawnCreatureNearPath,
  spawnCreatureAt,
  type CreatureInstance,
  generateAnatomy,
} from '@systems/creatures'
import { GAME_CONFIG } from '@core/constants'
import type { AudioManager } from '@systems/audio'
import type { CameraController } from '@systems/camera'
import type { UIManager } from '@ui/managers'
import type { IntegratedStateManager } from '@systems/state'
import type { ParkStructures } from '@rendering/scene'

export class CreatureManager {
  private creatures: CreatureInstance[] = []
  private experimentCreature: CreatureInstance | null = null
  private scene: THREE.Scene
  private curve: THREE.CatmullRomCurve3
  private audioManager: AudioManager
  private camera: CameraController
  private uiManager: UIManager
  private stateManager: IntegratedStateManager
  private parkStructures: ParkStructures

  constructor(
    scene: THREE.Scene,
    curve: THREE.CatmullRomCurve3,
    audioManager: AudioManager,
    camera: CameraController,
    uiManager: UIManager,
    stateManager: IntegratedStateManager,
    parkStructures: ParkStructures
  ) {
    this.scene = scene
    this.curve = curve
    this.audioManager = audioManager
    this.camera = camera
    this.uiManager = uiManager
    this.stateManager = stateManager
    this.parkStructures = parkStructures
  }

  /**
   * Spawn all creatures in the world
   */
  public spawnCreatures(): void {
    const randWorld = createRng(GAME_CONFIG.WORLD_SEED)
    this.creatures = Array.from({ length: GAME_CONFIG.CREATURE_COUNT }, () => {
      const anatomy = generateAnatomy(randWorld)
      return spawnCreatureNearPath(this.scene, this.curve, randWorld, anatomy)
    })

    // Update creatures state
    this.syncCreaturesToState()
  }

  /**
   * Spawn experiment creature in lab
   */
  public spawnExperimentCreature(): void {
    const labPosition = this.parkStructures.getLabPosition()
    const rand = createRng(Math.random() * 100000)
    const anatomy = generateAnatomy(rand)

    this.experimentCreature = spawnCreatureAt(this.scene, labPosition, rand, anatomy)
  }

  /**
   * Update all creatures
   */
  public update(dtSeconds: number, now: number): void {
    // Update regular creatures
    for (const creature of this.creatures) {
      const oldBehavior = creature.behaviorState

      creature.update(dtSeconds, now, this.camera.camera, this.creatures)

      // Play creature sounds based on behavior changes
      if (oldBehavior !== creature.behaviorState) {
        this.playCreatureBehaviorSound(creature)
      }
    }

    // Update experiment creature
    if (this.experimentCreature) {
      this.experimentCreature.update(dtSeconds, now, this.camera.camera, [])
    }

    // Find closest creature in view for info display
    this.updateCreatureInfo()
  }

  /**
   * Get all creatures including experiment creature
   */
  public getAllCreatures(): CreatureInstance[] {
    return this.experimentCreature
      ? [...this.creatures, this.experimentCreature]
      : this.creatures
  }

  /**
   * Get regular creatures only
   */
  public getCreatures(): CreatureInstance[] {
    return this.creatures
  }

  /**
   * Get experiment creature
   */
  public getExperimentCreature(): CreatureInstance | null {
    return this.experimentCreature
  }

  /**
   * Clear all creatures from scene
   */
  public clearCreatures(): void {
    for (const creature of this.creatures) {
      this.scene.remove(creature.group)
      // TODO: Dispose geometries and materials
    }
    this.creatures = []

    if (this.experimentCreature) {
      this.scene.remove(this.experimentCreature.group)
      this.experimentCreature = null
    }
  }

  /**
   * Respawn all creatures
   */
  public respawnCreatures(): void {
    this.clearCreatures()
    this.spawnCreatures()
    this.spawnExperimentCreature()
  }

  /**
   * Play sound based on creature behavior
   */
  private playCreatureBehaviorSound(creature: CreatureInstance): void {
    const position = creature.group.position
    const distance = this.camera.camera.position.distanceTo(position)

    // Only play sounds for creatures within reasonable distance
    if (distance > GAME_CONFIG.MAX_CREATURE_DISTANCE) return

    const volume =
      Math.max(GAME_CONFIG.AUDIO_CREATURE_MIN, 1 - distance / GAME_CONFIG.MAX_CREATURE_DISTANCE) *
      GAME_CONFIG.AUDIO_CREATURE_BASE

    switch (creature.behaviorState) {
      case 'curious':
        if (creature.anatomy.archetype === 'aerial') {
          this.audioManager.playSoundEffect('creature_chirp', volume, position)
        }
        break
      case 'territorial':
        if (creature.anatomy.temperament === 'aggressive') {
          this.audioManager.playSoundEffect('creature_growl', volume, position)
        }
        break
      case 'playing':
        if (creature.anatomy.archetype === 'aerial' && creature.anatomy.wingCount > 0) {
          this.audioManager.playSoundEffect('creature_flutter', volume, position)
        }
        break
      case 'shy':
        if (creature.anatomy.archetype === 'aquatic') {
          this.audioManager.playSoundEffect('creature_splash', volume * 0.6, position)
        }
        break
    }
  }

  /**
   * Update creature info display
   */
  private updateCreatureInfo(): void {
    let closestCreature: CreatureInstance | null = null
    let closestDistance = Infinity

    // Check regular creatures
    for (const creature of this.creatures) {
      const distance = this.camera.camera.position.distanceTo(creature.group.position)

      if (distance < GAME_CONFIG.CREATURE_INFO_DISTANCE) {
        if (distance < closestDistance) {
          closestDistance = distance
          closestCreature = creature
        }
      }
    }

    // Check experiment creature
    if (this.experimentCreature) {
      const distance = this.camera.camera.position.distanceTo(this.experimentCreature.group.position)
      if (distance < GAME_CONFIG.CREATURE_INFO_DISTANCE && distance < closestDistance) {
        closestCreature = this.experimentCreature
      }
    }

    // Update UI
    if (closestCreature) {
      const distance = this.camera.camera.position.distanceTo(closestCreature.group.position)
      const name = closestCreature.anatomy?.archetype || 'Unknown Creature'
      const rarity = closestCreature.rarity || 1
      this.uiManager.showCreatureInfo(name, distance, rarity)
    } else {
      this.uiManager.hideCreatureInfo()
    }
  }

  /**
   * Sync creatures to subsystem state
   */
  private syncCreaturesToState(): void {
    // TODO: Implement creature state sync when needed
    // Update creatures state
    this.stateManager.updateCreaturesState({
      activeCount: this.creatures.length,
      lastUpdateTime: Date.now(),
    })
  }
}
