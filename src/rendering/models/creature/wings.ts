import { QUARTER_PI } from '@core/constants'
import type { Random } from '@core/types'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'

export function buildWings(
  rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  torso: THREE.Object3D
): THREE.Object3D[] {
  const wings: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.wingCount; i++) {
    const wingGroup = new THREE.Group()
    const side = i % 2 === 0 ? -1 : 1

    switch (anatomy.wingType) {
      case 'feather': {
        // Bird-like feathered wing with segments
        const wingLength = (1.0 + rand() * 0.3) * sizeMultiplier
        const wingWidth = (0.6 + rand() * 0.2) * sizeMultiplier

        // Main wing surface
        const mainWing = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength, wingWidth, 4, 2),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            metalness: 0.1,
            roughness: 0.6,
          })
        )
        mainWing.rotation.y = side * Math.PI * 0.15

        // Wing tip feathers
        const tipFeathers = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength * 0.4, wingWidth * 0.8, 2, 3),
          new THREE.MeshStandardMaterial({
            color: palette.base,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        tipFeathers.position.x = side * wingLength * 0.5
        tipFeathers.rotation.y = side * Math.PI * 0.2

        wingGroup.add(mainWing)
        wingGroup.add(tipFeathers)
        break
      }
      case 'membrane': {
        // Bat-like membrane wing
        const wingLength = (0.9 + rand() * 0.3) * sizeMultiplier
        const wingWidth = (0.5 + rand() * 0.2) * sizeMultiplier

        const membrane = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength, wingWidth, 3, 2),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            metalness: 0.2,
            roughness: 0.5,
          })
        )

        // Wing bones/fingers
        for (let b = 0; b < 3; b++) {
          const bone = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.02 * sizeMultiplier, wingLength * 0.8, 4, 6),
            new THREE.MeshStandardMaterial({ color: palette.base })
          )
          bone.position.set(side * wingLength * 0.3, wingWidth * (b / 3 - 0.33), 0.01)
          bone.rotation.z = side * Math.PI * 0.5
          wingGroup.add(bone)
        }

        wingGroup.add(membrane)
        break
      }
      case 'energy': {
        // Ethereal energy wing
        const wingLength = (1.1 + rand() * 0.4) * sizeMultiplier
        const wingWidth = (0.7 + rand() * 0.3) * sizeMultiplier

        const energyWing = new THREE.Mesh(
          new THREE.PlaneGeometry(wingLength, wingWidth, 1, 1),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            emissive: palette.accent,
            emissiveIntensity: 0.3,
          })
        )
        wingGroup.add(energyWing)
        break
      }
      default: {
        // Default wing
        const wing = new THREE.Mesh(
          new THREE.PlaneGeometry(
            (0.9 + rand() * 0.3) * sizeMultiplier,
            (0.6 + rand() * 0.2) * sizeMultiplier,
            2,
            2
          ),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        wingGroup.add(wing)
      }
    }

    wingGroup.position.set(side * 0.6 * sizeMultiplier, 0.3 * sizeMultiplier, -0.1 * sizeMultiplier)
    wingGroup.rotation.y = side * Math.PI * 0.1
    wingGroup.rotation.z = side * QUARTER_PI * 0.6

    torso.add(wingGroup)
    wings.push(wingGroup)
  }
  return wings
}
