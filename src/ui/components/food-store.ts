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
    style.textContent = `
      .food-store-modal {
        background: rgba(20, 20, 30, 0.98);
        border-radius: 16px;
        padding: 0;
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        border: 2px solid rgba(255, 215, 0, 0.3);
        display: flex;
        flex-direction: column;
      }

      .food-store-header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 20px 24px;
        border-bottom: 2px solid rgba(255, 215, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .food-store-header h2 {
        margin: 0;
        color: #ffd700;
        font-size: 24px;
        font-weight: bold;
      }

      .store-balance {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }

      .balance-label {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
      }

      .balance-amount {
        font-size: 20px;
        font-weight: bold;
        color: #ffd700;
        font-family: 'Courier New', monospace;
      }

      .food-store-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .store-items {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }

      .store-item {
        background: rgba(30, 30, 45, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .store-item:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 215, 0, 0.5);
        box-shadow: 0 4px 16px rgba(255, 215, 0, 0.2);
      }

      .store-item.affordable {
        border-color: rgba(34, 197, 94, 0.3);
      }

      .store-item.affordable:hover {
        border-color: rgba(34, 197, 94, 0.6);
      }

      .store-item.expensive {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .store-item.expensive:hover {
        transform: none;
        border-color: rgba(220, 38, 38, 0.5);
      }

      .store-item-icon {
        font-size: 48px;
        text-align: center;
        margin-bottom: 8px;
      }

      .store-item-name {
        font-size: 16px;
        font-weight: bold;
        color: #fff;
        text-align: center;
      }

      .store-item-description {
        font-size: 12px;
        color: #aaa;
        text-align: center;
        min-height: 36px;
      }

      .store-item-price {
        font-size: 18px;
        font-weight: bold;
        color: #ffd700;
        text-align: center;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .store-item-rarity {
        font-size: 10px;
        text-transform: uppercase;
        text-align: center;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
      }

      .rarity-common { background: rgba(156, 163, 175, 0.3); color: #9ca3af; }
      .rarity-uncommon { background: rgba(34, 197, 94, 0.3); color: #22c55e; }
      .rarity-rare { background: rgba(59, 130, 246, 0.3); color: #3b82f6; }
      .rarity-epic { background: rgba(168, 85, 247, 0.3); color: #a855f7; }
      .rarity-legendary { background: rgba(251, 191, 36, 0.3); color: #fbbf24; }

      .store-empty {
        text-align: center;
        padding: 40px;
        color: #888;
        font-size: 16px;
      }
    `
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
