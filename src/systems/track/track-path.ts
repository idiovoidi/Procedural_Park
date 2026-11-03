import { TAU } from '@core/constants'
import {
  type Footprint,
  type Point2,
  pushOutside,
  shapesOverlap,
  signedDistance,
} from '@systems/layout/footprint'
import * as THREE from 'three'

/** Eye height of a rider above the top of the sleepers. */
export const EYE_HEIGHT = 1.6
/** The track never strays further than this from the park centre (the fence is at 70). */
export const MAX_TRACK_RADIUS = 58
/** Lowest the rail bed may sit above the ground. */
const MIN_GROUND_CLEARANCE = 0.25

export interface StationDef {
  /** Position along the loop, 0..1. */
  t: number
  name: string
}

/** Stops on the loop. The tram halts at each, letting the rider hop off. */
export const STATIONS: readonly StationDef[] = [
  { t: 0.06, name: 'Main Gate Station' },
  { t: 0.39, name: 'Lakeside Halt' },
  { t: 0.72, name: 'Lab Junction' },
]

/** How far from the rail centre line a station platform's middle sits. */
export const STATION_SIDE_OFFSET = 3.3
const PLATFORM_WIDTH = 3.4
const PLATFORM_LENGTH = 14
/** Room kept between the rails and any structure, enough for a platform on either side. */
export const TRACK_CLEARANCE = 6
const TRACK_HALF_WIDTH = 1.5

export interface TrackPath {
  /** The stops, nudged along the loop to wherever their platform fits. */
  stations: StationDef[]
  /** Centre line of the rails (top of the sleepers). */
  trackCurve: THREE.CatmullRomCurve3
  /** The same line lifted to rider eye height; the camera and creatures follow this. */
  rideCurve: THREE.CatmullRomCurve3
}

function smoothCircular(values: number[], radius: number, passes: number): number[] {
  let current = values
  const n = values.length
  for (let pass = 0; pass < passes; pass++) {
    const next = new Array<number>(n)
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) sum += current[(i + k + n) % n] as number
      next[i] = sum / (radius * 2 + 1)
    }
    current = next
  }
  return current
}

/**
 * Lays a closed loop of track over the terrain. The ground height is smoothed so the
 * rails roll gently instead of following every bump, but never dips into the ground.
 */
export function buildTrackPath(
  heightAt: (x: number, z: number) => number,
  seed: number = Math.random() * 1000,
  avoid: readonly Footprint[] = []
): TrackPath {
  const numPoints = 96
  let xs: number[] = []
  let zs: number[] = []

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * TAU
    const baseRadius = 40 + Math.sin(seed + angle * 3) * 9
    const radiusVariation = Math.sin(seed * 2 + angle * 5) * 5
    const r = Math.min(MAX_TRACK_RADIUS, baseRadius + radiusVariation)

    const spiral = Math.sin(seed + angle * 2) * 0.12
    xs.push(Math.sin(angle + spiral) * r)
    zs.push(Math.cos(angle + spiral) * r)
  }

  // Steer around structures: push points clear, ease the corners, and repeat until stable.
  const isClear = (x: number, z: number) =>
    avoid.every((fp) => signedDistance(fp.shape, x, z) >= TRACK_CLEARANCE)
  const clearOfStructures = () => {
    for (let i = 0; i < numPoints; i++) {
      const x = xs[i] as number
      const z = zs[i] as number
      let p: Point2 = { x, z }
      for (const fp of avoid) p = pushOutside(fp.shape, p.x, p.z, TRACK_CLEARANCE)
      if (Math.hypot(p.x, p.z) > MAX_TRACK_RADIUS || !isClear(p.x, p.z)) {
        // Pushing outward would leave the park; slip inside the obstacle's ring instead.
        const len = Math.hypot(x, z) || 1
        for (let r = Math.min(len, MAX_TRACK_RADIUS); r >= 8; r -= 0.5) {
          const cx = (x / len) * r
          const cz = (z / len) * r
          if (isClear(cx, cz)) {
            p = { x: cx, z: cz }
            break
          }
        }
      }
      xs[i] = p.x
      zs[i] = p.z
    }
  }
  if (avoid.length > 0) {
    for (let pass = 0; pass < 6; pass++) {
      clearOfStructures()
      xs = smoothCircular(xs, 1, 1)
      zs = smoothCircular(zs, 1, 1)
    }
    clearOfStructures()
  }

  const ground = xs.map((x, i) => heightAt(x, zs[i] as number))
  const smoothed = smoothCircular(ground, 3, 2)
  const trackPoints: THREE.Vector3[] = []
  const ridePoints: THREE.Vector3[] = []
  for (let i = 0; i < numPoints; i++) {
    const y = Math.max(smoothed[i] as number, (ground[i] as number) + MIN_GROUND_CLEARANCE)
    trackPoints.push(new THREE.Vector3(xs[i], y, zs[i]))
    ridePoints.push(new THREE.Vector3(xs[i], y + EYE_HEIGHT, zs[i]))
  }

  const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal', 0.2)
  return {
    stations: resolveStations(trackCurve, avoid),
    trackCurve,
    rideCurve: new THREE.CatmullRomCurve3(ridePoints, true, 'centripetal', 0.2),
  }
}

