/**
 * Food Inventory Component
 * Displays food items and allows selection for feeding
 */

import type { FoodItem } from '@systems/food'
import { UIComponentBase } from './UIComponentBase'

export class FoodInventory extends UIComponentBase {
  protected displayStyle = 'block'
  private onFoodSelect?: (foodId: string) => void
  private selectedFoodId: string | null = null

  protected createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'food-inventory'
    container.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid rgba(74, 222, 128, 0.3);
      border-radius: 12px;
      padding: 12px;
      display: none;
      gap: 8px;
      z-index: 900;
      backdrop-filter: blur(8px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `

    const title = document.createElement('div')
    title.textContent = '🍽️ Food Inventory (Press F to feed)'
    title.style.cssText = `
      color: #4ade80;
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
      text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
    `
    container.appendChild(title)

    const itemsContainer = document.createElement('div')
    itemsContainer.id = 'food-items-container'
    itemsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      max-width: 600px;
    `
    container.appendChild(itemsContainer)

    const hint = document.createElement('div')
    hint.textContent = 'Click to select, get close to creature and press F to feed'
    hint.style.cssText = `
      color: #9ca3af;
      font-size: 10px;
      text-align: center;
      margin-top: 8px;
    `
    container.appendChild(hint)

    return container
  }

  public updateInventory(items: FoodItem[]): void {
    const itemsContainer = document.getElementById('food-items-container')
    if (!itemsContainer) return

    const rarityColors = {
      common: '#9ca3af',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      epic: '#a78bfa',
      legendary: '#fbbf24',
    }

    itemsContainer.innerHTML = items
      .map(
        (item) => `
      <div 
        class="food-item"
        data-food-id="${item.id}"
        style="
          background: rgba(0, 0, 0, 0.6);
          border: 2px solid ${this.selectedFoodId === item.id ? '#4ade80' : rarityColors[item.rarity]}40;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          min-width: 80px;
          ${this.selectedFoodId === item.id ? 'box-shadow: 0 0 20px rgba(74, 222, 128, 0.5);' : ''}
        "
        title="${item.description}"
      >
        <div style="font-size: 32px; text-align: center;">${item.icon}</div>
        <div style="font-size: 10px; color: #e5e7eb; text-align: center; margin-top: 4px;">
          ${item.name}
        </div>
        <div style="
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.8);
          color: ${item.quantity > 0 ? '#4ade80' : '#ef4444'};
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
        ">×${item.quantity}</div>
        ${
          this.selectedFoodId === item.id
            ? `<div style="
            position: absolute;
            bottom: 4px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(74, 222, 128, 0.9);
            color: black;
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
          ">SELECTED</div>`
            : ''
        }
      </div>
    `
      )
      .join('')

    // Add click handlers
    const foodItems = itemsContainer.querySelectorAll('.food-item')
    foodItems.forEach((element) => {
      const foodId = (element as HTMLElement).dataset.foodId
      if (!foodId) return

      const item = items.find((i) => i.id === foodId)
      if (!item || item.quantity === 0) {
        ;(element as HTMLElement).style.opacity = '0.5'
        ;(element as HTMLElement).style.cursor = 'not-allowed'
        return
      }

      element.addEventListener('click', () => {
        this.audioCallbacks.onClick?.()
        this.selectFood(foodId)
      })

      element.addEventListener('mouseenter', () => {
        if (item.quantity > 0) {
          this.audioCallbacks.onHover?.()
          ;(element as HTMLElement).style.transform = 'scale(1.1)'
          ;(element as HTMLElement).style.borderColor = 'rgba(74, 222, 128, 0.8)'
        }
      })

      element.addEventListener('mouseleave', () => {
        if (item.quantity > 0) {
          ;(element as HTMLElement).style.transform = 'scale(1)'
          const isSelected = this.selectedFoodId === foodId
          ;(element as HTMLElement).style.borderColor = isSelected
            ? '#4ade80'
            : `${rarityColors[item.rarity]}40`
        }
      })
    })
  }

  private selectFood(foodId: string): void {
    if (this.selectedFoodId === foodId) {
      // Deselect if clicking the same item
      this.selectedFoodId = null
      this.onFoodSelect?.(null as any)
    } else {
      this.selectedFoodId = foodId
      this.onFoodSelect?.(foodId)
    }
  }

  public setSelectedFood(foodId: string | null): void {
    this.selectedFoodId = foodId
  }

  public setOnFoodSelect(callback: (foodId: string) => void): void {
    this.onFoodSelect = callback
  }
}
