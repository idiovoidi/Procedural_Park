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
  onAutoPerformanceToggle?: (enabled: boolean) => void
}

export class ShaderDebugUI {
  private panel: HTMLDivElement
  private callbacks: ShaderDebugCallbacks
  private currentConfig: ShaderConfig
  private isVisible: boolean = false

  // Control elements
  private enabledCheckbox!: HTMLInputElement
  private autoPerformanceCheckbox!: HTMLInputElement
  private luminanceSlider!: HTMLInputElement
  private luminanceInput!: HTMLInputElement
  private colorStepsSlider!: HTMLInputElement
  private colorStepsInput!: HTMLInputElement
  private intensitySlider!: HTMLInputElement
  private intensityInput!: HTMLInputElement
  private darknessSlider!: HTMLInputElement
  private darknessInput!: HTMLInputElement
  private grittinessSlider!: HTMLInputElement
  private grittinessInput!: HTMLInputElement
  private filmGrainSlider!: HTMLInputElement
  private filmGrainInput!: HTMLInputElement
  private vignetteSlider!: HTMLInputElement
  private vignetteInput!: HTMLInputElement
  private ditheringSlider!: HTMLInputElement
  private ditheringInput!: HTMLInputElement
  private pixelSizeSlider!: HTMLInputElement
  private pixelSizeInput!: HTMLInputElement

  private crtScanlinesSlider!: HTMLInputElement
  private crtScanlinesInput!: HTMLInputElement
  private crtPhosphorSlider!: HTMLInputElement
  private crtPhosphorInput!: HTMLInputElement
  private presetSelect!: HTMLSelectElement
  private resetButton!: HTMLButtonElement
  private exportButton!: HTMLButtonElement
  private importButton!: HTMLButtonElement
  private importFile!: HTMLInputElement

