import * as THREE from 'three'

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

export const BIOME_CONFIGS: Record<BiomeType, BiomeConfig> = {
  forest: {
    name: 'Enchanted Forest',
    groundColor: new THREE.Color(0x2d4a2b),
    fogColor: new THREE.Color(0x1a2f1a),
    fogDensity: 0.02,
    ambientLightColor: new THREE.Color(0x4a6b4a),
    directionalLightColor: new THREE.Color(0xffffff),
    vegetationDensity: 0.8,
    rockDensity: 0.3,
    waterLevel: -0.5,
    specialFeatures: ['ancient_trees', 'mushroom_rings', 'fireflies'],
  },
  meadow: {
    name: 'Sunlit Meadow',
    groundColor: new THREE.Color(0x4a6b2f),
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
    groundColor: new THREE.Color(0x5a5a5a),
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
    groundColor: new THREE.Color(0x2f4f2f),
    fogColor: new THREE.Color(0x2f4f4f),
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
    groundColor: new THREE.Color(0x1a1a2e),
    fogColor: new THREE.Color(0x16213e),
    fogDensity: 0.03,
    ambientLightColor: new THREE.Color(0x4a4a8a),
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

export class TerrainSystem {
  private scene: THREE.Scene
  private terrainGroup: THREE.Group
  private heightMap: number[][] = []
  private biomeMap: BiomeType[][] = []
  private currentBiomes: Set<BiomeType> = new Set()
  private readonly mapSize = 200
  private readonly resolution = 64
  private readonly maxHeight = 8

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.terrainGroup = new THREE.Group()
    this.scene.add(this.terrainGroup)
    this.addDistantMountains()
  }

  public generateTerrain(seed: number = 42) {
    this.clearTerrain()

    // Generate height and biome maps
    this.generateHeightMap(seed)
    this.generateBiomeMap(seed + 1000)

    // Create terrain mesh
    this.createTerrainMesh()

    // Add a simple fallback ground plane to ensure visibility
    this.createFallbackGround()

    // Add environmental features
    this.addEnvironmentalFeatures(seed + 2000)

    // Update scene lighting based on dominant biome
    this.updateSceneLighting()
  }

  private clearTerrain() {
    while (this.terrainGroup.children.length > 0) {
      const child = this.terrainGroup.children[0]
      this.terrainGroup.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    }
    this.currentBiomes.clear()
  }

  private generateHeightMap(seed: number) {
    const rand = this.createRng(seed)
    this.heightMap = []

    // Initialize with base noise
    for (let x = 0; x < this.resolution; x++) {
      this.heightMap[x] = []
      for (let z = 0; z < this.resolution; z++) {
        let height = 0

        // Multiple octaves of noise for realistic terrain
        height += this.noise2D(x * 0.02, z * 0.02, rand) * 4
        height += this.noise2D(x * 0.05, z * 0.05, rand) * 2
        height += this.noise2D(x * 0.1, z * 0.1, rand) * 1
        height += this.noise2D(x * 0.2, z * 0.2, rand) * 0.5

        // Add some dramatic features
        const ridgeNoise = Math.abs(this.noise2D(x * 0.03, z * 0.03, rand))
        height += ridgeNoise * ridgeNoise * 3

        this.heightMap[x][z] = Math.max(-2, Math.min(this.maxHeight, height))
      }
    }
  }

  private generateBiomeMap(seed: number) {
    const rand = this.createRng(seed)
    this.biomeMap = []

    for (let x = 0; x < this.resolution; x++) {
      this.biomeMap[x] = []
      for (let z = 0; z < this.resolution; z++) {
        const height = this.heightMap[x][z]
        const moisture = this.noise2D(x * 0.04, z * 0.04, rand)
        const temperature = this.noise2D(x * 0.03 + 100, z * 0.03 + 100, rand)

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

        this.biomeMap[x][z] = biome
        this.currentBiomes.add(biome)
      }
    }
  }

  private createTerrainMesh() {
    // Create geometry with proper resolution
    const geometry = new THREE.PlaneGeometry(
      this.mapSize,
      this.mapSize,
      this.resolution - 1,
      this.resolution - 1
    )
    const positionAttribute = geometry.attributes.position
    const vertices = positionAttribute.array as Float32Array
    const colors = new Float32Array(vertices.length)

    // Apply height and color data with correct vertex mapping
    // PlaneGeometry vertices are ordered in rows from top-left to bottom-right
    for (let i = 0; i < positionAttribute.count; i++) {
      // Get the actual position from the geometry
      const vx = vertices[i * 3] // X position in world space
      const vz = vertices[i * 3 + 2] // Z position in world space

      // Convert world position to heightmap indices
      const mapX = Math.floor(((vx + this.mapSize / 2) / this.mapSize) * (this.resolution - 1))
      const mapZ = Math.floor(((vz + this.mapSize / 2) / this.mapSize) * (this.resolution - 1))

      const clampedX = Math.max(0, Math.min(this.resolution - 1, mapX))
      const clampedZ = Math.max(0, Math.min(this.resolution - 1, mapZ))

      // Set height (Y coordinate)
      vertices[i * 3 + 1] = this.heightMap[clampedX][clampedZ]

      // Set color based on biome
      const biome = this.biomeMap[clampedX][clampedZ]
      const biomeColor = BIOME_CONFIGS[biome].groundColor
      colors[i * 3] = biomeColor.r
      colors[i * 3 + 1] = biomeColor.g
      colors[i * 3 + 2] = biomeColor.b
    }

    // Update geometry attributes
    positionAttribute.needsUpdate = true
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false,
    })

    const terrain = new THREE.Mesh(geometry, material)
    terrain.rotation.x = -Math.PI / 2
    terrain.receiveShadow = true
    terrain.castShadow = false

    this.terrainGroup.add(terrain)
  }

  private createFallbackGround() {
    // Simple fallback ground plane to ensure something is always visible
    const groundGeo = new THREE.PlaneGeometry(this.mapSize, this.mapSize)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d4a2b,
      metalness: 0.1,
      roughness: 0.9,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.1 // Slightly below the main terrain
    ground.receiveShadow = true
    this.terrainGroup.add(ground)
  }

  private addEnvironmentalFeatures(seed: number) {
    const rand = this.createRng(seed)

    // Add trees, rocks, and other features based on biome
    for (let i = 0; i < 150; i++) {
      const x = (rand() - 0.5) * this.mapSize * 0.8
      const z = (rand() - 0.5) * this.mapSize * 0.8

      const mapX = Math.floor(((x + this.mapSize / 2) / this.mapSize) * this.resolution)
      const mapZ = Math.floor(((z + this.mapSize / 2) / this.mapSize) * this.resolution)

      if (mapX >= 0 && mapX < this.resolution && mapZ >= 0 && mapZ < this.resolution) {
        const height = this.heightMap[mapX][mapZ]
        const biome = this.biomeMap[mapX][mapZ]
        const config = BIOME_CONFIGS[biome]

        if (rand() < config.vegetationDensity) {
          this.addVegetation(x, z, biome, rand)
        }

        if (rand() < config.rockDensity) {
          this.addRock(x, z, biome, rand)
        }
      }
    }

    // Add special biome features
    this.addSpecialFeatures(seed + 500)
  }

  private addVegetation(x: number, z: number, biome: BiomeType, rand: () => number) {
    let mesh: THREE.Mesh

    switch (biome) {
      case 'forest':
        mesh = this.createTree(rand)
        break
      case 'meadow':
        mesh = rand() > 0.7 ? this.createTree(rand) : this.createGrass(rand)
        break
      case 'wetland':
        mesh = this.createWetlandPlant(rand)
        break
      case 'crystal_cave':
        mesh = this.createCrystalFormation(rand)
        break
      default:
        mesh = this.createGrass(rand)
    }

    // Position vegetation at the correct terrain height
    const terrainHeight = this.getHeightAt(x, z)
    mesh.position.set(x, terrainHeight, z)
    mesh.rotation.y = rand() * Math.PI * 2
    mesh.castShadow = true
    mesh.receiveShadow = true

    this.terrainGroup.add(mesh)
  }

  private addRock(x: number, z: number, biome: BiomeType, rand: () => number) {
    const geometry = new THREE.IcosahedronGeometry(0.5 + rand() * 2, rand() > 0.5 ? 1 : 0)

    let color: THREE.Color
    switch (biome) {
      case 'rocky':
        color = new THREE.Color().setHSL(0.1, 0.2, 0.4 + rand() * 0.2)
        break
      case 'crystal_cave':
        color = new THREE.Color().setHSL(0.7 + rand() * 0.2, 0.8, 0.6)
        break
      default:
        color = new THREE.Color().setHSL(0.1, 0.3, 0.3 + rand() * 0.3)
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: biome === 'crystal_cave' ? 0.1 : 0.8,
      metalness: biome === 'crystal_cave' ? 0.3 : 0.1,
    })

    // Position rock at the correct terrain height
    const terrainHeight = this.getHeightAt(x, z)
    const rock = new THREE.Mesh(geometry, material)
    rock.position.set(x, terrainHeight + 0.5, z)
    rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    rock.castShadow = true
    rock.receiveShadow = true

    this.terrainGroup.add(rock)
  }

  private createTree(rand: () => number): THREE.Mesh {
    const group = new THREE.Group()

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2 + rand() * 2)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 1
    group.add(trunk)

    // Foliage
    const foliageGeometry = new THREE.SphereGeometry(1.5 + rand() * 1)
    const foliageColor = new THREE.Color().setHSL(0.3, 0.6 + rand() * 0.3, 0.3 + rand() * 0.2)
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: foliageColor })
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
    foliage.position.y = 2.5 + rand() * 1
    group.add(foliage)

    return group as any
  }

  private createGrass(rand: () => number): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(0.1, 0.5 + rand() * 0.5, 3)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.3, 0.7, 0.4 + rand() * 0.3),
    })
    return new THREE.Mesh(geometry, material)
  }

  private createWetlandPlant(rand: () => number): THREE.Mesh {
    const group = new THREE.Group()

    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 1 + rand() * 1)
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a2d })
    const stem = new THREE.Mesh(stemGeometry, stemMaterial)
    stem.position.y = 0.5
    group.add(stem)

    // Lily pad or flower
    if (rand() > 0.6) {
      const padGeometry = new THREE.CircleGeometry(0.5 + rand() * 0.5)
      const padMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c59 })
      const pad = new THREE.Mesh(padGeometry, padMaterial)
      pad.rotation.x = -Math.PI / 2
      pad.position.y = 0.1
      group.add(pad)
    }

    return group as any
  }

  private createCrystalFormation(rand: () => number): THREE.Mesh {
    const geometry = new THREE.OctahedronGeometry(0.5 + rand() * 1)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.6 + rand() * 0.3, 0.8, 0.7),
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.3,
    })
    return new THREE.Mesh(geometry, material)
  }

  private addSpecialFeatures(seed: number) {
    const rand = this.createRng(seed)

    // Add some larger landmark features
    for (let i = 0; i < 8; i++) {
      const x = (rand() - 0.5) * this.mapSize * 0.6
      const z = (rand() - 0.5) * this.mapSize * 0.6

      const mapX = Math.floor(((x + this.mapSize / 2) / this.mapSize) * this.resolution)
      const mapZ = Math.floor(((z + this.mapSize / 2) / this.mapSize) * this.resolution)

      if (mapX >= 0 && mapX < this.resolution && mapZ >= 0 && mapZ < this.resolution) {
        const height = this.heightMap[mapX][mapZ]
        const biome = this.biomeMap[mapX][mapZ]

        this.addLandmark(x, height, z, biome, rand)
      }
    }
  }

  private addLandmark(x: number, y: number, z: number, biome: BiomeType, rand: () => number) {
    switch (biome) {
      case 'rocky':
        this.addStoneArch(x, y, z)
        break
      case 'crystal_cave':
        this.addCrystalCluster(x, y, z, rand)
        break
      case 'forest':
        this.addAncientTree(x, y, z, rand)
        break
      case 'floating_islands':
        this.addFloatingRock(x, y + 5, z, rand)
        break
    }
  }

  private addStoneArch(x: number, y: number, z: number) {
    const group = new THREE.Group()

    // Arch pillars
    const pillarGeometry = new THREE.BoxGeometry(1, 4, 1)
    const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 })

    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
    leftPillar.position.set(-2, 2, 0)
    group.add(leftPillar)

    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
    rightPillar.position.set(2, 2, 0)
    group.add(rightPillar)

    // Arch top
    const archGeometry = new THREE.BoxGeometry(5, 0.5, 1)
    const arch = new THREE.Mesh(archGeometry, pillarMaterial)
    arch.position.set(0, 4, 0)
    group.add(arch)

    group.position.set(x, y, z)
    group.castShadow = true
    group.receiveShadow = true

    this.terrainGroup.add(group)
  }

  private addCrystalCluster(x: number, y: number, z: number, rand: () => number) {
    const group = new THREE.Group()

    for (let i = 0; i < 5 + rand() * 5; i++) {
      const crystal = this.createCrystalFormation(rand)
      crystal.position.set((rand() - 0.5) * 4, rand() * 3, (rand() - 0.5) * 4)
      crystal.scale.setScalar(0.5 + rand() * 1.5)
      group.add(crystal)
    }

    group.position.set(x, y, z)
    this.terrainGroup.add(group)
  }

  private addAncientTree(x: number, y: number, z: number, rand: () => number) {
    const tree = this.createTree(rand)
    tree.scale.setScalar(2 + rand() * 2)
    tree.position.set(x, y, z)
    this.terrainGroup.add(tree)
  }

  private addFloatingRock(x: number, y: number, z: number, rand: () => number) {
    const geometry = new THREE.IcosahedronGeometry(2 + rand() * 3, 1)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.6, 0.3, 0.6),
    })
    const rock = new THREE.Mesh(geometry, material)
    rock.position.set(x, y, z)
    rock.castShadow = true

    this.terrainGroup.add(rock)
  }

  private updateSceneLighting() {
    // Get dominant biome
    const biomeCounts = new Map<BiomeType, number>()
    for (const biome of this.currentBiomes) {
      biomeCounts.set(biome, 0)
    }

    for (let x = 0; x < this.resolution; x++) {
      for (let z = 0; z < this.resolution; z++) {
        const biome = this.biomeMap[x][z]
        biomeCounts.set(biome, (biomeCounts.get(biome) || 0) + 1)
      }
    }

    let dominantBiome: BiomeType = 'forest'
    let maxCount = 0
    for (const [biome, count] of biomeCounts) {
      if (count > maxCount) {
        maxCount = count
        dominantBiome = biome
      }
    }

    const config = BIOME_CONFIGS[dominantBiome]

    // Update scene background and fog
    this.scene.background = config.fogColor
    this.scene.fog = new THREE.Fog(config.fogColor.getHex(), 25, 120)
  }

  private noise2D(x: number, y: number, rand: () => number): number {
    // Simple 2D noise implementation
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy

    // Generate pseudo-random values at grid corners
    const a = this.hash2D(ix, iy)
    const b = this.hash2D(ix + 1, iy)
    const c = this.hash2D(ix, iy + 1)
    const d = this.hash2D(ix + 1, iy + 1)

    // Smooth interpolation
    const u = fx * fx * (3 - 2 * fx)
    const v = fy * fy * (3 - 2 * fy)

    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
  }

  private hash2D(x: number, y: number): number {
    // Simple hash function for 2D coordinates
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
  }

  private createRng(seed: number): () => number {
    let state = seed >>> 0
    return () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 0xffffffff
  }

  public getHeightAt(x: number, z: number): number {
    // Convert world coordinates to heightmap coordinates
    const mapX = ((x + this.mapSize / 2) / this.mapSize) * (this.resolution - 1)
    const mapZ = ((z + this.mapSize / 2) / this.mapSize) * (this.resolution - 1)

    // Get integer and fractional parts for bilinear interpolation
    const x0 = Math.floor(mapX)
    const z0 = Math.floor(mapZ)
    const x1 = Math.min(x0 + 1, this.resolution - 1)
    const z1 = Math.min(z0 + 1, this.resolution - 1)

    // Check bounds
    if (x0 < 0 || x0 >= this.resolution || z0 < 0 || z0 >= this.resolution) {
      return 0
    }

    // Get fractional parts
    const fx = mapX - x0
    const fz = mapZ - z0

    // Get heights at four corners
    const h00 = this.heightMap[x0][z0]
    const h10 = this.heightMap[x1][z0]
    const h01 = this.heightMap[x0][z1]
    const h11 = this.heightMap[x1][z1]

    // Bilinear interpolation
    const h0 = h00 * (1 - fx) + h10 * fx
    const h1 = h01 * (1 - fx) + h11 * fx

    return h0 * (1 - fz) + h1 * fz
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
    const mountainGroup = new THREE.Group()
    const edgeDistance = this.mapSize * 1.5 // Position beyond the map edges
    const mountainsPerSide = 4
    const sides = [
      { name: 'north', axis: 'z', value: edgeDistance, perpAxis: 'x' },
      { name: 'south', axis: 'z', value: -edgeDistance, perpAxis: 'x' },
      { name: 'east', axis: 'x', value: edgeDistance, perpAxis: 'z' },
      { name: 'west', axis: 'x', value: -edgeDistance, perpAxis: 'z' },
    ]

    sides.forEach((side) => {
      for (let i = 0; i < mountainsPerSide; i++) {
        // Spread mountains along each edge
        const spread = (i / (mountainsPerSide - 1) - 0.5) * this.mapSize * 1.8
        const offset = (Math.random() - 0.5) * 40 // Random offset for natural look

        const x = side.axis === 'x' ? side.value + offset : spread
        const z = side.axis === 'z' ? side.value + offset : spread

        // Create low-poly mountain with varied sizes
        const height = 50 + Math.random() * 80
        const width = 40 + Math.random() * 50
        const segments = 4 + Math.floor(Math.random() * 2) // 4-5 sides for low poly
        const geometry = new THREE.ConeGeometry(width, height, segments)

        // Vary mountain colors - darker and more atmospheric
        const brightness = 0.15 + Math.random() * 0.1
        const hue = 0.55 + Math.random() * 0.15
        const color = new THREE.Color().setHSL(hue, 0.25, brightness)

        const material = new THREE.MeshBasicMaterial({
          color,
          fog: true,
        })

        const mountain = new THREE.Mesh(geometry, material)
        mountain.position.set(x, height / 2 - 10, z)
        mountain.rotation.y = Math.random() * Math.PI * 2

        mountainGroup.add(mountain)
      }
    })

    // Add a few corner mountains for extra atmosphere
    const corners = [
      [edgeDistance * 0.7, edgeDistance * 0.7],
      [-edgeDistance * 0.7, edgeDistance * 0.7],
      [edgeDistance * 0.7, -edgeDistance * 0.7],
      [-edgeDistance * 0.7, -edgeDistance * 0.7],
    ]

    corners.forEach(([x, z]) => {
      const height = 60 + Math.random() * 70
      const width = 45 + Math.random() * 45
      const geometry = new THREE.ConeGeometry(width, height, 5)
      const color = new THREE.Color().setHSL(0.58, 0.2, 0.18)

      const material = new THREE.MeshBasicMaterial({
        color,
        fog: true,
      })

      const mountain = new THREE.Mesh(geometry, material)
      mountain.position.set(x, height / 2 - 10, z)
      mountain.rotation.y = Math.random() * Math.PI * 2

      mountainGroup.add(mountain)
    })

    this.scene.add(mountainGroup)
  }
}
