import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  buildTrackPath,
  EYE_HEIGHT,
  easeFactor,
  forwardDistance,
  MAX_TRACK_RADIUS,
  nearestTrackT,
} from './track-path'

const hilly = (x: number, z: number) => Math.sin(x * 0.1) * 2 + Math.cos(z * 0.08) * 1.5

describe('buildTrackPath', () => {
  it('keeps the rails above the ground and inside the park', () => {
    const { trackCurve } = buildTrackPath(hilly, 7)
    for (let i = 0; i < 200; i++) {
      const p = trackCurve.getPointAt(i / 200)
      expect(p.y).toBeGreaterThan(hilly(p.x, p.z) + 0.1)
      expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(MAX_TRACK_RADIUS + 3)
    }
  })

  it('puts the ride line exactly eye height above the rails', () => {
    const { trackCurve, rideCurve } = buildTrackPath(hilly, 3)
    const a = trackCurve.getPoint(0.37)
    const b = rideCurve.getPoint(0.37)
    expect(b.y - a.y).toBeCloseTo(EYE_HEIGHT, 5)
  })
})

describe('nearestTrackT', () => {
  it('finds the loop position of a point beside the track', () => {
    const { rideCurve } = buildTrackPath(() => 0, 1)
    const t = 0.42
    const p = rideCurve.getPointAt(t)
    const near = nearestTrackT(rideCurve, new THREE.Vector3(p.x + 1, p.y, p.z + 1))
    expect(forwardDistance(near, t) < 0.01 || forwardDistance(t, near) < 0.01).toBe(true)
  })
})

describe('station helpers', () => {
  it('measures forward distance around the loop', () => {
    expect(forwardDistance(0.9, 0.1)).toBeCloseTo(0.2)
    expect(forwardDistance(0.1, 0.9)).toBeCloseTo(0.8)
  })

  it('slows toward a stop but never fully halts', () => {
    expect(easeFactor(0.03, 0.03)).toBe(1)
    expect(easeFactor(0, 0.03)).toBe(0.15)
  })
})
