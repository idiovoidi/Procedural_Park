import * as THREE from 'three'
import { GAME_CONFIG, BIOME_COLORS } from './constants'
import { ShaderDebugUI, type ShaderDebugCallbacks } from './shaders/ShaderDebugUI'
import type { ShaderConfig } from './shaders/ShaderManager'

export interface UICallbacks {
  onHover?: () => void
  onClick?: () => void
}

export class UIManager {
  private galleryEl: HTMLDivElement
  private galleryContentEl: HTMLDivElement
  private toggleGalleryBtn: HTMLButtonElement
  private toggleMultiplayerBtn: HTMLButtonElement
  private toastEl: HTMLDivElement
  private lastScoreEl: HTMLSpanElement
  private filmCountEl: HTMLSpanElement
  private totalScoreEl: HTMLSpanElement
  private settingsPanel: HTMLDivElement
  private toggleSettingsBtn: HTMLButtonElement
  private restartRideBtn: HTMLButtonElement
  private shortcutsPanel: HTMLDivElement
  private toggleShortcutsBtn: HTMLButtonElement
  private creatureInfoEl: HTMLDivElement
  private loadingEl: HTMLDivElement
  private miniMapCanvas: HTMLCanvasElement
  private miniMapCtx: CanvasRenderingContext2D | null
  private playerDot: HTMLDivElement
  private sprintIndicator: HTMLDivElement

  private photoCount = 0
  private totalScore = 0
  private showCreatureInfoEnabled = true
  private audioCallbacks: UICallbacks = {}
  private shaderDebugUI: ShaderDebugUI | null = null
  private shaderStatusIndicator: HTMLDivElement | null = null

  constructor() {
    this.galleryEl = document.getElementById('gallery') as HTMLDivElement
    this.galleryContentEl = document.querySelector('.gallery-content') as HTMLDivElement
    this.toggleGalleryBtn = document.getElementById('toggleGallery') as HTMLButtonElement
    this.toggleMultiplayerBtn = document.getElementById('toggleMultiplayer') as HTMLButtonElement
    this.toastEl = document.getElementById('toast') as HTMLDivElement
    this.lastScoreEl = document.getElementById('lastScore') as HTMLSpanElement
    this.filmCountEl = document.getElementById('filmCount') as HTMLSpanElement
    this.totalScoreEl = document.getElementById('totalScoreValue') as HTMLSpanElement
    this.settingsPanel = document.getElementById('settings-panel') as HTMLDivElement
    this.toggleSettingsBtn = document.getElementById('toggleSettings') as HTMLButtonElement
    this.restartRideBtn = document.getElementById('restartRide') as HTMLButtonElement
    this.shortcutsPanel = document.getElementById('shortcuts-panel') as HTMLDivElement
    this.toggleShortcutsBtn = document.getElementById('toggleShortcuts') as HTMLButtonElement
    this.creatureInfoEl = document.getElementById('creature-info') as HTMLDivElement
    this.loadingEl = document.getElementById('loading') as HTMLDivElement
    this.miniMapCanvas = document.getElementById('mini-map-canvas') as HTMLCanvasElement
    this.miniMapCtx = this.miniMapCanvas?.getContext('2d') || null
    this.playerDot = document.getElementById('player-dot') as HTMLDivElement
    this.sprintIndicator = document.getElementById('sprint-indicator') as HTMLDivElement

    this.setupEventListeners()
    this.updateStats()
    this.initializeMiniMap()
    this.createShaderStatusIndicator()

    // Setup restart button
    this.restartRideBtn?.addEventListener('click', () => {
      this.onRestartRide?.()
    })
  }

  public setAudioCallbacks(callbacks: UICallbacks) {
    this.audioCallbacks = callbacks
  }

