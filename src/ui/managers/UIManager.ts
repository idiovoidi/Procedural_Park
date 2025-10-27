import * as THREE from 'three'
import type { UICallbacks } from '@core/types'
import type { ShaderConfig } from '@rendering/shaders'
import { ShaderDebugUI, type ShaderDebugCallbacks } from '@rendering/shaders'
import { Gallery } from '../components/gallery'
import { Settings } from '../components/settings'
import { Shortcuts } from '../components/shortcuts'
import { MiniMap } from '../components/mini-map'
import { Toast } from '../components/toast'
import { SaveLoadMenu } from '../components/save-load-menu'
import { PlayerStats, type InventoryItem } from '../components/player-stats'

export class UIManager {
  private gallery: Gallery
  private settings: Settings
  private toast: Toast
  private shortcuts: Shortcuts
  private miniMap: MiniMap
  private saveLoadMenu: SaveLoadMenu
  private playerStats: PlayerStats
  private toggleMultiplayerBtn: HTMLButtonElement
  private restartRideBtn: HTMLButtonElement
  private toggleSaveLoadBtn: HTMLButtonElement
  private togglePlayerStatsBtn: HTMLButtonElement
  private audioCallbacks: UICallbacks = {}
  private shaderDebugUI: ShaderDebugUI | null = null
  private shaderStatusIndicator: HTMLDivElement | null = null

  constructor() {
    this.gallery = new Gallery()
    this.settings = new Settings()
    this.toast = new Toast()
    this.shortcuts = new Shortcuts()
    this.miniMap = new MiniMap()
    this.saveLoadMenu = new SaveLoadMenu()
    this.playerStats = new PlayerStats()

    this.toggleMultiplayerBtn = document.getElementById('toggleMultiplayer') as HTMLButtonElement
    this.restartRideBtn = document.getElementById('restartRide') as HTMLButtonElement
    this.toggleSaveLoadBtn = document.getElementById('toggleSaveLoad') as HTMLButtonElement
    this.togglePlayerStatsBtn = document.getElementById('togglePlayerStats') as HTMLButtonElement

    if (!this.toggleSaveLoadBtn) {
      console.error('toggleSaveLoad button not found in DOM!')
    } else {
      console.log('toggleSaveLoad button found:', this.toggleSaveLoadBtn)
    }

    this.setupEventListeners()
    this.createShaderStatusIndicator()
  }

  public setAudioCallbacks(callbacks: UICallbacks) {
    this.audioCallbacks = callbacks
    this.gallery.setAudioCallbacks(callbacks)
    this.settings.setAudioCallbacks(callbacks)
    this.shortcuts.setAudioCallbacks(callbacks)
    this.saveLoadMenu.setAudioCallbacks(callbacks)
    this.playerStats.setAudioCallbacks(callbacks)
  }

