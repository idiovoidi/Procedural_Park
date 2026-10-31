import { TAU } from '@core/constants'
import * as THREE from 'three'
import { createRng, noise2D } from './noise-utils'
import type { Rand } from './prop-geometry'
import { WATER_LEVEL } from './terrain-height'
import {
  buildCattails,
  buildCrystalCluster,
  buildFlowerPatch,
  buildGrassClump,
  buildLilyPad,
  buildMushroomCluster,
  buildReeds,
  buildRock,
  buildTree,
  type RockKind,
  type RockShape,
  type TreeKind,
} from './terrain-props'
import type { BiomeType } from './types'

export interface ScatterContext {
  seed: number
  mapSize: number
  heightAt(x: number, z: number): number
  biomeAt(x: number, z: number): BiomeType
}

/** Circles around park structures where nothing should sprout (x, z, radius). */
export const PARK_KEEP_OUT: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: 0, z: 47, r: 19 }, // main gate + entrance plaza
  { x: 25, z: 42, r: 13 }, // ranger station
  { x: -25, z: 42, r: 14 }, // food store
  { x: -35, z: -20, r: 14 }, // experiment lab
]

/** Trees and big rocks stay outside the boundary fence (radius 70). */
const WILD_RADIUS = 74

interface BiomeScatter {
  trees: number
  treeMix: Array<[TreeKind, number]>
  rocks: number
  rockMix: Array<[RockKind, number]>
  grass: number
  flowers: number
  crystals: number
  /** Multiplier applied to instance colour of grass clumps. */
  grassTint: [number, number, number]
}

const SCATTER: Record<BiomeType, BiomeScatter> = {
  forest: {
    trees: 0.85,
    treeMix: [
      ['pine', 0.5],
      ['oak', 0.35],
      ['birch', 0.15],
    ],
    rocks: 0.12,
    rockMix: [
      ['mossy', 0.8],
      ['stone', 0.2],
    ],
    grass: 0.55,
    flowers: 0.04,
    crystals: 0,
    grassTint: [0.8, 0.95, 0.8],
  },
  meadow: {
    trees: 0.08,
    treeMix: [
      ['oak', 0.4],
      ['birch', 0.3],
      ['blossom', 0.3],
    ],
    rocks: 0.05,
    rockMix: [
      ['stone', 0.6],
      ['mossy', 0.4],
    ],
    grass: 0.9,
    flowers: 0.5,
    crystals: 0,
    grassTint: [1.3, 1.25, 0.75],
  },
  rocky: {
    trees: 0.12,
    treeMix: [
      ['pine', 0.5],
      ['dead', 0.5],
    ],
    rocks: 0.55,
    rockMix: [['stone', 1]],
    grass: 0.12,
    flowers: 0,
    crystals: 0.01,
    grassTint: [1.1, 1.0, 0.7],
  },
  wetland: {
    trees: 0.12,
    treeMix: [
      ['oak', 0.4],
      ['dead', 0.6],
    ],
    rocks: 0.08,
    rockMix: [['mossy', 1]],
    grass: 0.45,
    flowers: 0.08,
    crystals: 0,
    grassTint: [0.8, 1.0, 0.95],
  },
  crystal_cave: {
    trees: 0.04,
    treeMix: [['dead', 1]],
    rocks: 0.25,
    rockMix: [
      ['crystal', 0.7],
      ['stone', 0.3],
    ],
    grass: 0.04,
    flowers: 0,
    crystals: 0.12,
    grassTint: [0.6, 0.8, 1.0],
  },
  floating_islands: {
    trees: 0.1,
    treeMix: [
      ['blossom', 0.6],
      ['oak', 0.4],
    ],
    rocks: 0.1,
    rockMix: [['stone', 1]],
    grass: 0.5,
    flowers: 0.2,
    crystals: 0,
    grassTint: [1.1, 1.2, 0.95],
  },
}

const CRYSTAL_HUES = [0.75, 0.55, 0.88]
const FLOWER_COLORS = [0xf4f1e8, 0xf2c744, 0xe86a92, 0x9a7be0]
const ROCK_SHAPES: RockShape[] = ['boulder', 'slab', 'spire', 'cluster']

function weighted<T>(rand: Rand, list: Array<[T, number]>): T {
  let roll = rand() * list.reduce((sum, [, w]) => sum + w, 0)
  for (const [item, w] of list) {
    roll -= w
    if (roll <= 0) return item
  }
  return list[list.length - 1][0]
}

