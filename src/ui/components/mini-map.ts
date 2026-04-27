import { BIOME_COLORS, GAME_CONFIG } from '@core/constants'
import type * as THREE from 'three'

export class MiniMap {
  private miniMapCanvas: HTMLCanvasElement
  private miniMapCtx: CanvasRenderingContext2D | null
  private playerDot: HTMLDivElement

  constructor() {
    this.miniMapCanvas = document.getElementById('mini-map-canvas') as HTMLCanvasElement
    this.miniMapCtx = this.miniMapCanvas?.getContext('2d') || null
    this.playerDot = document.getElementById('player-dot') as HTMLDivElement

    this.initialize()
  }

  private initialize() {
    // Ensure we have a valid canvas and context
    if (!this.miniMapCanvas || !this.miniMapCtx) {
      console.warn('Mini-map canvas not found, skipping initialization')
      return
    }

    // Set up the mini-map canvas with proper scaling
    const dpr = window.devicePixelRatio || 1
    this.miniMapCanvas.width = GAME_CONFIG.MINIMAP_SIZE * dpr
    this.miniMapCanvas.height = GAME_CONFIG.MINIMAP_SIZE * dpr
    this.miniMapCtx.scale(dpr, dpr)

    // Initial clear
    this.clear()
  }

  private clear() {
    if (!this.miniMapCtx) return
    this.miniMapCtx.fillStyle = '#1a1a2e'
    this.miniMapCtx.fillRect(0, 0, GAME_CONFIG.MINIMAP_SIZE, GAME_CONFIG.MINIMAP_SIZE)
  }

  public update(
    playerPosition: { x: number; z: number },
    pathPoints: THREE.Vector3[],
    biomes?: Map<string, string>
  ) {
    // Skip if mini-map is not properly initialized
    if (!this.miniMapCanvas || !this.miniMapCtx) {
      return
    }

    this.clear()

    // Calculate bounds for the map
    const bounds = GAME_CONFIG.MINIMAP_BOUNDS
    const mapSize = GAME_CONFIG.MINIMAP_SIZE

    // Draw biome background if available
    if (biomes) {
      this.drawBiomes(biomes, bounds, mapSize)
    }

    // Draw the path
    this.drawPath(pathPoints, bounds, mapSize)

    // Update player dot position
    this.updatePlayerDot(playerPosition, bounds, mapSize)
  }

  private drawBiomes(
    biomes: Map<string, string>,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    mapSize: number
  ) {
    if (!this.miniMapCtx) return

    // Draw biome patches (simplified)
    for (const [position, biome] of biomes) {
      const [x, z] = position.split(',').map(Number)
      const screenX = ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * mapSize
      const screenZ = ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * mapSize

      this.miniMapCtx.fillStyle = BIOME_COLORS[biome] || BIOME_COLORS.default
      this.miniMapCtx.fillRect(screenX - 5, screenZ - 5, 10, 10)
    }
  }

  private drawPath(
    pathPoints: THREE.Vector3[],
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    mapSize: number
  ) {
    if (!this.miniMapCtx || pathPoints.length < 2) return

    this.miniMapCtx.strokeStyle = '#6cf'
    this.miniMapCtx.lineWidth = 2
    this.miniMapCtx.beginPath()

    for (let i = 0; i < pathPoints.length; i++) {
      const point = pathPoints[i]
      const screenX = ((point.x - bounds.minX) / (bounds.maxX - bounds.minX)) * mapSize
      const screenZ = ((point.z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * mapSize

      if (i === 0) {
        this.miniMapCtx.moveTo(screenX, screenZ)
      } else {
        this.miniMapCtx.lineTo(screenX, screenZ)
      }
    }

    this.miniMapCtx.stroke()
  }

  private updatePlayerDot(
    playerPosition: { x: number; z: number },
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    mapSize: number
  ) {
    if (!this.playerDot) return

    const screenX = ((playerPosition.x - bounds.minX) / (bounds.maxX - bounds.minX)) * mapSize
    const screenZ = ((playerPosition.z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * mapSize

    // Clamp to canvas bounds
    const clampedX = Math.max(6, Math.min(mapSize - 6, screenX))
    const clampedZ = Math.max(6, Math.min(mapSize - 6, screenZ))

    this.playerDot.style.left = `${clampedX}px`
    this.playerDot.style.top = `${clampedZ}px`
  }
}
