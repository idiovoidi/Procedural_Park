import { log } from '@core/utils'
/**
 * Save/Load Menu Component
 * UI for managing save slots
 */

import type { UICallbacks } from '@core/types'
import type { SaveSlotMetadata, WorldStateManager } from '@systems/state'
import { formatPlayTime, formatSaveDate } from '@systems/state'

export interface SaveLoadCallbacks {
  onSave: (slotId: string) => void
  onLoad: (slotId: string) => void
  onDelete: (slotId: string) => void
  onExport: (slotId: string) => void
  onImport: (slotId: string, data: string) => void
}

export class SaveLoadMenu {
  private container: HTMLDivElement
  private isOpen: boolean = false
  private callbacks: SaveLoadCallbacks | null = null
  private audioCallbacks: UICallbacks = {}
  private worldStateManager: WorldStateManager | null = null

  constructor() {
    this.container = this.createContainer()
    document.body.appendChild(this.container)
    this.setupEventListeners()
  }

  public setWorldStateManager(manager: WorldStateManager): void {
    this.worldStateManager = manager
  }

  public setCallbacks(callbacks: SaveLoadCallbacks): void {
    this.callbacks = callbacks
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audioCallbacks = callbacks
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'save-load-menu'
    container.className = 'modal-overlay hidden'
    container.innerHTML = `
      <div class="modal-content save-load-content">
        <div class="modal-header">
          <h2>💾 Save / Load Game</h2>
          <button class="close-btn" id="closeSaveLoad">×</button>
        </div>
        <div class="modal-body">
          <div class="save-slots-container" id="saveSlotsContainer">
            <!-- Slots will be dynamically generated -->
          </div>
          <div class="save-actions">
            <button class="btn btn-primary" id="quickSaveBtn">
              💾 Quick Save
            </button>
            <button class="btn btn-secondary" id="quickLoadBtn">
              📂 Quick Load
            </button>
            <button class="btn btn-danger" id="clearAllBtn">
              🗑️ Clear All Saves
            </button>
          </div>
          <div class="storage-info" id="storageInfo">
            <!-- Storage info will be displayed here -->
          </div>
        </div>
      </div>
    `
    return container
  }

