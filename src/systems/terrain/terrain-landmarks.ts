import { TAU } from '@core/constants'
import * as THREE from 'three'
import { createRng } from './noise-utils'
import { WATER_LEVEL } from './terrain-height'
import {
  buildBroadleaf,
  buildCrystalCluster,
  buildFloatingIsland,
  buildStoneArch,
} from './terrain-props'
import type { ScatterContext } from './terrain-scatter'
import type { BiomeType } from './types'

const WILD_RADIUS = 80

interface LandmarkSpec {
  name: string
  biome: BiomeType
  want: number
  build: (rand: () => number, ctx: ScatterContext, x: number, z: number, h: number) => THREE.Mesh
}

function solid(options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.92,
    metalness: 0,
    ...options,
  })
}

const SPECS: LandmarkSpec[] = [
  {
    name: 'StoneArch',
    biome: 'rocky',
    want: 2,
    build: (rand, ctx, x, z, h) => {
      const mesh = new THREE.Mesh(buildStoneArch(rand), solid())
      const yaw = rand() * TAU
      // Pillars sit about 2.6-3.2 either side of centre along the arch's width axis
      const dx = Math.cos(yaw) * 3
      const dz = -Math.sin(yaw) * 3
      const base = Math.min(h, ctx.heightAt(x + dx, z + dz), ctx.heightAt(x - dx, z - dz))
      mesh.position.set(x, base - 0.3, z)
      mesh.rotation.y = yaw
      return mesh
    },
  },
  {
    name: 'AncientTree',
    biome: 'forest',
    want: 3,
    build: (rand, _ctx, x, z, h) => {
      const mesh = new THREE.Mesh(buildBroadleaf(rand, 'oak'), solid())
      mesh.scale.setScalar(2.2 + rand() * 0.9)
      mesh.position.set(x, h - 0.3, z)
      mesh.rotation.y = rand() * TAU
      return mesh
    },
  },
  {
    name: 'CrystalSpire',
    biome: 'crystal_cave',
    want: 3,
    build: (rand, _ctx, x, z, h) => {
      const hue = [0.75, 0.55, 0.88][Math.floor(rand() * 3)]
      const glow = new THREE.Color().setHSL(hue, 0.7, 0.35, THREE.SRGBColorSpace)
      const material = solid({ emissive: glow, emissiveIntensity: 0.7, roughness: 0.35 })
      const mesh = new THREE.Mesh(buildCrystalCluster(rand, hue), material)
      mesh.scale.setScalar(1.8 + rand() * 0.8)
      mesh.position.set(x, h - 0.2, z)
      mesh.rotation.y = rand() * TAU
      return mesh
    },
  },
]

/**
 * Hand-placed set pieces: stone arches in rocky country, ancient trees in forests,
 * crystal spires in the caverns, and islands of rock hovering above the wilds.
 */
export function buildLandmarks(ctx: ScatterContext): THREE.Group {
  const rand = createRng(ctx.seed)
  const group = new THREE.Group()
  group.name = 'TerrainLandmarks'

  const half = ctx.mapSize / 2
  const range = half * 0.7
  const randomSpot = () => {
    for (let tries = 0; tries < 50; tries++) {
      const x = (rand() * 2 - 1) * range
      const z = (rand() * 2 - 1) * range
      if (Math.hypot(x, z) < WILD_RADIUS) continue
      const h = ctx.heightAt(x, z)
      if (h > WATER_LEVEL + 0.5) return { x, z, h }
    }
    return null
  }

  const placed = new Map<string, number>()
  const place = (spec: LandmarkSpec, x: number, z: number, h: number) => {
    const mesh = spec.build(rand, ctx, x, z, h)
    mesh.name = spec.name
    mesh.receiveShadow = true
    group.add(mesh)
    placed.set(spec.name, (placed.get(spec.name) ?? 0) + 1)
  }

  for (let i = 0; i < 250; i++) {
    const spot = randomSpot()
    if (!spot) continue
    const biome = ctx.biomeAt(spot.x, spot.z)
    const spec = SPECS.find((s) => s.biome === biome && (placed.get(s.name) ?? 0) < s.want)
    if (spec) place(spec, spot.x, spot.z, spot.h)
  }

  // Make sure every set piece appears at least once, whatever the terrain turned out to be
  for (const spec of SPECS) {
    if (placed.has(spec.name)) continue
    const spot = randomSpot()
    if (spot) place(spec, spot.x, spot.z, spot.h)
  }

  for (let i = 0; i < 3; i++) {
    const spot = randomSpot()
    if (!spot) continue
    const island = new THREE.Mesh(buildFloatingIsland(rand), solid())
    island.name = 'FloatingIsland'
    island.position.set(spot.x, spot.h + 10 + rand() * 6, spot.z)
    island.rotation.y = rand() * TAU
    island.scale.setScalar(0.9 + rand() * 0.6)
    group.add(island)
  }

  return group
}
