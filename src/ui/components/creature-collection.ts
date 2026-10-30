import type { UICallbacks } from '@core/types'
import { log } from '@core/utils'
import type { CreatureCardMetadata } from '@systems/photo'

export interface CapturedCreature {
  id: string
  metadata: CreatureCardMetadata
  thumbnail: string // base64 image data
  captureTime: number
}

export class CreatureCollection {
  private collectionPanel: HTMLDivElement
  private toggleCollectionBtn: HTMLButtonElement
  private collectionGrid: HTMLDivElement
  private audioCallbacks: UICallbacks = {}
  private capturedCreatures: CapturedCreature[] = []
  private maxCreatures = 10

  constructor() {
    this.collectionPanel = document.getElementById('collection-panel') as HTMLDivElement
    this.toggleCollectionBtn = document.getElementById('toggleCollection') as HTMLButtonElement
    this.collectionGrid = document.getElementById('collection-grid') as HTMLDivElement

    log.debug('🎨 CreatureCollection initialized')
    log.debug('Panel:', this.collectionPanel ? 'Found' : 'NOT FOUND')
    log.debug('Button:', this.toggleCollectionBtn ? 'Found' : 'NOT FOUND')
    log.debug('Grid:', this.collectionGrid ? 'Found' : 'NOT FOUND')

    this.setupEventListeners()
    this.loadFromLocalStorage()
    this.render()

    if (import.meta.env.DEV) {
      this.addTestCreature()
    }
  }

  public setAudioCallbacks(callbacks: UICallbacks) {
    this.audioCallbacks = callbacks
  }

