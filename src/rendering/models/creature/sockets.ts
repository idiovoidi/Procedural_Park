import { TAU } from '@core/constants'
import { BODY_PLANS } from '@systems/creatures/genome/body-plans'
import type { Anatomy } from '@systems/creatures/types'
import * as THREE from 'three'
import { getNeckHeight, getSizeMultiplier } from './body-types'

/**
 * Attachment points computed from the measured body, so parts sit on the
 * silhouette the torso actually has instead of at fixed offsets.
 * Coordinates are in creature space: +z forward, +y up, +x right.
 */

/**
 * Rough surface family of the torso. Each is a superellipsoid whose exponent
 * controls how boxy the body is, so one formula places parts on any torso.
 */
export type BodyShape = 'ellipsoid' | 'capsule' | 'box' | 'diamond'

const SHAPE_EXPONENT: Record<BodyShape, number> = {
  ellipsoid: 2,
  capsule: 3,
  box: 8,
  // A subdivided octahedron sits between a diamond (1) and an ellipsoid (2)
  diamond: 1.5,
}

/** Half extents of the torso around the creature origin, plus its surface family. */
export type BodyBounds = { hx: number; hy: number; hz: number; shape: BodyShape }

export type Socket = {
  position: THREE.Vector3
  /** Unit vector the part points along (limbs are built hanging toward local -y). */
  direction: THREE.Vector3
  /** -1 left, 1 right, 0 on the centerline. */
  side: -1 | 0 | 1
}

export const DOWN = new THREE.Vector3(0, -1, 0)

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export function shapeForTorso(torsoShape: Anatomy['torsoShape']): BodyShape {
  switch (torsoShape) {
    case 'capsule':
      return 'capsule'
    case 'box':
      return 'box'
    case 'crystal':
      return 'diamond'
    default:
      return 'ellipsoid'
  }
}

export function boundsFromBox(box: THREE.Box3, shape: BodyShape): BodyBounds {
  const size = box.getSize(new THREE.Vector3())
  return { hx: size.x / 2, hy: size.y / 2, hz: size.z / 2, shape }
}

/**
 * Point on the body surface along the ray toward `fraction`, given as fractions
 * of the half extents. `inset` below 1 buries the point slightly in the body.
 */
export function onSurface(bounds: BodyBounds, fraction: THREE.Vector3, inset = 1): THREE.Vector3 {
  const p = SHAPE_EXPONENT[bounds.shape]
  const norm =
    (Math.abs(fraction.x) ** p + Math.abs(fraction.y) ** p + Math.abs(fraction.z) ** p) ** (1 / p)
  const scale = norm > 0 ? inset / norm : 0
  return new THREE.Vector3(
    fraction.x * bounds.hx * scale,
    fraction.y * bounds.hy * scale,
    fraction.z * bounds.hz * scale
  )
}

/** Outward unit normal of the body surface at (or near) `point`. */
export function surfaceNormal(bounds: BodyBounds, point: THREE.Vector3): THREE.Vector3 {
  const p = SHAPE_EXPONENT[bounds.shape]
  const gradient = (value: number, half: number) =>
    (Math.sign(value) * Math.abs(value / half) ** (p - 1)) / half
  return new THREE.Vector3(
    gradient(point.x, bounds.hx),
    gradient(point.y, bounds.hy),
    gradient(point.z, bounds.hz)
  ).normalize()
}

/** Height of the body's upper surface at a given z, on the centerline. */
export function getDorsalY(bounds: BodyBounds, z: number): number {
  const p = SHAPE_EXPONENT[bounds.shape]
  const t = Math.min(1, Math.abs(z) / bounds.hz)
  return bounds.hy * (1 - t ** p) ** (1 / p)
}

export function getHeadPosition(anatomy: Anatomy, bounds: BodyBounds): THREE.Vector3 {
  const lift = BODY_PLANS[anatomy.bodyPlan].headLift
  const sizeMultiplier = getSizeMultiplier(anatomy.size)
  const headRadius = anatomy.headSize * 0.8
  const neck = (getNeckHeight(anatomy.bodyType) - 0.5) * sizeMultiplier
  return new THREE.Vector3(0, bounds.hy * lift + neck, bounds.hz * 0.8 + headRadius * 0.55)
}

