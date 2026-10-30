import type { Random } from '@core/types'
import { randomCenteredSeeded } from '@core/utils'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'
import { type BodyBounds, onSurface, surfaceNormal } from './sockets'

const FORWARD = new THREE.Vector3(0, 0, 1)

// Antennae
export function buildAntennae(
  rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  head: THREE.Object3D | null
): THREE.Object3D[] {
  if (!head) return []
  const antennae: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const count = anatomy.antennaCount
  // One length per creature, so the set reads as symmetric
  const length = anatomy.headSize * (0.7 + rand() * 0.7)
  const spacing = anatomy.headSize * 0.35

  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * spacing
    const antenna = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.03 * sizeMultiplier, length, 6, 10),
      palette.standard({ color: palette.accent })
    )
    antenna.position.set(x, anatomy.headSize * 0.65 + length / 2, anatomy.headSize * 0.25)
    antenna.rotation.z = -Math.sign(x) * 0.35
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
          palette.standard({ color: palette.base })
        )
        ear.rotation.z = side * Math.PI * 0.3
        break
      }
      case 'round': {
        // Round ears
        ear = new THREE.Mesh(
          new THREE.SphereGeometry(0.2 * sizeMultiplier, 12, 12),
          palette.standard({ color: palette.base })
        )
        ear.scale.set(0.6, 1.0, 0.3)
        break
      }
      case 'floppy': {
        // Floppy hanging ears
        ear = new THREE.Mesh(
          new THREE.PlaneGeometry(0.25 * sizeMultiplier, 0.5 * sizeMultiplier),
          palette.standard({ color: palette.base, side: THREE.DoubleSide })
        )
        ear.rotation.y = side * Math.PI * 0.5
        ear.rotation.z = side * Math.PI * 0.2
        break
      }
      case 'fin': {
        // Fish-like fin ears
        ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.2 * sizeMultiplier, 0.3 * sizeMultiplier, 3),
          palette.standard({
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
          palette.standard({ color: palette.accent, metalness: 0.3, roughness: 0.4 })
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
            palette.standard({ color: palette.accent, metalness: 0.3 })
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
          palette.standard({ color: palette.accent, metalness: 0.4 })
        )
        break
      }
      case 'antler': {
        // Branching antler
        const antlerGroup = new THREE.Group()
        const main = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.04 * sizeMultiplier, 0.5 * sizeMultiplier, 6, 8),
          palette.standard({ color: palette.accent })
        )
        main.position.y = 0.25 * sizeMultiplier
        antlerGroup.add(main)

        // Add branches
        for (let b = 0; b < 2; b++) {
          const branch = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.03 * sizeMultiplier, 0.25 * sizeMultiplier, 6, 8),
            palette.standard({ color: palette.accent })
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

    // Mirror horns across the head's centerline, tilting outward from the skull
    const spacing = anatomy.headSize * (anatomy.hornCount <= 2 ? 0.55 : 0.32)
    const x = (i - (anatomy.hornCount - 1) / 2) * spacing
    horn.position.set(x, anatomy.headSize * 0.55 - Math.abs(x) * 0.4, anatomy.headSize * 0.1)
    horn.rotation.z = -Math.sign(x) * 0.3

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
  root: THREE.Object3D,
  bounds: BodyBounds
): THREE.Object3D[] {
  if (!anatomy.furTufts) return []
  const tufts: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  // Chest, both flanks, and the back, as directions from the body center
  const tuftDirections = [
    new THREE.Vector3(0, -0.1, 1),
    new THREE.Vector3(-1, 0, 0.2),
    new THREE.Vector3(1, 0, 0.2),
    new THREE.Vector3(0, 1, -0.5),
  ]

  for (const direction of tuftDirections) {
    const tuftGroup = new THREE.Group()

    // Create multiple small spheres for fluffy effect
    for (let i = 0; i < 3; i++) {
      const tuft = new THREE.Mesh(
        palette.geometry('fur-puff', () => new THREE.SphereGeometry(0.08 * sizeMultiplier, 8, 8)),
        palette.standard({ color: palette.base, roughness: 0.9 })
      )
      tuft.position.set(
        randomCenteredSeeded(rand) * 0.1,
        randomCenteredSeeded(rand) * 0.1,
        randomCenteredSeeded(rand) * 0.1
      )
      tuftGroup.add(tuft)
    }

    tuftGroup.position.copy(onSurface(bounds, direction, 0.97))
    root.add(tuftGroup)
    tufts.push(tuftGroup)
  }

  return tufts
}

// Scales
export function buildScales(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  root: THREE.Object3D,
  bounds: BodyBounds
): THREE.Object3D[] {
  if (!anatomy.hasScales) return []
  const scales: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)

  // A staggered grid over the upper half of the body: rows along the length,
  // each offset from the last, like overlapping plates.
  const rows = anatomy.genes.length > 0.5 ? 4 : 3
  const perRow = 5
  const step = (Math.PI * 0.7) / perRow
  for (let row = 0; row < rows; row++) {
    const z = 0.6 - (1.2 * row) / (rows - 1)
    for (let i = 0; i < perRow; i++) {
      // Angle from the top line, evenly spread, with odd rows shifted half a step
      const phi = (i - (perRow - 1) / 2 + (row % 2 === 0 ? 0 : 0.5)) * step
      const position = onSurface(bounds, new THREE.Vector3(Math.sin(phi), Math.cos(phi), z), 1.01)

      const scale = new THREE.Mesh(
        palette.geometry('scale-plate', () => new THREE.CircleGeometry(0.08 * sizeMultiplier, 6)),
        palette.standard({
          color: palette.accent,
          metalness: 0.4,
          roughness: 0.3,
          side: THREE.DoubleSide,
        })
      )
      scale.position.copy(position)
      scale.quaternion.setFromUnitVectors(FORWARD, surfaceNormal(bounds, position))

      root.add(scale)
      scales.push(scale)
    }
  }

  return scales
}