/** Yaw (three.js `rotation.y`) that points an object's local +Z along a tangent. */
export function stationYaw(tangent: { x: number; z: number }): number {
  return Math.atan2(tangent.x, tangent.z)
}

/** The platform's footprint for a station at loop position `t`. */
function platformFootprint(trackCurve: THREE.Curve<THREE.Vector3>, station: StationDef): Footprint {
  const centre = trackCurve.getPointAt(station.t)
  const tangent = trackCurve.getTangentAt(station.t)
  const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()
  return {
    id: `station:${station.name}`,
    label: station.name,
    kind: 'station',
    shape: {
      type: 'rect',
      x: centre.x + right.x * STATION_SIDE_OFFSET,
      z: centre.z + right.z * STATION_SIDE_OFFSET,
      w: PLATFORM_WIDTH,
      d: PLATFORM_LENGTH,
      rot: stationYaw(tangent),
    },
  }
}

/**
 * Moves each station along the loop, as little as possible, to a straight stretch where
 * its platform sits beside the rails without crossing them, and clear of every structure
 * and the other platforms. A station with no such spot keeps its nominal place.
 */
export function resolveStations(
  trackCurve: THREE.CatmullRomCurve3,
  avoid: readonly Footprint[]
): StationDef[] {
  const line = trackFootprints(trackCurve, [])
  const placed: Footprint[] = []
  return STATIONS.map((nominal) => {
    for (let step = 0; step <= 100; step++) {
      const offsets = step === 0 ? [0] : [step * 0.005, -step * 0.005]
      for (const offset of offsets) {
        const t = (((nominal.t + offset) % 1) + 1) % 1
        const candidate = { ...nominal, t }
        const platform = platformFootprint(trackCurve, candidate)
        const blocked = [...avoid, ...placed].some((fp) =>
          shapesOverlap(platform.shape, fp.shape, 1)
        )
        const onRails = line.some((fp) => shapesOverlap(platform.shape, fp.shape, 0.05))
        if (!blocked && !onRails) {
          placed.push(platform)
          return candidate
        }
      }
    }
    return { ...nominal }
  })
}

/** The ground the railway occupies: the line itself, and a platform at each station. */
export function trackFootprints(
  trackCurve: THREE.CatmullRomCurve3,
  stations: readonly StationDef[] = STATIONS
): Footprint[] {
  const samples = Math.max(64, Math.ceil(trackCurve.getLength() / 2))
  const points: Point2[] = []
  for (let i = 0; i < samples; i++) {
    const p = trackCurve.getPointAt(i / samples)
    points.push({ x: p.x, z: p.z })
  }

  return [
    {
      id: 'train-track',
      label: 'Railway',
      kind: 'track',
      shape: { type: 'path', points, halfWidth: TRACK_HALF_WIDTH, closed: true },
    },
    ...stations.map((station) => platformFootprint(trackCurve, station)),
  ]
}

/** Position (0..1) on a closed curve closest to a world point. */
export function nearestTrackT(curve: THREE.Curve<THREE.Vector3>, point: THREE.Vector3): number {
  const samples = 400
  let bestT = 0
  let bestDist = Number.POSITIVE_INFINITY
  const probe = new THREE.Vector3()
  for (let i = 0; i < samples; i++) {
    const t = i / samples
    curve.getPointAt(t, probe)
    const dx = probe.x - point.x
    const dz = probe.z - point.z
    const d = dx * dx + dz * dz
    if (d < bestDist) {
      bestDist = d
      bestT = t
    }
  }
  return bestT
}

export const STATION_APPROACH = 0.03
export const STATION_DEPART = 0.02
export const STATION_STOP_EPS = 0.0008
export const STATION_DWELL_SECONDS = 8

/** Forward distance (in loop fractions) from `from` to `to`. */
export function forwardDistance(from: number, to: number): number {
  return (((to - from) % 1) + 1) % 1
}

/** Speed multiplier (0.15..1) that eases the tram out of and into a stop `d` loop-fractions away. */
export function easeFactor(d: number, zone: number): number {
  return Math.min(1, Math.max(0.15, Math.sqrt(d / zone)))
}
