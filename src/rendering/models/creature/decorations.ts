import { TAU } from '@core/constants'
import type { Random } from '@core/types'
import { randomCenteredSeeded } from '@core/utils'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'

// Antennae
export function buildAntennae(
  rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head) return []
  const antennae: THREE.Object3D[] = []
  for (let i = 0; i < anatomy.antennaCount; i++) {
    const antenna = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.03, 0.35 + rand() * 0.4, 6, 10),
      new THREE.MeshStandardMaterial({ color: palette.accent })
    )
    antenna.position.set((i - (anatomy.antennaCount - 1) / 2) * 0.2, 0.4 + rand() * 0.2, 0.1)
    head.add(antenna)
    antennae.push(antenna)
  }
  return antennae
}

// Ears
export function buildEars(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head || anatomy.earCount === 0 || anatomy.earType === 'none') return []
  const ears: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.earCount; i++) {
    const side = i === 0 ? -1 : 1
    let ear: THREE.Mesh

    switch (anatomy.earType) {
      case 'pointed': {
        // Triangular pointed ears
        ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.15 * sizeMultiplier, 0.4 * sizeMultiplier, 4),
          new THREE.MeshStandardMaterial({ color: palette.base })
        )
        ear.rotation.z = side * Math.PI * 0.3
        break
      }
      case 'round': {
        // Round ears
        ear = new THREE.Mesh(
          new THREE.SphereGeometry(0.2 * sizeMultiplier, 12, 12),
          new THREE.MeshStandardMaterial({ color: palette.base })
        )
        ear.scale.set(0.6, 1.0, 0.3)
        break
      }
      case 'floppy': {
        // Floppy hanging ears
        ear = new THREE.Mesh(
          new THREE.PlaneGeometry(0.25 * sizeMultiplier, 0.5 * sizeMultiplier),
          new THREE.MeshStandardMaterial({ color: palette.base, side: THREE.DoubleSide })
        )
        ear.rotation.y = side * Math.PI * 0.5
        ear.rotation.z = side * Math.PI * 0.2
        break
      }
      case 'fin': {
        // Fish-like fin ears
        ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.2 * sizeMultiplier, 0.3 * sizeMultiplier, 3),
          new THREE.MeshStandardMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        )
        ear.rotation.z = side * Math.PI * 0.5
        break
      }
      default:
        continue
    }

    ear.position.set(side * anatomy.headSize * 0.6, anatomy.headSize * 0.3, 0)
    head.add(ear)
    ears.push(ear)
  }
  return ears
}

