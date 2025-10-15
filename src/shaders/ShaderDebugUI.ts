import type { ShaderConfig } from './ShaderManager'
import {
  INSCRYPTION_SHADER_DEFAULTS,
  DEVELOPMENT_PRESETS,
  SHADER_QUALITY_PRESETS,
} from './InscryptionShaderConfig'

export interface ShaderDebugCallbacks {
  onConfigChange: (config: Partial<ShaderConfig>) => void
  onToggleShader: (enabled: boolean) => void
  onPresetLoad: (preset: ShaderConfig) => void
}

export class ShaderDebugUI {
  private panel: HTMLDivElement
  private callbacks: ShaderDebugCallbacks
  private currentConfig: ShaderConfig
  private isVisible: boolean = false

  // Control elements
  private enabledCheckbox!: HTMLInputElement
  private luminanceSlider!: HTMLInputElement
  private luminanceValue!: HTMLSpanElement
  private colorStepsSlider!: HTMLInputElement
  private colorStepsValue!: HTMLSpanElement
  private intensitySlider!: HTMLInputElement
  private intensityValue!: HTMLSpanElement
  private darknessSlider!: HTMLInputElement
  private darknessValue!: HTMLSpanElement
  private grittinessSlider!: HTMLInputElement
  private grittinessValue!: HTMLSpanElement
  private filmGrainSlider!: HTMLInputElement
  private filmGrainValue!: HTMLSpanElement
  private vignetteSlider!: HTMLInputElement
  private vignetteValue!: HTMLSpanElement
  private presetSelect!: HTMLSelectElement
  private resetButton!: HTMLButtonElement

  constructor(callbacks: ShaderDebugCallbacks, initialConfig: ShaderConfig) {
    this.callbacks = callbacks
    this.currentConfig = { ...initialConfig }
    this.panel = this.createPanel()
    this.setupEventListeners()
    this.setupKeyboardShortcuts()
    this.updateUI()
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.id = 'shader-debug-panel'
    panel.className = 'shader-debug-panel hidden'

    panel.innerHTML = `
      <div class="panel-header">
        <h3>🎨 Shader Debug</h3>
        <button class="close-btn" title="Close (F4)">&times;</button>
      </div>
      <div class="panel-content">
        <div class="setting-group">
          <label>
            <input type="checkbox" id="shader-enabled" checked />
            Enable Inscryption Shader
          </label>
          <small>Toggle shader on/off for comparison</small>
        </div>
        
        <div class="setting-group">
          <label for="shader-preset">Preset:</label>
          <select id="shader-preset">
            <option value="inscryption">Inscryption (Default)</option>
            <option value="dramatic">Dramatic</option>
            <option value="subtle">Subtle</option>
            <option value="highContrast">High Contrast</option>
            <optgroup label="Quality Presets">
              <option value="high">High Quality</option>
              <option value="medium">Medium Quality</option>
              <option value="low">Low Quality</option>
              <option value="minimal">Minimal Quality</option>
            </optgroup>
          </select>
          <small>Quick preset configurations</small>
        </div>

        <div class="setting-group">
          <label for="luminance-threshold">Luminance Threshold: <span id="luminance-value">0.30</span></label>
          <input type="range" id="luminance-threshold" min="0" max="1" step="0.01" value="0.3" />
          <small>Controls dark/bright area balance</small>
        </div>

        <div class="setting-group">
          <label for="color-steps">Color Steps: <span id="color-steps-value">8</span></label>
          <input type="range" id="color-steps" min="2" max="16" step="1" value="8" />
          <small>Number of posterization levels</small>
        </div>

        <div class="setting-group">
          <label for="intensity">Intensity: <span id="intensity-value">1.00</span></label>
          <input type="range" id="intensity" min="0" max="2" step="0.01" value="1" />
          <small>Overall effect strength</small>
        </div>

        <div class="setting-group">
          <label for="darkness-bias">Darkness Bias: <span id="darkness-value">0.40</span></label>
          <input type="range" id="darkness-bias" min="0" max="1" step="0.01" value="0.4" />
          <small>Additional darkening for shadows</small>
        </div>

        <div class="setting-group">
          <h4>🎬 Grit Effects</h4>
        </div>

        <div class="setting-group">
          <label for="grittiness">Grittiness: <span id="grittiness-value">0.60</span></label>
          <input type="range" id="grittiness" min="0" max="1" step="0.01" value="0.6" />
          <small>Overall dirt, dust, and imperfections</small>
        </div>

        <div class="setting-group">
          <label for="film-grain">Film Grain: <span id="film-grain-value">0.80</span></label>
          <input type="range" id="film-grain" min="0" max="2" step="0.01" value="0.8" />
          <small>Film noise and texture intensity</small>
        </div>

        <div class="setting-group">
          <label for="vignette-strength">Vignette: <span id="vignette-value">0.40</span></label>
          <input type="range" id="vignette-strength" min="0" max="1" step="0.01" value="0.4" />
          <small>Edge darkening for old camera look</small>
        </div>

        <div class="setting-group">
          <button id="reset-shader">Reset to Defaults</button>
          <small>Restore original Inscryption settings</small>
        </div>

        <div class="setting-group">
          <div class="keyboard-shortcuts">
            <h4>Keyboard Shortcuts:</h4>
            <div class="shortcut-list">
              <div><kbd>F4</kbd> Toggle Debug Panel</div>
              <div><kbd>F5</kbd> Toggle Shader On/Off</div>
              <div><kbd>1-4</kbd> Load Development Presets</div>
              <div><kbd>Shift + 1-4</kbd> Load Quality Presets</div>
            </div>
          </div>
        </div>
      </div>
    `

    // Add styles
    this.addStyles()

    // Cache control elements
    this.cacheElements(panel)

    document.body.appendChild(panel)
    return panel
  }

