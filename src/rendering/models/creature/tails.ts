import type { Random } from '@core/types'
import { rangeInt } from '@systems/creatures/generator'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'

export function buildTails(
  rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  torso: THREE.Object3D
): THREE.Object3D[] {
  const tails: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.tailCount; i++) {
    const segments = 5 + rangeInt(rand, 0, 4)
    const group = new THREE.Group()
    let parent: THREE.Object3D = group

    switch (anatomy.tailType) {
      case 'fur':
      case 'scale': {
        // Mammal/reptile tail - tapered segments
        for (let s = 0; s < segments; s++) {
          const thickness = 0.12 * sizeMultiplier * (1 - s / segments)
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(thickness, 0.25 * sizeMultiplier, 6, 8),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          seg.position.z = -0.22 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
        break
      }
      case 'feather': {
        // Bird tail - fan shape at end
        for (let s = 0; s < segments; s++) {
          const thickness = 0.1 * sizeMultiplier * (1 - s / segments)
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(thickness, 0.2 * sizeMultiplier, 6, 8),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          seg.position.z = -0.18 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
        // Add tail fan
        const fan = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4 * sizeMultiplier, 0.3 * sizeMultiplier),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          })
        )
        fan.position.z = -0.15 * sizeMultiplier
        parent.add(fan)
        break
      }
      default: {
        // Default segmented tail
        for (let s = 0; s < segments; s++) {
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(
              0.12 * sizeMultiplier * (1 - s / segments),
              0.25 * sizeMultiplier,
              6,
              8
            ),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          seg.position.z = -0.22 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
      }
    }

    group.position.set(0, -0.2 * sizeMultiplier + rand() * 0.2, -0.6 * sizeMultiplier)
    torso.add(group)
    tails.push(group)
  }
  return tails
}

export function buildSpines(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  torso: THREE.Object3D,
  tails: THREE.Object3D[]
): THREE.Object3D[] {
  if (anatomy.spineCount === 0 || anatomy.spineType === 'none') return []
  const spines: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.spineCount; i++) {
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.04 * sizeMultiplier, 0.2 * sizeMultiplier, 4),
      new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.2 })
    )

    switch (anatomy.spineType) {
      case 'back': {
        // Spines along the back
        const t = i / (anatomy.spineCount - 1)
        spine.position.set(0, 0.5 * sizeMultiplier, (t - 0.5) * 1.2 * sizeMultiplier)
        spine.rotation.x = Math.PI * 0.1
        torso.add(spine)
        break
      }
      case 'neck': {
        // Spines along neck area
        const t = i / (anatomy.spineCount - 1)
        spine.position.set(0, 0.3 * sizeMultiplier + t * 0.4, 0.5 * sizeMultiplier)
        spine.rotation.x = -Math.PI * 0.2
        torso.add(spine)
        break
      }
      case 'tail': {
        // Spines along tail
        if (tails.length > 0) {
          const tail = tails[0]
          const t = i / (anatomy.spineCount - 1)
          spine.position.set(0, 0.1 * sizeMultiplier, -t * 0.3 * sizeMultiplier)
          tail.add(spine)
        }
        break
      }
    }

    spines.push(spine)
  }
  return spines
}