  private setupEventListeners() {
    this.toggleGalleryBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleGallery()
    })
    this.toggleMultiplayerBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleMultiplayer()
    })
    this.toggleSettingsBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleSettings()
    })
    this.toggleShortcutsBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleShortcuts()
    })

    // Gallery close button
    this.galleryEl.querySelector('.close-btn')?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleGallery()
    })

    // Settings panel close button
    this.settingsPanel.querySelector('.close-btn')?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleSettings()
    })

    // Shortcuts panel close button
    this.shortcutsPanel.querySelector('.close-btn')?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleShortcuts()
    })

    // Settings controls
    const rideSpeedSlider = document.getElementById('rideSpeed') as HTMLInputElement
    const rideSpeedValue = document.getElementById('rideSpeedValue') as HTMLSpanElement
    const showCreatureInfoCheckbox = document.getElementById('showCreatureInfo') as HTMLInputElement
    const clearGalleryBtn = document.getElementById('clearGallery') as HTMLButtonElement

    rideSpeedSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.onRideSpeedChange?.(value)
      rideSpeedValue.textContent = this.getRideSpeedLabel(value)
    })

    showCreatureInfoCheckbox?.addEventListener('change', (e) => {
      this.showCreatureInfoEnabled = (e.target as HTMLInputElement).checked
      if (!this.showCreatureInfoEnabled) {
        this.hideCreatureInfo()
      }
    })

    clearGalleryBtn?.addEventListener('click', () => {
      this.onClearGallery?.()
    })

    // Shader settings button
    const shaderSettingsBtn = document.getElementById('shaderSettings') as HTMLButtonElement
    shaderSettingsBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.toggleShaderDebugUI()
    })

    // Day/Night toggle button
    const dayNightToggleBtn = document.getElementById('dayNightToggle') as HTMLButtonElement
    dayNightToggleBtn?.addEventListener('click', () => {
      const currentMode = dayNightToggleBtn.textContent?.includes('🌙') ? 'day' : 'night'
      const newMode = currentMode === 'day' ? 'night' : 'day'
      dayNightToggleBtn.textContent = newMode === 'day' ? '🌙 Night Mode' : '☀️ Day Mode'
      this.onDayNightToggle?.(newMode)
      this.audioCallbacks.onClick?.()
    })

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'g') {
        this.toggleGallery()
      }
      if (e.key.toLowerCase() === 'm') {
        this.toggleMultiplayer()
      }
      if (e.key.toLowerCase() === 'h') {
        this.toggleShortcuts()
      }
      // Changed from 'S' to 'Escape' to avoid conflict with WASD movement
      if (e.key === 'Escape') {
        e.preventDefault()
        this.toggleSettings()
      }
      if (e.key.toLowerCase() === 'n') {
        dayNightToggleBtn?.click()
      }
    })
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

  public toggleGallery() {
    this.galleryEl.classList.toggle('hidden')
  }

  public showToast(text: string, duration = GAME_CONFIG.TOAST_DURATION_MS) {
    this.toastEl.textContent = text
    this.toastEl.classList.remove('hidden')
    setTimeout(() => this.toastEl.classList.add('hidden'), duration)
  }

  public toggleSettings() {
    this.settingsPanel.classList.toggle('hidden')
  }

  public toggleShortcuts() {
    this.shortcutsPanel.classList.toggle('hidden')
  }

  public toggleMultiplayer() {
    this.onToggleMultiplayer?.()
  }

  public showCreatureInfo(name: string, distance: number, rarity: number) {
    if (!this.showCreatureInfoEnabled) return

    const nameEl = this.creatureInfoEl.querySelector('.creature-name') as HTMLDivElement
    const distanceEl = this.creatureInfoEl.querySelector('.creature-distance') as HTMLDivElement
    const rarityEl = this.creatureInfoEl.querySelector('.creature-rarity') as HTMLDivElement

    nameEl.textContent = name
    distanceEl.textContent = `Distance: ${distance.toFixed(1)}m`
    rarityEl.textContent = `Rarity: ${Math.round(rarity * 100)}%`

    this.creatureInfoEl.classList.remove('hidden')
  }

  public hideCreatureInfo() {
    this.creatureInfoEl.classList.add('hidden')
  }

  public showLoading(text = 'Loading...') {
    const loadingText = this.loadingEl.querySelector('.loading-text') as HTMLDivElement
    loadingText.textContent = text
    this.loadingEl.classList.remove('hidden')
  }

  public hideLoading() {
    this.loadingEl.classList.add('hidden')
  }

  private getRideSpeedLabel(speed: number): string {
    if (speed <= GAME_CONFIG.CAMERA_SPEED_VERY_SLOW) return 'Very Slow'
    if (speed <= GAME_CONFIG.CAMERA_SPEED_DEFAULT) return 'Slow'
    if (speed <= GAME_CONFIG.CAMERA_SPEED_NORMAL) return 'Normal'
    if (speed <= GAME_CONFIG.CAMERA_SPEED_FAST) return 'Fast'
    return 'Very Fast'
  }

  public addPhotoToGallery(dataUrl: string, score: number, creatureName?: string) {
    const img = new Image()
    img.src = dataUrl
    img.title = creatureName ? `${creatureName} - Score: ${score}` : `Score: ${score}`
    img.className = 'gallery-photo'

    // Add click handler for full-size view
    img.addEventListener('click', () => this.showFullSizePhoto(dataUrl, score, creatureName))

    this.galleryContentEl.appendChild(img)
    this.photoCount++
    this.totalScore += score
    this.updateStats()
  }

  private showFullSizePhoto(dataUrl: string, score: number, creatureName?: string) {
    // Create modal overlay
    const modal = document.createElement('div')
    modal.className = 'photo-modal'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${creatureName || 'Unknown Creature'}</h3>
          <button class="close-btn">&times;</button>
        </div>
        <img src="${dataUrl}" alt="Full size photo" class="modal-image">
        <div class="modal-footer">
          <p>Score: ${score}</p>
          <button class="delete-btn">Delete Photo</button>
        </div>
      </div>
    `

    // Add modal styles
    const style = document.createElement('style')
    style.textContent = `
      .photo-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .modal-content {
        background: var(--hud-bg);
        border-radius: 12px;
        padding: 20px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      .modal-header h3 {
        margin: 0;
        color: var(--hud-text);
      }
      .close-btn, .delete-btn {
        background: #1b2430;
        color: var(--hud-text);
        border: 1px solid #2a384a;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
      }
      .close-btn:hover, .delete-btn:hover {
        background: #2a384a;
      }
      .modal-image {
        max-width: 100%;
        max-height: 60vh;
        object-fit: contain;
        border-radius: 8px;
      }
      .modal-footer {
        margin-top: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .modal-footer p {
        margin: 0;
        color: var(--hud-text);
        font-weight: bold;
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(modal)

    // Event listeners
    modal.querySelector('.close-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal)
      document.head.removeChild(style)
    })

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
        document.head.removeChild(style)
      }
    })
  }

  private updateStats() {
    this.filmCountEl.textContent = String(this.photoCount)
    this.totalScoreEl.textContent = String(this.totalScore)
  }

  public showScoreToast(score: number) {
    if (score > 0) {
      let message = `Nice! +${score}`
      if (score > GAME_CONFIG.PHOTO_SCORE_EXCELLENT) message = `Excellent! +${score}`
      else if (score > GAME_CONFIG.PHOTO_SCORE_GREAT) message = `Great shot! +${score}`
      else if (score > GAME_CONFIG.PHOTO_SCORE_GOOD) message = `Good! +${score}`

      this.showToast(message)
    } else {
      this.showToast('Miss!')
    }
  }

  public getPhotoCount(): number {
    return this.photoCount
  }

  public getTotalScore(): number {
    return this.totalScore
  }

  private initializeMiniMap() {
    // Ensure we have a valid canvas and context
    if (!this.miniMapCanvas || !this.miniMapCtx) {
      console.warn('Mini-map canvas not found, skipping initialization')
      return
    }

    // Set up the mini-map canvas with proper scaling
    const dpr = window.devicePixelRatio || 1
    this.miniMapCanvas.width = GAME_CONFIG.MINIMAP_SIZE * dpr
    this.miniMapCanvas.height = GAME_CONFIG.MINIMAP_SIZE * dpr
    this.miniMapCtx.scale(dpr, dpr)

    // Initial clear
    this.clearMiniMap()
  }

  private clearMiniMap() {
    if (!this.miniMapCtx) return
    this.miniMapCtx.fillStyle = '#1a1a2e'
    this.miniMapCtx.fillRect(0, 0, GAME_CONFIG.MINIMAP_SIZE, GAME_CONFIG.MINIMAP_SIZE)
  }

  public updateMiniMap(
    playerPosition: { x: number; z: number },
    pathPoints: THREE.Vector3[],
    biomes?: Map<string, string>
  ) {
    // Skip if mini-map is not properly initialized
    if (!this.miniMapCanvas || !this.miniMapCtx) {
      return
    }

    this.clearMiniMap()

    // Calculate bounds for the map
    const bounds = GAME_CONFIG.MINIMAP_BOUNDS
    const mapSize = GAME_CONFIG.MINIMAP_SIZE

    // Draw biome background if available
    if (biomes) {
      this.drawBiomes(biomes, bounds, mapSize)
    }

    // Draw the path
    this.drawPath(pathPoints, bounds, mapSize)

    // Update player dot position
    this.updatePlayerDot(playerPosition, bounds, mapSize)
  }

  private drawBiomes(biomes: Map<string, string>, bounds: any, mapSize: number) {
    if (!this.miniMapCtx) return

    // Draw biome patches (simplified)
    for (let [position, biome] of biomes) {
      const [x, z] = position.split(',').map(Number)
      const screenX = ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * mapSize
      const screenZ = ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * mapSize

      this.miniMapCtx.fillStyle = BIOME_COLORS[biome] || BIOME_COLORS.default
      this.miniMapCtx.fillRect(screenX - 5, screenZ - 5, 10, 10)
    }
  }

  private drawPath(pathPoints: THREE.Vector3[], bounds: any, mapSize: number) {
    if (!this.miniMapCtx || pathPoints.length < 2) return

    this.miniMapCtx.strokeStyle = '#6cf'
    this.miniMapCtx.lineWidth = 2
    this.miniMapCtx.beginPath()

    for (let i = 0; i < pathPoints.length; i++) {
      const point = pathPoints[i]
      const screenX = ((point.x - bounds.minX) / (bounds.maxX - bounds.minX)) * mapSize
      const screenZ = ((point.z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * mapSize

      if (i === 0) {
        this.miniMapCtx.moveTo(screenX, screenZ)
      } else {
        this.miniMapCtx.lineTo(screenX, screenZ)
      }
    }

    this.miniMapCtx.stroke()
  }

  private updatePlayerDot(playerPosition: { x: number; z: number }, bounds: any, mapSize: number) {
    if (!this.playerDot) return

    const screenX = ((playerPosition.x - bounds.minX) / (bounds.maxX - bounds.minX)) * mapSize
    const screenZ = ((playerPosition.z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * mapSize

    // Clamp to canvas bounds
    const clampedX = Math.max(6, Math.min(mapSize - 6, screenX))
    const clampedZ = Math.max(6, Math.min(mapSize - 6, screenZ))

    this.playerDot.style.left = `${clampedX}px`
    this.playerDot.style.top = `${clampedZ}px`
  }

  public clearGallery() {
    this.galleryContentEl.innerHTML = ''
    this.photoCount = 0
    this.totalScore = 0
    this.updateStats()
    this.lastScoreEl.textContent = '0'
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
      }
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
  public showShaderNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors = {
      info: '#3b82f6',
      success: '#22c55e', 
      warning: '#f59e0b',
      error: '#dc2626'
    }
    
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
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

  // Sprint indicator methods
  public showSprintIndicator(): void {
    if (this.sprintIndicator) {
      this.sprintIndicator.classList.remove('hidden')
    }
  }

  public hideSprintIndicator(): void {
    if (this.sprintIndicator) {
      this.sprintIndicator.classList.add('hidden')
    }
  }
}
