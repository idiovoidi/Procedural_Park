/**
 * Example usage of object pooling for creatures and particles
 * 
 * This demonstrates how to use the pooling systems for better performance
 */

import * as THREE from 'three'
import { CreaturePool } from '@systems/creatures'
import { ParticleSystem } from '../particle-system'

export function setupPoolingExample(scene: THREE.Scene) {
  // Create creature pool
  const creaturePool = new CreaturePool(scene, 20, 100)

  // Spawn some creatures
  const creature1 = creaturePool.spawn(new THREE.Vector3(0, 0, 0))
  const creature2 = creaturePool.spawn(new THREE.Vector3(5, 0, 5))
  const creature3 = creaturePool.spawn(new THREE.Vector3(-5, 0, -5))

  console.log('Creature pool stats:', creaturePool.getStats())

  // Create particle system
  const particleSystem = new ParticleSystem(scene, 100, 500)

  // Emit some particles
  particleSystem.emitBurst('sparkle', new THREE.Vector3(0, 2, 0), 20)
  particleSystem.emitBurst('dust', new THREE.Vector3(3, 0, 3), 15)

  console.log('Particle system stats:', particleSystem.getStats())

  // Update loop example
  function update(dt: number, tSec: number, camera: THREE.Camera) {
    // Update creatures
    creaturePool.update(dt, tSec, camera)

    // Update particles
    particleSystem.update(dt)
  }

  // Cleanup example
  function cleanup() {
    // Despawn specific creature
    creaturePool.despawn(creature1)

    // Or despawn all
    creaturePool.despawnAll()

    // Clear particles
    particleSystem.clear()

    // Full cleanup
    creaturePool.clear()
    particleSystem.dispose()
  }

  return {
    creaturePool,
    particleSystem,
    update,
    cleanup,
  }
}

/**
 * Example: Dynamic creature spawning based on player position
 */
export function dynamicCreatureSpawning(
  scene: THREE.Scene,
  playerPosition: THREE.Vector3,
  creaturePool: CreaturePool
) {
  const spawnRadius = 50
  const maxCreatures = 30
  const spawnDistance = 40

  // Get current active creatures
  const activeCreatures = creaturePool.getAllInstances()

  // Despawn creatures that are too far
  activeCreatures.forEach((creature) => {
    const distance = creature.group.position.distanceTo(playerPosition)
    if (distance > spawnRadius) {
      // Find the pooled creature wrapper
      // Note: In real implementation, you'd need to track the mapping
      console.log('Creature too far, despawning...')
    }
  })

  // Spawn new creatures if under limit
  if (activeCreatures.length < maxCreatures) {
    const angle = Math.random() * Math.PI * 2
    const distance = spawnDistance + Math.random() * 10
    const spawnPos = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * distance,
      0,
      playerPosition.z + Math.sin(angle) * distance
    )

    creaturePool.spawn(spawnPos)
  }
}

/**
 * Example: Particle effects for creature interactions
 */
export function creatureParticleEffects(
  particleSystem: ParticleSystem,
  creaturePosition: THREE.Vector3,
  interactionType: 'landing' | 'takeoff' | 'splash' | 'excited'
) {
  switch (interactionType) {
    case 'landing':
      particleSystem.emitBurst('dust', creaturePosition, 10)
      break

    case 'takeoff':
      particleSystem.emitBurst('feather', creaturePosition, 5)
      particleSystem.emitBurst('dust', creaturePosition, 8)
      break

    case 'splash':
      particleSystem.emitBurst('splash', creaturePosition, 15, {
        velocity: new THREE.Vector3(0, 3, 0),
      })
      break

    case 'excited':
      particleSystem.emitBurst('sparkle', creaturePosition.clone().add(new THREE.Vector3(0, 1, 0)), 12)
      break
  }
}

/**
 * Example: Performance monitoring
 */
export function monitorPoolingPerformance(
  creaturePool: CreaturePool,
  particleSystem: ParticleSystem
) {
  const stats = {
    creatures: creaturePool.getStats(),
    particles: particleSystem.getStats(),
  }

  console.log('=== Pooling Performance ===')
  console.log('Creatures:', stats.creatures)
  console.log('Particles:', stats.particles)
  console.log('Total objects managed:', stats.creatures.total + stats.particles.total)
  console.log('Memory saved by pooling:', 
    `${((stats.creatures.pooled + stats.particles.pooled) / 
       (stats.creatures.total + stats.particles.total) * 100).toFixed(1)}%`)

  return stats
}
