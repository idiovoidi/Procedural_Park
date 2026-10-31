import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Helpers for building low-poly, flat-shaded, vertex-coloured props. Every prop is a
 * single merged geometry (position, normal, colour) so it can be instanced cheaply.
 */

export type Rand = () => number

/** Deterministic 0..1 hash of a 3D point. Equal inputs give equal outputs. */
export function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return n - Math.floor(n)
}

/** Smooth 3D value noise in roughly [-1, 1]. */
export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const w = fz * fz * (3 - 2 * fz)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz) * 2 - 1
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  )
}

/** Strip a geometry down to non-indexed position data so it can be jittered and painted. */
export function prepare(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = geometry.index ? geometry.toNonIndexed() : geometry
  if (out !== geometry) geometry.dispose()
  out.deleteAttribute('uv')
  out.deleteAttribute('normal')
  return out
}

/**
 * Nudge every vertex by a position-hashed offset. Vertices that share a position move
 * together, so the surface stays closed.
 */
export function jitter(
  geometry: THREE.BufferGeometry,
  amount: number,
  seed = 0
): THREE.BufferGeometry {
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const qx = Math.round(x * 500) + seed
    const qy = Math.round(y * 500)
    const qz = Math.round(z * 500)
    pos.setXYZ(
      i,
      x + (hash3(qx, qy, qz) - 0.5) * 2 * amount,
      y + (hash3(qy, qz, qx + 17) - 0.5) * 2 * amount,
      z + (hash3(qz, qx + 31, qy) - 0.5) * 2 * amount
    )
  }
  pos.needsUpdate = true
  return geometry
}

export interface FaceInfo {
  /** Triangle centroid in the geometry's local space. */
  x: number
  y: number
  z: number
  /** Face normal Y component: 1 faces straight up, -1 straight down. */
  ny: number
  /** 0..1 pseudo-random value unique to the face. */
  noise: number
}

/** Colour each triangle flat. Call after all vertex positions are final. */
export function paint(
  geometry: THREE.BufferGeometry,
  colorFor: (face: FaceInfo, out: THREE.Color) => void
): THREE.BufferGeometry {
  const pos = geometry.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  const color = new THREE.Color()

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize()
    const x = (a.x + b.x + c.x) / 3
    const y = (a.y + b.y + c.y) / 3
    const z = (a.z + b.z + c.z) / 3
    colorFor({ x, y, z, ny: n.y, noise: hash3(x * 91, y * 91, z * 91) }, color)
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = color.r
      colors[(i + k) * 3 + 1] = color.g
      colors[(i + k) * 3 + 2] = color.b
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Merge painted parts into one geometry and free the parts. */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  merged.computeBoundingSphere()
  merged.computeBoundingBox()
  return merged
}

/** Translate so the lowest point sits at y = 0. */
export function restOnGround(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.computeBoundingBox()
  const min = geometry.boundingBox?.min.y ?? 0
  geometry.translate(0, -min, 0)
  return geometry
}

/** A tapered limb from the origin along +Y, tilted by (tiltX, tiltZ) and spun around Y. */
export function limb(
  radiusTop: number,
  radiusBottom: number,
  length: number,
  sides: number,
  tiltX: number,
  tiltZ: number
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, sides, 1)
  geo.translate(0, length / 2, 0)
  geo.rotateX(tiltX)
  geo.rotateZ(tiltZ)
  return prepare(geo)
}

/** Shift a colour's HSL by the given offsets, in place. */
export function shiftHsl(color: THREE.Color, h: number, s: number, l: number): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl, THREE.SRGBColorSpace)
  return color.setHSL(
    hsl.h + h,
    Math.max(0, Math.min(1, hsl.s + s)),
    Math.max(0, Math.min(1, hsl.l + l)),
    THREE.SRGBColorSpace
  )
}
