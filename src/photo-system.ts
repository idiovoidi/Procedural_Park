import * as THREE from 'three'
import type { CreatureInstance } from './creatures'

export interface PhotoResult {
  score: number
  creature: CreatureInstance | null
  creatureName: string
}

export interface PhotoCallbacks {
  onShutter?: () => void
  onFocus?: () => void
  onScore?: (score: number) => void
}

export class PhotoSystem {
  private raycaster = new THREE.Raycaster()
  private callbacks: PhotoCallbacks = {}

  constructor() {}

  public setCallbacks(callbacks: PhotoCallbacks) {
    this.callbacks = callbacks
  }

  private objectBelongsToGroup(obj: THREE.Object3D, group: THREE.Group): boolean {
    let o: THREE.Object3D | null = obj
    while (o) {
      if (o === group) return true
      o = o.parent
    }
    return false
  }

  private scoreCreature(creature: CreatureInstance, camera: THREE.Camera): number {
    // Project to NDC (Normalized Device Coordinates)
    const v = creature.group.position.clone().project(camera)
    const centerBonus = 1.0 - Math.min(1, v.distanceTo(new THREE.Vector3(0, 0, 0)))
    
    const dist = camera.position.distanceTo(creature.group.position)
    const sizeBonus = Math.max(0, 1.2 - dist / 20)
    
    // Facing: dot between forward and vector to camera
    const toCam = new THREE.Vector3().subVectors(camera.position, creature.group.position).normalize()
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(creature.group.quaternion)
    const facing = Math.max(0, forward.dot(toCam))
    
    const rarityBonus = 0.5 + creature.rarity
    const score = Math.round((centerBonus * 40 + sizeBonus * 35 + facing * 25) * rarityBonus)
    
    return Math.max(0, score)
  }

  public generateCreatureName(creature: CreatureInstance): string {
    // Generate a fun creature name based on its properties
    const prefixes = ['Sparkle', 'Fluffy', 'Crystal', 'Shadow', 'Mystic', 'Glowing', 'Swift', 'Gentle', 'Wild', 'Cosmic']
    const suffixes = ['wing', 'tail', 'eye', 'horn', 'fin', 'claw', 'beam', 'song', 'dance', 'spirit']
    
    // Use creature's rarity and position to determine name
    const seed = Math.floor(creature.rarity * 1000) + Math.floor(creature.group.position.x * 10)
    const prefixIndex = seed % prefixes.length
    const suffixIndex = Math.floor(seed / prefixes.length) % suffixes.length
    
    return `${prefixes[prefixIndex]}${suffixes[suffixIndex]}`
  }

  public takePhoto(
    creatures: CreatureInstance[], 
    camera: THREE.Camera, 
    scene: THREE.Scene
  ): PhotoResult {
    // Find the best creature in view (close to center and visible)
    let best: { c: CreatureInstance, score: number } | null = null
    
    for (const c of creatures) {
      // Quick visibility test
      const clipPos = c.group.position.clone().project(camera)
      if (Math.abs(clipPos.x) > 1 || Math.abs(clipPos.y) > 1 || clipPos.z > 1 || clipPos.z < -1) {
        continue
      }
      
      // Raycast occlusion check (first hit must belong to this creature)
      this.raycaster.setFromCamera(new THREE.Vector2(clipPos.x, clipPos.y), camera)
      const hits = this.raycaster.intersectObjects(scene.children, true)
      if (hits.length && !this.objectBelongsToGroup(hits[0].object, c.group)) {
        continue
      }
      
      const s = this.scoreCreature(c, camera)
      if (!best || s > best.score) {
        best = { c, score: s }
      }
    }

    const score = best?.score ?? 0
    const creature = best?.c ?? null
    const creatureName = creature ? this.generateCreatureName(creature) : 'Unknown'

    // Trigger audio callbacks
    this.callbacks.onShutter?.()
    if (score > 0) {
      this.callbacks.onScore?.(score)
    }

    // Make creatures react to the shutter
    for (const c of creatures) {
      c.reactToPhoto?.()
    }

    return { score, creature, creatureName }
  }

  public getPhotoQualityDescription(score: number): string {
    if (score >= 90) return 'Perfect Shot!'
    if (score >= 80) return 'Excellent!'
    if (score >= 70) return 'Great Shot!'
    if (score >= 60) return 'Good Photo'
    if (score >= 40) return 'Nice Try'
    if (score >= 20) return 'Could be Better'
    if (score > 0) return 'Needs Work'
    return 'No Subject'
  }

  public getScoreBreakdown(creature: CreatureInstance, camera: THREE.Camera): {
    centering: number
    size: number
    facing: number
    rarity: number
    total: number
  } {
    const v = creature.group.position.clone().project(camera)
    const centerBonus = 1.0 - Math.min(1, v.distanceTo(new THREE.Vector3(0, 0, 0)))
    
    const dist = camera.position.distanceTo(creature.group.position)
    const sizeBonus = Math.max(0, 1.2 - dist / 20)
    
    const toCam = new THREE.Vector3().subVectors(camera.position, creature.group.position).normalize()
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(creature.group.quaternion)
    const facing = Math.max(0, forward.dot(toCam))
    
    const rarityBonus = 0.5 + creature.rarity
    
    const centering = Math.round(centerBonus * 40 * rarityBonus)
    const size = Math.round(sizeBonus * 35 * rarityBonus)
    const facingScore = Math.round(facing * 25 * rarityBonus)
    const total = Math.max(0, centering + size + facingScore)

    return {
      centering,
      size,
      facing: facingScore,
      rarity: Math.round(creature.rarity * 100),
      total
    }
  }
}
