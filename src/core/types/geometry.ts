/**
 * Geometry-related types
 */

/**
 * 2D position
 */
export interface Position2D {
  x: number
  y: number
}

/**
 * 3D position
 */
export interface Position3D {
  x: number
  y: number
  z: number
}

/**
 * 2D size
 */
export interface Size2D {
  width: number
  height: number
}

/**
 * 3D size
 */
export interface Size3D {
  width: number
  height: number
  depth: number
}

/**
 * Bounding box
 */
export interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/**
 * 2D Bounding box
 */
export interface BoundingBox2D {
  minX: number
  maxX: number
  minY: number
  maxY: number
}
