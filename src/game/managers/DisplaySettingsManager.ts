import {
  type DisplaySettings,
  loadDisplaySettings,
  saveDisplaySettings,
  type TouchSetting,
} from '@core/settings'
import {
  levelForSetting,
  QUALITY_PRESETS,
  QualityGovernor,
  type QualityLevel,
} from '@systems/performance'
import { installAccessibility } from '@ui/accessibility'
import type { GameSystems } from '../SystemsCoordinator'
import { wantsTouchControls } from './TouchManager'

/** Film grain and grit are animated noise: off under reduced motion. */
const CALM_SHADER = { filmGrainIntensity: 0, grittiness: 0.05 }

/**
 * DisplaySettingsManager
 * Owns the player's display and accessibility settings: applies them (graphics quality with an
 * automatic governor, interface size, high contrast, reduced motion, touch controls), saves them,
 * and binds the controls in the Settings panel.
 */
export class DisplaySettingsManager {
  private readonly systems: GameSystems
  private settings: DisplaySettings
  private readonly governor = new QualityGovernor(2)
  private lastApplied: QualityLevel | null = null
  private lastFrame = performance.now()
  /** Shader values to restore when reduced motion is turned off again. */
  private savedShader: { filmGrainIntensity: number; grittiness: number } | null = null

  constructor(systems: GameSystems) {
    this.systems = systems
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.settings = loadDisplaySettings(undefined, prefersReduced)
  }

  public getSettings(): Readonly<DisplaySettings> {
    return this.settings
  }

  public initialize(): void {
    this.bindControls()
    this.applyAll()
    installAccessibility()
    // A hidden tab's frames say nothing about performance.
    document.addEventListener('visibilitychange', () => {
      this.governor.setPaused(document.hidden)
      this.lastFrame = performance.now()
    })
  }

  /** Call every frame (the game loop's always-updater): feeds the governor and applies changes. */
  public update(): void {
    const now = performance.now()
    const dt = (now - this.lastFrame) / 1000
    this.lastFrame = now
    if (this.settings.quality !== 'auto') return
    const changed = this.governor.recordFrame(dt)
    if (changed !== null) {
      this.applyQuality()
      this.systems.ui.showToast(
        `⚙️ Graphics set to ${['low', 'medium', 'high'][changed]} to keep it smooth`,
        3000
      )
    }
  }

  private update_(patch: Partial<DisplaySettings>): void {
    this.settings = { ...this.settings, ...patch }
    saveDisplaySettings(this.settings)
    this.applyAll()
  }

  private applyAll(): void {
    this.applyQuality()
    this.applyInterface()
    this.applyMotion()
    this.applyTouch()
    this.syncControls()
  }

  private applyQuality(): void {
    const { scene, residents } = this.systems
    const level = levelForSetting(this.settings.quality, this.governor.getLevel())
    if (this.settings.quality === 'auto') this.governor.setCeiling(2)
    else this.governor.setLevel(level)
    if (level === this.lastApplied) return
    this.lastApplied = level
    const preset = QUALITY_PRESETS[level]
    scene.setQuality(preset)
    residents.setActiveRange(preset.residentRange)
  }

  private applyInterface(): void {
    const root = document.documentElement
    root.dataset.uiScale = String(this.settings.uiScale)
    root.style.setProperty('--ui-scale', String(this.settings.uiScale))
    root.classList.toggle('high-contrast', this.settings.highContrast)
  }

  private applyMotion(): void {
    document.documentElement.classList.toggle('reduce-motion', this.settings.reducedMotion)
    const { scene } = this.systems
    const config = scene.getShaderConfig()
    if (this.settings.reducedMotion) {
      if (!this.savedShader) {
        this.savedShader = {
          filmGrainIntensity: config.filmGrainIntensity,
          grittiness: config.grittiness,
        }
      }
      scene.updateShaderConfig(CALM_SHADER)
    } else if (this.savedShader) {
      scene.updateShaderConfig(this.savedShader)
      this.savedShader = null
    }
  }

  private applyTouch(): void {
    const forced: Record<TouchSetting, string> = { auto: '', on: '?touch=1', off: '?touch=0' }
    const query = forced[this.settings.touch] || window.location.search
    const on = wantsTouchControls(query, window.matchMedia?.('(pointer: coarse)').matches ?? false)
    this.systems.ui.getTouchControls().setEnabled(on)
    this.systems.build.setTouchMode(on)
  }

  // ---- The Settings panel controls ------------------------------------------------------------------

  private bindControls(): void {
    const select = (id: string) => document.getElementById(id) as HTMLSelectElement | null
    const check = (id: string) => document.getElementById(id) as HTMLInputElement | null

    select('qualitySelect')?.addEventListener('change', (e) =>
      this.update_({ quality: (e.target as HTMLSelectElement).value as DisplaySettings['quality'] })
    )
    select('uiScaleSelect')?.addEventListener('change', (e) =>
      this.update_({ uiScale: Number((e.target as HTMLSelectElement).value) })
    )
    check('highContrast')?.addEventListener('change', (e) =>
      this.update_({ highContrast: (e.target as HTMLInputElement).checked })
    )
    check('reducedMotion')?.addEventListener('change', (e) =>
      this.update_({ reducedMotion: (e.target as HTMLInputElement).checked })
    )
    select('touchSelect')?.addEventListener('change', (e) =>
      this.update_({ touch: (e.target as HTMLSelectElement).value as TouchSetting })
    )
  }

  private syncControls(): void {
    const set = (id: string, apply: (el: HTMLInputElement & HTMLSelectElement) => void) => {
      const el = document.getElementById(id) as (HTMLInputElement & HTMLSelectElement) | null
      if (el) apply(el)
    }
    set('qualitySelect', (el) => (el.value = this.settings.quality))
    set('uiScaleSelect', (el) => (el.value = String(this.settings.uiScale)))
    set('highContrast', (el) => (el.checked = this.settings.highContrast))
    set('reducedMotion', (el) => (el.checked = this.settings.reducedMotion))
    set('touchSelect', (el) => (el.value = this.settings.touch))
  }
}
