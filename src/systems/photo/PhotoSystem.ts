import * as THREE from 'three'
import type { CreatureInstance } from '@systems/creatures'
import { scoreCreature, generateCreatureName, getPhotoQualityDescription, getScoreBreakdown } from './scoring'
import type { PhotoResult, PhotoCallbacks, ScoreBreakdown } from './types'
import { CreatureCardExporter } from './CreatureCardExporter'

export class PhotoSystem {
  private raycaster = new THREE.Raycaster()
  private callbacks: PhotoCallbacks = {}
  private cardExporter: CreatureCardExporter

  constructor() {
    this.cardExporter = new CreatureCardExporter()
  }

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

  /**
   * Find the best creature currently in view of the camera
   */
  private findBestCreature(
    creatures: CreatureInstance[],
    camera: THREE.Camera,
    scene: THREE.Scene
  ): { c: CreatureInstance; score: number } | null {
    let best: { c: CreatureInstance; score: number } | null = null

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

    return best
  }

  public takePhoto(
    creatures: CreatureInstance[],
    camera: THREE.Camera,
    scene: THREE.Scene
  ): PhotoResult {
    const best = this.findBestCreature(creatures, camera, scene)

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

  /**
   * Export creature card for the creature currently in view
   * Returns the captured creature data
   */
  public async exportCreatureCard(
    creatures: CreatureInstance[],
    camera: THREE.Camera,
    scene: THREE.Scene,
    worldSeed: number
  ): Promise<{ metadata: import('./CreatureCardExporter').CreatureCardMetadata; thumbnail: string } | null> {
    console.log('🔍 PhotoSystem.exportCreatureCard - Starting search')
    console.log('Total creatures:', creatures.length)

    const best = this.findBestCreature(creatures, camera, scene)

    console.log(`Checked ${creatures.length} creatures, ${best ? '1' : '0'} best found`)

    if (best) {
      console.log(`✅ Found best creature with score ${best.score}`)
      console.log('🎨 Calling cardExporter.exportCreatureCard...')
      const result = await this.cardExporter.exportCreatureCard(best.c, worldSeed)
      console.log(`✅ Card exported, result:`, result ? 'Success' : 'Failed')
      if (result) {
        console.log(`Creature name: ${result.metadata.creatureName}`)
        console.log(`Thumbnail length: ${result.thumbnail.length}`)
      }
      return result
    } else {
      console.warn('❌ No creature in view to export')
      return null
    }
  }

  public dispose(): void {
    this.cardExporter.dispose()
  }
}
