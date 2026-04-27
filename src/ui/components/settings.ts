import { GAME_CONFIG } from '@core/constants'
import type { UICallbacks } from '@core/types'
import type { ShaderConfig } from '@rendering/shaders'

export class Settings {
  private settingsPanel: HTMLDivElement
  private toggleSettingsBtn: HTMLButtonElement
  private audioCallbacks: UICallbacks = {}

  // Callback functions
  public onRideSpeedChange?: (speed: number) => void
  public onClearGallery?: () => void
  public onDayNightToggle?: (mode: 'day' | 'night') => void
  public onShaderConfigChange?: (config: Partial<ShaderConfig>) => void
  public onShaderToggle?: (enabled: boolean) => void
  public onShaderPresetLoad?: (preset: ShaderConfig) => void
  public onAutoPerformanceToggle?: (enabled: boolean) => void

  constructor() {
    this.settingsPanel = document.getElementById('settings-panel') as HTMLDivElement
    this.toggleSettingsBtn = document.getElementById('toggleSettings') as HTMLButtonElement

    this.setupEventListeners()
  }

  public setAudioCallbacks(callbacks: UICallbacks) {
    this.audioCallbacks = callbacks
  }

  private handleSettingsClick() {
    this.audioCallbacks.onClick?.()
    this.toggle()
  }

  private setupEventListeners() {
    this.toggleSettingsBtn?.addEventListener('click', () => this.handleSettingsClick())
    this.settingsPanel
      .querySelector('.close-btn')
      ?.addEventListener('click', () => this.handleSettingsClick())

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
      const enabled = (e.target as HTMLInputElement).checked
      this.onShowCreatureInfoChange?.(enabled)
    })

    clearGalleryBtn?.addEventListener('click', () => {
      this.onClearGallery?.()
    })

    // Shader settings button
    const shaderSettingsBtn = document.getElementById('shaderSettings') as HTMLButtonElement
    shaderSettingsBtn?.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.onShaderSettingsClick?.()
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
  }

  // Additional callbacks
  public onShowCreatureInfoChange?: (enabled: boolean) => void
  public onShaderSettingsClick?: () => void

  public toggle() {
    this.settingsPanel.classList.toggle('hidden')
  }

  private getRideSpeedLabel(speed: number): string {
    if (speed <= GAME_CONFIG.CAMERA_SPEED_VERY_SLOW) return 'Very Slow'
    if (speed <= GAME_CONFIG.CAMERA_SPEED_DEFAULT) return 'Slow'
    if (speed <= GAME_CONFIG.CAMERA_SPEED_NORMAL) return 'Normal'
    if (speed <= GAME_CONFIG.CAMERA_SPEED_FAST) return 'Fast'
    return 'Very Fast'
  }
}
