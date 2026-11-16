import {
  type Footprint,
  type FootprintKind,
  type Point2,
  rectCorners,
  type Shape,
  signedDistance,
} from '@systems/layout/footprint'
import type { WorldLayout } from '@systems/layout/WorldLayout'

/** Everything the map needs to know about the world, supplied by the game. */
export interface WorldMapSource {
  /** Width/depth of the (square, origin-centred) terrain in metres. */
  mapSize: number
  waterLevel: number
  heightAt: (x: number, z: number) => number
  biomeAt: (x: number, z: number) => string
  layout: WorldLayout
  getPlayer: () => { x: number; z: number; heading: number }
  getCreatures: () => Point2[]
}

const BIOME_RGB: Record<string, [number, number, number]> = {
  forest: [58, 110, 54],
  meadow: [120, 160, 84],
  rocky: [128, 126, 120],
  wetland: [70, 120, 110],
  crystal_cave: [130, 100, 170],
  floating_islands: [140, 170, 200],
}
const DEFAULT_RGB: [number, number, number] = [100, 130, 90]

const KIND_STYLE: Record<FootprintKind, { fill: string; stroke: string; label: boolean }> = {
  boundary: { fill: 'transparent', stroke: '#8b6b3e', label: false },
  'build-zone': { fill: 'rgba(102, 204, 255, 0.12)', stroke: '#66ccff', label: true },
  gate: { fill: '#d9b341', stroke: '#5a4510', label: true },
  plaza: { fill: 'rgba(225, 225, 225, 0.85)', stroke: '#777', label: true },
  building: { fill: '#b9743a', stroke: '#4a2a10', label: true },
  landmark: { fill: '#a06ad0', stroke: '#3d1e5c', label: true },
  station: { fill: '#efe3b0', stroke: '#3a3320', label: true },
  track: { fill: '#2b2b2f', stroke: '#2b2b2f', label: false },
}

const TERRAIN_RES = 256
const MIN_SCALE = 1.2
const MAX_SCALE = 14

const CSS = `
#world-map { position: fixed; inset: 0; z-index: 10000; background: rgba(8, 12, 16, 0.97);
  display: flex; flex-direction: column; font-family: inherit; color: #e8eef2; }
#world-map.hidden { display: none; }
#world-map .wm-bar { display: flex; align-items: center; gap: 16px; padding: 10px 18px;
  background: rgba(20, 28, 36, 0.9); border-bottom: 1px solid rgba(255,255,255,0.12); }
#world-map .wm-title { font-weight: 700; font-size: 16px; }
#world-map .wm-hint { opacity: 0.65; font-size: 12px; flex: 1; }
#world-map .wm-status { font-size: 12px; opacity: 0.85; min-width: 170px; text-align: right; }
#world-map .wm-close { background: none; border: 1px solid rgba(255,255,255,0.3); color: inherit;
  border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 16px; }
#world-map .wm-stage { position: relative; flex: 1; min-height: 0; }
#world-map canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; }
#world-map canvas.dragging { cursor: grabbing; }
#world-map .wm-legend { position: absolute; left: 14px; bottom: 14px; display: flex; flex-direction: column;
  gap: 4px; padding: 8px 10px; background: rgba(20,28,36,0.85); border-radius: 8px; font-size: 12px;
  pointer-events: none; }
#world-map .wm-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px;
  vertical-align: -2px; border: 1px solid rgba(255,255,255,0.4); }
#world-map .wm-warn { position: absolute; right: 14px; top: 14px; max-width: 260px; padding: 8px 10px;
  background: rgba(150, 30, 30, 0.88); border-radius: 8px; font-size: 12px; pointer-events: none; }
#world-map .wm-warn.hidden { display: none; }
`

/**
 * WorldMap
 * A full-screen, top-down view of the whole park: terrain, every structure footprint, the
 * railway and its stations, creatures and the player. It draws from the shared WorldLayout,
 * so what you see is exactly what the placement rules check, and any overlap is outlined
 * in red. Drag to pan, scroll to zoom, double-click to recentre.
 */
export class WorldMap {
  private root: HTMLDivElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private statusEl: HTMLSpanElement
  private warnEl: HTMLDivElement
  private source: WorldMapSource | null = null
  private terrainLayer: HTMLCanvasElement | null = null
  private open = false
  private raf = 0

