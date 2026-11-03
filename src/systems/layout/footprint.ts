/**
 * Footprints
 * The ground a thing occupies, seen from above (x/z plane, metres). Everything the world
 * map draws and everything the placement rules check is a footprint, so the two cannot
 * disagree about where something is.
 *
 * Rotations use three.js' `rotation.y` convention, so a structure's group rotation can be
 * copied straight into its footprint.
 */

export interface Point2 {
  x: number
  z: number
}

export interface CircleShape {
  type: 'circle'
  x: number
  z: number
  r: number
}

export interface RectShape {
  type: 'rect'
  /** Centre. */
  x: number
  z: number
  /** Size along the shape's local X and Z axes. */
  w: number
  d: number
  /** Rotation about Y (three.js convention). */
  rot: number
}

/** A ribbon of constant width following a polyline, such as a stretch of railway. */
export interface PathShape {
  type: 'path'
  points: Point2[]
  halfWidth: number
  closed: boolean
}

export type Shape = CircleShape | RectShape | PathShape

export type FootprintKind =
  | 'boundary'
  | 'build-zone'
  | 'gate'
  | 'plaza'
  | 'building'
  | 'landmark'
  | 'station'
  | 'track'

export interface Footprint {
  id: string
  label: string
  kind: FootprintKind
  shape: Shape
}

/** World offset (dx, dz) into a rectangle's local frame. */
function toLocal(shape: RectShape, dx: number, dz: number): Point2 {
  const c = Math.cos(shape.rot)
  const s = Math.sin(shape.rot)
  return { x: dx * c - dz * s, z: dx * s + dz * c }
}

/** Local offset back into world space. */
function toWorld(shape: RectShape, lx: number, lz: number): Point2 {
  const c = Math.cos(shape.rot)
  const s = Math.sin(shape.rot)
  return { x: lx * c + lz * s, z: -lx * s + lz * c }
}

/** The four corners of a rectangle in world space. */
export function rectCorners(shape: RectShape): Point2[] {
  const hw = shape.w / 2
  const hd = shape.d / 2
  return (
    [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ] as const
  ).map(([lx, lz]) => {
    const p = toWorld(shape, lx, lz)
    return { x: shape.x + p.x, z: shape.z + p.z }
  })
}

function distanceToSegment(p: Point2, a: Point2, b: Point2): number {
  const abx = b.x - a.x
  const abz = b.z - a.z
  const len2 = abx * abx + abz * abz
  const t =
    len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2))
  return Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t))
}

function distanceToPolyline(p: Point2, points: Point2[], closed: boolean): number {
  let best = Number.POSITIVE_INFINITY
  const last = closed ? points.length : points.length - 1
  for (let i = 0; i < last; i++) {
    const a = points[i] as Point2
    const b = points[(i + 1) % points.length] as Point2
    best = Math.min(best, distanceToSegment(p, a, b))
  }
  return best
}

/** Signed distance from a point to a shape's edge: negative inside, positive outside. */
export function signedDistance(shape: Shape, x: number, z: number): number {
  switch (shape.type) {
    case 'circle':
      return Math.hypot(x - shape.x, z - shape.z) - shape.r
    case 'rect': {
      const l = toLocal(shape, x - shape.x, z - shape.z)
      const qx = Math.abs(l.x) - shape.w / 2
      const qz = Math.abs(l.z) - shape.d / 2
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0))
      return outside + Math.min(Math.max(qx, qz), 0)
    }
    case 'path':
      return distanceToPolyline({ x, z }, shape.points, shape.closed) - shape.halfWidth
  }
}

export function containsPoint(shape: Shape, x: number, z: number): boolean {
  return signedDistance(shape, x, z) < 0
}

/**
 * Moves a point (if needed) so it sits at least `clearance` outside a circle or rectangle.
 * Paths are not pushable and are returned unchanged.
 */
