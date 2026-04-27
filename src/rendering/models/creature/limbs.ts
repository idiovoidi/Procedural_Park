import { HALF_PI, TAU } from '@core/constants'
import type { Random } from '@core/types'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getLimbThicknessMultiplier, getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'

export function buildLimbs(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  torso: THREE.Object3D
): THREE.Object3D[] {
  const limbs: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  const limbThicknessMultiplier = getLimbThicknessMultiplier(anatomy.bodyType)

  for (let i = 0; i < anatomy.limbCount; i++) {
    const limbGroup = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: palette.accent,
      metalness: 0.1,
      roughness: 0.6,
    })

    switch (anatomy.limbType) {
      case 'leg': {
        // Two-segment leg (thigh + shin)
        const thighLength = 0.4 * sizeMultiplier * (anatomy.bodyType === 'lanky' ? 1.3 : 1.0)
        const shinLength = 0.35 * sizeMultiplier * (anatomy.bodyType === 'lanky' ? 1.3 : 1.0)
        const thickness = 0.08 * sizeMultiplier * limbThicknessMultiplier

        const thigh = new THREE.Mesh(
          new THREE.CapsuleGeometry(thickness, thighLength, 6, 8),
          material
        )
        thigh.position.y = -thighLength / 2

        const shin = new THREE.Mesh(
          new THREE.CapsuleGeometry(thickness * 0.8, shinLength, 6, 8),
          material
        )
        shin.position.y = -thighLength - shinLength / 2

        // Simple foot
        const foot = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.2, 8, 8), material)
        foot.scale.set(1.2, 0.6, 1.5)
        foot.position.y = -thighLength - shinLength

        limbGroup.add(thigh)
        limbGroup.add(shin)
        limbGroup.add(foot)
        break
      }
      case 'arm': {
        // Arm with hand
        const armLength = 0.5 * sizeMultiplier * (anatomy.bodyType === 'lanky' ? 1.2 : 1.0)
        const thickness = 0.07 * sizeMultiplier * limbThicknessMultiplier

        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(thickness, armLength, 6, 8), material)
        arm.position.y = -armLength / 2

        const hand = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.3, 8, 8), material)
        hand.position.y = -armLength

        limbGroup.add(arm)
        limbGroup.add(hand)
        break
      }
      case 'fin': {
        // Flat fin shape
        const finLength = 0.6 * sizeMultiplier
        const finWidth = 0.4 * sizeMultiplier

        const fin = new THREE.Mesh(
          new THREE.ConeGeometry(finWidth, finLength, 3),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        fin.rotation.x = HALF_PI
        limbGroup.add(fin)
        break
      }
      case 'tendril': {
        // Segmented tentacle
        const segments = 4
        let parent: THREE.Object3D = limbGroup
        for (let s = 0; s < segments; s++) {
          const seg = new THREE.Mesh(
            new THREE.CapsuleGeometry(
              0.05 * sizeMultiplier * (1 - s / segments),
              0.2 * sizeMultiplier,
              4,
              6
            ),
            material
          )
          seg.position.y = -0.18 * sizeMultiplier
          parent.add(seg)
          parent = seg
        }
        break
      }
      default: {
        const limb = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.08 * sizeMultiplier, 0.5 * sizeMultiplier, 6, 12),
          material
        )
        limbGroup.add(limb)
      }
    }

    // Position limbs around body
    const theta = (i / Math.max(1, anatomy.limbCount)) * TAU
    const radius = 0.5 * sizeMultiplier
    limbGroup.position.set(
      Math.cos(theta) * radius,
      -0.2 * sizeMultiplier,
      Math.sin(theta) * radius
    )

    // Angle limbs outward naturally
    limbGroup.rotation.z = Math.cos(theta) * 0.3
    limbGroup.rotation.x = Math.sin(theta) * 0.3

    limbs.push(limbGroup)
    ;(torso as THREE.Object3D).add(limbGroup)
  }
  return limbs
}
