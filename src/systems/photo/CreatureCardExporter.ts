import * as THREE from 'three'
import type { CreatureInstance } from '@systems/creatures'
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

    // Debug: Temporarily show canvas (remove in production)
    if (import.meta.env.DEV) {
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
    }

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

    // Get canvas data
    const canvas = this.cardRenderer.domElement
    console.log(`Canvas size: ${canvas.width}x${canvas.height}`)

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      console.error('Failed to get canvas context')
      this.cardScene.remove(creatureClone)
      throw new Error('Failed to get canvas context')
    }

    // Create metadata object
    const metadata: CreatureCardMetadata = {
      version: '1.0',
      creatureName,
      anatomy: creature.anatomy,
      rarity: creature.rarity,
      seed,
      captureDate: new Date().toISOString(),
    }

    // Get thumbnail data
    const dataUrl = canvas.toDataURL('image/png')

    console.log(`Generated dataURL length: ${dataUrl.length} characters`)

    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Failed to generate image data from canvas')
    }

    // Store metadata in localStorage as backup
    const metadataKey = `creature-card-${metadata.creatureName}-${Date.now()}`
    localStorage.setItem(metadataKey, JSON.stringify(metadata))
    console.log(`Stored metadata in localStorage: ${metadataKey}`)

    // Cleanup
    this.cardScene.remove(creatureClone)

    return { metadata, thumbnail: dataUrl }
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
