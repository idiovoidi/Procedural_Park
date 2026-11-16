import { noise2D } from './noise-utils'

/** World size of the square terrain, in world units. */
export const MAP_SIZE = 300
/** Ground height inside the park; structures and creatures are built against this. */
export const PARK_FLOOR_Y = -0.1
/** Inside this radius the ground is dead flat (the boundary fence sits at 70). */
export const PARK_FLAT_RADIUS = 68
/** Terrain reaches its natural height by this radius. */
export const PARK_BLEND_RADIUS = 108
/** Surface of lakes and ponds. */
export const WATER_LEVEL = -0.75

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** 0 inside the park, rising smoothly to 1 out in the wilds. */
export function wildness(x: number, z: number): number {
  return smoothstep(PARK_FLAT_RADIUS, PARK_BLEND_RADIUS, Math.hypot(x, z))
}

/**
 * Builds a continuous, world-space height function. The park is flat, then the land
 * rolls up into hills, ridges and (below the water line) ponds, and drops away at the
 * map edge so the world ends in water instead of a cliff.
 */
export function createHeightSampler(
  seed: number,
  /** The hub keeps a flat park at the centre; expedition maps are wild all the way in. */
  flatPark = true
): (x: number, z: number) => number {
  const ox = ((seed * 0.6180339) % 97) + 11.3
  const oz = ((seed * 0.7548776) % 89) + 5.7
  const half = MAP_SIZE / 2

  return (x, z) => {
    let h = noise2D(x * 0.011 + ox, z * 0.011 + oz) * 4.5
    h += noise2D(x * 0.028 + ox * 1.3, z * 0.028 + oz * 1.3) * 2.4
    h += noise2D(x * 0.07 + ox * 2.1, z * 0.07 + oz * 2.1) * 0.9
    h += noise2D(x * 0.16 + ox * 3.7, z * 0.16 + oz * 3.7) * 0.3

    const ridge = Math.abs(noise2D(x * 0.017 + oz, z * 0.017 + ox))
    h += ridge * ridge * 3

    // Soften the extremes instead of clipping them into plateaus
    if (h > 5) h = 5 + (h - 5) * 0.5
    if (h < 0) h *= 0.65
    h = Math.max(-2.2, h)

    const edge = Math.max(Math.abs(x), Math.abs(z)) / half
    h -= smoothstep(0.78, 1, edge) * 5

    const w = flatPark ? wildness(x, z) : 1
    return PARK_FLOOR_Y + (h - PARK_FLOOR_Y) * w
  }
}