  private centerX = 0
  private centerZ = 0
  private scale = 4
  private dragging = false
  private lastPointer = { x: 0, y: 0 }
  private hover: Point2 | null = null
  private clashIds = new Set<string>()
  private unsubscribeLayout: (() => void) | null = null
  private onOpenChange: ((open: boolean) => void) | null = null

  constructor() {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)

    this.root = document.createElement('div')
    this.root.id = 'world-map'
    this.root.className = 'hidden'
    this.root.innerHTML = `
      <div class="wm-bar">
        <span class="wm-title">🗺️ Park map</span>
        <span class="wm-hint">Drag to pan · Scroll to zoom · Double-click to recentre · Tab or Esc to close</span>
        <span class="wm-status"></span>
        <button class="wm-close" title="Close (Tab)">✕</button>
      </div>
      <div class="wm-stage">
        <canvas></canvas>
        <div class="wm-legend"></div>
        <div class="wm-warn hidden"></div>
      </div>`
    document.body.appendChild(this.root)

    this.canvas = this.root.querySelector('canvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')
    this.statusEl = this.root.querySelector('.wm-status') as HTMLSpanElement
    this.warnEl = this.root.querySelector('.wm-warn') as HTMLDivElement
    this.buildLegend()
    this.bindEvents()
    document.getElementById('toggleMap')?.addEventListener('click', () => this.toggle())
  }

  public setSource(source: WorldMapSource): void {
    this.unsubscribeLayout?.()
    this.source = source
    this.terrainLayer = null
    this.refreshClashes()
    this.unsubscribeLayout = source.layout.onChange(() => this.refreshClashes())
  }

  public onToggle(callback: (open: boolean) => void): void {
    this.onOpenChange = callback
  }

  public isOpen(): boolean {
    return this.open
  }

  public toggle(): void {
    this.setOpen(!this.open)
  }

  public setOpen(open: boolean): void {
    if (open === this.open) return
    if (open && !this.source) return
    this.open = open
    this.root.classList.toggle('hidden', !open)
    if (open) {
      if (document.pointerLockElement) document.exitPointerLock()
      this.resize()
      this.recentre()
      this.loop()
    } else {
      cancelAnimationFrame(this.raf)
      this.dragging = false
    }
    this.onOpenChange?.(open)
  }

  public dispose(): void {
    cancelAnimationFrame(this.raf)
    this.unsubscribeLayout?.()
    window.removeEventListener('keydown', this.handleKeyDown, true)
    window.removeEventListener('resize', this.handleResize)
    this.root.remove()
  }

  // ---- setup ----

  private buildLegend(): void {
    const items: [string, string][] = [
      ['#d9b341', 'Gate'],
      ['#e1e1e1', 'Plaza'],
      ['#b9743a', 'Buildings'],
      ['#a06ad0', 'Landmarks'],
      ['#2b2b2f', 'Railway'],
      ['#efe3b0', 'Station'],
      ['rgba(102,204,255,0.4)', 'Build zone'],
    ]
    const legend = this.root.querySelector('.wm-legend') as HTMLDivElement
    legend.innerHTML = items
      .map(([c, l]) => `<div><i style="background:${c}"></i>${l}</div>`)
      .join('')
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.open && e.key === 'Escape') {
      e.stopImmediatePropagation()
      e.preventDefault()
      this.setOpen(false)
    }
  }

  private handleResize = () => {
    if (this.open) this.resize()
  }

  private bindEvents(): void {
    // Capture phase so Escape closes the map instead of opening settings.
    window.addEventListener('keydown', this.handleKeyDown, true)
    window.addEventListener('resize', this.handleResize)
    this.root.querySelector('.wm-close')?.addEventListener('click', () => this.setOpen(false))

    this.canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true
      this.lastPointer = { x: e.clientX, y: e.clientY }
      this.canvas.classList.add('dragging')
      this.canvas.setPointerCapture(e.pointerId)
    })
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      this.hover = this.toWorld(e.clientX - rect.left, e.clientY - rect.top)
      if (!this.dragging) return
      this.centerX -= (e.clientX - this.lastPointer.x) / this.scale
      this.centerZ -= (e.clientY - this.lastPointer.y) / this.scale
      this.lastPointer = { x: e.clientX, y: e.clientY }
    })
    const endDrag = () => {
      this.dragging = false
      this.canvas.classList.remove('dragging')
    }
    this.canvas.addEventListener('pointerup', endDrag)
    this.canvas.addEventListener('pointercancel', endDrag)
    this.canvas.addEventListener('pointerleave', () => {
      this.hover = null
    })
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const before = this.toWorld(sx, sy)
        this.scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, this.scale * Math.exp(-e.deltaY * 0.0015))
        )
        // Keep the point under the cursor fixed while zooming.
        this.centerX = before.x - (sx - this.canvas.clientWidth / 2) / this.scale
        this.centerZ = before.z - (sy - this.canvas.clientHeight / 2) / this.scale
      },
      { passive: false }
    )
    this.canvas.addEventListener('dblclick', () => this.recentre())
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr))
    this.canvas.height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr))
  }

  /** Frames the whole park fence in the window. */
  private recentre(): void {
    this.centerX = 0
    this.centerZ = 0
    const fence = this.source?.layout.get('boundary-fence')?.shape
    const radius = fence?.type === 'circle' ? fence.r : 70
    const side = Math.min(this.canvas.clientWidth, this.canvas.clientHeight)
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (side * 0.92) / (radius * 2)))
  }

  private refreshClashes(): void {
    const clashes = this.source?.layout.findOverlaps() ?? []
    this.clashIds = new Set(clashes.flatMap((c) => [c.a.id, c.b.id]))
    this.warnEl.classList.toggle('hidden', clashes.length === 0)
    this.warnEl.textContent =
      clashes.length === 0
        ? ''
        : `⚠️ Overlap: ${clashes.map((c) => `${c.a.label} / ${c.b.label}`).join('; ')}`
  }

  // ---- coordinates ----

  private toScreen(x: number, z: number): Point2 {
    return {
      x: this.canvas.clientWidth / 2 + (x - this.centerX) * this.scale,
      z: this.canvas.clientHeight / 2 + (z - this.centerZ) * this.scale,
    }
  }

  private toWorld(sx: number, sy: number): Point2 {
    return {
      x: this.centerX + (sx - this.canvas.clientWidth / 2) / this.scale,
      z: this.centerZ + (sy - this.canvas.clientHeight / 2) / this.scale,
    }
  }

  // ---- drawing ----

  private loop = () => {
    if (!this.open) return
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  private draw(): void {
    const ctx = this.ctx
    const source = this.source
    if (!ctx || !source) return
    const dpr = window.devicePixelRatio || 1
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#0b1218'
    ctx.fillRect(0, 0, w, h)

    this.drawTerrain(ctx, source)
    this.drawGrid(ctx, w, h)

    const footprints = source.layout.list()
    for (const kind of [
      'boundary',
      'build-zone',
      'plaza',
      'track',
      'gate',
      'building',
      'landmark',
      'station',
    ] as const) {
      for (const fp of footprints.filter((f) => f.kind === kind)) this.drawFootprint(ctx, fp)
    }
    for (const fp of footprints.filter((f) => KIND_STYLE[f.kind].label)) this.drawLabel(ctx, fp)

    this.drawCreatures(ctx, source)
    this.drawPlayer(ctx, source)
    this.drawCompassAndScale(ctx, w, h)
    this.updateStatus(source)
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, source: WorldMapSource): void {
    if (!this.terrainLayer) this.terrainLayer = this.renderTerrain(source)
    const half = source.mapSize / 2
    const a = this.toScreen(-half, -half)
    const side = source.mapSize * this.scale
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.terrainLayer, a.x, a.z, side, side)
  }

  /** Paints biome colour, height shading and water once; it only changes if the world does. */
  private renderTerrain(source: WorldMapSource): HTMLCanvasElement {
    const layer = document.createElement('canvas')
    layer.width = TERRAIN_RES
    layer.height = TERRAIN_RES
    const lctx = layer.getContext('2d')
    if (!lctx) return layer
    const img = lctx.createImageData(TERRAIN_RES, TERRAIN_RES)
    const half = source.mapSize / 2
    const step = source.mapSize / TERRAIN_RES
    for (let j = 0; j < TERRAIN_RES; j++) {
      for (let i = 0; i < TERRAIN_RES; i++) {
        const x = -half + (i + 0.5) * step
        const z = -half + (j + 0.5) * step
        const height = source.heightAt(x, z)
        const [br, bg, bb] = BIOME_RGB[source.biomeAt(x, z)] ?? DEFAULT_RGB
        let r = br
        let g = bg
        let b = bb
        if (height < source.waterLevel) {
          const depth = Math.min(1, (source.waterLevel - height) / 3)
          r = 60 - depth * 30
          g = 120 - depth * 40
          b = 190 - depth * 40
        } else {
          // Light from the north-west: slopes facing it brighten, others darken.
          const slopeX = source.heightAt(x + step, z) - source.heightAt(x - step, z)
          const slopeZ = source.heightAt(x, z + step) - source.heightAt(x, z - step)
          const shade = Math.max(0.6, Math.min(1.4, 1 + (slopeX + slopeZ) * 0.12))
          const lift = Math.max(0, Math.min(1, (height - 1) / 10)) * 40
          r = Math.min(255, r * shade + lift)
          g = Math.min(255, g * shade + lift)
          b = Math.min(255, b * shade + lift)
        }
        const o = (j * TERRAIN_RES + i) * 4
        img.data[o] = r
        img.data[o + 1] = g
        img.data[o + 2] = b
        img.data[o + 3] = 255
      }
    }
    lctx.putImageData(img, 0, 0)
    return layer
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const minor = this.scale >= 5 ? 10 : 0
    const major = 50
    const topLeft = this.toWorld(0, 0)
    const bottomRight = this.toWorld(w, h)
    ctx.font = '10px sans-serif'
    ctx.textBaseline = 'top'
    const line = (step: number, alpha: number, labels: boolean) => {
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let gx = Math.ceil(topLeft.x / step) * step; gx <= bottomRight.x; gx += step) {
        const sx = Math.round(this.toScreen(gx, 0).x) + 0.5
        ctx.moveTo(sx, 0)
        ctx.lineTo(sx, h)
      }
      for (let gz = Math.ceil(topLeft.z / step) * step; gz <= bottomRight.z; gz += step) {
        const sy = Math.round(this.toScreen(0, gz).z) + 0.5
        ctx.moveTo(0, sy)
        ctx.lineTo(w, sy)
      }
      ctx.stroke()
      if (!labels) return
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      for (let gx = Math.ceil(topLeft.x / step) * step; gx <= bottomRight.x; gx += step) {
        ctx.fillText(String(gx), this.toScreen(gx, 0).x + 3, 4)
      }
      for (let gz = Math.ceil(topLeft.z / step) * step; gz <= bottomRight.z; gz += step) {
        ctx.fillText(String(gz), 4, this.toScreen(0, gz).z + 3)
      }
    }
    if (minor) line(minor, 0.07, false)
    line(major, 0.16, true)
  }

  private tracePath(ctx: CanvasRenderingContext2D, shape: Shape): void {
    ctx.beginPath()
    if (shape.type === 'circle') {
      const c = this.toScreen(shape.x, shape.z)
      ctx.arc(c.x, c.z, shape.r * this.scale, 0, Math.PI * 2)
    } else if (shape.type === 'rect') {
      rectCorners(shape).forEach((p, i) => {
        const s = this.toScreen(p.x, p.z)
        if (i === 0) ctx.moveTo(s.x, s.z)
        else ctx.lineTo(s.x, s.z)
      })
      ctx.closePath()
    } else {
      shape.points.forEach((p, i) => {
        const s = this.toScreen(p.x, p.z)
        if (i === 0) ctx.moveTo(s.x, s.z)
        else ctx.lineTo(s.x, s.z)
      })
      if (shape.closed) ctx.closePath()
    }
  }

  private drawFootprint(ctx: CanvasRenderingContext2D, fp: Footprint): void {
    const style = KIND_STYLE[fp.kind]
    const clash = this.clashIds.has(fp.id)
    ctx.save()

    if (fp.shape.type === 'path') {
      // Railway: dark bed with a pale centre line so it reads as a track, not a road.
      this.tracePath(ctx, fp.shape)
      ctx.lineJoin = 'round'
      ctx.strokeStyle = clash ? '#ff4040' : style.stroke
      ctx.lineWidth = Math.max(3, fp.shape.halfWidth * 2 * this.scale)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(230, 230, 235, 0.85)'
      ctx.lineWidth = Math.max(1, 0.5 * this.scale * 0.5)
      ctx.setLineDash([Math.max(3, this.scale * 0.9), Math.max(3, this.scale * 0.9)])
      ctx.stroke()
      ctx.restore()
      return
    }

    this.tracePath(ctx, fp.shape)
    if (fp.kind === 'boundary' || fp.kind === 'build-zone') ctx.setLineDash([8, 6])
    if (style.fill !== 'transparent') {
      ctx.fillStyle = style.fill
      ctx.fill()
    }
    ctx.lineWidth = clash ? 3 : 1.5
    ctx.strokeStyle = clash ? '#ff4040' : style.stroke
    ctx.stroke()
    ctx.restore()
  }

  private drawLabel(ctx: CanvasRenderingContext2D, fp: Footprint): void {
    if (fp.shape.type === 'path') return
    // Hide labels when the map is zoomed out too far to read them.
    if (this.scale < 2.2 && fp.kind === 'station') return
    const c = this.toScreen(fp.shape.x, fp.shape.z)
    ctx.save()
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const text = fp.label
    const width = ctx.measureText(text).width + 8
    ctx.fillStyle = 'rgba(10, 14, 18, 0.72)'
    ctx.fillRect(c.x - width / 2, c.z - 8, width, 16)
    ctx.fillStyle = '#fff'
    ctx.fillText(text, c.x, c.z)
    ctx.restore()
  }

  private drawCreatures(ctx: CanvasRenderingContext2D, source: WorldMapSource): void {
    ctx.fillStyle = '#ffd24a'
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 1
    for (const c of source.getCreatures()) {
      const s = this.toScreen(c.x, c.z)
      ctx.beginPath()
      ctx.arc(s.x, s.z, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, source: WorldMapSource): void {
    const p = source.getPlayer()
    const s = this.toScreen(p.x, p.z)
    ctx.save()
    ctx.translate(s.x, s.z)
    ctx.rotate(p.heading)
    ctx.fillStyle = '#66ccff'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(11, 0)
    ctx.lineTo(-7, 7)
    ctx.lineTo(-3, 0)
    ctx.lineTo(-7, -7)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  private drawCompassAndScale(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save()
    ctx.fillStyle = 'rgba(20,28,36,0.85)'
    ctx.beginPath()
    ctx.arc(w - 40, 40, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('N', w - 40, 32)
    ctx.beginPath()
    ctx.moveTo(w - 40, 40)
    ctx.lineTo(w - 46, 52)
    ctx.lineTo(w - 34, 52)
    ctx.closePath()
    ctx.fill()

    // Scale bar: 10, 20 or 50 m, whichever fits.
    const options = [5, 10, 20, 50, 100]
    const metres = options.find((m) => m * this.scale >= 70) ?? 100
    const len = metres * this.scale
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(w - 30 - len, h - 24)
    ctx.lineTo(w - 30, h - 24)
    ctx.moveTo(w - 30 - len, h - 29)
    ctx.lineTo(w - 30 - len, h - 19)
    ctx.moveTo(w - 30, h - 29)
    ctx.lineTo(w - 30, h - 19)
    ctx.stroke()
    ctx.textAlign = 'right'
    ctx.fillText(`${metres} m`, w - 30, h - 36)
    ctx.restore()
  }

  private updateStatus(source: WorldMapSource): void {
    if (!this.hover) {
      this.statusEl.textContent = ''
      return
    }
    const { x, z } = this.hover
    const under = source.layout
      .list()
      .filter((f) => f.kind !== 'boundary' && signedDistance(f.shape, x, z) < 0)
      .sort((a, b) => Number(a.kind === 'build-zone') - Number(b.kind === 'build-zone'))[0]
    const here = `x ${x.toFixed(0)}, z ${z.toFixed(0)}`
    this.statusEl.textContent = under ? `${under.label} · ${here}` : here
  }
}
