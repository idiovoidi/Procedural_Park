import { ObjectPool } from '@core/utils'
import { createRng } from '@systems/terrain/noise-utils'
import type * as THREE from 'three'
import { spawnCreatureAt } from './creature-builder'
import { generateAnatomy } from './creature-generator'
import type { CreatureInstance } from './types'

/**
 * Pooled creature wrapper that can be reused
 */
export class PooledCreature {
  public instance: CreatureInstance | null = null
  public active: boolean = false

  public init(scene: THREE.Scene, position: THREE.Vector3, seed: number): void {
    const rand = createRng(seed)
    const anatomy = generateAnatomy(rand)
    this.instance = spawnCreatureAt(scene, position, rand, anatomy)
    this.active = true
  }

  public reset(scene: THREE.Scene): void {
    if (this.instance) {
      scene.remove(this.instance.group)
      this.instance = null
    }
    this.active = false
  }

  public update(
    dt: number,
    tSec: number,
    camera?: THREE.Camera,
    allCreatures?: CreatureInstance[]
  ): void {
    if (this.active && this.instance) {
      this.instance.update(dt, tSec, camera, allCreatures)
    }
  }
}

/**
 * Creature pool manager for efficient creature spawning/despawning
 */
export class CreaturePool {
  private scene: THREE.Scene
  private pool: ObjectPool<PooledCreature>
  private activeCreatures: Set<PooledCreature> = new Set()
  private seedCounter: number = 0

  constructor(scene: THREE.Scene, initialSize: number = 20, maxSize: number = 100) {
    this.scene = scene
    this.pool = new ObjectPool<PooledCreature>(
      () => new PooledCreature(),
      (creature) => creature.reset(this.scene),
      initialSize,
      maxSize
    )
  }

  /**
   * Spawn a creature at a specific position
   */
  public spawn(position: THREE.Vector3, seed?: number): PooledCreature {
    const creature = this.pool.get()
    const useSeed = seed ?? this.seedCounter++
    creature.init(this.scene, position, useSeed)
    this.activeCreatures.add(creature)
    return creature
  }

  /**
   * Despawn a creature and return it to the pool
   */
  public despawn(creature: PooledCreature): void {
    if (this.activeCreatures.has(creature)) {
      this.activeCreatures.delete(creature)
      this.pool.release(creature)
    }
  }

  /**
   * Despawn all creatures
   */
  public despawnAll(): void {
    this.activeCreatures.forEach((creature) => {
      this.pool.release(creature)
    })
    this.activeCreatures.clear()
  }

  /**
   * Update all active creatures
   */
  public update(dt: number, tSec: number, camera?: THREE.Camera): void {
    const allInstances = this.getAllInstances()
    this.activeCreatures.forEach((creature) => {
      creature.update(dt, tSec, camera, allInstances)
    })
  }

  /**
   * Get all active creature instances
   */
  public getAllInstances(): CreatureInstance[] {
    const instances: CreatureInstance[] = []
    this.activeCreatures.forEach((creature) => {
      if (creature.instance) {
        instances.push(creature.instance)
      }
    })
    return instances
  }

  /**
   * Get active creature count
   */
  public getActiveCount(): number {
    return this.activeCreatures.size
  }

  /**
   * Get pool statistics
   */
  public getStats() {
    return {
      active: this.activeCreatures.size,
      pooled: this.pool.getAvailableCount(),
      total: this.pool.size(),
    }
  }

  /**
   * Clear all creatures and reset pool
   */
  public clear(): void {
    this.despawnAll()
    this.pool.clear()
  }
}
