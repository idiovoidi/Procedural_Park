/**
 * Static markup and styles for the shader debug panel
 */

export const SHADER_DEBUG_PANEL_HTML = `
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

export const SHADER_DEBUG_PANEL_CSS = `
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
