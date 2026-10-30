/**
 * Player Stats Component
 * Displays player statistics, avatar preview, and inventory
 */

import type { PlayerProgress } from '@systems/state'
import { AvatarPreview } from './avatar-preview'
import {
  type InventoryItem,
  renderBasicStats,
  renderInventoryItems,
  renderRarityTiers,
} from './player-stats-views'
import { UIComponentBase } from './UIComponentBase'

export type { InventoryItem }

export class PlayerStats extends UIComponentBase {
  protected displayStyle = 'flex'

  // Avatar preview. Created on first use because the base constructor builds the
  // container before this class's field initializers have run.
  // `declare` emits no initializer, which would otherwise reset the value after super() returns.
  private declare avatarPreview?: AvatarPreview
  private get avatar(): AvatarPreview {
    this.avatarPreview ??= new AvatarPreview(268)
    return this.avatarPreview
  }

  // Inventory
  private inventory: InventoryItem[] = []

  protected createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'player-stats-modal'
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1500;
      backdrop-filter: blur(8px);
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      padding: 0;
      max-width: 900px;
      width: 90%;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(74, 222, 128, 0.3);
      display: flex;
      flex-direction: column;
    `

    // Header
    const header = this.createHeader()
    content.appendChild(header)

    // Main content area (scrollable)
    const mainContent = document.createElement('div')
    mainContent.style.cssText = `
      display: flex;
      gap: 20px;
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    `

    // Left column - Avatar and basic stats
    const leftColumn = this.createLeftColumn()
    mainContent.appendChild(leftColumn)

    // Right column - Detailed stats and inventory
    const rightColumn = this.createRightColumn()
    mainContent.appendChild(rightColumn)

    content.appendChild(mainContent)
    container.appendChild(content)

    // Close on background click
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        this.audioCallbacks.onClick?.()
        this.hide()
      }
    })

    return container
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div')
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 2px solid rgba(74, 222, 128, 0.2);
      background: rgba(0, 0, 0, 0.3);
    `

    const title = document.createElement('h2')
    title.textContent = '👤 Player Profile'
    title.style.cssText = `
      margin: 0;
      color: #4ade80;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
    `

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = `
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #ef4444;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 20px;
      transition: all 0.2s;
    `
    closeBtn.addEventListener('mouseenter', () => {
      this.audioCallbacks.onHover?.()
      closeBtn.style.background = 'rgba(239, 68, 68, 0.4)'
      closeBtn.style.transform = 'scale(1.1)'
    })
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.2)'
      closeBtn.style.transform = 'scale(1)'
    })
    closeBtn.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.hide()
    })

    header.appendChild(title)
    header.appendChild(closeBtn)
    return header
  }

  private createLeftColumn(): HTMLDivElement {
    const column = document.createElement('div')
    column.style.cssText = `
      flex: 0 0 300px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    `

    // Avatar preview card
    const avatarCard = document.createElement('div')
    avatarCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
    `

    const avatarTitle = document.createElement('h3')
    avatarTitle.textContent = '🎭 Avatar'
    avatarTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    avatarCard.appendChild(avatarTitle)

    // Avatar canvas
    this.avatar.canvas.style.cssText = `
      width: 100%;
      border-radius: 8px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 2px solid rgba(74, 222, 128, 0.3);
    `
    avatarCard.appendChild(this.avatar.canvas)

    column.appendChild(avatarCard)

    // Basic stats card
    const statsCard = document.createElement('div')
    statsCard.id = 'basic-stats-card'
    statsCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
    `

    const statsTitle = document.createElement('h3')
    statsTitle.textContent = '📊 Quick Stats'
    statsTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    statsCard.appendChild(statsTitle)

    const statsContent = document.createElement('div')
    statsContent.id = 'basic-stats-content'
    statsContent.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #e5e7eb;
      font-size: 14px;
    `
    statsCard.appendChild(statsContent)

    column.appendChild(statsCard)

    return column
  }

  private createRightColumn(): HTMLDivElement {
    const column = document.createElement('div')
    column.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    `

    // Detailed stats card
    const detailedStatsCard = document.createElement('div')
    detailedStatsCard.id = 'detailed-stats-card'
    detailedStatsCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
    `

    const detailedTitle = document.createElement('h3')
    detailedTitle.textContent = '🏆 Achievements'
    detailedTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    detailedStatsCard.appendChild(detailedTitle)

    const detailedContent = document.createElement('div')
    detailedContent.id = 'detailed-stats-content'
    detailedContent.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    `
    detailedStatsCard.appendChild(detailedContent)

    column.appendChild(detailedStatsCard)

    // Inventory card
    const inventoryCard = document.createElement('div')
    inventoryCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
      flex: 1;
    `

    const inventoryTitle = document.createElement('h3')
    inventoryTitle.textContent = '🎒 Inventory'
    inventoryTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    inventoryCard.appendChild(inventoryTitle)

    const inventoryGrid = document.createElement('div')
    inventoryGrid.id = 'inventory-grid'
    inventoryGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    `
    inventoryCard.appendChild(inventoryGrid)

    column.appendChild(inventoryCard)

    return column
  }

  public updateStats(progress: PlayerProgress): void {
    const basicStats = document.getElementById('basic-stats-content')
    if (basicStats) basicStats.innerHTML = renderBasicStats(progress)

    const detailedStats = document.getElementById('detailed-stats-content')
    if (detailedStats) detailedStats.innerHTML = renderRarityTiers(progress)
  }

  public setInventory(items: InventoryItem[]): void {
    this.inventory = items
    this.renderInventory()
  }

  public addInventoryItem(item: InventoryItem): void {
    const existing = this.inventory.find((i) => i.id === item.id)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      this.inventory.push(item)
    }
    this.renderInventory()
  }

  private renderInventory(): void {
    const inventoryGrid = document.getElementById('inventory-grid')
    if (!inventoryGrid) return

    inventoryGrid.innerHTML = renderInventoryItems(this.inventory)

    // Hover effects
    for (const el of inventoryGrid.querySelectorAll<HTMLElement>('.inventory-item')) {
      const restingBorder = el.style.borderColor
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)'
        el.style.borderColor = 'rgba(74, 222, 128, 0.8)'
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
        el.style.borderColor = restingBorder
      })
    }
  }

  protected onShow(): void {
    this.avatar.start(() => this.isVisible)
  }

  protected onDispose(): void {
    this.avatar.dispose()
  }
}
