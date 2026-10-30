import { HALF_PI } from '@core/constants'
import type { Random } from '@core/types'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'
import { type BodyBounds, getDorsalY, getHeadPosition, getTailSockets } from './sockets'

/** Capsule lying along z, so chained tail segments form a continuous tube. */
function lengthwiseCapsule(
  radius: number,
  length: number,
  capSegments: number,
  radialSegments: number
): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments).rotateX(HALF_PI)
}

export function buildTails(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  root: THREE.Object3D,
  bounds: BodyBounds
): THREE.Object3D[] {
  const tails: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const sockets = getTailSockets(anatomy.tailCount, bounds)

  for (const socket of sockets) {
    const segments = Math.round(4 + anatomy.genes.tail * 6)
    const group = new THREE.Group()
    let parent: THREE.Object3D = group

    switch (anatomy.tailType) {
      case 'fur':
      case 'scale': {
        // Mammal/reptile tail - tapered segments
        for (let s = 0; s < segments; s++) {
          const thickness = 0.12 * sizeMultiplier * (1 - s / segments)
          const seg = new THREE.Mesh(
            lengthwiseCapsule(thickness, 0.25 * sizeMultiplier, 6, 8),
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
            lengthwiseCapsule(thickness, 0.2 * sizeMultiplier, 6, 8),
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
            lengthwiseCapsule(
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

    group.position.copy(socket.position)
    group.rotation.y = socket.yaw
    // Used to spread tail ornaments along the finished length
    group.userData.length = segments * 0.22 * sizeMultiplier
    root.add(group)
    tails.push(group)
  }
  return tails
}

export function buildSpines(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  root: THREE.Object3D,
  bounds: BodyBounds,
  tails: THREE.Object3D[]
): THREE.Object3D[] {
  if (anatomy.spineCount === 0 || anatomy.spineType === 'none') return []
  const spines: THREE.Object3D[] = []
  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const count = anatomy.spineCount
  const headPosition = anatomy.hasHead ? getHeadPosition(anatomy, bounds) : null

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    // Taller in the middle of the row, shorter at both ends
    const height = 0.7 + 0.6 * Math.sin(Math.PI * t)
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.04 * sizeMultiplier, 0.2 * sizeMultiplier * height, 4),
      new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.2 })
    )

    switch (anatomy.spineType) {
      case 'back': {
        // A dorsal ridge following the body's top line, front to back
        const z = (0.65 - 1.3 * t) * bounds.hz
        spine.position.set(0, getDorsalY(bounds, z) * 0.98, z)
        spine.rotation.x = -0.3
        root.add(spine)
        break
      }
      case 'neck': {
        // A ridge from the shoulders up the back of the head
        if (!headPosition) continue
        const headRadius = anatomy.headSize * 0.8
        const shoulderZ = bounds.hz * 0.4
        const from = new THREE.Vector3(0, getDorsalY(bounds, shoulderZ), shoulderZ)
        const to = headPosition
          .clone()
          .add(new THREE.Vector3(0, headRadius * 0.7, -headRadius * 0.5))
        spine.position.lerpVectors(from, to, t)
        spine.rotation.x = -0.4
        root.add(spine)
        break
      }
      case 'tail': {
        // A ridge along the first tail
        const tail = tails[0]
        if (!tail) continue
        const length = (tail.userData.length as number) ?? 0.22 * sizeMultiplier
        spine.position.set(
          0,
          0.12 * sizeMultiplier * (1 - t) + 0.04 * sizeMultiplier,
          -(0.1 + 0.85 * t) * length
        )
        spine.rotation.x = -0.3
        tail.add(spine)
        break
      }
    }

    spines.push(spine)
  }
  return spines
}
