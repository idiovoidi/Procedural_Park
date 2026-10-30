import { HALF_PI } from '@core/constants'
import type { Random } from '@core/types'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getHeadSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'
import { type BodyBounds, getHeadPosition } from './sockets'

const FORWARD = new THREE.Vector3(0, 0, 1)

/** Radii of the skull ellipsoid, shared by head, eye and ornament placement. */
function getHeadRadii(anatomy: Anatomy): { rx: number; ry: number; rz: number } {
  const multiplier = getHeadSizeMultiplier(anatomy.bodyType)
  switch (anatomy.archetype) {
    case 'terrestrial':
    case 'aerial': {
      const r = anatomy.headSize * 0.8 * multiplier
      return { rx: r * 0.9, ry: r, rz: r * 1.2 }
    }
    case 'aquatic': {
      const r = anatomy.headSize * 0.9 * multiplier
      return { rx: r * 0.8, ry: r * 0.8, rz: r * 1.3 }
    }
    default: {
      const r = anatomy.headSize * 0.8
      return { rx: r, ry: r, rz: r }
    }
  }
}

export function buildHead(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  bounds: BodyBounds
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

  headGroup.position.copy(getHeadPosition(anatomy, bounds))

  return headGroup
}

export function buildEyes(
  _rand: Random,
  anatomy: Anatomy,
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head || anatomy.eyeCount <= 0) return []
  const eyes: THREE.Object3D[] = []

  // Eyes sit on the skull surface: pairs stack upward and narrow, and an odd
  // eye goes on the centerline (a lone eye low, a third eye on the brow).
  const { rx, ry, rz } = getHeadRadii(anatomy)
  const pairs = Math.floor(anatomy.eyeCount / 2)
  const eyeSlots: Array<{ position: THREE.Vector3; normal: THREE.Vector3 }> = []

  const addSlot = (x: number, y: number) => {
    const inside = Math.max(0, 1 - (x / rx) ** 2 - (y / ry) ** 2)
    const z = rz * Math.sqrt(inside) * 0.97
    eyeSlots.push({
      position: new THREE.Vector3(x, y, z),
      normal: new THREE.Vector3(x / rx ** 2, y / ry ** 2, z / rz ** 2).normalize(),
    })
  }

  for (let pair = 0; pair < pairs; pair++) {
    const x = rx * 0.55 * (1 - pair * 0.2)
    const y = ry * (0.22 + pair * 0.26)
    addSlot(-x, y)
    addSlot(x, y)
  }
  if (anatomy.eyeCount % 2 === 1) addSlot(0, ry * (0.22 + pairs * 0.26))

  for (let i = 0; i < eyeSlots.length; i++) {
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

    eye.position.copy(eyeSlots[i].position)
    eye.quaternion.setFromUnitVectors(FORWARD, eyeSlots[i].normal)

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