  constructor(callbacks: ShaderDebugCallbacks, initialConfig: ShaderConfig) {
    this.callbacks = callbacks
    // Ensure all properties are defined by merging with defaults
    this.currentConfig = {
      ...INSCRYPTION_SHADER_DEFAULTS,
      ...initialConfig
    }
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
          <label>
            <input type="checkbox" id="auto-performance" checked />
            Auto Performance Adjustment
          </label>
          <small>Automatically adjust quality based on FPS (disable for testing)</small>
        </div>
        
        <div class="setting-group">
          <label for="shader-preset">Preset:</label>
          <select id="shader-preset">
            <option value="inscryption">Inscryption (Default)</option>
            <option value="dramatic">Dramatic</option>
            <option value="pixelArt">Pixel Art Style</option>
            <option value="retroCRT">Retro CRT Monitor</option>
            <option value="subtle">Subtle</option>
            <option value="highContrast">High Contrast</option>
            <option value="clean">Clean (No Effects)</option>
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
          <label for="luminance-threshold">Luminance Threshold:</label>
          <div class="slider-input-group">
            <input type="range" id="luminance-threshold" min="0" max="1" step="0.01" value="0.3" />
            <input type="number" id="luminance-input" min="0" max="1" step="0.01" value="0.3" class="number-input" />
          </div>
          <small>Controls dark/bright area balance</small>
        </div>

        <div class="setting-group">
          <label for="color-steps">Color Steps:</label>
          <div class="slider-input-group">
            <input type="range" id="color-steps" min="2" max="16" step="1" value="8" />
            <input type="number" id="color-steps-input" min="2" max="16" step="1" value="8" class="number-input" />
          </div>
          <small>Number of posterization levels</small>
        </div>

        <div class="setting-group">
          <label for="intensity">Intensity:</label>
          <div class="slider-input-group">
            <input type="range" id="intensity" min="0" max="2" step="0.01" value="1" />
            <input type="number" id="intensity-input" min="0" max="2" step="0.01" value="1" class="number-input" />
          </div>
          <small>Overall effect strength</small>
        </div>

        <div class="setting-group">
          <label for="darkness-bias">Darkness Bias:</label>
          <div class="slider-input-group">
            <input type="range" id="darkness-bias" min="0" max="1" step="0.01" value="0.4" />
            <input type="number" id="darkness-input" min="0" max="1" step="0.01" value="0.4" class="number-input" />
          </div>
          <small>Additional darkening for shadows</small>
        </div>

        <div class="setting-group">
          <h4>🎬 Grit Effects</h4>
        </div>

        <div class="setting-group">
          <label for="grittiness">Grittiness:</label>
          <div class="slider-input-group">
            <input type="range" id="grittiness" min="0" max="1" step="0.01" value="0.6" />
            <input type="number" id="grittiness-input" min="0" max="1" step="0.01" value="0.6" class="number-input" />
          </div>
          <small>Overall dirt, dust, and imperfections</small>
        </div>

        <div class="setting-group">
          <label for="film-grain">Film Grain:</label>
          <div class="slider-input-group">
            <input type="range" id="film-grain" min="0" max="2" step="0.01" value="0.8" />
            <input type="number" id="film-grain-input" min="0" max="2" step="0.01" value="0.8" class="number-input" />
          </div>
          <small>Film noise and texture intensity</small>
        </div>

        <div class="setting-group">
          <label for="vignette-strength">Vignette:</label>
          <div class="slider-input-group">
            <input type="range" id="vignette-strength" min="0" max="1" step="0.01" value="0.4" />
            <input type="number" id="vignette-input" min="0" max="1" step="0.01" value="0.4" class="number-input" />
          </div>
          <small>Edge darkening for old camera look</small>
        </div>

        <div class="setting-group">
          <h4>🎮 Pixel Art Effects</h4>
        </div>

        <div class="setting-group">
          <label for="dithering-intensity">Dithering:</label>
          <div class="slider-input-group">
            <input type="range" id="dithering-intensity" min="0" max="1" step="0.01" value="0.3" />
            <input type="number" id="dithering-input" min="0" max="1" step="0.01" value="0.3" class="number-input" />
          </div>
          <small>Bayer matrix dithering for pixel art style</small>
        </div>

        <div class="setting-group">
          <label for="pixel-size">Pixel Size:</label>
          <div class="slider-input-group">
            <input type="range" id="pixel-size" min="1" max="8" step="0.1" value="1.0" />
            <input type="number" id="pixel-size-input" min="1" max="8" step="0.1" value="1.0" class="number-input" />
          </div>
          <small>Pixelation effect (1.0 = no pixelation)</small>
        </div>

        <div class="setting-group">
          <h4>📺 CRT Monitor Effects</h4>
        </div>



        <div class="setting-group">
          <label for="crt-scanlines">Scanlines:</label>
          <div class="slider-input-group">
            <input type="range" id="crt-scanlines" min="0" max="1" step="0.01" value="0.3" />
            <input type="number" id="crt-scanlines-input" min="0" max="1" step="0.01" value="0.3" class="number-input" />
          </div>
          <small>Horizontal scanlines like old monitors</small>
        </div>

        <div class="setting-group">
          <label for="crt-phosphor">Phosphor Glow:</label>
          <div class="slider-input-group">
            <input type="range" id="crt-phosphor" min="0" max="1" step="0.01" value="0.4" />
            <input type="number" id="crt-phosphor-input" min="0" max="1" step="0.01" value="0.4" class="number-input" />
          </div>
          <small>RGB phosphor glow and color bleeding</small>
        </div>

        <div class="setting-group">
          <div class="button-row">
            <button id="reset-shader">Reset to Defaults</button>
            <button id="export-settings">Export Settings</button>
          </div>
          <div class="button-row">
            <button id="import-settings">Import Settings</button>
            <input type="file" id="import-file" accept=".json" style="display: none;" />
          </div>
          <small>Save and load your custom shader configurations</small>
        </div>

        <div class="setting-group">
          <div class="keyboard-shortcuts">
            <h4>Keyboard Shortcuts:</h4>
            <div class="shortcut-list">
              <div><kbd>F4</kbd> Toggle Debug Panel</div>
              <div><kbd>F5</kbd> Toggle Shader On/Off</div>
              <div><kbd>F6</kbd> Toggle Auto Performance</div>
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

      .shader-debug-panel .slider-input-group {
        display: flex;
        gap: 8px;
        align-items: center;
        margin: 8px 0;
      }

      .shader-debug-panel input[type="range"] {
        flex: 1;
        accent-color: #6cf;
      }

      .shader-debug-panel .number-input {
        width: 80px;
        padding: 4px 8px;
        background: var(--hud-bg, #1b2430);
        border: 1px solid var(--hud-border, #2a384a);
        border-radius: 4px;
        color: var(--hud-text, #e0e6ed);
        font-size: 12px;
        text-align: center;
      }

      .shader-debug-panel .number-input:focus {
        outline: none;
        border-color: #6cf;
        box-shadow: 0 0 0 2px rgba(102, 204, 255, 0.2);
      }

      .shader-debug-panel input[type="checkbox"] {
        margin-right: 8px;
        accent-color: #6cf;
      }

      .shader-debug-panel .button-row {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .shader-debug-panel .button-row button {
        flex: 1;
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
    this.autoPerformanceCheckbox = panel.querySelector('#auto-performance') as HTMLInputElement
    this.luminanceSlider = panel.querySelector('#luminance-threshold') as HTMLInputElement
    this.luminanceInput = panel.querySelector('#luminance-input') as HTMLInputElement
    this.colorStepsSlider = panel.querySelector('#color-steps') as HTMLInputElement
    this.colorStepsInput = panel.querySelector('#color-steps-input') as HTMLInputElement
    this.intensitySlider = panel.querySelector('#intensity') as HTMLInputElement
    this.intensityInput = panel.querySelector('#intensity-input') as HTMLInputElement
    this.darknessSlider = panel.querySelector('#darkness-bias') as HTMLInputElement
    this.darknessInput = panel.querySelector('#darkness-input') as HTMLInputElement
    this.grittinessSlider = panel.querySelector('#grittiness') as HTMLInputElement
    this.grittinessInput = panel.querySelector('#grittiness-input') as HTMLInputElement
    this.filmGrainSlider = panel.querySelector('#film-grain') as HTMLInputElement
    this.filmGrainInput = panel.querySelector('#film-grain-input') as HTMLInputElement
    this.vignetteSlider = panel.querySelector('#vignette-strength') as HTMLInputElement
    this.vignetteInput = panel.querySelector('#vignette-input') as HTMLInputElement
    this.ditheringSlider = panel.querySelector('#dithering-intensity') as HTMLInputElement
    this.ditheringInput = panel.querySelector('#dithering-input') as HTMLInputElement
    this.pixelSizeSlider = panel.querySelector('#pixel-size') as HTMLInputElement
    this.pixelSizeInput = panel.querySelector('#pixel-size-input') as HTMLInputElement

    this.crtScanlinesSlider = panel.querySelector('#crt-scanlines') as HTMLInputElement
    this.crtScanlinesInput = panel.querySelector('#crt-scanlines-input') as HTMLInputElement
    this.crtPhosphorSlider = panel.querySelector('#crt-phosphor') as HTMLInputElement
    this.crtPhosphorInput = panel.querySelector('#crt-phosphor-input') as HTMLInputElement
    this.presetSelect = panel.querySelector('#shader-preset') as HTMLSelectElement
    this.resetButton = panel.querySelector('#reset-shader') as HTMLButtonElement
    this.exportButton = panel.querySelector('#export-settings') as HTMLButtonElement
    this.importButton = panel.querySelector('#import-settings') as HTMLButtonElement
    this.importFile = panel.querySelector('#import-file') as HTMLInputElement
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

    // Auto performance adjustment checkbox
    this.autoPerformanceCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked
      this.callbacks.onAutoPerformanceToggle?.(enabled)
    })

    // Setup slider-input pairs with proper synchronization
    this.setupSliderInputPair(
      this.luminanceSlider, 
      this.luminanceInput, 
      'luminanceThreshold',
      (value) => this.callbacks.onConfigChange({ luminanceThreshold: value })
    )

    this.setupSliderInputPair(
      this.colorStepsSlider, 
      this.colorStepsInput, 
      'colorSteps',
      (value) => this.callbacks.onConfigChange({ colorSteps: value }),
      true // isInteger
    )

    this.setupSliderInputPair(
      this.intensitySlider, 
      this.intensityInput, 
      'intensity',
      (value) => this.callbacks.onConfigChange({ intensity: value })
    )

    this.setupSliderInputPair(
      this.darknessSlider, 
      this.darknessInput, 
      'darknessBias',
      (value) => this.callbacks.onConfigChange({ darknessBias: value })
    )

    this.setupSliderInputPair(
      this.grittinessSlider, 
      this.grittinessInput, 
      'grittiness',
      (value) => this.callbacks.onConfigChange({ grittiness: value })
    )

    this.setupSliderInputPair(
      this.filmGrainSlider, 
      this.filmGrainInput, 
      'filmGrainIntensity',
      (value) => this.callbacks.onConfigChange({ filmGrainIntensity: value })
    )

    this.setupSliderInputPair(
      this.vignetteSlider, 
      this.vignetteInput, 
      'vignetteStrength',
      (value) => this.callbacks.onConfigChange({ vignetteStrength: value })
    )

    this.setupSliderInputPair(
      this.ditheringSlider, 
      this.ditheringInput, 
      'ditheringIntensity',
      (value) => {
        console.log('Dithering slider changed to:', value)
        this.callbacks.onConfigChange({ ditheringIntensity: value })
      }
    )

    this.setupSliderInputPair(
      this.pixelSizeSlider, 
      this.pixelSizeInput, 
      'pixelSize',
      (value) => {
        console.log('Pixel Size slider changed to:', value)
        this.callbacks.onConfigChange({ pixelSize: value })
      }
    )



    this.setupSliderInputPair(
      this.crtScanlinesSlider, 
      this.crtScanlinesInput, 
      'crtScanlines',
      (value) => this.callbacks.onConfigChange({ crtScanlines: value })
    )

    this.setupSliderInputPair(
      this.crtPhosphorSlider, 
      this.crtPhosphorInput, 
      'crtPhosphor',
      (value) => this.callbacks.onConfigChange({ crtPhosphor: value })
    )

    // Preset selection
    this.presetSelect.addEventListener('change', (e) => {
      const presetName = (e.target as HTMLSelectElement).value
      this.loadPreset(presetName)
    })

    // Reset button
    this.resetButton.addEventListener('click', () => {
      this.loadPreset('inscryption')
    })

    // Export button
    this.exportButton.addEventListener('click', () => {
      this.exportSettings()
    })

    // Import button
    this.importButton.addEventListener('click', () => {
      this.importFile.click()
    })

    // Import file handler
    this.importFile.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        this.importSettings(file)
      }
    })
  }

