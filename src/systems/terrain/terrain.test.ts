import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createRng } from './noise-utils'
import { TerrainSystem } from './TerrainSystem'
import { createHeightSampler, PARK_FLAT_RADIUS, PARK_FLOOR_Y, WATER_LEVEL } from './terrain-height'
import { buildLandmarks } from './terrain-landmarks'
import { buildTerrainMesh } from './terrain-mesh'
import {
  buildCattails,
  buildCrystalCluster,
  buildFloatingIsland,
  buildFlowerPatch,
  buildGrassClump,
  buildLilyPad,
  buildMountainRing,
  buildMushroomCluster,
  buildReeds,
  buildRock,
  buildStoneArch,
  buildTree,
} from './terrain-props'
import { isKeptClear, PARK_KEEP_OUT, scatterProps } from './terrain-scatter'

describe('height sampler', () => {
  const heightAt = createHeightSampler(42)

  it('is deterministic per seed and differs between seeds', () => {
    expect(heightAt(100, -80)).toBe(createHeightSampler(42)(100, -80))
    expect(heightAt(100, -80)).not.toBe(createHeightSampler(43)(100, -80))
  })

  it('is dead flat inside the park so structures and creatures share one floor', () => {
    for (let a = 0; a < 12; a++) {
      const angle = (a / 12) * Math.PI * 2
      for (const r of [0, 20, 45, PARK_FLAT_RADIUS - 1]) {
        expect(heightAt(Math.cos(angle) * r, Math.sin(angle) * r)).toBeCloseTo(PARK_FLOOR_Y, 6)
      }
    }
  })

  it('has real relief in the wilds and falls away at the map edge', () => {
    const wild: number[] = []
    for (let x = -130; x <= 130; x += 5) {
      for (let z = -130; z <= 130; z += 5) {
        if (Math.hypot(x, z) > 110) wild.push(heightAt(x, z))
      }
    }
    expect(Math.max(...wild) - Math.min(...wild)).toBeGreaterThan(4)
    expect(heightAt(149, 0)).toBeLessThan(WATER_LEVEL)
  })

  it('is continuous', () => {
    for (let i = 0; i < 100; i++) {
      const x = -140 + i * 2.8
      expect(Math.abs(heightAt(x, 77) - heightAt(x + 0.1, 77))).toBeLessThan(0.3)
    }
  })
})

describe('prop geometry', () => {
  const rand = createRng(5)
  const builders: Record<string, () => THREE.BufferGeometry> = {
    pine: () => buildTree(rand, 'pine'),
    oak: () => buildTree(rand, 'oak'),
    birch: () => buildTree(rand, 'birch'),
    blossom: () => buildTree(rand, 'blossom'),
    dead: () => buildTree(rand, 'dead'),
    boulder: () => buildRock(rand, 'mossy', 'boulder'),
    slab: () => buildRock(rand, 'stone', 'slab'),
    spire: () => buildRock(rand, 'crystal', 'spire'),
    cluster: () => buildRock(rand, 'stone', 'cluster'),
    crystals: () => buildCrystalCluster(rand, 0.75),
    grass: () => buildGrassClump(rand),
    reeds: () => buildReeds(rand),
    cattails: () => buildCattails(rand),
    flowers: () => buildFlowerPatch(rand, 0xe86a92),
    mushrooms: () => buildMushroomCluster(rand, 0xc23a2e),
    lily: () => buildLilyPad(rand, true),
    arch: () => buildStoneArch(rand),
    island: () => buildFloatingIsland(rand),
    mountains: () => buildMountainRing(rand, 330, 6),
  }

  for (const [name, build] of Object.entries(builders)) {
    it(`${name} is a finite, fully coloured mesh`, () => {
      const geo = build()
      const { position, color, normal } = geo.attributes
      expect(position.count).toBeGreaterThan(0)
      expect(color.count).toBe(position.count)
      expect(normal.count).toBe(position.count)
      for (const value of position.array) expect(Number.isFinite(value)).toBe(true)
      for (const value of color.array) expect(Number.isFinite(value)).toBe(true)
    })
  }

  it('trees and rocks stand on the ground rather than floating above it', () => {
    for (const kind of ['pine', 'oak', 'birch', 'blossom', 'dead'] as const) {
      const geo = buildTree(rand, kind)
      geo.computeBoundingBox()
      expect(geo.boundingBox?.min.y).toBeLessThanOrEqual(0.05)
      expect(geo.boundingBox?.min.y).toBeGreaterThan(-0.6)
      expect(geo.boundingBox?.max.y).toBeGreaterThan(2.5)
    }
    const rock = buildRock(rand, 'stone', 'boulder')
    rock.computeBoundingBox()
    expect(rock.boundingBox?.min.y).toBeCloseTo(0, 5)
  })
})