const pick = <T>(rand: Rand, list: T[]): T => list[Math.floor(rand() * list.length)]

/** One geometry + material and everywhere it appears; becomes a single InstancedMesh. */
class Batch {
  private matrices: THREE.Matrix4[] = []
  private colors: Array<THREE.Color | null> = []
  private geometry: THREE.BufferGeometry
  private material: THREE.Material

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material) {
    this.geometry = geometry
    this.material = material
  }

  add(matrix: THREE.Matrix4, color: THREE.Color | null = null) {
    this.matrices.push(matrix)
    this.colors.push(color)
  }

  build(): THREE.InstancedMesh | null {
    if (this.matrices.length === 0) {
      this.geometry.dispose()
      return null
    }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.matrices.length)
    const white = new THREE.Color(1, 1, 1)
    const tinted = this.colors.some((c) => c !== null)
    this.matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m)
      if (tinted) mesh.setColorAt(i, this.colors[i] ?? white)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.receiveShadow = true
    mesh.castShadow = false
    return mesh
  }
}

function makeMaterial(options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.92,
    metalness: 0,
    ...options,
  })
}

class PropLibrary {
  private solid = makeMaterial()
  private double = makeMaterial({ side: THREE.DoubleSide })
  /** Smooth-shaded material for blades, whose normals are authored to face up. */
  private blades = makeMaterial({ flatShading: false })
  readonly trees = {} as Record<TreeKind, Batch[]>
  readonly rocks = {} as Record<RockKind, Record<RockShape, Batch[]>>
  readonly crystals: Batch[] = []
  readonly grass: Batch[] = []
  readonly flowers: Batch[] = []
  readonly mushrooms: Batch[] = []
  readonly reeds: Batch[] = []
  readonly lilies: Batch[] = []
  private everything: Batch[] = []

  constructor(rand: Rand) {
    const make = (geometry: THREE.BufferGeometry, material: THREE.Material = this.solid) => {
      const batch = new Batch(geometry, material)
      this.everything.push(batch)
      return batch
    }

    const treeKinds: Array<[TreeKind, number]> = [
      ['pine', 4],
      ['oak', 4],
      ['birch', 3],
      ['blossom', 3],
      ['dead', 3],
    ]
    for (const [kind, variants] of treeKinds) {
      this.trees[kind] = Array.from({ length: variants }, () => make(buildTree(rand, kind)))
    }

    for (const kind of ['stone', 'mossy', 'crystal'] as RockKind[]) {
      this.rocks[kind] = {} as Record<RockShape, Batch[]>
      for (const shape of ROCK_SHAPES) {
        const variants = shape === 'boulder' ? 3 : 2
        this.rocks[kind][shape] = Array.from({ length: variants }, () =>
          make(buildRock(rand, kind, shape))
        )
      }
    }

    for (const hue of CRYSTAL_HUES) {
      const glow = new THREE.Color().setHSL(hue, 0.7, 0.35, THREE.SRGBColorSpace)
      const material = makeMaterial({ emissive: glow, emissiveIntensity: 0.7, roughness: 0.35 })
      for (let i = 0; i < 2; i++) this.crystals.push(make(buildCrystalCluster(rand, hue), material))
    }

    for (let i = 0; i < 4; i++) this.grass.push(make(buildGrassClump(rand), this.blades))
    for (const color of FLOWER_COLORS) this.flowers.push(make(buildFlowerPatch(rand, color)))
    for (const color of [0xc23a2e, 0xd98a3d]) {
      this.mushrooms.push(make(buildMushroomCluster(rand, color)))
    }
    for (let i = 0; i < 2; i++) this.reeds.push(make(buildReeds(rand), this.blades))
    this.reeds.push(make(buildCattails(rand)))
    this.lilies.push(make(buildLilyPad(rand, false), this.double))
    this.lilies.push(make(buildLilyPad(rand, true), this.double))
  }

  build(): THREE.InstancedMesh[] {
    return this.everything.map((b) => b.build()).filter((m): m is THREE.InstancedMesh => m !== null)
  }
}

const _euler = new THREE.Euler()
const _quat = new THREE.Quaternion()
const _pos = new THREE.Vector3()
const _scale = new THREE.Vector3()