  private setupSliderInputPair(
    slider: HTMLInputElement, 
    input: HTMLInputElement, 
    configKey: keyof ShaderConfig,
    onChange: (value: number) => void,
    isInteger: boolean = false
  ): void {
    // Slider change handler
    const handleSliderChange = () => {
      const value = isInteger ? parseInt(slider.value) : parseFloat(slider.value)
      if (!isNaN(value)) {
        (this.currentConfig as any)[configKey] = value
        input.value = value.toString()
        onChange(value)
      }
    }

    // Input change handler
    const handleInputChange = () => {
      const value = isInteger ? parseInt(input.value) : parseFloat(input.value)
      const minValue = isInteger ? parseInt(input.min) : parseFloat(input.min)
      const maxValue = isInteger ? parseInt(input.max) : parseFloat(input.max)
      
      if (!isNaN(value)) {
        // Clamp value to valid range
        const clampedValue = Math.max(minValue, Math.min(maxValue, value))
        ;(this.currentConfig as any)[configKey] = clampedValue
        slider.value = clampedValue.toString()
        input.value = clampedValue.toString()
        onChange(clampedValue)
      }
    }

    // Add event listeners with both 'input' and 'change' for better responsiveness
    slider.addEventListener('input', handleSliderChange)
    slider.addEventListener('change', handleSliderChange)
    input.addEventListener('input', handleInputChange)
    input.addEventListener('change', handleInputChange)
    
    // Handle Enter key for immediate application
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleInputChange()
        input.blur()
      }
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

