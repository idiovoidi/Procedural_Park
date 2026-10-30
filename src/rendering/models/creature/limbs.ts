import { HALF_PI } from '@core/constants'
import type { Random } from '@core/types'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getLimbThicknessMultiplier, getSizeMultiplier } from './body-types'
import type { CreaturePalette } from './palette'
import { type BodyBounds, DOWN, getLimbSockets } from './sockets'

type LimbType = Anatomy['limbType']

/** How far each limb type may sway at idle, in radians. Stiff limbs barely move. */
const SWAY: Record<LimbType, number> = {
  leg: 0.05,
  arm: 0.12,
  fin: 0.15,
  tendril: 0.3,
  crystal_shard: 0.02,
}

type LimbSize = {
  scale: number
  thickness: number
  lanky: boolean
  lengthScale: number
}

/**
 * Build every limb set at its sockets. All limbs are built hanging toward local
 * -y, then turned so that axis follows the socket direction.
 */
export function buildLimbs(
  _rand: Random,
  anatomy: Anatomy,
  palette: CreaturePalette,
  root: THREE.Object3D,
  bounds: BodyBounds
): THREE.Object3D[] {
  const limbs: THREE.Object3D[] = []
  const size: LimbSize = {
    scale: getSizeMultiplier(anatomy.size),
    thickness: getLimbThicknessMultiplier(anatomy.bodyType),
    lanky: anatomy.bodyType === 'lanky',
    lengthScale: 0.85 + anatomy.genes.limb * 0.4,
  }

  for (const set of anatomy.limbSets) {
    for (const socket of getLimbSockets(set.layout, set.count, bounds)) {
      const limb = buildLimb(set.type, palette, size)
      limb.position.copy(socket.position)
      limb.quaternion.setFromUnitVectors(DOWN, socket.direction)
      limb.userData.swayAmp = SWAY[set.type]
      root.add(limb)
      limbs.push(limb)
    }
  }
  return limbs
}

function buildLimb(type: LimbType, palette: CreaturePalette, size: LimbSize): THREE.Group {
  const group = new THREE.Group()
  const { scale, thickness: thicknessMultiplier, lanky, lengthScale } = size
  const material = new THREE.MeshStandardMaterial({
    color: palette.accent,
    metalness: 0.1,
    roughness: 0.6,
  })

  switch (type) {
    case 'leg': {
      // Two-segment leg (thigh + shin) with a simple foot
      const reach = (lanky ? 1.3 : 1.0) * lengthScale
      const thighLength = 0.4 * scale * reach
      const shinLength = 0.35 * scale * reach
      const thickness = 0.08 * scale * thicknessMultiplier

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

      const foot = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.2, 8, 8), material)
      foot.scale.set(1.2, 0.6, 1.5)
      foot.position.y = -thighLength - shinLength

      group.add(thigh, shin, foot)
      break
    }
    case 'arm': {
      const armLength = 0.5 * scale * (lanky ? 1.2 : 1.0) * lengthScale
      const thickness = 0.07 * scale * thicknessMultiplier

      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(thickness, armLength, 6, 8), material)
      arm.position.y = -armLength / 2

      const hand = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.3, 8, 8), material)
      hand.position.y = -armLength

      group.add(arm, hand)
      break
    }
    case 'fin': {
      // Flat triangular fin, root at the socket and tip along -y
      const finLength = 0.6 * scale * lengthScale
      const finWidth = 0.22 * scale
      const geometry = new THREE.ConeGeometry(finWidth, finLength, 3)
      geometry.rotateX(Math.PI)
      geometry.translate(0, -finLength / 2, 0)

      const fin = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: palette.accent,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        })
      )
      // Flatten, then turn the plate so it lies roughly level when the fin points outward
      fin.scale.z = 0.25
      fin.rotation.y = HALF_PI
      group.add(fin)
      break
    }
    case 'tendril': {
      // Segmented tentacle that tapers toward the tip
      const segments = 4
      let parent: THREE.Object3D = group
      for (let s = 0; s < segments; s++) {
        const seg = new THREE.Mesh(
          new THREE.CapsuleGeometry(
            0.05 * scale * (1 - s / segments),
            0.2 * scale * lengthScale,
            4,
            6
          ),
          material
        )
        seg.position.y = -0.18 * scale * lengthScale
        parent.add(seg)
        parent = seg
      }
      break
    }
    case 'crystal_shard': {
      // Elongated crystal, base at the socket, point outward
      const radius = 0.2 * scale * lengthScale
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(radius),
        new THREE.MeshStandardMaterial({
          color: palette.accent,
          metalness: 0.7,
          roughness: 0.2,
          transparent: true,
          opacity: 0.9,
        })
      )
      shard.scale.set(0.45, 1.5, 0.45)
      shard.position.y = -radius * 1.5
      group.add(shard)
      break
    }
  }
  return group
}