// Horns
export function buildHorns(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head || anatomy.hornCount === 0 || anatomy.hornType === 'none') return []
  const horns: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  for (let i = 0; i < anatomy.hornCount; i++) {
    let horn: THREE.Object3D

    switch (anatomy.hornType) {
      case 'straight': {
        // Straight pointed horn
        horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.08 * sizeMultiplier, 0.6 * sizeMultiplier, 8),
          new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.3, roughness: 0.4 })
        )
        horn.rotation.x = -Math.PI * 0.1
        break
      }
      case 'curved': {
        // Curved horn using multiple segments
        const hornGroup = new THREE.Group()
        const segments = 4
        let parent: THREE.Object3D = hornGroup
        for (let s = 0; s < segments; s++) {
          const seg = new THREE.Mesh(
            new THREE.ConeGeometry(
              0.08 * sizeMultiplier * (1 - s / segments),
              0.15 * sizeMultiplier,
              8
            ),
            new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.3 })
          )
          seg.position.y = 0.12 * sizeMultiplier
          seg.rotation.x = -0.3
          parent.add(seg)
          parent = seg
        }
        horn = hornGroup
        break
      }
      case 'spiral': {
        // Spiral horn
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.05, 0.15, 0.05),
          new THREE.Vector3(-0.05, 0.3, 0.05),
          new THREE.Vector3(0.05, 0.45, 0),
          new THREE.Vector3(0, 0.6, 0),
        ])
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.05 * sizeMultiplier, 8, false)
        horn = new THREE.Mesh(
          tubeGeometry,
          new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.4 })
        )
        break
      }
      case 'antler': {
        // Branching antler
        const antlerGroup = new THREE.Group()
        const main = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.04 * sizeMultiplier, 0.5 * sizeMultiplier, 6, 8),
          new THREE.MeshStandardMaterial({ color: palette.accent })
        )
        main.position.y = 0.25 * sizeMultiplier
        antlerGroup.add(main)

        // Add branches
        for (let b = 0; b < 2; b++) {
          const branch = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.03 * sizeMultiplier, 0.25 * sizeMultiplier, 6, 8),
            new THREE.MeshStandardMaterial({ color: palette.accent })
          )
          branch.position.set((b === 0 ? -0.1 : 0.1) * sizeMultiplier, 0.35 * sizeMultiplier, 0)
          branch.rotation.z = (b === 0 ? 1 : -1) * Math.PI * 0.3
          antlerGroup.add(branch)
        }
        horn = antlerGroup
        break
      }
      default:
        continue
    }

    // Position horns on head
    const angle = (i / Math.max(1, anatomy.hornCount - 1)) * Math.PI - Math.PI / 2
    horn.position.set(
      Math.sin(angle) * anatomy.headSize * 0.4,
      anatomy.headSize * 0.5,
      Math.cos(angle) * anatomy.headSize * 0.2
    )

    head.add(horn)
    horns.push(horn)
  }
  return horns
}

// Fur Tufts
export function buildFurTufts(
  rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  torso: THREE.Object3D
): THREE.Object3D[] {
  if (!anatomy.furTufts) return []
  const tufts: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  // Add fur tufts at various locations
  const tuftLocations = [
    { x: 0, y: 0.4, z: 0.6 }, // chest
    { x: -0.3, y: 0.2, z: 0.3 }, // left side
    { x: 0.3, y: 0.2, z: 0.3 }, // right side
    { x: 0, y: 0.3, z: -0.5 }, // back
  ]

  for (const loc of tuftLocations) {
    const tuftGroup = new THREE.Group()

    // Create multiple small spheres for fluffy effect
    for (let i = 0; i < 3; i++) {
      const tuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 * sizeMultiplier, 8, 8),
        new THREE.MeshStandardMaterial({ color: palette.base, roughness: 0.9 })
      )
      tuft.position.set(
        randomCenteredSeeded(rand) * 0.1,
        randomCenteredSeeded(rand) * 0.1,
        randomCenteredSeeded(rand) * 0.1
      )
      tuftGroup.add(tuft)
    }

    tuftGroup.position.set(loc.x * sizeMultiplier, loc.y * sizeMultiplier, loc.z * sizeMultiplier)
    torso.add(tuftGroup)
    tufts.push(tuftGroup)
  }

  return tufts
}

// Scales
export function buildScales(
  rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  torso: THREE.Object3D
): THREE.Object3D[] {
  if (!anatomy.hasScales) return []
  const scales: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  // Add scale pattern on body
  const scaleCount = 12 + Math.floor(rand() * 8)
  for (let i = 0; i < scaleCount; i++) {
    const scale = new THREE.Mesh(
      new THREE.CircleGeometry(0.08 * sizeMultiplier, 6),
      new THREE.MeshStandardMaterial({
        color: palette.accent,
        metalness: 0.4,
        roughness: 0.3,
        side: THREE.DoubleSide,
      })
    )

    // Random position on body surface
    const theta = rand() * TAU
    const phi = rand() * Math.PI
    const radius = 0.5 * sizeMultiplier

    scale.position.set(
      Math.sin(phi) * Math.cos(theta) * radius,
      Math.cos(phi) * radius * 0.8,
      Math.sin(phi) * Math.sin(theta) * radius
    )

    // Orient scale to face outward
    scale.lookAt(scale.position.clone().multiplyScalar(2))

    torso.add(scale)
    scales.push(scale)
  }

  return scales
}
