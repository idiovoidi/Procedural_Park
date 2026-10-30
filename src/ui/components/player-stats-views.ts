/**
 * HTML builders for the player stats panels
 */

import type { PlayerProgress } from '@systems/state'

export interface InventoryItem {
  id: string
  name: string
  icon: string
  description: string
  quantity: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export const RARITY_COLORS: Record<InventoryItem['rarity'], string> = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#a78bfa',
  legendary: '#fbbf24',
}

export function renderBasicStats(progress: PlayerProgress): string {
  const hours = Math.floor(progress.playTime / 3600)
  const minutes = Math.floor((progress.playTime % 3600) / 60)

  const row = (label: string, color: string, value: string | number) => `
        <div style="display: flex; justify-content: space-between;">
          <span>${label}</span>
          <span style="color: ${color}; font-weight: bold;">${value}</span>
        </div>`

  return [
    row('📸 Photos:', '#4ade80', progress.photoCount),
    row('⭐ Total Score:', '#fbbf24', progress.totalScore.toLocaleString()),
    row('🏆 Best Score:', '#f59e0b', progress.bestScore),
    row('🦎 Discovered:', '#60a5fa', progress.creaturesDiscovered.size),
    row('⏱️ Play Time:', '#a78bfa', `${hours}h ${minutes}m`),
  ].join('')
}

export function renderRarityTiers(progress: PlayerProgress): string {
  return Object.entries(progress.rarityTiers)
    .map(([tier, count]) => {
      const color = RARITY_COLORS[tier as InventoryItem['rarity']]
      return `
        <div style="
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid ${color}40;
        ">
          <div style="color: ${color}; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">
            ${tier}
          </div>
          <div style="color: white; font-size: 20px; font-weight: bold;">
            ${count}
          </div>
        </div>
      `
    })
    .join('')
}

export function renderInventoryItems(items: InventoryItem[]): string {
  return items
    .map(
      (item) => `
      <div
        class="inventory-item"
        data-rarity="${item.rarity}"
        style="
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid ${RARITY_COLORS[item.rarity]}40;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        "
        title="${item.description}"
      >
        <div style="font-size: 32px; text-align: center;">${item.icon}</div>
        <div style="font-size: 10px; color: #e5e7eb; text-align: center; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${item.name}
        </div>
        ${
          item.quantity > 1
            ? `<div style="
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            border-radius: 4px;
            font-weight: bold;
          ">${item.quantity}</div>`
            : ''
        }
      </div>
    `
    )
    .join('')
}
