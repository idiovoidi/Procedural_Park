import * as THREE from 'three'

export class DebugPanel {
  private panel: HTMLElement | null = null
  private isVisible = false
  private stats: {
    fps: number
    frameTime: number
    creatures: number
    triangles: number
    drawCalls: number
    cameraPos: THREE.Vector3
    cameraMode: string
    rideProgress: number
  }

  constructor() {
    this.stats = {
      fps: 0,
      frameTime: 0,
      creatures: 0,
      triangles: 0,
      drawCalls: 0,
      cameraPos: new THREE.Vector3(),
      cameraMode: 'ride',
      rideProgress: 0,
    }

    this.createPanel()
    this.setupKeyboardShortcut()
  }

  private createPanel() {
    this.panel = document.createElement('div')
    this.panel.id = 'debug-panel'
    this.panel.style.cssText = `
      position: fixed;
      top: 60px;
      left: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      z-index: 10000;
      display: none;
      min-width: 250px;
      line-height: 1.6;
      border: 1px solid #0f0;
    `

    this.panel.innerHTML = `
      <div style="color: #fff; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #0f0; padding-bottom: 4px;">
        🐛 DEBUG PANEL (F3 to toggle)
      </div>
      <div id="debug-content"></div>
    `

    document.body.appendChild(this.panel)
  }

  private setupKeyboardShortcut() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault()
        this.toggle()
      }
    })
  }

  public toggle() {
    this.isVisible = !this.isVisible
    if (this.panel) {
      this.panel.style.display = this.isVisible ? 'block' : 'none'
    }
  }

  public update(
    deltaTime: number,
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    additionalStats?: {
      creatures?: number
      cameraMode?: string
      rideProgress?: number
    }
  ) {
    if (!this.isVisible) return

    // Calculate FPS
    this.stats.fps = Math.round(1 / deltaTime)
    this.stats.frameTime = Math.round(deltaTime * 1000 * 10) / 10

    // Get render info
    const info = renderer.info
    this.stats.triangles = info.render.triangles
    this.stats.drawCalls = info.render.calls

    // Camera info
    this.stats.cameraPos.copy(camera.position)

    // Additional stats
    if (additionalStats) {
      if (additionalStats.creatures !== undefined) this.stats.creatures = additionalStats.creatures
      if (additionalStats.cameraMode) this.stats.cameraMode = additionalStats.cameraMode
      if (additionalStats.rideProgress !== undefined)
        this.stats.rideProgress = additionalStats.rideProgress
    }

    this.render()
  }

  private render() {
    const content = document.getElementById('debug-content')
    if (!content) return

    const { fps, frameTime, creatures, triangles, drawCalls, cameraPos, cameraMode, rideProgress } =
      this.stats

    content.innerHTML = `
      <div><span style="color: #888;">FPS:</span> ${fps} <span style="color: #666;">(${frameTime}ms)</span></div>
      <div><span style="color: #888;">Triangles:</span> ${triangles.toLocaleString()}</div>
      <div><span style="color: #888;">Draw Calls:</span> ${drawCalls}</div>
      <div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;">
        <span style="color: #888;">Camera Mode:</span> ${cameraMode}
      </div>
      <div><span style="color: #888;">Position:</span> ${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)}, ${cameraPos.z.toFixed(1)}</div>
      <div><span style="color: #888;">Ride Progress:</span> ${(rideProgress * 100).toFixed(1)}%</div>
      <div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;">
        <span style="color: #888;">Creatures:</span> ${creatures}
      </div>
    `
  }

  public isOpen(): boolean {
    return this.isVisible
  }
}
