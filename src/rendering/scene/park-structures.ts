import { disposeThreeObject } from '@core/utils'
import * as THREE from 'three'
import { buildBoundaryFence } from './structures/boundary-fence'
import { buildEntrancePlaza } from './structures/entrance-plaza'
import { buildExperimentLab, drawLabSignText, type LabSign } from './structures/experiment-lab'
import { buildFoodStore } from './structures/food-store'
import { buildMainGate } from './structures/main-gate'
import { buildRangerStation } from './structures/ranger-station'

export class ParkStructures {
  private scene: THREE.Scene
  private structures: THREE.Group
  private labSign: LabSign | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.structures = new THREE.Group()
    this.structures.name = 'ParkStructures'
    this.scene.add(this.structures)
  }

  public buildAll() {
    this.structures.add(
      buildMainGate(),
      buildBoundaryFence(),
      buildEntrancePlaza(),
      buildRangerStation(),
      this.buildLab(),
      buildFoodStore()
    )
  }

  private buildLab(): THREE.Group {
    const { group, sign } = buildExperimentLab()
    this.labSign = sign
    return group
  }

  public update(time: number) {
    // Animate fountain water
    const water = this.structures
      .getObjectByName('EntrancePlaza')
      ?.children.find(
        (child) =>
          child instanceof THREE.Mesh &&
          (child.material as THREE.MeshStandardMaterial).color?.getHex() === 0x4488ff
      )
    if (water) {
      water.position.y = 1.2 + Math.sin(time * 2) * 0.1
    }

    // Pulse lanterns at gate
    const mainGate = this.structures.getObjectByName('MainGate')
    if (mainGate) {
      mainGate.children.forEach((child) => {
        if (
          child instanceof THREE.Mesh &&
          (child.material as THREE.MeshStandardMaterial).emissive
        ) {
          const material = child.material as THREE.MeshStandardMaterial
          material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.2
        }
      })
    }

    // Animate ranger station flag
    const rangerStation = this.structures.getObjectByName('RangerStation')
    if (rangerStation) {
      const flag = rangerStation.children.find(
        (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry
      )
      if (flag) {
        flag.rotation.y = Math.sin(time * 2) * 0.15
      }
    }
  }

  public getStructures(): THREE.Group {
    return this.structures
  }

  public getLabPosition(): THREE.Vector3 {
    const lab = this.structures.getObjectByName('ExperimentLab')
    // Position creature higher in the dome (Y=3.5 instead of 1.5)
    const basePos = lab ? lab.position.clone() : new THREE.Vector3(-35, 0, -20)
    basePos.y = 3.5
    return basePos
  }

  public updateLabSign(creatureName: string) {
    if (this.labSign) drawLabSignText(this.labSign, creatureName)
  }

  public getFoodStorePosition(): THREE.Vector3 {
    const store = this.structures.getObjectByName('FoodStore')
    return store ? store.position.clone() : new THREE.Vector3(-25, 0, 40)
  }

  public dispose(): void {
    if (this.labSign) {
      this.labSign.texture.dispose()
      this.labSign = null
    }
    disposeThreeObject(this.structures)
    this.scene.remove(this.structures)
  }
}