      // F6 - Toggle auto performance adjustment
      if (e.key === 'F6') {
        e.preventDefault()
        const newEnabled = !this.autoPerformanceCheckbox.checked
        this.autoPerformanceCheckbox.checked = newEnabled
        this.callbacks.onAutoPerformanceToggle?.(newEnabled)
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
    // Note: Auto-performance state is managed separately from shader config

    // Update slider-input pairs
    this.updateSliderInputPair(this.luminanceSlider, this.luminanceInput, this.currentConfig.luminanceThreshold)
    this.updateSliderInputPair(this.colorStepsSlider, this.colorStepsInput, this.currentConfig.colorSteps, true)
    this.updateSliderInputPair(this.intensitySlider, this.intensityInput, this.currentConfig.intensity)
    this.updateSliderInputPair(this.darknessSlider, this.darknessInput, this.currentConfig.darknessBias)
    this.updateSliderInputPair(this.grittinessSlider, this.grittinessInput, this.currentConfig.grittiness)
    this.updateSliderInputPair(this.filmGrainSlider, this.filmGrainInput, this.currentConfig.filmGrainIntensity)
    this.updateSliderInputPair(this.vignetteSlider, this.vignetteInput, this.currentConfig.vignetteStrength)
    this.updateSliderInputPair(this.ditheringSlider, this.ditheringInput, this.currentConfig.ditheringIntensity)
    this.updateSliderInputPair(this.pixelSizeSlider, this.pixelSizeInput, this.currentConfig.pixelSize)

    this.updateSliderInputPair(this.crtScanlinesSlider, this.crtScanlinesInput, this.currentConfig.crtScanlines)
    this.updateSliderInputPair(this.crtPhosphorSlider, this.crtPhosphorInput, this.currentConfig.crtPhosphor)
  }

