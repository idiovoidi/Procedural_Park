import * as THREE from 'three'
import type { CreatureInstance } from './creatures'
import type { BiomeType } from './terrain-system'

export interface InteractionPoint {
  position: THREE.Vector3
  type: 'perch' | 'hide' | 'drink' | 'rest' | 'feed'
  biome: BiomeType
  occupied: boolean
  lastUsed: number
}

export class EnvironmentInteractions {
  private interactionPoints: InteractionPoint[] = []
  private scene: THREE.Scene
  private debugMode = false

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  public generateInteractionPoints(terrainSystem: any, seed: number = 123) {
    this.clearInteractionPoints()
    const rand = this.createRng(seed)
    
    // Generate interaction points based on terrain features
    for (let i = 0; i < 100; i++) {
      const x = (rand() - 0.5) * 180 // Stay within terrain bounds
      const z = (rand() - 0.5) * 180
      
      const height = terrainSystem.getHeightAt(x, z)
      const biome = terrainSystem.getBiomeAt(x, z)
      
      // Generate different types of interaction points based on biome and height
      const interactionTypes = this.getInteractionTypesForBiome(biome, height)
      
      if (interactionTypes.length > 0) {
        const type = interactionTypes[Math.floor(rand() * interactionTypes.length)]
        
        this.interactionPoints.push({
          position: new THREE.Vector3(x, height + this.getHeightOffset(type), z),
          type,
          biome,
          occupied: false,
          lastUsed: 0
        })
        
        if (this.debugMode) {
          this.createDebugMarker(x, height, z, type)
        }
      }
    }
  }

  private getInteractionTypesForBiome(biome: BiomeType, height: number): Array<'perch' | 'hide' | 'drink' | 'rest' | 'feed'> {
    const types: Array<'perch' | 'hide' | 'drink' | 'rest' | 'feed'> = []
    
    switch (biome) {
      case 'forest':
        types.push('perch', 'hide', 'rest', 'feed')
        if (height < 1) types.push('drink')
        break
      case 'meadow':
        types.push('rest', 'feed')
        if (height > 2) types.push('perch')
        break
      case 'rocky':
        types.push('perch', 'hide', 'rest')
        break
      case 'wetland':
        types.push('drink', 'hide', 'feed')
        if (height > 0.5) types.push('rest')
        break
      case 'crystal_cave':
        types.push('hide', 'rest', 'perch')
        break
      case 'floating_islands':
        types.push('perch', 'rest')
        break
    }
    
    return types
  }

  private getHeightOffset(type: string): number {
    switch (type) {
      case 'perch': return 2 + Math.random() * 3
      case 'hide': return 0.2
      case 'drink': return 0.1
      case 'rest': return 0.3
      case 'feed': return 0.2
      default: return 0.5
    }
  }

  public findNearestInteraction(
    creature: CreatureInstance, 
    interactionType: 'perch' | 'hide' | 'drink' | 'rest' | 'feed',
    maxDistance: number = 15
  ): InteractionPoint | null {
    let nearest: InteractionPoint | null = null
    let nearestDistance = maxDistance
    
    for (const point of this.interactionPoints) {
      if (point.type === interactionType && !point.occupied) {
        const distance = creature.group.position.distanceTo(point.position)
        if (distance < nearestDistance) {
          // Check if this interaction type is suitable for the creature's archetype
          if (this.isInteractionSuitableForCreature(creature, point)) {
            nearest = point
            nearestDistance = distance
          }
        }
      }
    }
    
    return nearest
  }

  private isInteractionSuitableForCreature(creature: CreatureInstance, point: InteractionPoint): boolean {
    const archetype = creature.anatomy.archetype
    
    switch (point.type) {
      case 'perch':
        return archetype === 'aerial' || (archetype === 'terrestrial' && creature.anatomy.limbCount >= 2)
      case 'hide':
        return creature.anatomy.temperament === 'shy' || creature.anatomy.size === 'tiny' || creature.anatomy.size === 'small'
      case 'drink':
        return archetype === 'terrestrial' || archetype === 'aquatic'
      case 'rest':
        return true // All creatures can rest
      case 'feed':
        return archetype === 'terrestrial' || archetype === 'aerial'
      default:
        return true
    }
  }

  public occupyInteraction(point: InteractionPoint, creature: CreatureInstance): boolean {
    if (!point.occupied) {
      point.occupied = true
      point.lastUsed = performance.now()
      return true
    }
    return false
  }

  public releaseInteraction(point: InteractionPoint): void {
    point.occupied = false
  }

  public updateCreatureBehavior(creature: CreatureInstance, deltaTime: number): void {
    const currentTime = performance.now() / 1000
    
    // Check if creature should look for an interaction
    if (creature.behaviorState === 'idle' && Math.random() < 0.02) {
      this.tryStartInteraction(creature)
    }
    
    // Handle current interactions
    if (creature.currentInteraction) {
      this.updateInteractionBehavior(creature, deltaTime, currentTime)
    }
  }

