import * as THREE from 'three'
import type { BiomeType, BiomeConfig } from './types'
import { noise2D, hash2D } from './noise-utils'

export const BIOME_CONFIGS: Record<BiomeType, BiomeConfig> = {
  forest: {
    name: 'Enchanted Forest',
    groundColor: new THREE.Color(0x4a6b3f), // Lighter forest green
    fogColor: new THREE.Color(0x5a7f5a), // Lighter forest fog
    fogDensity: 0.02,
    ambientLightColor: new THREE.Color(0x5a7b5a),
    directionalLightColor: new THREE.Color(0xffffff),
    vegetationDensity: 0.8,
    rockDensity: 0.3,
    waterLevel: -0.5,
    specialFeatures: ['ancient_trees', 'mushroom_rings', 'fireflies'],
  },
  meadow: {
    name: 'Sunlit Meadow',
    groundColor: new THREE.Color(0x6a8b4f), // Brighter meadow green
    fogColor: new THREE.Color(0x87ceeb),
    fogDensity: 0.01,
    ambientLightColor: new THREE.Color(0x87ceeb),
    directionalLightColor: new THREE.Color(0xffeaa7),
    vegetationDensity: 0.6,
    rockDensity: 0.1,
    waterLevel: -1.0,
    specialFeatures: ['flower_patches', 'tall_grass', 'butterflies'],
  },
  rocky: {
    name: 'Stone Peaks',
    groundColor: new THREE.Color(0x7a7a7a), // Lighter stone gray
    fogColor: new THREE.Color(0x696969),
    fogDensity: 0.015,
    ambientLightColor: new THREE.Color(0x708090),
    directionalLightColor: new THREE.Color(0xffd700),
    vegetationDensity: 0.2,
    rockDensity: 0.9,
    waterLevel: -2.0,
    specialFeatures: ['stone_arches', 'crystal_formations', 'wind_erosion'],
  },
  wetland: {
    name: 'Mystic Wetlands',
    groundColor: new THREE.Color(0x4f6f4f), // Lighter wetland green
    fogColor: new THREE.Color(0x6f8f8f), // Lighter wetland fog
    fogDensity: 0.025,
    ambientLightColor: new THREE.Color(0x4682b4),
    directionalLightColor: new THREE.Color(0xe6e6fa),
    vegetationDensity: 0.7,
    rockDensity: 0.2,
    waterLevel: 0.2,
    specialFeatures: ['lily_pads', 'mist_effects', 'glowing_plants'],
  },
  crystal_cave: {
    name: 'Crystal Caverns',
    groundColor: new THREE.Color(0x3a3a5e), // Much lighter cave floor
    fogColor: new THREE.Color(0x46516e), // Lighter crystal cave fog
    fogDensity: 0.03,
    ambientLightColor: new THREE.Color(0x5a5a9a),
    directionalLightColor: new THREE.Color(0xda70d6),
    vegetationDensity: 0.1,
    rockDensity: 0.4,
    waterLevel: -1.5,
    specialFeatures: ['crystal_clusters', 'glowing_veins', 'stalactites'],
  },
  floating_islands: {
    name: 'Sky Islands',
    groundColor: new THREE.Color(0x8fbc8f),
    fogColor: new THREE.Color(0x87ceeb),
    fogDensity: 0.005,
    ambientLightColor: new THREE.Color(0x87ceeb),
    directionalLightColor: new THREE.Color(0xffffff),
    vegetationDensity: 0.5,
    rockDensity: 0.3,
    waterLevel: -10.0,
    specialFeatures: ['floating_rocks', 'wind_currents', 'cloud_wisps'],
  },
}

export function generateBiomeMap(
  heightMap: number[][],
  resolution: number,
  seed: number
): BiomeType[][] {
  const rand = createRng(seed)
  const biomeMap: BiomeType[][] = []

  for (let x = 0; x < resolution; x++) {
    biomeMap[x] = []
    for (let z = 0; z < resolution; z++) {
      const height = heightMap[x][z]
      const moisture = noise2D(x * 0.04, z * 0.04)
      const temperature = noise2D(x * 0.03 + 100, z * 0.03 + 100)

      let biome: BiomeType

      if (height > 5) {
        biome = rand() > 0.7 ? 'crystal_cave' : 'rocky'
      } else if (height > 3) {
        biome = temperature > 0.3 ? 'rocky' : 'forest'
      } else if (height < -0.5) {
        biome = 'wetland'
      } else if (moisture > 0.4) {
        biome = 'forest'
      } else {
        biome = 'meadow'
      }

      // Add some floating islands at high altitudes
      if (height > 6 && rand() > 0.8) {
        biome = 'floating_islands'
      }

      biomeMap[x][z] = biome
    }
  }

  return biomeMap
}

function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 0xffffffff
}
