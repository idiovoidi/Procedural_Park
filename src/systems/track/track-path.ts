import { TAU } from '@core/constants'
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

export interface TrackPath {
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
  seed: number = Math.random() * 1000
): TrackPath {
  const numPoints = 64
  const xs: number[] = []
  const zs: number[] = []
  const ground: number[] = []

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * TAU
    const baseRadius = 40 + Math.sin(seed + angle * 3) * 9
    const radiusVariation = Math.sin(seed * 2 + angle * 5) * 5
    const r = Math.min(MAX_TRACK_RADIUS, baseRadius + radiusVariation)

    const spiral = Math.sin(seed + angle * 2) * 0.12
    const x = Math.sin(angle + spiral) * r
    const z = Math.cos(angle + spiral) * r
    xs.push(x)
    zs.push(z)
    ground.push(heightAt(x, z))
  }

  const smoothed = smoothCircular(ground, 3, 2)
  const trackPoints: THREE.Vector3[] = []
  const ridePoints: THREE.Vector3[] = []
  for (let i = 0; i < numPoints; i++) {
    const y = Math.max(smoothed[i] as number, (ground[i] as number) + MIN_GROUND_CLEARANCE)
    trackPoints.push(new THREE.Vector3(xs[i], y, zs[i]))
    ridePoints.push(new THREE.Vector3(xs[i], y + EYE_HEIGHT, zs[i]))
  }

  return {
    trackCurve: new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal', 0.2),
    rideCurve: new THREE.CatmullRomCurve3(ridePoints, true, 'centripetal', 0.2),
  }
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
