import { FOOD_STORE_CSS } from './food-store-styles'
/**
 * Food Store Component
 * Shop interface for purchasing food items
 */

import type { UICallbacks } from '@core/types'

export interface StoreItem {
  id: string
  name: string
  icon: string
  description: string
  price: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export class FoodStore {
  private container: HTMLDivElement
  private isOpen: boolean = false
  private audioCallbacks: UICallbacks = {}
  private onPurchaseCallback: ((itemId: string, price: number) => boolean) | null = null
  private currentBalance: number = 0

  constructor() {
    this.container = this.createContainer()
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'food-store'
    container.className = 'modal-overlay'
    container.style.display = 'none'

    container.innerHTML = `
      <div class="food-store-modal">
        <div class="food-store-header">
          <h2>🏪 Food Store</h2>
          <div class="store-balance">
            <span class="balance-label">Your Balance:</span>
            <span class="balance-amount">🪙 0</span>
          </div>
          <button class="close-btn" id="closeFoodStore">✕</button>
        </div>
        <div class="food-store-content">
          <div class="store-items" id="storeItems"></div>
        </div>
      </div>
    `

    this.addStyles()
    this.setupEventListeners(container)

    return container
  }

  private addStyles(): void {
    if (document.getElementById('food-store-styles')) return

    const style = document.createElement('style')
    style.id = 'food-store-styles'
    style.textContent = FOOD_STORE_CSS
    document.head.appendChild(style)
  }

  private setupEventListeners(container: HTMLDivElement): void {
    const closeBtn = container.querySelector('#closeFoodStore')
    closeBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.close()
    })

    // Close on overlay click
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        this.close()
      }
    })
  }

  /**
   * Set audio callbacks
   */
  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audioCallbacks = callbacks
  }

  /**
   * Set purchase callback
   */
  public setOnPurchase(callback: (itemId: string, price: number) => boolean): void {
    this.onPurchaseCallback = callback
  }

  /**
   * Update player balance display
   */
  public updateBalance(balance: number): void {
    this.currentBalance = balance
    const balanceEl = this.container.querySelector('.balance-amount')
    if (balanceEl) {
      balanceEl.textContent = `🪙 ${balance}`
    }
  }

  /**
   * Load store items
   */
  public loadItems(items: StoreItem[]): void {
    const itemsContainer = this.container.querySelector('#storeItems')
    if (!itemsContainer) return

    if (items.length === 0) {
      itemsContainer.innerHTML = '<div class="store-empty">No items available</div>'
      return
    }

    itemsContainer.innerHTML = items
      .map((item) => {
        const canAfford = this.currentBalance >= item.price
        const affordClass = canAfford ? 'affordable' : 'expensive'

        return `
          <div class="store-item ${affordClass}" data-item-id="${item.id}" data-price="${item.price}">
            <div class="store-item-icon">${item.icon}</div>
            <div class="store-item-rarity rarity-${item.rarity}">${item.rarity}</div>
            <div class="store-item-name">${item.name}</div>
            <div class="store-item-description">${item.description}</div>
            <div class="store-item-price">🪙 ${item.price}</div>
          </div>
        `
      })
      .join('')

    // Add click handlers to items
    itemsContainer.querySelectorAll('.store-item').forEach((el) => {
      el.addEventListener('click', () => {
        const itemId = el.getAttribute('data-item-id')
        const price = parseInt(el.getAttribute('data-price') || '0', 10)
        if (itemId) {
          this.handlePurchase(itemId, price)
        }
      })
    })
  }

  /**
   * Handle item purchase
   */
  private handlePurchase(itemId: string, price: number): void {
    if (!this.onPurchaseCallback) return

    this.audioCallbacks.onClick?.()

    const success = this.onPurchaseCallback(itemId, price)

    if (success) {
      // Refresh items to update affordability
      const items = this.getCurrentItems()
      this.loadItems(items)
    }
  }

  /**
   * Get current items from DOM
   */
  private getCurrentItems(): StoreItem[] {
    const items: StoreItem[] = []
    const itemElements = this.container.querySelectorAll('.store-item')

    itemElements.forEach((el) => {
      const id = el.getAttribute('data-item-id') || ''
      const price = parseInt(el.getAttribute('data-price') || '0', 10)
      const icon = el.querySelector('.store-item-icon')?.textContent || ''
      const name = el.querySelector('.store-item-name')?.textContent || ''
      const description = el.querySelector('.store-item-description')?.textContent || ''
      const rarityEl = el.querySelector('.store-item-rarity')
      const rarity = (rarityEl?.textContent || 'common') as StoreItem['rarity']

      items.push({ id, name, icon, description, price, rarity })
    })

    return items
  }

  /**
   * Open the store
   */
  public open(): void {
    this.isOpen = true
    this.container.style.display = 'flex'
  }

  /**
   * Close the store
   */
  public close(): void {
    this.isOpen = false
    this.container.style.display = 'none'
  }

  /**
   * Toggle store visibility
   */
  public toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * Check if store is open
   */
  public isStoreOpen(): boolean {
    return this.isOpen
  }
}