  private addStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      .shader-debug-panel {
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        width: 320px;
        max-height: 80vh;
        background: var(--hud-bg, rgba(27, 36, 48, 0.95));
        border: 1px solid var(--hud-border, #2a384a);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        z-index: 1000;
        overflow-y: auto;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .shader-debug-panel .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid var(--hud-border, #2a384a);
        background: rgba(0, 0, 0, 0.2);
      }

      .shader-debug-panel .panel-header h3 {
        margin: 0;
        color: var(--hud-text, #e0e6ed);
        font-size: 16px;
      }

      .shader-debug-panel .panel-content {
        padding: 20px;
      }

      .shader-debug-panel .setting-group {
        margin-bottom: 20px;
      }

      .shader-debug-panel .setting-group:last-child {
        margin-bottom: 0;
      }

      .shader-debug-panel label {
        display: block;
        color: var(--hud-text, #e0e6ed);
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .shader-debug-panel input[type="range"] {
        width: 100%;
        margin: 8px 0;
        accent-color: #6cf;
      }

      .shader-debug-panel input[type="checkbox"] {
        margin-right: 8px;
        accent-color: #6cf;
      }

      .shader-debug-panel select {
        width: 100%;
        padding: 8px 12px;
        background: var(--hud-bg, #1b2430);
        border: 1px solid var(--hud-border, #2a384a);
        border-radius: 6px;
        color: var(--hud-text, #e0e6ed);
        font-size: 14px;
      }

      .shader-debug-panel button {
        background: var(--hud-bg, #1b2430);
        color: var(--hud-text, #e0e6ed);
        border: 1px solid var(--hud-border, #2a384a);
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }

      .shader-debug-panel button:hover {
        background: var(--hud-hover, #2a384a);
      }

      .shader-debug-panel .close-btn {
        background: transparent;
        border: none;
        color: var(--hud-text, #e0e6ed);
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
      }

      .shader-debug-panel small {
        display: block;
        color: var(--hud-text-dim, #9ca3af);
        font-size: 12px;
        margin-top: 4px;
        font-style: italic;
      }

      .shader-debug-panel .keyboard-shortcuts {
        margin-top: 10px;
      }

      .shader-debug-panel .keyboard-shortcuts h4 {
        margin: 0 0 10px 0;
        color: var(--hud-text, #e0e6ed);
        font-size: 14px;
      }

      .shader-debug-panel .shortcut-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .shader-debug-panel .shortcut-list div {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--hud-text-dim, #9ca3af);
      }

      .shader-debug-panel kbd {
        background: var(--hud-bg, #1b2430);
        border: 1px solid var(--hud-border, #2a384a);
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 11px;
        font-family: monospace;
        color: var(--hud-text, #e0e6ed);
      }

      .shader-debug-panel.hidden {
        display: none;
      }

      /* Scrollbar styling */
      .shader-debug-panel::-webkit-scrollbar {
        width: 6px;
      }

      .shader-debug-panel::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
      }

      .shader-debug-panel::-webkit-scrollbar-thumb {
        background: var(--hud-border, #2a384a);
        border-radius: 3px;
      }
    `
    document.head.appendChild(style)
  }

  private cacheElements(panel: HTMLDivElement): void {
    this.enabledCheckbox = panel.querySelector('#shader-enabled') as HTMLInputElement
    this.luminanceSlider = panel.querySelector('#luminance-threshold') as HTMLInputElement
    this.luminanceValue = panel.querySelector('#luminance-value') as HTMLSpanElement
    this.colorStepsSlider = panel.querySelector('#color-steps') as HTMLInputElement
    this.colorStepsValue = panel.querySelector('#color-steps-value') as HTMLSpanElement
    this.intensitySlider = panel.querySelector('#intensity') as HTMLInputElement
    this.intensityValue = panel.querySelector('#intensity-value') as HTMLSpanElement
    this.darknessSlider = panel.querySelector('#darkness-bias') as HTMLInputElement
    this.darknessValue = panel.querySelector('#darkness-value') as HTMLSpanElement
    this.grittinessSlider = panel.querySelector('#grittiness') as HTMLInputElement
    this.grittinessValue = panel.querySelector('#grittiness-value') as HTMLSpanElement
    this.filmGrainSlider = panel.querySelector('#film-grain') as HTMLInputElement
    this.filmGrainValue = panel.querySelector('#film-grain-value') as HTMLSpanElement
    this.vignetteSlider = panel.querySelector('#vignette-strength') as HTMLInputElement
    this.vignetteValue = panel.querySelector('#vignette-value') as HTMLSpanElement
    this.presetSelect = panel.querySelector('#shader-preset') as HTMLSelectElement
    this.resetButton = panel.querySelector('#reset-shader') as HTMLButtonElement
  }

  private setupEventListeners(): void {
    // Close button
    this.panel.querySelector('.close-btn')?.addEventListener('click', () => {
      this.hide()
    })

    // Enable/disable checkbox
    this.enabledCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked
      this.currentConfig.enabled = enabled
      this.callbacks.onToggleShader(enabled)
    })

    // Parameter sliders
    this.luminanceSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.currentConfig.luminanceThreshold = value
      this.luminanceValue.textContent = value.toFixed(2)
      this.callbacks.onConfigChange({ luminanceThreshold: value })
    })

    this.colorStepsSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value)
      this.currentConfig.colorSteps = value
      this.colorStepsValue.textContent = value.toString()
      this.callbacks.onConfigChange({ colorSteps: value })
    })

    this.intensitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.currentConfig.intensity = value
      this.intensityValue.textContent = value.toFixed(2)
      this.callbacks.onConfigChange({ intensity: value })
    })

    this.darknessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.currentConfig.darknessBias = value
      this.darknessValue.textContent = value.toFixed(2)
      this.callbacks.onConfigChange({ darknessBias: value })
    })

    this.grittinessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.currentConfig.grittiness = value
      this.grittinessValue.textContent = value.toFixed(2)
      this.callbacks.onConfigChange({ grittiness: value })
    })

    this.filmGrainSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.currentConfig.filmGrainIntensity = value
      this.filmGrainValue.textContent = value.toFixed(2)
      this.callbacks.onConfigChange({ filmGrainIntensity: value })
    })

    this.vignetteSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.currentConfig.vignetteStrength = value
      this.vignetteValue.textContent = value.toFixed(2)
      this.callbacks.onConfigChange({ vignetteStrength: value })
    })

    // Preset selection
    this.presetSelect.addEventListener('change', (e) => {
      const presetName = (e.target as HTMLSelectElement).value
      this.loadPreset(presetName)
    })

    // Reset button
    this.resetButton.addEventListener('click', () => {
      this.loadPreset('inscryption')
    })
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // F4 - Toggle debug panel
      if (e.key === 'F4') {
        e.preventDefault()
        this.toggle()
      }

      // F5 - Toggle shader on/off
      if (e.key === 'F5') {
        e.preventDefault()
        const newEnabled = !this.currentConfig.enabled
        this.currentConfig.enabled = newEnabled
        this.enabledCheckbox.checked = newEnabled
        this.callbacks.onToggleShader(newEnabled)
      }

      // Number keys for presets
      if (e.key >= '1' && e.key <= '4') {
        e.preventDefault()
        const presetIndex = parseInt(e.key) - 1

        if (e.shiftKey) {
          // Quality presets with Shift
          const qualityPresets = ['high', 'medium', 'low', 'minimal']
          if (presetIndex < qualityPresets.length) {
            this.loadPreset(qualityPresets[presetIndex])
          }
        } else {
          // Development presets
          const devPresets = ['inscryption', 'dramatic', 'subtle', 'highContrast']
          if (presetIndex < devPresets.length) {
            this.loadPreset(devPresets[presetIndex])
          }
        }
      }
    })
  }

  private loadPreset(presetName: string): void {
    let preset: ShaderConfig

    // Development presets
    if (presetName in DEVELOPMENT_PRESETS) {
      preset = DEVELOPMENT_PRESETS[presetName as keyof typeof DEVELOPMENT_PRESETS]
    }
    // Quality presets
    else if (presetName in SHADER_QUALITY_PRESETS) {
      preset = SHADER_QUALITY_PRESETS[presetName as keyof typeof SHADER_QUALITY_PRESETS]
    }
    // Default fallback
    else {
      preset = INSCRYPTION_SHADER_DEFAULTS
    }

    this.currentConfig = { ...preset }
    this.updateUI()
    this.callbacks.onPresetLoad(preset)

    // Show visual feedback
    this.showPresetFeedback(presetName)
  }

  private showPresetFeedback(presetName: string): void {
    // Create temporary feedback element
    const feedback = document.createElement('div')
    feedback.textContent = `Loaded: ${presetName.charAt(0).toUpperCase() + presetName.slice(1)}`
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(102, 204, 255, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      animation: fadeInOut 2s ease-in-out;
    `

    // Add fade animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(20px); }
        20% { opacity: 1; transform: translateX(0); }
        80% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(20px); }
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(feedback)

    setTimeout(() => {
      document.body.removeChild(feedback)
      document.head.removeChild(style)
    }, 2000)
  }

  private updateUI(): void {
    this.enabledCheckbox.checked = this.currentConfig.enabled

    this.luminanceSlider.value = this.currentConfig.luminanceThreshold.toString()
    this.luminanceValue.textContent = this.currentConfig.luminanceThreshold.toFixed(2)

    this.colorStepsSlider.value = this.currentConfig.colorSteps.toString()
    this.colorStepsValue.textContent = this.currentConfig.colorSteps.toString()

    this.intensitySlider.value = this.currentConfig.intensity.toString()
    this.intensityValue.textContent = this.currentConfig.intensity.toFixed(2)

    this.darknessSlider.value = this.currentConfig.darknessBias.toString()
    this.darknessValue.textContent = this.currentConfig.darknessBias.toFixed(2)

    this.grittinessSlider.value = this.currentConfig.grittiness.toString()
    this.grittinessValue.textContent = this.currentConfig.grittiness.toFixed(2)

    this.filmGrainSlider.value = this.currentConfig.filmGrainIntensity.toString()
    this.filmGrainValue.textContent = this.currentConfig.filmGrainIntensity.toFixed(2)

    this.vignetteSlider.value = this.currentConfig.vignetteStrength.toString()
    this.vignetteValue.textContent = this.currentConfig.vignetteStrength.toFixed(2)
  }

  public show(): void {
    this.isVisible = true
    this.panel.classList.remove('hidden')
  }

  public hide(): void {
    this.isVisible = false
    this.panel.classList.add('hidden')
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  public updateConfig(config: ShaderConfig): void {
    this.currentConfig = { ...config }
    this.updateUI()
  }

  public dispose(): void {
    if (this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel)
    }
  }
}