  private setupEventListeners(): void {
    const closeBtn = this.container.querySelector('#closeSaveLoad')
    closeBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.close()
    })

    const quickSaveBtn = this.container.querySelector('#quickSaveBtn')
    quickSaveBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.handleQuickSave()
    })

    const quickLoadBtn = this.container.querySelector('#quickLoadBtn')
    quickLoadBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.handleQuickLoad()
    })

    const clearAllBtn = this.container.querySelector('#clearAllBtn')
    clearAllBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.handleClearAll()
    })

    // Close on overlay click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close()
      }
    })
  }

  public open(): void {
    this.isOpen = true
    this.container.classList.remove('hidden')
    this.refreshSlots()
    this.updateStorageInfo()
  }

  public close(): void {
    this.isOpen = false
    this.container.classList.add('hidden')
  }

  public toggle(): void {
    log.debug('SaveLoadMenu.toggle() called, isOpen:', this.isOpen)
    log.debug('worldStateManager:', this.worldStateManager)
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private refreshSlots(): void {
    if (!this.worldStateManager) return

    const slotsContainer = this.container.querySelector('#saveSlotsContainer')
    if (!slotsContainer) return

    const slots = this.worldStateManager.getAvailableSlots()
    const metadata = this.worldStateManager.getAllMetadata()

    slotsContainer.innerHTML = slots
      .map((slotId) => {
        const meta = metadata.find((m) => m.slotId === slotId)
        return this.createSlotHTML(slotId, meta)
      })
      .join('')

    // Add event listeners to slot buttons
    this.attachSlotListeners()
  }

  private createSlotHTML(slotId: string, meta?: SaveSlotMetadata): string {
    const slotNumber = slotId.replace('slot_', '')
    const isEmpty = !meta

    if (isEmpty) {
      return `
        <div class="save-slot empty-slot" data-slot-id="${slotId}">
          <div class="slot-header">
            <span class="slot-number">Slot ${slotNumber}</span>
            <span class="slot-status">Empty</span>
          </div>
          <div class="slot-actions">
            <button class="btn btn-sm btn-primary save-btn" data-slot-id="${slotId}">
              💾 Save Here
            </button>
          </div>
        </div>
      `
    }

    return `
      <div class="save-slot" data-slot-id="${slotId}">
        <div class="slot-header">
          <span class="slot-number">Slot ${slotNumber}</span>
          <span class="slot-date">${formatSaveDate(meta.saveDate)}</span>
        </div>
        <div class="slot-info">
          <div class="slot-stat">
            <span class="stat-label">Photos:</span>
            <span class="stat-value">${meta.photoCount}</span>
          </div>
          <div class="slot-stat">
            <span class="stat-label">Score:</span>
            <span class="stat-value">${meta.totalScore}</span>
          </div>
          <div class="slot-stat">
            <span class="stat-label">Play Time:</span>
            <span class="stat-value">${formatPlayTime(meta.playTime)}</span>
          </div>
          <div class="slot-stat">
            <span class="stat-label">Seed:</span>
            <span class="stat-value">${meta.worldSeed}</span>
          </div>
        </div>
        <div class="slot-actions">
          <button class="btn btn-sm btn-primary save-btn" data-slot-id="${slotId}">
            💾 Save
          </button>
          <button class="btn btn-sm btn-success load-btn" data-slot-id="${slotId}">
            📂 Load
          </button>
          <button class="btn btn-sm btn-secondary export-btn" data-slot-id="${slotId}">
            📤 Export
          </button>
          <button class="btn btn-sm btn-danger delete-btn" data-slot-id="${slotId}">
            🗑️ Delete
          </button>
        </div>
      </div>
    `
  }

  private attachSlotListeners(): void {
    // Save buttons
    this.setupButtonHandler('.save-btn', (slotId) => this.handleSave(slotId))

    // Load buttons
    this.setupButtonHandler('.load-btn', (slotId) => this.handleLoad(slotId))

    // Delete buttons
    this.setupButtonHandler('.delete-btn', (slotId) => this.handleDelete(slotId))

    // Export buttons
    this.setupButtonHandler('.export-btn', (slotId) => this.handleExport(slotId))
  }

  private setupButtonHandler(selector: string, handler: (slotId: string) => void): void {
    this.container.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.audioCallbacks.onClick?.()
        const slotId = (e.target as HTMLElement).dataset.slotId
        if (slotId) handler(slotId)
      })
    })
  }

  private handleSave(slotId: string): void {
    this.callbacks?.onSave(slotId)
    this.refreshSlots()
    this.updateStorageInfo()
  }

  private handleLoad(slotId: string): void {
    if (confirm('Load this save? Current progress will be lost if not saved.')) {
      this.callbacks?.onLoad(slotId)
      this.close()
    }
  }

  private handleDelete(slotId: string): void {
    if (confirm('Delete this save? This cannot be undone.')) {
      this.callbacks?.onDelete(slotId)
      this.refreshSlots()
      this.updateStorageInfo()
    }
  }

  private handleExport(slotId: string): void {
    this.callbacks?.onExport(slotId)
  }

  private handleQuickSave(): void {
    this.callbacks?.onSave('quicksave')
    this.refreshSlots()
    this.updateStorageInfo()
  }

  private handleQuickLoad(): void {
    if (this.worldStateManager?.hasSave('quicksave')) {
      if (confirm('Load quick save? Current progress will be lost if not saved.')) {
        this.callbacks?.onLoad('quicksave')
        this.close()
      }
    } else {
      alert('No quick save found!')
    }
  }

  private handleClearAll(): void {
    if (confirm('Delete ALL saves? This cannot be undone!')) {
      if (confirm('Are you absolutely sure? This will delete everything!')) {
        this.worldStateManager?.clearAllSaves()
        this.refreshSlots()
        this.updateStorageInfo()
      }
    }
  }

  private updateStorageInfo(): void {
    if (!this.worldStateManager) return

    const infoContainer = this.container.querySelector('#storageInfo')
    if (!infoContainer) return

    const info = this.worldStateManager.getStorageInfo()
    infoContainer.innerHTML = `
      <div class="storage-bar">
        <div class="storage-bar-fill" style="width: ${info.percentage}%"></div>
      </div>
      <div class="storage-text">
        Storage: ${info.used} KB / ${info.available} KB (${info.percentage}%)
      </div>
    `
  }
}
