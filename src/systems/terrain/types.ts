import type * as THREE from 'three'

export type BiomeType =
  | 'forest'
  | 'meadow'
  | 'rocky'
  | 'wetland'
  | 'crystal_cave'
  | 'floating_islands'

export interface BiomeConfig {
  name: string
  groundColor: THREE.Color
  fogColor: THREE.Color
  fogDensity: number
  ambientLightColor: THREE.Color
  directionalLightColor: THREE.Color
  vegetationDensity: number
  rockDensity: number
  waterLevel: number
  specialFeatures: string[]
}
