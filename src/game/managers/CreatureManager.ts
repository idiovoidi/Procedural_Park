/**
 * CreatureManager
 * Manages creature spawning, updates, and lifecycle
 */

import { GAME_CONFIG } from '@core/constants'
import { disposeThreeObject } from '@core/utils'
import type { ParkStructures } from '@rendering/scene'
import type { AudioManager } from '@systems/audio'
import type { CameraController } from '@systems/camera'
import {
  type CreatureInstance,
  type Genome,
  generateGenome,
  generateSpeciesName,
  hashSeed,
  spawnCreatureAt,
  spawnCreatureNearPath,
} from '@systems/creatures'
import type { IntegratedStateManager } from '@systems/state'
import { WATER_LEVEL } from '@systems/terrain/terrain-height'
import type { UIManager } from '@ui/managers'
import * as THREE from 'three'

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
  private groundHeightAt?: (x: number, z: number) => number

  constructor(
    scene: THREE.Scene,
    curve: THREE.CatmullRomCurve3,
    audioManager: AudioManager,
    camera: CameraController,
    uiManager: UIManager,
    stateManager: IntegratedStateManager,
    parkStructures: ParkStructures,
    groundHeightAt?: (x: number, z: number) => number
  ) {
    this.scene = scene
    this.curve = curve
    this.audioManager = audioManager
    this.camera = camera
    this.uiManager = uiManager
    this.stateManager = stateManager
    this.parkStructures = parkStructures
    this.groundHeightAt = groundHeightAt
  }

  /**
   * Spawn all creatures in the world
   */
  public spawnCreatures(): void {
    // Each creature has its own seed, so adding or removing one never reshuffles the rest
    this.creatures = Array.from({ length: GAME_CONFIG.CREATURE_COUNT }, (_, index) => {
      const genome = generateGenome(hashSeed(GAME_CONFIG.WORLD_SEED, index))
      return spawnCreatureNearPath(this.scene, this.curve, genome, {
        groundHeightAt: this.groundHeightAt,
      })
    })

    // Update creatures state
    this.syncCreaturesToState()
  }

  /**
   * Fill the world with a map's wild founders instead of the hub's, scattered around `centre`.
   * Founders keep the order of `genomes`, so the same map always looks the same.
   */
  public spawnFounders(genomes: Genome[], centre: { x: number; z: number }): void {
    this.clearWild()
    const height = this.groundHeightAt
    this.creatures = genomes.map((genome) => {
      // A spiral of spots, nudged off water, so founders spread out around the arrival point.
      let x = centre.x
      let z = centre.z
      for (let attempt = 0; attempt < 6; attempt++) {
        const angle = (hashSeed(genome.seed, attempt, 1) % 6283) / 1000
        const radius = 14 + ((hashSeed(genome.seed, attempt, 2) % 1000) / 1000) * 70
        x = centre.x + Math.cos(angle) * radius
        z = centre.z + Math.sin(angle) * radius
        if (!height || height(x, z) > WATER_LEVEL + 0.3) break
      }
      return spawnCreatureAt(this.scene, new THREE.Vector3(x, height?.(x, z) ?? 0, z), genome, {
        groundHeightAt: height,
      })
    })
    this.syncCreaturesToState()
  }

  /** Put the hub's own wild creatures back (after an expedition). */
  public restoreHubWild(): void {
    this.clearWild()
    this.spawnCreatures()
  }

  /** Remove the wild creatures only, leaving the lab's experiment creature alone. */
  private clearWild(): void {
    for (const creature of this.creatures) {
      this.scene.remove(creature.group)
      disposeThreeObject(creature.group)
    }
    this.creatures = []
  }

  /**
   * Spawn experiment creature in lab
   */
  public spawnExperimentCreature(): void {
    const labPosition = this.parkStructures.getLabPosition()
    const genome = generateGenome(Math.floor(Math.random() * 0x7fffffff))

    this.experimentCreature = spawnCreatureAt(this.scene, labPosition, genome)
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
    return this.experimentCreature ? [...this.creatures, this.experimentCreature] : this.creatures
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
   * Take one wild creature out of the world (e.g. once it has been crated) and free its
   * resources. Returns false if it isn't one of the regular creatures.
   */
  public removeCreature(creature: CreatureInstance): boolean {
    const index = this.creatures.indexOf(creature)
    if (index < 0) return false
    this.creatures.splice(index, 1)
    this.scene.remove(creature.group)
    disposeThreeObject(creature.group)
    return true
  }

  /**
   * Clear all creatures from scene and dispose resources
   */
  public clearCreatures(): void {
    for (const creature of this.creatures) {
      this.scene.remove(creature.group)
      disposeThreeObject(creature.group)
    }
    this.creatures = []

    if (this.experimentCreature) {
      this.scene.remove(this.experimentCreature.group)
      disposeThreeObject(this.experimentCreature.group)
      this.experimentCreature = null
    }
  }

  /**
   * Dispose all creature resources
   */
  public dispose(): void {
    this.clearCreatures()
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
      const distance = this.camera.camera.position.distanceTo(
        this.experimentCreature.group.position
      )
      if (distance < GAME_CONFIG.CREATURE_INFO_DISTANCE && distance < closestDistance) {
        closestCreature = this.experimentCreature
      }
    }

    // Update UI
    if (closestCreature) {
      const distance = this.camera.camera.position.distanceTo(closestCreature.group.position)
      const name = generateSpeciesName(closestCreature.genome)
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
    // Update creatures state
    this.stateManager.updateCreaturesState({
      activeCount: this.creatures.length,
      lastUpdateTime: Date.now(),
    })
  }
}
