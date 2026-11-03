import { shapesOverlap } from '@systems/layout/footprint'
import { parkFootprints } from '@systems/layout/park-sites'
import { WorldLayout } from '@systems/layout/WorldLayout'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  buildTrackPath,
  EYE_HEIGHT,
  easeFactor,
  forwardDistance,
  MAX_TRACK_RADIUS,
  nearestTrackT,
  STATIONS,
  type StationDef,
  trackFootprints,
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

describe('track and structures', () => {
  const sites = parkFootprints().filter((f) => f.kind !== 'boundary')

  it('never overlaps a park structure, for any seed', () => {
    for (let seed = 0; seed < 60; seed++) {
      const { trackCurve, stations } = buildTrackPath(() => 0, seed * 17.3, sites)
      const laid = trackFootprints(trackCurve, stations)
      for (const piece of laid) {
        for (const site of sites) {
          expect(
            shapesOverlap(piece.shape, site.shape),
            `seed ${seed}: ${piece.id} hits ${site.id}`
          ).toBe(false)
        }
      }
    }
  })

  it('leaves the whole layout free of overlaps, for any seed', () => {
    for (let seed = 0; seed < 60; seed++) {
      const { trackCurve, stations } = buildTrackPath(() => 0, seed * 17.3, sites)
      const layout = new WorldLayout()
      layout.add(...parkFootprints(), ...trackFootprints(trackCurve, stations))
      expect(
        layout.findOverlaps().map((p) => `${p.a.id}/${p.b.id}`),
        `seed ${seed}`
      ).toEqual([])
    }
  })

  it('keeps stations near where they were meant to be', () => {
    const { stations } = buildTrackPath(() => 0, 5, sites)
    expect(stations).toHaveLength(3)
    stations.forEach((s, i) => {
      const nominal = STATIONS[i] as StationDef
      const gap = Math.min(Math.abs(s.t - nominal.t), 1 - Math.abs(s.t - nominal.t))
      expect(gap).toBeLessThanOrEqual(0.3)
    })
  })
})
