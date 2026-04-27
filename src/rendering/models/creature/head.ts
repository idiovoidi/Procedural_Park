import { HALF_PI, TAU } from '@core/constants'
import type { Random } from '@core/types'
import { normalish } from '@systems/creatures/generator'
import type { Anatomy, CreatureArchetype } from '@systems/creatures/types'
import * as THREE from 'three'
import { getHeadSizeMultiplier, getNeckHeight, getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'

export function buildHead(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette
): THREE.Object3D | null {
  if (!anatomy.hasHead) return null

  const headGroup = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: palette.base,
    metalness: 0.2,
    roughness: 0.5,
  })

  const headSizeMultiplier = getHeadSizeMultiplier(anatomy.bodyType)

  // Create more animal-like head shapes based on archetype
  let headMesh: THREE.Mesh

  switch (anatomy.archetype) {
    case 'terrestrial':
    case 'aerial': {
      // Bird/mammal-like head - slightly elongated with snout
      const headGeom = new THREE.SphereGeometry(anatomy.headSize * 0.8 * headSizeMultiplier, 24, 24)
      headMesh = new THREE.Mesh(headGeom, material)
      headMesh.scale.set(0.9, 1.0, 1.2) // Elongated forward for snout/beak

      // Add snout/beak
      const snoutGeom = new THREE.ConeGeometry(
        anatomy.headSize * 0.3 * headSizeMultiplier,
        anatomy.headSize * 0.5 * headSizeMultiplier,
        12
      )
      const snout = new THREE.Mesh(snoutGeom, material)
      snout.rotation.x = HALF_PI
      snout.position.set(0, -anatomy.headSize * 0.2, anatomy.headSize * 0.9 * headSizeMultiplier)
      headGroup.add(snout)
      break
    }
    case 'aquatic': {
      // Fish-like head - streamlined
      const headGeom = new THREE.SphereGeometry(anatomy.headSize * 0.9 * headSizeMultiplier, 24, 24)
      headMesh = new THREE.Mesh(headGeom, material)
      headMesh.scale.set(0.8, 0.8, 1.3) // Very elongated
      break
    }
    default: {
      // Default rounded head
      const headGeom = new THREE.SphereGeometry(anatomy.headSize * 0.8, 24, 24)
      headMesh = new THREE.Mesh(headGeom, material)
      break
    }
  }

  headGroup.add(headMesh)

  // Adjust head/neck position based on body type
  const neckHeight = getNeckHeight(anatomy.bodyType)
  headGroup.position.set(0, neckHeight, 0.7)

  return headGroup
}

export function buildEyes(
  rand: Random,
  anatomy: Anatomy,
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head || anatomy.eyeCount <= 0) return []
  const eyes: THREE.Object3D[] = []

  // Position eyes based on creature type
  const eyePositions: Array<{ x: number; y: number; z: number }> = []

  if (anatomy.eyeCount === 2) {
    // Standard bilateral eyes
    const separation = anatomy.headSize * 0.5
    eyePositions.push(
      { x: -separation, y: anatomy.headSize * 0.2, z: anatomy.headSize * 0.6 },
      { x: separation, y: anatomy.headSize * 0.2, z: anatomy.headSize * 0.6 }
    )
  } else {
    // Multiple eyes arranged in a pattern
    for (let i = 0; i < anatomy.eyeCount; i++) {
      const theta = (i / anatomy.eyeCount) * TAU * 1.2 - TAU * 0.6
      eyePositions.push({
        x: Math.sin(theta) * anatomy.headSize * 0.5,
        y: anatomy.headSize * 0.15 + normalish(rand) * 0.1,
        z: anatomy.headSize * 0.5 + Math.cos(theta) * 0.1,
      })
    }
  }

  for (let i = 0; i < Math.min(anatomy.eyeCount, eyePositions.length); i++) {
    const eyeSize = anatomy.eyeSize * 1.2

    // Eye white (slightly oval for more natural look)
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(eyeSize, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.4 })
    )
    eyeWhite.scale.set(1.0, 0.9, 1.1)

    // Iris (colored ring around pupil)
    const irisColor = new THREE.Color().setHSL(anatomy.baseHue, 0.6, 0.4)
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(eyeSize * 0.5, 12, 12),
      new THREE.MeshStandardMaterial({
        color: irisColor,
        metalness: 0.2,
        roughness: 0.6,
      })
    )
    iris.position.z = eyeSize * 0.5

    // Pupil (black center) - made larger and more prominent
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(eyeSize * 0.25, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0,
        roughness: 1,
        emissive: 0x000000,
      })
    )
    pupil.position.z = eyeSize * 0.7 // Much further forward to be clearly visible
    pupil.name = 'pupil'

    const eye = new THREE.Group()
    eye.add(eyeWhite)
    eye.add(iris)
    eye.add(pupil)

    // Store references for eye tracking
    eye.userData.pupil = pupil
    eye.userData.iris = iris
    eye.userData.maxOffset = eyeSize * 0.15 // Max distance pupil can move

    const pos = eyePositions[i]
    eye.position.set(pos.x, pos.y, pos.z)

    head.add(eye)
    eyes.push(eye)
  }

  return eyes
}

export interface MouthParts {
  mouth: THREE.Group | null
  lowerJaw: THREE.Mesh | null
}

export function buildMouth(
  _rand: Random,
  anatomy: Anatomy,
  head: THREE.Object3D | null,
  palette: CreaturePalette
): MouthParts {
  if (!head) return { mouth: null, lowerJaw: null }
  const mouth = new THREE.Group()
  // Upper lip (static)
  const upper = new THREE.Mesh(
    new THREE.CapsuleGeometry(anatomy.eyeSize * 0.6, anatomy.eyeSize * 0.1, 4, 8),
    new THREE.MeshStandardMaterial({ color: palette.base, metalness: 0.2, roughness: 0.6 })
  )
  upper.position.set(0, -anatomy.headSize * 0.3, anatomy.headSize * 0.9)
  mouth.add(upper)
  // Lower jaw (animated)
  const lowerJaw = new THREE.Mesh(
    new THREE.BoxGeometry(anatomy.eyeSize * 1.6, anatomy.eyeSize * 0.5, anatomy.eyeSize * 0.9),
    new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.1, roughness: 0.5 })
  )
  lowerJaw.position.set(0, -anatomy.headSize * 0.37, anatomy.headSize * 0.78)
  lowerJaw.rotation.x = -0.1
  mouth.add(lowerJaw)
  head.add(mouth)
  return { mouth, lowerJaw }
}
