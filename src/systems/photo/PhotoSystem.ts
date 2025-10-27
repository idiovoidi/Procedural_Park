import * as THREE from 'three'
import type { CreatureInstance } from '@systems/creatures'
import { scoreCreature, generateCreatureName, getPhotoQualityDescription, getScoreBreakdown } from './scoring'
import type { PhotoResult, PhotoCallbacks, ScoreBreakdown } from './types'

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

  public generateCreatureName(creature: CreatureInstance): string {
    return generateCreatureName(creature)
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
      
      const s = scoreCreature(c, camera)
      if (!best || s > best.score) {
        best = { c, score: s }
      }
    }

    const score = best?.score ?? 0
    const creature = best?.c ?? null
    const creatureName = creature ? generateCreatureName(creature) : 'Unknown'

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
    return getPhotoQualityDescription(score)
  }

  public getScoreBreakdown(creature: CreatureInstance, camera: THREE.Camera): ScoreBreakdown {
    return getScoreBreakdown(creature, camera)
  }
}
