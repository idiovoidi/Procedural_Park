/**
 * Aiming
 * Where a view ray meets the ground, for placing things where the crosshair points.
 * Plain numbers, no Three.js, so it can be tested.
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Intersect a ray with the horizontal plane y = floorY. Returns the ground point, or null if
 * the ray points level or upward, starts below the floor, or hits it farther than `maxReach`.
 */
export function aimAtGround(
  origin: Vec3,
  direction: Vec3,
  floorY: number,
  maxReach: number
): { x: number; z: number; distance: number } | null {
  const values = [origin.x, origin.y, origin.z, direction.x, direction.y, direction.z, floorY]
  if (values.some((v) => !Number.isFinite(v))) return null
  if (origin.y <= floorY) return null
  if (direction.y >= -1e-6) return null // looking level or up: never reaches the ground

  const t = (floorY - origin.y) / direction.y
  const length = Math.hypot(direction.x, direction.y, direction.z)
  const distance = t * length
  if (distance > maxReach) return null

  return { x: origin.x + direction.x * t, z: origin.z + direction.z * t, distance }
}