describe('generated world', () => {
  const system = new TerrainSystem(new THREE.Scene())
  system.generateTerrain(42)

  it('draws a terrain surface that matches the height function', () => {
    const mesh = buildTerrainMesh({
      mapSize: 300,
      segments: 30,
      heightAt: (x, z) => system.getHeightAt(x, z),
      groundColorAt: (_x, _z, out) => out.setRGB(0.3, 0.5, 0.3),
    })
    const pos = mesh.geometry.attributes.position
    for (let i = 0; i < pos.count; i += 37) {
      expect(pos.getY(i)).toBeCloseTo(system.getHeightAt(pos.getX(i), pos.getZ(i)), 5)
    }
    // Faces point up
    const normals = mesh.geometry.attributes.normal
    let up = 0
    for (let i = 0; i < normals.count; i++) if (normals.getY(i) > 0) up++
    expect(up / normals.count).toBeGreaterThan(0.99)
  })

  it('has a mix of biomes rather than one', () => {
    expect(system.getCurrentBiomes().length).toBeGreaterThanOrEqual(3)
  })

  it('hands creatures the same floor the park is built on', () => {
    expect(system.getFloorHeightAt(10, 10)).toBeCloseTo(PARK_FLOOR_Y, 6)
    expect(system.getFloorHeightAt(10, 10)).toBe(system.getHeightAt(10, 10))
  })

  it('scatters props that sit on the terrain and keep out of the park structures', () => {
    const props = scatterProps({
      seed: 2042,
      mapSize: 300,
      heightAt: (x, z) => system.getHeightAt(x, z),
      biomeAt: (x, z) => system.getBiomeAt(x, z),
    })
    const meshes = props.children as THREE.InstancedMesh[]
    const total = meshes.reduce((n, m) => n + m.count, 0)
    expect(meshes.length).toBeGreaterThan(5)
    expect(total).toBeGreaterThan(1000)

    const m = new THREE.Matrix4()
    const p = new THREE.Vector3()
    for (const mesh of meshes) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m)
        p.setFromMatrixPosition(m)
        expect(Number.isFinite(p.x + p.y + p.z)).toBe(true)
        // Within half a unit-ish of the ground it was placed on (lily pads sit on the water)
        const ground = Math.max(system.getHeightAt(p.x, p.z), WATER_LEVEL)
        expect(Math.abs(p.y - ground)).toBeLessThan(1.5)
        expect(p.y).toBeLessThan(9)
      }
    }
  })

  it('places landmarks and keeps structures clear', () => {
    const landmarks = buildLandmarks({
      seed: 2042,
      mapSize: 300,
      heightAt: (x, z) => system.getHeightAt(x, z),
      biomeAt: (x, z) => system.getBiomeAt(x, z),
    })
    const names = landmarks.children.map((c) => c.name)
    expect(names).toContain('StoneArch')
    expect(names).toContain('AncientTree')
    expect(names).toContain('CrystalSpire')
    expect(names).toContain('FloatingIsland')

    for (const zone of PARK_KEEP_OUT) expect(isKeptClear(zone.x, zone.z)).toBe(true)
    expect(isKeptClear(0, -40)).toBe(false)
  })
})