function transform(
  x: number,
  y: number,
  z: number,
  yaw: number,
  scale: number,
  tiltX = 0,
  tiltZ = 0,
  stretchY = 1
): THREE.Matrix4 {
  _euler.set(tiltX, yaw, tiltZ, 'YXZ')
  _quat.setFromEuler(_euler)
  _pos.set(x, y, z)
  _scale.set(scale, scale * stretchY, scale)
  return new THREE.Matrix4().compose(_pos, _quat, _scale)
}

/** Fixed-cell spatial hash for cheap minimum-distance checks. */
class SpacingGrid {
  private cells = new Map<number, Array<[number, number]>>()
  private cell: number

  constructor(cell: number) {
    this.cell = cell
  }

  private key(cx: number, cz: number) {
    return cx * 73856093 + cz * 19349663
  }

  add(x: number, z: number) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(z / this.cell))
    const bucket = this.cells.get(k)
    if (bucket) bucket.push([x, z])
    else this.cells.set(k, [[x, z]])
  }

  /** True if any stored point lies within `distance` of (x, z). */
  near(x: number, z: number, distance: number): boolean {
    const cx = Math.floor(x / this.cell)
    const cz = Math.floor(z / this.cell)
    const reach = Math.ceil(distance / this.cell)
    for (let i = -reach; i <= reach; i++) {
      for (let j = -reach; j <= reach; j++) {
        const bucket = this.cells.get(this.key(cx + i, cz + j))
        if (!bucket) continue
        for (const [px, pz] of bucket) {
          if ((px - x) ** 2 + (pz - z) ** 2 < distance * distance) return true
        }
      }
    }
    return false
  }
}

export function isKeptClear(x: number, z: number, margin = 0): boolean {
  return PARK_KEEP_OUT.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + margin)
}

/**
 * Scatter trees, rocks, crystals, undergrowth and water plants across the terrain.
 * Everything is instanced, so thousands of props cost a few dozen draw calls.
 */
