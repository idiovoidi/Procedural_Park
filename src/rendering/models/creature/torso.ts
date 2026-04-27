import { HALF_PI, TAU } from '@core/constants'
import type { Random } from '@core/types'
import { randomCenteredSeeded } from '@core/utils'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getBodyTypeScale, getSizeMultiplier } from './body-types'
import { createCreatureMaterial } from './palette'

export function buildTorso(
  rand: Random,
  anatomy: Anatomy
): THREE.Object3D {
  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const material = createCreatureMaterial(anatomy, { base: new THREE.Color(), accent: new THREE.Color() }, rand)
  const bodyScale = getBodyTypeScale(anatomy.bodyType)

  // Create proper palette for material
  const palette = {
    base: new THREE.Color().setHSL(anatomy.baseHue, 0.6, 0.55),
    accent: new THREE.Color().setHSL((anatomy.baseHue + 0.12) % 1, 0.7, 0.6),
  }
  const finalMaterial = createCreatureMaterial(anatomy, palette, rand)

  switch (anatomy.torsoShape) {
    case 'sphere': {
      // Round body like a bird or small mammal
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.6 * sizeMultiplier, 28, 28), finalMaterial)
      body.scale.set(1.0 * bodyScale.width, 0.9 * bodyScale.height, 1.1 * bodyScale.length)
      return body
    }
    case 'ellipsoid': {
      // Streamlined body for aerial/aquatic creatures
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5 * sizeMultiplier, 28, 28), finalMaterial)
      body.scale.set(0.7 * bodyScale.width, 0.6 * bodyScale.height, 1.3 * bodyScale.length)
      return body
    }
    case 'capsule': {
      // Mammal-like body
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          0.4 * sizeMultiplier * bodyScale.width,
          0.8 * sizeMultiplier * bodyScale.length,
          8,
          16
        ),
        finalMaterial
      )
      body.rotation.z = HALF_PI // Horizontal orientation
      body.scale.y = bodyScale.height
      return body
    }
    case 'box': {
      // Sturdy terrestrial body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.8 * sizeMultiplier * bodyScale.width,
          0.6 * sizeMultiplier * bodyScale.height,
          1.0 * sizeMultiplier * bodyScale.length,
          4,
          4,
          4
        ),
        finalMaterial
      )
      return body
    }
    case 'crystal': {
      const crystalGeometry = new THREE.OctahedronGeometry((0.8 + rand() * 0.4) * sizeMultiplier, 1)
      const crystalMesh = new THREE.Mesh(crystalGeometry, finalMaterial)
      crystalMesh.rotation.set(rand() * TAU, rand() * TAU, rand() * TAU)
      return crystalMesh
    }
    case 'cloud': {
      const cloudGroup = new THREE.Group()
      const cloudMaterial = new THREE.MeshStandardMaterial({
        color: palette.base,
        transparent: true,
        opacity: 0.7,
        metalness: 0.1,
        roughness: 0.9,
      })

      // Create multiple spheres for cloud effect
      for (let i = 0; i < 5 + Math.floor(rand() * 3); i++) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry((0.3 + rand() * 0.4) * sizeMultiplier, 16, 16),
          cloudMaterial
        )
        sphere.position.set(
          randomCenteredSeeded(rand) * 1.5 * sizeMultiplier,
          randomCenteredSeeded(rand) * 0.8 * sizeMultiplier,
          randomCenteredSeeded(rand) * 1.5 * sizeMultiplier
        )
        cloudGroup.add(sphere)
      }
      return cloudGroup
    }
    default:
      return new THREE.Mesh(
        new THREE.SphereGeometry((0.9 + rand() * 0.6) * sizeMultiplier, 28, 28),
        finalMaterial
      )
  }
}
