import { TAU } from '@core/constants'
import { disposeThreeObject } from '@core/utils'
import * as THREE from 'three'
import { BIOME_CONFIGS, generateBiomeMap } from './biome-generator'
import { createRng } from './noise-utils'
import { createHeightSampler, MAP_SIZE } from './terrain-height'
import { buildLandmarks } from './terrain-landmarks'
import { buildTerrainMesh, buildWater } from './terrain-mesh'
import { buildMountainRing } from './terrain-props'
import { type ScatterContext, scatterProps } from './terrain-scatter'
import type { BiomeType } from './types'

export class TerrainSystem {
  private scene: THREE.Scene
  private terrainGroup: THREE.Group
  private mountains: THREE.Mesh | null = null
  private biomeMap: BiomeType[][] = []
  private currentBiomes: Set<BiomeType> = new Set()
  private heightSampler: (x: number, z: number) => number = () => 0
  private readonly mapSize = MAP_SIZE
  /** Cells along each side of the biome grid. */
  private readonly resolution = 100
  /** Quads along each side of the rendered mesh. */
  private readonly meshSegments = 150

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.terrainGroup = new THREE.Group()
    this.terrainGroup.name = 'Terrain'
    this.scene.add(this.terrainGroup)
    this.addDistantMountains()
  }

  public generateTerrain(seed: number = 42) {
    this.clearTerrain()

    this.heightSampler = createHeightSampler(seed)
    this.biomeMap = generateBiomeMap(this.sampleHeightGrid(), this.resolution, seed + 1000)

    this.currentBiomes.clear()
    for (let x = 0; x < this.resolution; x++) {
      for (let z = 0; z < this.resolution; z++) {
        this.currentBiomes.add(this.biomeMap[x][z])
      }
    }

    this.terrainGroup.add(
      buildTerrainMesh({
        mapSize: this.mapSize,
        segments: this.meshSegments,
        heightAt: this.heightSampler,
        groundColorAt: (x, z, out) => this.blendGroundColor(x, z, out),
      }),
      buildWater(this.mapSize * 2.4)
    )

    const context: ScatterContext = {
      seed: seed + 2000,
      mapSize: this.mapSize,
      heightAt: (x, z) => this.getHeightAt(x, z),
      biomeAt: (x, z) => this.getBiomeAt(x, z),
    }
    this.terrainGroup.add(scatterProps(context), buildLandmarks(context))

    this.updateSceneLighting()
  }

  private clearTerrain() {
    while (this.terrainGroup.children.length > 0) {
      const child = this.terrainGroup.children[0]
      this.terrainGroup.remove(child)
      disposeThreeObject(child)
    }
    this.currentBiomes.clear()
  }

  public dispose() {
    this.clearTerrain()
    if (this.mountains) {
      disposeThreeObject(this.mountains)
      this.mountains = null
    }
    this.scene.remove(this.terrainGroup)
  }

  /** Heights at the centre of each biome cell, indexed [x][z]. */
  private sampleHeightGrid(): number[][] {
    const grid: number[][] = []
    for (let x = 0; x < this.resolution; x++) {
      grid[x] = []
      for (let z = 0; z < this.resolution; z++) {
        const wx = ((x + 0.5) / this.resolution - 0.5) * this.mapSize
        const wz = ((z + 0.5) / this.resolution - 0.5) * this.mapSize
        grid[x][z] = this.heightSampler(wx, wz)
      }
    }
    return grid
  }

  /** Bilinear blend of the four nearest cells' ground colours, so biomes fade into each other. */
  private blendGroundColor(x: number, z: number, out: THREE.Color) {
    const fx = Math.min(
      this.resolution - 1.001,
      Math.max(0, ((x + this.mapSize / 2) / this.mapSize) * this.resolution - 0.5)
    )
    const fz = Math.min(
      this.resolution - 1.001,
      Math.max(0, ((z + this.mapSize / 2) / this.mapSize) * this.resolution - 0.5)
    )
    const x0 = Math.floor(fx)
    const z0 = Math.floor(fz)
    const tx = fx - x0
    const tz = fz - z0

    const corner = (cx: number, cz: number) => BIOME_CONFIGS[this.biomeMap[cx][cz]].groundColor
    out.setRGB(0, 0, 0)
    const weights: Array<[number, number, number]> = [
      [x0, z0, (1 - tx) * (1 - tz)],
      [x0 + 1, z0, tx * (1 - tz)],
      [x0, z0 + 1, (1 - tx) * tz],
      [x0 + 1, z0 + 1, tx * tz],
    ]
    for (const [cx, cz, w] of weights) {
      const c = corner(cx, cz)
      out.r += c.r * w
      out.g += c.g * w
      out.b += c.b * w
    }
  }

  private updateSceneLighting() {
    // Dominant biome among the cells the player can actually see (skip the sunken map edge)
    const counts = new Map<BiomeType, number>()
    const margin = Math.floor(this.resolution * 0.125)
    for (let x = margin; x < this.resolution - margin; x++) {
      for (let z = margin; z < this.resolution - margin; z++) {
        const biome = this.biomeMap[x][z]
        counts.set(biome, (counts.get(biome) ?? 0) + 1)
      }
    }

    let dominant: BiomeType = 'forest'
    let max = 0
    for (const [biome, count] of counts) {
      if (count > max) {
        max = count
        dominant = biome
      }
    }

    const config = BIOME_CONFIGS[dominant]
    this.scene.background = config.fogColor
    this.scene.fog = new THREE.Fog(config.fogColor.getHex(), 60, 380)
  }

  /**
   * Height of the ground the player sees. It is also the surface every prop, structure
   * and creature stands on, so they all agree.
   */
  public getFloorHeightAt(x: number, z: number): number {
    return this.getHeightAt(x, z)
  }

  public getHeightAt(x: number, z: number): number {
    return this.heightSampler(x, z)
  }

  public getBiomeAt(x: number, z: number): BiomeType {
    const mapX = Math.floor(((x + this.mapSize / 2) / this.mapSize) * this.resolution)
    const mapZ = Math.floor(((z + this.mapSize / 2) / this.mapSize) * this.resolution)

    if (mapX >= 0 && mapX < this.resolution && mapZ >= 0 && mapZ < this.resolution) {
      return this.biomeMap[mapX][mapZ]
    }
    return 'forest'
  }

  public getCurrentBiomes(): BiomeType[] {
    return Array.from(this.currentBiomes)
  }

  private addDistantMountains() {
    const mesh = new THREE.Mesh(
      buildMountainRing(createRng(7), this.mapSize * 1.1, 22),
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 1,
        metalness: 0,
      })
    )
    mesh.name = 'DistantMountains'
    mesh.rotation.y = TAU * 0.13
    this.mountains = mesh
    this.scene.add(mesh)
  }
}