  private setupEventListeners() {
    if (this.toggleCollectionBtn) {
      log.debug('✅ Setting up collection button listener')
      this.toggleCollectionBtn.addEventListener('click', () => {
        log.debug('🖱️ Collection button clicked!')
        this.audioCallbacks.onClick?.()
        this.toggle()
      })
    } else {
      console.error('❌ toggleCollectionBtn not found!')
    }

    const closeBtn = this.collectionPanel?.querySelector('.close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        log.debug('🖱️ Close button clicked!')
        this.audioCallbacks.onClick?.()
        this.toggle()
      })
    }
  }

  public toggle() {
    log.debug('🔄 Toggling collection panel')
    log.debug('Panel element:', this.collectionPanel)
    log.debug('Current classes:', this.collectionPanel?.className)
    this.collectionPanel?.classList.toggle('hidden')
    log.debug('After toggle:', this.collectionPanel?.className)
    log.debug('Collection size:', this.capturedCreatures.length)
  }

  public addCreature(metadata: CreatureCardMetadata, thumbnail: string): boolean {
    log.debug('🎨 CreatureCollection.addCreature called:', metadata.creatureName)
    log.debug('📊 Current collection size:', this.capturedCreatures.length)
    log.debug('🖼️ Thumbnail length:', thumbnail.length)

    // Check if already captured
    const creatureId = this.getCreatureId(metadata)
    log.debug('🆔 Creature ID:', creatureId)

    const exists = this.capturedCreatures.some((c) => c.id === creatureId)
    if (exists) {
      log.debug('⚠️ Creature already in collection')
      return false
    }

    // Remove oldest if at max capacity
    if (this.capturedCreatures.length >= this.maxCreatures) {
      const removed = this.capturedCreatures.shift()
      if (removed) {
        log.debug('🗑️ Removing oldest creature:', removed.metadata.creatureName)
        this.removeFromLocalStorage(removed.id)
      }
    }

    const captured: CapturedCreature = {
      id: creatureId,
      metadata,
      thumbnail,
      captureTime: Date.now(),
    }

    this.capturedCreatures.push(captured)
    log.debug('💾 Saving to localStorage...')
    this.saveToLocalStorage(captured)
    log.debug('🎨 Rendering collection...')
    this.render()
    log.debug('✅ Creature added successfully! New size:', this.capturedCreatures.length)
    return true
  }

  private getCreatureId(metadata: CreatureCardMetadata): string {
    return `${metadata.creatureName}-${metadata.seed}-${metadata.rarity.toFixed(3)}`
  }

  private render() {
    if (!this.collectionGrid) return

    this.collectionGrid.innerHTML = ''

    if (this.capturedCreatures.length === 0) {
      this.collectionGrid.innerHTML = `
        <div class="empty-collection">
          <p>📦 No creatures captured yet</p>
          <p class="hint">Press E when looking at a creature to capture it!</p>
        </div>
      `
      return
    }

    this.capturedCreatures.forEach((creature, index) => {
      const card = this.createCreatureCard(creature, index)
      this.collectionGrid.appendChild(card)
    })
  }

  private createCreatureCard(creature: CapturedCreature, index: number): HTMLDivElement {
    const card = document.createElement('div')
    card.className = 'creature-card'
    card.dataset.index = index.toString()

    const rarityClass = this.getRarityClass(creature.metadata.rarity)
    const rarityLabel = this.getRarityLabel(creature.metadata.rarity)

    card.innerHTML = `
      <div class="creature-thumbnail">
        <img src="${creature.thumbnail}" alt="${creature.metadata.creatureName}">
        <div class="rarity-badge ${rarityClass}">${rarityLabel}</div>
      </div>
      <div class="creature-info">
        <h4>${creature.metadata.creatureName}</h4>
        <p class="creature-archetype">${creature.metadata.anatomy.archetype}</p>
        <p class="creature-size">${creature.metadata.anatomy.size}</p>
      </div>
      <div class="creature-actions">
        <button class="export-btn" data-id="${creature.id}" data-format="png">
          💾 Export PNG
        </button>
        <button class="export-btn" data-id="${creature.id}" data-format="jpg">
          💾 Export JPG
        </button>
        <button class="remove-btn" data-id="${creature.id}">
          🗑️ Remove
        </button>
      </div>
    `

    // Add event listeners
    const exportBtns = card.querySelectorAll('.export-btn') as NodeListOf<HTMLButtonElement>
    const removeBtn = card.querySelector('.remove-btn') as HTMLButtonElement

    exportBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audioCallbacks.onClick?.()
        const format = btn.dataset.format as 'png' | 'jpg'
        this.exportCreature(creature, format)
      })
    })

    removeBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.removeCreature(creature.id)
    })

    return card
  }

  private getRarityClass(rarity: number): string {
    if (rarity > 0.8) return 'legendary'
    if (rarity > 0.6) return 'epic'
    if (rarity > 0.4) return 'rare'
    if (rarity > 0.2) return 'uncommon'
    return 'common'
  }

  private getRarityLabel(rarity: number): string {
    if (rarity > 0.8) return '⭐ Legendary'
    if (rarity > 0.6) return '💎 Epic'
    if (rarity > 0.4) return '🔷 Rare'
    if (rarity > 0.2) return '🔹 Uncommon'
    return '⚪ Common'
  }

  private exportCreature(creature: CapturedCreature, format: 'png' | 'jpg' = 'png') {
    log.debug('Exporting creature:', creature.metadata.creatureName, 'as', format)

    try {
      // Create a temporary canvas to convert format if needed
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get 2D context')

        // For JPG, add white background
        if (format === 'jpg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        ctx.drawImage(img, 0, 0)

        // Convert to desired format
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
        const quality = format === 'jpg' ? 0.95 : undefined

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error('Failed to create blob')
              return
            }

            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const filename = `creature-card-${creature.metadata.creatureName.replace(/\s+/g, '-')}.${format}`
            link.href = url
            link.download = filename
            link.style.display = 'none'

            document.body.appendChild(link)
            link.click()

            setTimeout(() => {
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
            }, 100)

            log.debug(`Exported: ${filename}`)
          },
          mimeType,
          quality
        )
      }

      img.onerror = () => {
        console.error('Failed to load image for export')
      }

      img.src = creature.thumbnail
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  private removeCreature(id: string) {
    const index = this.capturedCreatures.findIndex((c) => c.id === id)
    if (index !== -1) {
      this.capturedCreatures.splice(index, 1)
      this.removeFromLocalStorage(id)
      this.render()
    }
  }

  private saveToLocalStorage(creature: CapturedCreature) {
    const key = `captured-creature-${creature.id}`
    localStorage.setItem(key, JSON.stringify(creature))
  }

  private removeFromLocalStorage(id: string) {
    const key = `captured-creature-${id}`
    localStorage.removeItem(key)
  }

  private loadFromLocalStorage() {
    this.capturedCreatures = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('captured-creature-')) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            const creature = JSON.parse(data) as CapturedCreature
            this.capturedCreatures.push(creature)
          } catch (_e) {
            console.error('Failed to parse captured creature:', key)
          }
        }
      }
    }

    // Sort by capture time
    this.capturedCreatures.sort((a, b) => b.captureTime - a.captureTime)

    // Limit to max creatures
    if (this.capturedCreatures.length > this.maxCreatures) {
      this.capturedCreatures = this.capturedCreatures.slice(0, this.maxCreatures)
    }
  }

  public getCount(): number {
    return this.capturedCreatures.length
  }

  public isFull(): boolean {
    return this.capturedCreatures.length >= this.maxCreatures
  }

  private addTestCreature() {
    log.debug('🧪 Adding test creature...')

    // Create a simple test image (red square)
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')

    // Draw a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 200, 200)
    gradient.addColorStop(0, '#ff6b6b')
    gradient.addColorStop(1, '#4ecdc4')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 200, 200)

    // Draw text
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('TEST', 100, 80)
    ctx.fillText('CREATURE', 100, 120)

    const testThumbnail = canvas.toDataURL('image/png')

    const testMetadata: CreatureCardMetadata = {
      version: '1.0',
      creatureName: 'Test Creature',
      anatomy: {
        archetype: 'terrestrial',
        size: 'medium',
        rarity: 0.75,
      } as unknown as import('@systems/creatures').Anatomy,
      rarity: 0.75,
      seed: 12345,
      captureDate: new Date().toISOString(),
    }

    const result = this.addCreature(testMetadata, testThumbnail)
    log.debug('🧪 Test creature added:', result)
  }
}