  private setupEventListeners() {
    this.toggleMultiplayerBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleMultiplayer()
    })

    // Setup save/load button
    if (this.toggleSaveLoadBtn) {
      console.log('Adding click listener to save/load button')
      this.toggleSaveLoadBtn.addEventListener('click', () => {
        console.log('Save/load button clicked!')
        this.audioCallbacks.onClick?.()
        this.toggleSaveLoadMenu()
      })
    } else {
      console.error('Cannot add listener: toggleSaveLoadBtn is null')
    }

    // Setup player stats button
    if (this.togglePlayerStatsBtn) {
      this.togglePlayerStatsBtn.addEventListener('click', () => {
        this.audioCallbacks.onClick?.()
        this.togglePlayerStats()
      })
    }

    // Setup restart button
    this.restartRideBtn?.addEventListener('click', () => {
      this.onRestartRide?.()
    })

    // Wire up settings callbacks
    this.settings.onRideSpeedChange = (speed) => this.onRideSpeedChange?.(speed)
    this.settings.onClearGallery = () => this.onClearGallery?.()
    this.settings.onDayNightToggle = (mode) => this.onDayNightToggle?.(mode)
    this.settings.onShaderConfigChange = (config) => this.onShaderConfigChange?.(config)
    this.settings.onShaderToggle = (enabled) => this.onShaderToggle?.(enabled)
    this.settings.onShaderPresetLoad = (preset) => this.onShaderPresetLoad?.(preset)
    this.settings.onAutoPerformanceToggle = (enabled) => this.onAutoPerformanceToggle?.(enabled)
    this.settings.onShowCreatureInfoChange = (enabled) =>
      this.toast.setShowCreatureInfoEnabled(enabled)
    this.settings.onShaderSettingsClick = () => this.toggleShaderDebugUI()
  }

  // Callback functions that can be set by the game
  public onRideSpeedChange?: (speed: number) => void
  public onClearGallery?: () => void
  public onRestartRide?: () => void
  public onDayNightToggle?: (mode: 'day' | 'night') => void
  public onShaderConfigChange?: (config: Partial<ShaderConfig>) => void
  public onShaderToggle?: (enabled: boolean) => void
  public onShaderPresetLoad?: (preset: ShaderConfig) => void
  public onAutoPerformanceToggle?: (enabled: boolean) => void
  public onToggleMultiplayer?: () => void
  public onToggleSaveLoad?: () => void

  // Gallery methods
  public toggleGallery() {
    this.gallery.toggle()
  }

  public addPhotoToGallery(dataUrl: string, score: number, creatureName?: string) {
    this.gallery.addPhoto(dataUrl, score, creatureName)
    this.toast.addPhoto(score)
  }

  public clearGallery() {
    this.gallery.clear()
    this.toast.clearStats()
  }

  // Settings methods
  public toggleSettings() {
    this.settings.toggle()
  }

  // Shortcuts methods
  public toggleShortcuts() {
    this.shortcuts.toggle()
  }

  // Multiplayer methods
  public toggleMultiplayer() {
    this.onToggleMultiplayer?.()
  }

  // Player Stats methods
  public togglePlayerStats() {
    this.playerStats.toggle()
  }

  public updatePlayerStats(progress: import('@systems/state').PlayerProgress) {
    this.playerStats.updateStats(progress)
  }

  public setInventory(items: InventoryItem[]) {
    this.playerStats.setInventory(items)
  }

  public addInventoryItem(item: InventoryItem) {
    this.playerStats.addInventoryItem(item)
  }

  // Save/Load methods
  public toggleSaveLoadMenu() {
    console.log('toggleSaveLoadMenu called')
    this.saveLoadMenu.toggle()
  }

  public getSaveLoadMenu(): SaveLoadMenu {
    return this.saveLoadMenu
  }

  // Toast methods
  public showToast(text: string, duration?: number) {
    this.toast.show(text, duration)
  }

  public showScoreToast(score: number) {
    this.toast.showScore(score)
  }

  public showCreatureInfo(name: string, distance: number, rarity: number) {
    this.toast.showCreatureInfo(name, distance, rarity)
  }

  public hideCreatureInfo() {
    this.toast.hideCreatureInfo()
  }

  public showLoading(text?: string) {
    this.toast.showLoading(text)
  }

  public hideLoading() {
    this.toast.hideLoading()
  }

  public getPhotoCount(): number {
    return this.toast.getPhotoCount()
  }

  public getTotalScore(): number {
    return this.toast.getTotalScore()
  }

  // Sprint indicator methods
  public showSprintIndicator() {
    this.toast.showSprintIndicator()
  }

  public hideSprintIndicator() {
    this.toast.hideSprintIndicator()
  }

  // Mini-map methods
  public updateMiniMap(
    playerPosition: { x: number; z: number },
    pathPoints: THREE.Vector3[],
    biomes?: Map<string, string>
  ) {
    this.miniMap.update(playerPosition, pathPoints, biomes)
  }

  // Shader debug UI methods
  public initializeShaderDebugUI(initialConfig: ShaderConfig): void {
    if (this.shaderDebugUI) {
      this.shaderDebugUI.dispose()
    }

    const callbacks: ShaderDebugCallbacks = {
      onConfigChange: (config) => {
        this.onShaderConfigChange?.(config)
      },
      onToggleShader: (enabled) => {
        this.onShaderToggle?.(enabled)
      },
      onPresetLoad: (preset) => {
        this.onShaderPresetLoad?.(preset)
      },
      onAutoPerformanceToggle: (enabled) => {
        this.onAutoPerformanceToggle?.(enabled)
      },
    }

    this.shaderDebugUI = new ShaderDebugUI(callbacks, initialConfig)
  }

  public updateShaderDebugUI(config: ShaderConfig): void {
    this.shaderDebugUI?.updateConfig(config)
  }

  public setShaderAutoPerformanceEnabled(enabled: boolean): void {
    this.shaderDebugUI?.setAutoPerformanceEnabled(enabled)
  }

  public showShaderDebugUI(): void {
    this.shaderDebugUI?.show()
  }

  public hideShaderDebugUI(): void {
    this.shaderDebugUI?.hide()
  }

  public toggleShaderDebugUI(): void {
    this.shaderDebugUI?.toggle()
  }

  public disposeShaderDebugUI(): void {
    if (this.shaderDebugUI) {
      this.shaderDebugUI.dispose()
      this.shaderDebugUI = null
    }
  }

  // Create shader status indicator
  private createShaderStatusIndicator(): void {
    const indicator = document.createElement('div')
    indicator.id = 'shader-status-indicator'
    indicator.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 6px;
      z-index: 999;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
    `

    indicator.innerHTML = `
      <span class="status-icon">🎨</span>
      <span class="status-text">Shader: ON</span>
    `

    document.body.appendChild(indicator)
    this.shaderStatusIndicator = indicator
  }

  // Update shader status indicator
  public updateShaderStatus(status: {
    enabled: boolean
    hasErrors: boolean
    isTransitioning: boolean
    qualityLevel: string
  }): void {
    if (!this.shaderStatusIndicator) return

    const iconEl = this.shaderStatusIndicator.querySelector('.status-icon') as HTMLSpanElement
    const textEl = this.shaderStatusIndicator.querySelector('.status-text') as HTMLSpanElement

    if (status.hasErrors) {
      iconEl.textContent = '⚠️'
      textEl.textContent = 'Shader: ERROR'
      this.shaderStatusIndicator.style.background = 'rgba(220, 38, 38, 0.8)'
      this.shaderStatusIndicator.style.borderColor = 'rgba(220, 38, 38, 0.5)'
    } else if (status.isTransitioning) {
      iconEl.textContent = '🔄'
      textEl.textContent = status.enabled ? 'Shader: ENABLING...' : 'Shader: DISABLING...'
      this.shaderStatusIndicator.style.background = 'rgba(59, 130, 246, 0.8)'
      this.shaderStatusIndicator.style.borderColor = 'rgba(59, 130, 246, 0.5)'
    } else if (status.enabled) {
      iconEl.textContent = '🎨'
      textEl.textContent = `Shader: ON (${status.qualityLevel.toUpperCase()})`
      this.shaderStatusIndicator.style.background = 'rgba(34, 197, 94, 0.8)'
      this.shaderStatusIndicator.style.borderColor = 'rgba(34, 197, 94, 0.5)'
    } else {
      iconEl.textContent = '🚫'
      textEl.textContent = 'Shader: OFF'
      this.shaderStatusIndicator.style.background = 'rgba(107, 114, 128, 0.8)'
      this.shaderStatusIndicator.style.borderColor = 'rgba(107, 114, 128, 0.5)'
    }
  }

  // Show shader notification toast
  public showShaderNotification(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): void {
    const colors = {
      info: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#dc2626',
    }

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }

    // Create notification element
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 160px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1001;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.3s ease-out;
    `

    notification.innerHTML = `
      <span>${icons[type]}</span>
      <span>${message}</span>
    `

    // Add animation styles
    if (!document.getElementById('shader-notification-styles')) {
      const style = document.createElement('style')
      style.id = 'shader-notification-styles'
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(notification)

    // Auto-remove after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in'
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 4000)
  }

  // Hide shader status indicator
  public hideShaderStatusIndicator(): void {
    if (this.shaderStatusIndicator) {
      this.shaderStatusIndicator.style.display = 'none'
    }
  }

  // Show shader status indicator
  public showShaderStatusIndicator(): void {
    if (this.shaderStatusIndicator) {
      this.shaderStatusIndicator.style.display = 'flex'
    }
  }
}