export function scatterProps(ctx: ScatterContext): THREE.Group {
  const rand = createRng(ctx.seed)
  const lib = new PropLibrary(rand)
  const half = ctx.mapSize / 2
  const range = half * 0.92

  const sample = () => [(rand() * 2 - 1) * range, (rand() * 2 - 1) * range] as const
  const slopeAt = (x: number, z: number) =>
    Math.max(
      Math.abs(ctx.heightAt(x + 1, z) - ctx.heightAt(x - 1, z)),
      Math.abs(ctx.heightAt(x, z + 1) - ctx.heightAt(x, z - 1))
    ) / 2
  const isLand = (h: number) => h > WATER_LEVEL + 0.3

  const treeSpacing = new SpacingGrid(6)
  const forestTrees: Array<{ x: number; y: number; z: number; scale: number }> = []

  // Trees, clumped into groves by a low-frequency noise field
  for (let i = 0; i < 2600; i++) {
    const [x, z] = sample()
    if (Math.hypot(x, z) < WILD_RADIUS) continue
    const h = ctx.heightAt(x, z)
    if (!isLand(h)) continue
    const slope = slopeAt(x, z)
    if (slope > 0.7) continue

    const biome = ctx.biomeAt(x, z)
    const config = SCATTER[biome]
    const grove = Math.max(
      0.05,
      Math.min(1.3, 0.55 + noise2D(x * 0.045 + ctx.seed, z * 0.045) * 0.9)
    )
    if (rand() > config.trees * grove) continue
    if (treeSpacing.near(x, z, 3.4)) continue

    const kind = weighted(rand, config.treeMix)
    const scale = 0.85 + rand() * 0.5
    const y = h - slope * 0.8 * scale
    pick(rand, lib.trees[kind]).add(
      transform(x, y, z, rand() * TAU, scale, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.04)
    )
    treeSpacing.add(x, z)
    if (biome === 'forest') forestTrees.push({ x, y: h, z, scale })
  }

  // Rocks and crystals, favouring slopes
  for (let i = 0; i < 1100; i++) {
    const [x, z] = sample()
    if (Math.hypot(x, z) < WILD_RADIUS - 2) continue
    const h = ctx.heightAt(x, z)
    if (!isLand(h)) continue
    const slope = slopeAt(x, z)
    const biome = ctx.biomeAt(x, z)
    const config = SCATTER[biome]
    if (treeSpacing.near(x, z, 1.4)) continue

    if (rand() < config.crystals) {
      const scale = 0.7 + rand() * 0.9
      pick(rand, lib.crystals).add(transform(x, h - 0.1, z, rand() * TAU, scale))
      continue
    }
    if (rand() > config.rocks * (0.6 + slope * 2)) continue

    const kind = weighted(rand, config.rockMix)
    const shape = weighted<RockShape>(rand, [
      ['boulder', 0.5],
      ['slab', 0.2],
      ['spire', 0.1],
      ['cluster', 0.2],
    ])
    const scale = 0.6 + rand() ** 2.5 * 2.4
    pick(rand, lib.rocks[kind][shape]).add(
      transform(
        x,
        h - 0.18 * scale - slope * 0.4 * scale,
        z,
        rand() * TAU,
        scale,
        (rand() - 0.5) * 0.25,
        (rand() - 0.5) * 0.25
      )
    )
  }

  // Mushroom rings around forest trees
  for (const tree of forestTrees) {
    if (rand() > 0.2) continue
    const rings = 1 + Math.floor(rand() * 2)
    for (let i = 0; i < rings; i++) {
      const angle = rand() * TAU
      const distance = 0.9 + rand() * 0.9
      const x = tree.x + Math.cos(angle) * distance * tree.scale
      const z = tree.z + Math.sin(angle) * distance * tree.scale
      pick(rand, lib.mushrooms).add(
        transform(x, ctx.heightAt(x, z) - 0.02, z, rand() * TAU, 0.9 + rand() * 0.8)
      )
    }
  }

  // Grass: dense everywhere, shorter inside the park so it stays out of the way
  const tint = new THREE.Color()
  for (let i = 0; i < 9000; i++) {
    const [x, z] = sample()
    if (isKeptClear(x, z, 1)) continue
    const h = ctx.heightAt(x, z)
    if (!isLand(h)) continue
    const config = SCATTER[ctx.biomeAt(x, z)]
    if (rand() > config.grass) continue
    if (slopeAt(x, z) > 0.9) continue

    const inPark = Math.hypot(x, z) < WILD_RADIUS - 4
    const scale = (inPark ? 0.7 : 1.0) * (0.8 + rand() * 0.7)
    const [r, g, b] = config.grassTint
    const brightness = 0.85 + rand() * 0.3
    tint.setRGB(r * brightness, g * brightness, b * brightness)
    pick(rand, lib.grass).add(transform(x, h - 0.03, z, rand() * TAU, scale), tint.clone())
  }

  // Flowers
  for (let i = 0; i < 3500; i++) {
    const [x, z] = sample()
    if (isKeptClear(x, z, 1)) continue
    const h = ctx.heightAt(x, z)
    if (!isLand(h)) continue
    if (rand() > SCATTER[ctx.biomeAt(x, z)].flowers) continue

    // Same-coloured patches: pick the colour from low-frequency noise
    const colorIndex = Math.floor(
      ((noise2D(x * 0.08 + 40, z * 0.08) + 1) / 2) * lib.flowers.length * 0.999
    )
    lib.flowers[colorIndex].add(transform(x, h - 0.02, z, rand() * TAU, 0.8 + rand() * 0.6))
  }

  // Shoreline reeds and lily pads
  const lilySpacing = new SpacingGrid(2)
  for (let i = 0; i < 7000; i++) {
    const [x, z] = sample()
    const h = ctx.heightAt(x, z)
    if (isKeptClear(x, z, 1)) continue

    if (h > WATER_LEVEL - 0.45 && h < WATER_LEVEL + 0.5 && rand() < 0.35) {
      pick(rand, lib.reeds).add(
        transform(x, h - 0.05, z, rand() * TAU, 0.8 + rand() * 0.6, 0, 0, 0.8 + rand() * 0.5)
      )
    } else if (h < WATER_LEVEL - 0.3 && h > WATER_LEVEL - 1.7 && rand() < 0.1) {
      if (lilySpacing.near(x, z, 1.4)) continue
      pick(rand, lib.lilies).add(
        transform(x, WATER_LEVEL + 0.03, z, rand() * TAU, 0.8 + rand() * 0.5)
      )
      lilySpacing.add(x, z)
    }
  }

  const group = new THREE.Group()
  group.name = 'TerrainProps'
  group.add(...lib.build())
  return group
}
