import type { CreatureInstance } from '@systems/creatures'
import * as THREE from 'three'
import { generateCreatureName } from './scoring'

export interface CreatureCardMetadata {
  version: string
  creatureName: string
  anatomy: CreatureInstance['anatomy']
  rarity: number
  seed: number
  captureDate: string
}

export class CreatureCardExporter {
  private cardRenderer: THREE.WebGLRenderer
  private cardScene: THREE.Scene
  private cardCamera: THREE.PerspectiveCamera
  private cardWidth = 512
  private cardHeight = 512

  constructor() {
    // Create offscreen renderer for card generation
    this.cardRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    })
    this.cardRenderer.setSize(this.cardWidth, this.cardHeight)
    this.cardRenderer.setClearColor(0x000000, 0)

    // Debug canvas - always enabled for testing
    const canvas = this.cardRenderer.domElement
    canvas.style.position = 'fixed'
    canvas.style.top = '10px'
    canvas.style.right = '10px'
    canvas.style.zIndex = '10000'
    canvas.style.border = '2px solid red'
    canvas.style.display = 'none' // Hidden by default
    canvas.id = 'creature-card-debug-canvas'
    document.body.appendChild(canvas)
    console.log('Debug canvas added to DOM (hidden)')

    // Setup card scene
    this.cardScene = new THREE.Scene()

    // Setup card camera
    this.cardCamera = new THREE.PerspectiveCamera(45, this.cardWidth / this.cardHeight, 0.1, 100)
    this.cardCamera.position.set(0, 1, 4)
    this.cardCamera.lookAt(0, 0, 0)

    // Add lighting for card render
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.cardScene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8)
    keyLight.position.set(2, 3, 2)
    this.cardScene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-2, 1, -1)
    this.cardScene.add(fillLight)
  }

  /**
   * Export creature as PNG with embedded metadata
   * Returns the thumbnail data URL for storage
   */
  public async exportCreatureCard(
    creature: CreatureInstance,
    seed: number
  ): Promise<{ metadata: CreatureCardMetadata; thumbnail: string }> {
    const creatureName = generateCreatureName(creature)
    console.log(`Exporting creature card for: ${creatureName}`)

    // Clone creature group for isolated rendering
    const creatureClone = creature.group.clone(true)

    // Center and scale creature for card
    const box = new THREE.Box3().setFromObject(creatureClone)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    console.log(
      `Creature bounds - center: ${center.toArray()}, size: ${size.toArray()}, maxDim: ${maxDim}`
    )

    creatureClone.position.sub(center)
    const scale = 2.5 / maxDim
    creatureClone.scale.multiplyScalar(scale)

    // Add to card scene
    this.cardScene.add(creatureClone)

    // Render creature to canvas
    this.cardRenderer.render(this.cardScene, this.cardCamera)

    // Debug: Show canvas temporarily
    if (import.meta.env.DEV) {
      const debugCanvas = document.getElementById('creature-card-debug-canvas') as HTMLCanvasElement
      if (debugCanvas) {
        debugCanvas.style.display = 'block'
        setTimeout(() => {
          debugCanvas.style.display = 'none'
        }, 2000) // Show for 2 seconds
      }
    }

    // Wait a frame to ensure render completes
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Get canvas data (WebGL canvas, no need for 2D context)
    const canvas = this.cardRenderer.domElement
    console.log(`Canvas size: ${canvas.width}x${canvas.height}`)

    // Create metadata object
    const metadata: CreatureCardMetadata = {
      version: '1.0',
      creatureName,
      anatomy: creature.anatomy,
      rarity: creature.rarity,
      seed,
      captureDate: new Date().toISOString(),
    }

    // Create enhanced card with border and text
    console.log('Creating enhanced card with border and name...')
    const enhancedCanvas = this.createEnhancedCard(canvas, creatureName, creature.rarity)
    console.log(`Enhanced canvas size: ${enhancedCanvas.width}x${enhancedCanvas.height}`)

    // Debug: Show enhanced canvas (always enabled)
    const debugCanvas = document.getElementById('creature-card-debug-canvas') as HTMLCanvasElement
    if (debugCanvas) {
      const debugCtx = debugCanvas.getContext('2d')
      if (debugCtx) {
        // Resize debug canvas to match enhanced size
        debugCanvas.width = enhancedCanvas.width
        debugCanvas.height = enhancedCanvas.height
        debugCtx.drawImage(enhancedCanvas, 0, 0)
        debugCanvas.style.display = 'block'
        setTimeout(() => {
          debugCanvas.style.display = 'none'
          // Reset size
          debugCanvas.width = this.cardWidth
          debugCanvas.height = this.cardHeight
        }, 3000) // Show for 3 seconds
      }
    }

    const dataUrl = enhancedCanvas.toDataURL('image/png')

    console.log(`Generated dataURL length: ${dataUrl.length} characters`)

    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Failed to generate image data from canvas')
    }

    // Store metadata in localStorage as backup
    const metadataKey = `creature-card-${metadata.creatureName}-${Date.now()}`
    localStorage.setItem(metadataKey, JSON.stringify(metadata))
    console.log(`Stored metadata in localStorage: ${metadataKey}`)
    console.log(`✅ Creature card created successfully for ${creatureName}`)

    // Cleanup
    this.cardScene.remove(creatureClone)

    return { metadata, thumbnail: dataUrl }
  }

  /**
   * Create enhanced card with border and creature name
   */
  private createEnhancedCard(
    sourceCanvas: HTMLCanvasElement,
    creatureName: string,
    rarity: number
  ): HTMLCanvasElement {
    // Create new canvas with padding for border and text
    const padding = 40
    const textHeight = 60
    const newWidth = this.cardWidth + padding * 2
    const newHeight = this.cardHeight + padding * 2 + textHeight

    const enhancedCanvas = document.createElement('canvas')
    enhancedCanvas.width = newWidth
    enhancedCanvas.height = newHeight
    const ctx = enhancedCanvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, newHeight)
    gradient.addColorStop(0, '#0a0f19')
    gradient.addColorStop(1, '#1a1f2e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, newWidth, newHeight)

    // Get rarity color
    const rarityColor = this.getRarityColor(rarity)
    const rarityGlow = this.getRarityGlow(rarity)

    // Outer glow for legendary creatures
    if (rarity > 0.8) {
      ctx.shadowColor = rarityGlow
      ctx.shadowBlur = 30
      ctx.strokeStyle = rarityGlow
      ctx.lineWidth = 4
      ctx.strokeRect(padding - 10, padding - 10, this.cardWidth + 20, this.cardHeight + 20)
      ctx.shadowBlur = 0
    }

    // Border
    ctx.strokeStyle = rarityColor
    ctx.lineWidth = 6
    ctx.strokeRect(padding, padding, this.cardWidth, this.cardHeight)

    // Inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 2
    ctx.strokeRect(padding + 3, padding + 3, this.cardWidth - 6, this.cardHeight - 6)

    // Draw creature image
    ctx.drawImage(sourceCanvas, padding, padding, this.cardWidth, this.cardHeight)

    // Text background
    const textY = padding + this.cardHeight + 10
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(padding, textY, this.cardWidth, textHeight - 10)

    // Creature name
    ctx.fillStyle = rarityColor
    ctx.font = 'bold 28px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    ctx.fillText(creatureName, newWidth / 2, textY + (textHeight - 10) / 2)

    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Rarity indicator (small badge in corner)
    const badgeSize = 50
    const badgeX = newWidth - padding - badgeSize - 10
    const badgeY = padding + 10

    ctx.fillStyle = rarityColor
    ctx.beginPath()
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2)
    ctx.fill()

    // Rarity stars
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const stars = this.getRarityStars(rarity)
    ctx.fillText(stars, badgeX + badgeSize / 2, badgeY + badgeSize / 2)

    return enhancedCanvas
  }

  /**
   * Get rarity color
   */
  private getRarityColor(rarity: number): string {
    if (rarity > 0.8) return '#ffd700' // Legendary - Gold
    if (rarity > 0.6) return '#a335ee' // Epic - Purple
    if (rarity > 0.4) return '#0070dd' // Rare - Blue
    if (rarity > 0.2) return '#1eff00' // Uncommon - Green
    return '#9d9d9d' // Common - Gray
  }

  /**
   * Get rarity glow color
   */
  private getRarityGlow(rarity: number): string {
    if (rarity > 0.8) return '#ffaa00'
    if (rarity > 0.6) return '#8800ff'
    if (rarity > 0.4) return '#0088ff'
    if (rarity > 0.2) return '#00ff00'
    return '#666666'
  }

  /**
   * Get rarity stars
   */
  private getRarityStars(rarity: number): string {
    if (rarity > 0.8) return '⭐'
    if (rarity > 0.6) return '💎'
    if (rarity > 0.4) return '🔷'
    if (rarity > 0.2) return '🔹'
    return '⚪'
  }

  /**
   * Extract metadata from stored creature card
   */
  public static extractMetadata(creatureName: string): CreatureCardMetadata | null {
    // Search localStorage for matching creature card
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`creature-card-${creatureName}`)) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            return JSON.parse(data) as CreatureCardMetadata
          } catch (e) {
            console.error('Failed to parse creature card metadata:', e)
          }
        }
      }
    }
    return null
  }

  /**
   * Reconstruct creature from metadata
   */
  public static async reconstructCreature(
    metadata: CreatureCardMetadata
  ): Promise<CreatureInstance | null> {
    // This would require importing the creature builder
    // For now, return the anatomy data that can be used to rebuild
    console.log('Creature reconstruction data:', metadata)
    return null
  }

  public dispose(): void {
    this.cardRenderer.dispose()
  }
}