export function pushOutside(shape: Shape, x: number, z: number, clearance: number): Point2 {
  if (shape.type === 'path') return { x, z }
  const sd = signedDistance(shape, x, z)
  if (sd >= clearance) return { x, z }
  const move = clearance - sd

  if (shape.type === 'circle') {
    const dx = x - shape.x
    const dz = z - shape.z
    const len = Math.hypot(dx, dz)
    const nx = len === 0 ? 1 : dx / len
    const nz = len === 0 ? 0 : dz / len
    return { x: x + nx * move, z: z + nz * move }
  }

  // Rectangle: push along the outward normal in local space.
  const l = toLocal(shape, x - shape.x, z - shape.z)
  const qx = Math.abs(l.x) - shape.w / 2
  const qz = Math.abs(l.z) - shape.d / 2
  let gx: number
  let gz: number
  if (qx > 0 || qz > 0) {
    const len = Math.hypot(Math.max(qx, 0), Math.max(qz, 0))
    gx = (Math.sign(l.x) * Math.max(qx, 0)) / len
    gz = (Math.sign(l.z) * Math.max(qz, 0)) / len
  } else if (qx > qz) {
    gx = Math.sign(l.x) || 1
    gz = 0
  } else {
    gx = 0
    gz = Math.sign(l.z) || 1
  }
  const g = toWorld(shape, gx, gz)
  return { x: x + g.x * move, z: z + g.z * move }
}

/** Points spread along a shape's outline or spine, used to test paths against other shapes. */
function samplePath(shape: PathShape, spacing: number): Point2[] {
  const out: Point2[] = []
  const last = shape.closed ? shape.points.length : shape.points.length - 1
  for (let i = 0; i < last; i++) {
    const a = shape.points[i] as Point2
    const b = shape.points[(i + 1) % shape.points.length] as Point2
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / spacing))
    for (let k = 0; k < steps; k++) {
      const t = k / steps
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
    }
  }
  return out
}

function rectsOverlap(a: RectShape, b: RectShape, margin: number): boolean {
  const inflated: RectShape = { ...a, w: a.w + margin * 2, d: a.d + margin * 2 }
  const axes = [a.rot, b.rot].flatMap((rot) => [
    { x: Math.cos(rot), z: -Math.sin(rot) },
    { x: Math.sin(rot), z: Math.cos(rot) },
  ])
  const ca = rectCorners(inflated)
  const cb = rectCorners(b)
  for (const axis of axes) {
    const pa = ca.map((p) => p.x * axis.x + p.z * axis.z)
    const pb = cb.map((p) => p.x * axis.x + p.z * axis.z)
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false
  }
  return true
}

/** True when two shapes come within `margin` metres of each other (or overlap). */
export function shapesOverlap(a: Shape, b: Shape, margin = 0): boolean {
  if (a.type === 'path' && b.type === 'path') return false
  if (a.type === 'path') return shapesOverlap(b, a, margin)

  if (b.type === 'path') {
    const reach = b.halfWidth + margin
    return samplePath(b, 1.5).some((p) => signedDistance(a, p.x, p.z) < reach)
  }
  if (a.type === 'circle' && b.type === 'circle') {
    return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r + margin
  }
  if (a.type === 'circle' && b.type === 'rect') {
    return signedDistance(b, a.x, a.z) < a.r + margin
  }
  if (a.type === 'rect' && b.type === 'circle') {
    return signedDistance(a, b.x, b.z) < b.r + margin
  }
  return rectsOverlap(a as RectShape, b as RectShape, margin)
}

/** Axis-aligned world bounds of a shape. */
export function shapeBounds(shape: Shape): {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
} {
  let pts: Point2[]
  let pad = 0
  if (shape.type === 'circle') {
    pts = [{ x: shape.x, z: shape.z }]
    pad = shape.r
  } else if (shape.type === 'rect') {
    pts = rectCorners(shape)
  } else {
    pts = shape.points
    pad = shape.halfWidth
  }
  return {
    minX: Math.min(...pts.map((p) => p.x)) - pad,
    maxX: Math.max(...pts.map((p) => p.x)) + pad,
    minZ: Math.min(...pts.map((p) => p.z)) - pad,
    maxZ: Math.max(...pts.map((p) => p.z)) + pad,
  }
}