/** Evenly spaced z fractions, front to back, for `count` rows of limbs. */
function rowOffsets(count: number): number[] {
  if (count <= 1) return [-0.1]
  return Array.from({ length: count }, (_, i) => 0.6 - (1.2 * i) / (count - 1))
}

function sideOf(value: number): -1 | 0 | 1 {
  return value < -0.1 ? -1 : value > 0.1 ? 1 : 0
}

export function getLimbSockets(
  layout: Anatomy['limbSets'][number]['layout'],
  count: number,
  bounds: BodyBounds
): Socket[] {
  const sockets: Socket[] = []
  const pairs = Math.floor(count / 2)

  switch (layout) {
    case 'rows': {
      // Hips: mirrored pairs spread along the underside, plus a rear centerline limb if odd
      rowOffsets(pairs)
        .slice(0, pairs)
        .forEach((row) => {
          for (const side of [-1, 1] as const) {
            sockets.push({
              position: onSurface(bounds, new THREE.Vector3(side * 0.6, -0.5, row), 0.92),
              direction: new THREE.Vector3(side * 0.12, -1, 0).normalize(),
              side,
            })
          }
        })
      if (count % 2 === 1) {
        sockets.push({
          position: onSurface(bounds, new THREE.Vector3(0, -0.5, -0.4), 0.92),
          direction: DOWN.clone(),
          side: 0,
        })
      }
      break
    }
    case 'shoulders': {
      for (const side of [-1, 1] as const) {
        sockets.push({
          position: onSurface(bounds, new THREE.Vector3(side, 0.35, 0.2), 0.97),
          direction: new THREE.Vector3(side * 0.3, -1, 0.1).normalize(),
          side,
        })
      }
      break
    }
    case 'sides': {
      // Fins: mirrored pairs along the flanks, angled outward and back
      rowOffsets(pairs)
        .slice(0, pairs)
        .forEach((row) => {
          for (const side of [-1, 1] as const) {
            sockets.push({
              position: onSurface(bounds, new THREE.Vector3(side, -0.2, row * 0.55), 0.97),
              direction: new THREE.Vector3(side * 0.9, -0.35, -0.25).normalize(),
              side,
            })
          }
        })
      break
    }
    case 'underside': {
      // Tendrils: a ring beneath the body, each splayed slightly outward
      for (let i = 0; i < count; i++) {
        const theta = ((i + 0.5) / count) * TAU
        const cos = Math.cos(theta)
        const sin = Math.sin(theta)
        sockets.push({
          position: onSurface(bounds, new THREE.Vector3(cos * 0.55, -1, sin * 0.55), 0.92),
          direction: new THREE.Vector3(cos * 0.25, -1, sin * 0.25).normalize(),
          side: sideOf(cos),
        })
      }
      break
    }
    case 'ring': {
      // Fibonacci sphere: even coverage for any shard count, pointing straight out
      for (let i = 0; i < count; i++) {
        const y = 1 - (2 * (i + 0.5)) / count
        const radius = Math.sqrt(1 - y * y)
        const phi = i * GOLDEN_ANGLE
        const direction = new THREE.Vector3(Math.cos(phi) * radius, y, Math.sin(phi) * radius)
        sockets.push({
          position: onSurface(bounds, direction, 0.95),
          direction,
          side: sideOf(direction.x),
        })
      }
      break
    }
  }
  return sockets
}

/** Wing sockets in builder order: even indices are left wings, odd are right. */
export function getWingSockets(pairs: number, bounds: BodyBounds): Socket[] {
  const sockets: Socket[] = []
  for (let pair = 0; pair < pairs; pair++) {
    for (const side of [-1, 1] as const) {
      sockets.push({
        position: onSurface(
          bounds,
          new THREE.Vector3(side, 0.62 - 0.2 * pair, 0.3 - 0.5 * pair),
          0.95
        ),
        direction: new THREE.Vector3(side, 0, 0),
        side,
      })
    }
  }
  return sockets
}

export function getTailSockets(count: number, bounds: BodyBounds): Array<Socket & { yaw: number }> {
  return Array.from({ length: count }, (_, i) => {
    const side = count === 2 ? (i === 0 ? -1 : 1) : 0
    return {
      position: onSurface(bounds, new THREE.Vector3(side * 0.22, -0.12, -1), 0.92),
      direction: new THREE.Vector3(0, 0, -1),
      side: side as -1 | 0 | 1,
      yaw: side * 0.3,
    }
  })
}
