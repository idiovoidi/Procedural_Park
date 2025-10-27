import type { UICallbacks } from '@core/types'
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

    this.setupEventListeners()
    this.loadFromLocalStorage()
    this.render()
  }

  public setAudioCallbacks(callbacks: UICallbacks) {
    this.audioCallbacks = callbacks
  }

  private setupEventListeners() {
    this.toggleCollectionBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggle()
    })

    this.collectionPanel?.querySelector('.close-btn')?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggle()
    })
  }

  public toggle() {
    this.collectionPanel?.classList.toggle('hidden')
  }

  public addCreature(metadata: CreatureCardMetadata, thumbnail: string): boolean {
    // Check if already captured
    const exists = this.capturedCreatures.some(c => c.id === this.getCreatureId(metadata))
    if (exists) {
      console.log('Creature already in collection')
      return false
    }

    // Remove oldest if at max capacity
    if (this.capturedCreatures.length >= this.maxCreatures) {
      const removed = this.capturedCreatures.shift()
      if (removed) {
        this.removeFromLocalStorage(removed.id)
      }
    }

    const captured: CapturedCreature = {
      id: this.getCreatureId(metadata),
      metadata,
      thumbnail,
      captureTime: Date.now()
    }

    this.capturedCreatures.push(captured)
    this.saveToLocalStorage(captured)
    this.render()
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
        <button class="export-btn" data-id="${creature.id}">
          💾 Export PNG
        </button>
        <button class="remove-btn" data-id="${creature.id}">
          🗑️ Remove
        </button>
      </div>
    `

    // Add event listeners
    const exportBtn = card.querySelector('.export-btn') as HTMLButtonElement
    const removeBtn = card.querySelector('.remove-btn') as HTMLButtonElement

    exportBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.exportCreature(creature)
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

  private exportCreature(creature: CapturedCreature) {
    console.log('Exporting creature:', creature.metadata.creatureName)

    try {
      // Convert base64 to blob
      const arr = creature.thumbnail.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }

      const blob = new Blob([u8arr], { type: mime })
      const url = URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement('a')
      const filename = `creature-card-${creature.metadata.creatureName.replace(/\s+/g, '-')}.png`
      link.href = url
      link.download = filename
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()

      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)

      console.log(`Exported: ${filename}`)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  private removeCreature(id: string) {
    const index = this.capturedCreatures.findIndex(c => c.id === id)
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
          } catch (e) {
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
}