  private updateSliderInputPair(slider: HTMLInputElement, input: HTMLInputElement, value: number | undefined, isInteger: boolean = false): void {
    // Handle undefined values by using default values
    const safeValue = value ?? 0
    const stringValue = isInteger ? safeValue.toString() : safeValue.toFixed(2)
    slider.value = stringValue
    input.value = stringValue
  }

  private exportSettings(): void {
    try {
      const exportData = {
        name: `Shader Settings ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        config: { ...this.currentConfig }
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `shader-settings-${Date.now()}.json`
      link.click()
      
      URL.revokeObjectURL(link.href)
      
      this.showNotification('Settings exported successfully!', 'success')
    } catch (error) {
      console.error('Failed to export settings:', error)
      this.showNotification('Failed to export settings', 'error')
    }
  }

  private async importSettings(file: File): Promise<void> {
    try {
      const text = await file.text()
      const importData = JSON.parse(text)
      
      // Validate the imported data
      if (!importData.config || typeof importData.config !== 'object') {
        throw new Error('Invalid settings file format')
      }

      // Validate required properties
      const requiredProps: (keyof ShaderConfig)[] = [
        'enabled', 'luminanceThreshold', 'colorSteps', 'intensity', 
        'darknessBias', 'grittiness', 'filmGrainIntensity', 'vignetteStrength',
        'ditheringIntensity', 'pixelSize', 'crtCurvature', 'crtScanlines', 'crtPhosphor'
      ]

      for (const prop of requiredProps) {
        if (!(prop in importData.config)) {
          throw new Error(`Missing required property: ${prop}`)
        }
      }

      // Apply the imported configuration
      this.currentConfig = { ...importData.config }
      this.updateUI()
      this.callbacks.onPresetLoad(this.currentConfig)
      
      const name = importData.name || 'Imported Settings'
      this.showNotification(`${name} loaded successfully!`, 'success')
      
    } catch (error) {
      console.error('Failed to import settings:', error)
      this.showNotification('Failed to import settings: Invalid file format', 'error')
    } finally {
      // Clear the file input
      this.importFile.value = ''
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const colors = {
      success: '#22c55e',
      error: '#dc2626',
      info: '#3b82f6'
    }

    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.3s ease-out;
    `
    notification.textContent = message

    // Add animation styles if not already present
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style')
      style.id = 'notification-styles'
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(notification)

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in'
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 3000)
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

  public setAutoPerformanceEnabled(enabled: boolean): void {
    this.autoPerformanceCheckbox.checked = enabled
  }

  public dispose(): void {
    if (this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel)
    }
  }
}