  private tryStartInteraction(creature: CreatureInstance): void {
    const possibleInteractions: Array<'perch' | 'hide' | 'drink' | 'rest' | 'feed'> = []
    
    // Determine which interactions this creature might want based on its traits
    if (creature.anatomy.archetype === 'aerial' && Math.random() < 0.4) {
      possibleInteractions.push('perch')
    }
    if (creature.anatomy.temperament === 'shy' && Math.random() < 0.3) {
      possibleInteractions.push('hide')
    }
    if ((creature.anatomy.archetype === 'terrestrial' || creature.anatomy.archetype === 'aquatic') && Math.random() < 0.2) {
      possibleInteractions.push('drink')
    }
    if (Math.random() < 0.3) {
      possibleInteractions.push('rest')
    }
    if (Math.random() < 0.25) {
      possibleInteractions.push('feed')
    }
    
    if (possibleInteractions.length > 0) {
      const desiredInteraction = possibleInteractions[Math.floor(Math.random() * possibleInteractions.length)]
      const interactionPoint = this.findNearestInteraction(creature, desiredInteraction)
      
      if (interactionPoint && this.occupyInteraction(interactionPoint, creature)) {
        creature.currentInteraction = interactionPoint
        creature.interactionStartTime = performance.now() / 1000
        this.setCreatureBehaviorForInteraction(creature, desiredInteraction)
      }
    }
  }

  private setCreatureBehaviorForInteraction(creature: CreatureInstance, interactionType: string): void {
    switch (interactionType) {
      case 'perch':
        creature.behaviorState = 'perching'
        break
      case 'hide':
        creature.behaviorState = 'hiding'
        break
      case 'drink':
        creature.behaviorState = 'drinking'
        break
      case 'rest':
        creature.behaviorState = 'resting'
        break
      case 'feed':
        creature.behaviorState = 'feeding'
        break
    }
  }

  private updateInteractionBehavior(creature: CreatureInstance, deltaTime: number, currentTime: number): void {
    if (!creature.currentInteraction || !creature.interactionStartTime) return
    
    const interactionDuration = currentTime - creature.interactionStartTime
    const targetPosition = creature.currentInteraction.position
    const currentPosition = creature.group.position
    
    // Move towards interaction point if not there yet
    const distanceToTarget = currentPosition.distanceTo(targetPosition)
    if (distanceToTarget > 0.5) {
      const direction = targetPosition.clone().sub(currentPosition).normalize()
      const moveSpeed = 2.0 * deltaTime
      creature.group.position.add(direction.multiplyScalar(moveSpeed))
    } else {
      // Apply interaction-specific animations and behaviors
      this.applyInteractionAnimation(creature, deltaTime)
      
      // Check if interaction should end
      const maxDuration = this.getInteractionDuration(creature.currentInteraction.type)
      if (interactionDuration > maxDuration || Math.random() < 0.01) {
        this.endInteraction(creature)
      }
    }
  }

  private applyInteractionAnimation(creature: CreatureInstance, deltaTime: number): void {
    if (!creature.currentInteraction) return
    
    const time = performance.now() / 1000
    
    switch (creature.currentInteraction.type) {
      case 'perch':
        // Reduce floating motion, more stable
        creature.group.position.y = creature.currentInteraction.position.y + Math.sin(time * 0.5) * 0.1
        creature.group.rotation.y += deltaTime * 0.2 // Slow turning to look around
        break
        
      case 'hide':
        // Crouch down, reduce visibility
        creature.group.scale.y = 0.7
        creature.group.position.y = creature.currentInteraction.position.y - 0.2
        break
        
      case 'drink':
        // Lean forward animation
        creature.group.rotation.x = Math.sin(time * 2) * 0.2 - 0.1
        break
        
      case 'rest':
        // Slower, calmer breathing animation
        const restScale = 1 + Math.sin(time * 0.8) * 0.05
        creature.group.scale.setScalar(restScale)
        break
        
      case 'feed':
        // Pecking or grazing motion
        creature.group.rotation.x = Math.sin(time * 4) * 0.15
        creature.group.position.y = creature.currentInteraction.position.y + Math.abs(Math.sin(time * 4)) * 0.1
        break
    }
  }

  private getInteractionDuration(type: string): number {
    switch (type) {
      case 'perch': return 8 + Math.random() * 12
      case 'hide': return 5 + Math.random() * 10
      case 'drink': return 3 + Math.random() * 4
      case 'rest': return 10 + Math.random() * 15
      case 'feed': return 6 + Math.random() * 8
      default: return 5
    }
  }

  private endInteraction(creature: CreatureInstance): void {
    if (creature.currentInteraction) {
      this.releaseInteraction(creature.currentInteraction)
      creature.currentInteraction = null
      creature.interactionStartTime = null
    }
    
    // Reset any animation changes
    creature.group.scale.setScalar(1)
    creature.group.rotation.x = 0
    creature.behaviorState = 'idle'
  }

  private createDebugMarker(x: number, y: number, z: number, type: string): void {
    const colors = {
      perch: 0x00ff00,
      hide: 0xff0000,
      drink: 0x0000ff,
      rest: 0xffff00,
      feed: 0xff00ff
    }
    
    const geometry = new THREE.SphereGeometry(0.2)
    const material = new THREE.MeshBasicMaterial({ 
      color: colors[type as keyof typeof colors] || 0xffffff,
      transparent: true,
      opacity: 0.7
    })
    const marker = new THREE.Mesh(geometry, material)
    marker.position.set(x, y + this.getHeightOffset(type), z)
    this.scene.add(marker)
  }

  private clearInteractionPoints(): void {
    this.interactionPoints = []
  }

  private createRng(seed: number): () => number {
    let state = seed >>> 0
    return () => (state = Math.imul(1664525, state) + 1013904223 >>> 0) / 0xffffffff
  }

  public getInteractionPoints(): InteractionPoint[] {
    return this.interactionPoints
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
  }
}

// Type extensions are now handled in creatures.ts
