import * as THREE from 'three'
import { noise2D } from './noise-utils'
import { smoothstep, WATER_LEVEL, wildness } from './terrain-height'

const ROCK_COLOR = new THREE.Color(0x6b665c)
const SAND_COLOR = new THREE.Color(0x9c8b62)
const MUD_COLOR = new THREE.Color(0x3d4a35)
const LAWN_COLOR = new THREE.Color(0x5c8f45)

export interface TerrainMeshOptions {
  mapSize: number
  /** Quads along each side. */
  segments: number
  heightAt(x: number, z: number): number
  /** Writes the (smoothly blended) biome ground colour at a world position into `out`. */
  groundColorAt(x: number, z: number, out: THREE.Color): void
}

/**
 * A heightfield mesh in the XZ plane, coloured per vertex by biome, with rock on steep
 * slopes, sand and mud around the waterline and a manicured lawn inside the park.
 */
export function buildTerrainMesh(options: TerrainMeshOptions): THREE.Mesh {
  const { mapSize, segments, heightAt, groundColorAt } = options
  const half = mapSize / 2
  const side = segments + 1
  const positions = new Float32Array(side * side * 3)
  const colors = new Float32Array(side * side * 3)
  const color = new THREE.Color()

  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const x = (i / segments) * mapSize - half
      const z = (j / segments) * mapSize - half
      const h = heightAt(x, z)
      const k = j * side + i
      positions[k * 3] = x
      positions[k * 3 + 1] = h
      positions[k * 3 + 2] = z

      groundColorAt(x, z, color)

      // Mottled variation so large areas don't read as one flat colour
      const mottle =
        0.88 + 0.24 * (noise2D(x * 0.09, z * 0.09) * 0.5 + 0.5) + 0.06 * noise2D(x * 0.4, z * 0.4)
      color.multiplyScalar(mottle)

      const slope =
        Math.max(
          Math.abs(heightAt(x + 1, z) - heightAt(x - 1, z)),
          Math.abs(heightAt(x, z + 1) - heightAt(x, z - 1))
        ) / 2
      color.lerp(ROCK_COLOR, smoothstep(0.5, 1.1, slope) * 0.8)

      // Shore: sand just above the water, mud beneath it
      color.lerp(SAND_COLOR, smoothstep(WATER_LEVEL + 0.45, WATER_LEVEL + 0.05, h) * 0.75)
      color.lerp(MUD_COLOR, smoothstep(WATER_LEVEL - 0.1, WATER_LEVEL - 0.8, h) * 0.8)

      // Park lawn
      color.lerp(LAWN_COLOR, (1 - wildness(x, z)) * 0.7)

      colors[k * 3] = color.r
      colors[k * 3 + 1] = color.g
      colors[k * 3 + 2] = color.b
    }
  }

  const indices = new Uint32Array(segments * segments * 6)
  let n = 0
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * side + i
      const b = a + 1
      const c = a + side
      const d = c + 1
      // Wound counter-clockwise when viewed from above (+Y)
      indices[n++] = a
      indices[n++] = c
      indices[n++] = b
      indices[n++] = b
      indices[n++] = c
      indices[n++] = d
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
  )
  mesh.name = 'TerrainSurface'
  mesh.receiveShadow = true
  return mesh
}

/** A broad translucent sheet that fills every hollow below the water line. */
export function buildWater(size: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size)
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x2e6f86,
      transparent: true,
      opacity: 0.8,
      roughness: 0.15,
      metalness: 0.1,
    })
  )
  mesh.name = 'Water'
  mesh.position.y = WATER_LEVEL
  mesh.receiveShadow = true
  return mesh
}
