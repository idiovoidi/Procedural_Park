/**
 * Touch controls
 * An on-screen layer for phones and tablets: a floating stick on the left half, a look-drag zone
 * on the right half, and a few round buttons. It only reports what the fingers do; the game layer
 * feeds that to the input manager. Pure view: it holds no game logic.
 */

import { lookDelta, type Point, VirtualStick } from '@systems/input/joystick'

export interface TouchButton {
  id: string
  label: string
  title: string
  /** Held buttons (sprint) report down and up; the rest report a press. */
  hold?: boolean
}

export interface TouchCallbacks {
  /** Stick axes, x right and y forward, each -1..1. */
  onMove: (x: number, y: number) => void
  /** A finger drag on the look zone, in mouse-like pixels. */
  onLook: (dx: number, dy: number) => void
  onPress: (id: string) => void
  onHold: (id: string, down: boolean) => void
}

const STYLE = `
  #touch-controls { position: fixed; inset: 0; z-index: 700; display: none; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; }
  #touch-controls.on { display: block; }
  #touch-controls .tc-zone { position: absolute; top: 0; bottom: 0; pointer-events: auto; touch-action: none; }
  #touch-controls .tc-move { left: 0; width: 45%; }
  #touch-controls .tc-look { right: 0; width: 55%; }
  #touch-controls .tc-ring, #touch-controls .tc-knob { position: absolute; border-radius: 50%; pointer-events: none; display: none; }
  #touch-controls .tc-ring { width: 120px; height: 120px; margin: -60px 0 0 -60px; border: 2px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.08); }
  #touch-controls .tc-knob { width: 52px; height: 52px; margin: -26px 0 0 -26px; background: rgba(255,255,255,0.35); border: 2px solid rgba(255,255,255,0.7); }
  #touch-controls .tc-buttons { position: absolute; right: 12px; top: 84px; display: grid; grid-template-columns: repeat(3, 50px); gap: 8px; pointer-events: auto; }
  #touch-controls .tc-btn { width: 50px; height: 50px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); background: rgba(15,18,28,0.7); color: #fff; font-size: 22px; touch-action: none; }
  #touch-controls .tc-btn:active, #touch-controls .tc-btn.down { background: rgba(255,215,0,0.45); }
`

const BUTTONS: TouchButton[] = [
  { id: 'jump', label: '⤒', title: 'Jump' },
  { id: 'sprint', label: '»', title: 'Sprint (hold)', hold: true },
  { id: 'crate', label: '📦', title: 'Crate the creature in front of you' },
  { id: 'feed', label: '🍖', title: 'Feed the creature in front of you' },
  { id: 'photo', label: '📷', title: 'Take a photo' },
  { id: 'place', label: '🔨', title: 'Build or remove at the crosshair (build mode)' },
]

/** Keep receiving a finger's events after it leaves the element; harmless if the id is unknown. */
function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture?.(pointerId)
  } catch {
    // a synthetic or already-ended pointer: nothing to capture
  }
}

export class TouchControls {
  private root: HTMLDivElement
  private ring: HTMLDivElement
  private knob: HTMLDivElement
  private stick = new VirtualStick(60)
  private stickPointer: number | null = null
  private lookPointer: number | null = null
  private lastLook: Point | null = null
  private callbacks: TouchCallbacks = {
    onMove: () => {},
    onLook: () => {},
    onPress: () => {},
    onHold: () => {},
  }

  constructor() {
    this.root = document.createElement('div')
    this.root.id = 'touch-controls'
    this.root.setAttribute('aria-hidden', 'true')

    const move = document.createElement('div')
    move.className = 'tc-zone tc-move'
    const look = document.createElement('div')
    look.className = 'tc-zone tc-look'
    this.ring = document.createElement('div')
    this.ring.className = 'tc-ring'
    this.knob = document.createElement('div')
    this.knob.className = 'tc-knob'

    move.addEventListener('pointerdown', (e) => this.onMoveDown(e, move))
    move.addEventListener('pointermove', (e) => this.onMoveMove(e))
    for (const type of ['pointerup', 'pointercancel']) {
      move.addEventListener(type, (e) => this.onMoveEnd(e as PointerEvent))
    }
    look.addEventListener('pointerdown', (e) => this.onLookDown(e, look))
    look.addEventListener('pointermove', (e) => this.onLookMove(e))
    for (const type of ['pointerup', 'pointercancel']) {
      look.addEventListener(type, (e) => this.onLookEnd(e as PointerEvent))
    }

    const buttons = document.createElement('div')
    buttons.className = 'tc-buttons'
    for (const b of BUTTONS) buttons.append(this.makeButton(b))

    this.root.append(move, look, this.ring, this.knob, buttons)
    document.body.appendChild(this.root)

    if (!document.getElementById('touch-controls-styles')) {
      const style = document.createElement('style')
      style.id = 'touch-controls-styles'
      style.textContent = STYLE
      document.head.appendChild(style)
    }
  }

  public setCallbacks(callbacks: TouchCallbacks): void {
    this.callbacks = callbacks
  }

  public setEnabled(enabled: boolean): void {
    this.root.classList.toggle('on', enabled)
    document.body.classList.toggle('touch-mode', enabled)
    if (!enabled) this.releaseAll()
  }

  public isEnabled(): boolean {
    return this.root.classList.contains('on')
  }

  private makeButton(b: TouchButton): HTMLButtonElement {
    const el = document.createElement('button')
    el.className = 'tc-btn'
    el.type = 'button'
    el.textContent = b.label
    el.title = b.title
    el.setAttribute('aria-label', b.title)
    el.dataset.touch = b.id
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      capture(el, e.pointerId)
      el.classList.add('down')
      if (b.hold) this.callbacks.onHold(b.id, true)
      else this.callbacks.onPress(b.id)
    })
    const up = () => {
      el.classList.remove('down')
      if (b.hold) this.callbacks.onHold(b.id, false)
    }
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return el
  }

  // ---- Stick ---------------------------------------------------------------------------------

  private onMoveDown(e: PointerEvent, zone: HTMLElement): void {
    if (this.stickPointer !== null) return
    e.preventDefault()
    this.stickPointer = e.pointerId
    capture(zone, e.pointerId)
    this.stick.start({ x: e.clientX, y: e.clientY })
    this.draw()
  }

  private onMoveMove(e: PointerEvent): void {
    if (e.pointerId !== this.stickPointer) return
    this.stick.move({ x: e.clientX, y: e.clientY })
    const a = this.stick.getAxes()
    this.callbacks.onMove(a.x, a.y)
    this.draw()
  }

  private onMoveEnd(e: PointerEvent): void {
    if (e.pointerId !== this.stickPointer) return
    this.stickPointer = null
    this.stick.end()
    this.callbacks.onMove(0, 0)
    this.draw()
  }

  private draw(): void {
    const o = this.stick.getOrigin()
    this.ring.style.display = this.knob.style.display = o ? 'block' : 'none'
    if (!o) return
    const off = this.stick.getOffset()
    this.ring.style.left = `${o.x}px`
    this.ring.style.top = `${o.y}px`
    this.knob.style.left = `${o.x + off.x}px`
    this.knob.style.top = `${o.y + off.y}px`
  }

  // ---- Look drag -----------------------------------------------------------------------------

  private onLookDown(e: PointerEvent, zone: HTMLElement): void {
    if (this.lookPointer !== null) return
    e.preventDefault()
    this.lookPointer = e.pointerId
    capture(zone, e.pointerId)
    this.lastLook = { x: e.clientX, y: e.clientY }
  }

  private onLookMove(e: PointerEvent): void {
    if (e.pointerId !== this.lookPointer || !this.lastLook) return
    const now = { x: e.clientX, y: e.clientY }
    const d = lookDelta(this.lastLook, now)
    this.lastLook = now
    this.callbacks.onLook(d.x, d.y)
  }

  private onLookEnd(e: PointerEvent): void {
    if (e.pointerId !== this.lookPointer) return
    this.lookPointer = null
    this.lastLook = null
  }

  private releaseAll(): void {
    if (this.stickPointer !== null) {
      this.stickPointer = null
      this.stick.end()
      this.callbacks.onMove(0, 0)
      this.draw()
    }
    this.lookPointer = null
    this.lastLook = null
    for (const b of BUTTONS) if (b.hold) this.callbacks.onHold(b.id, false)
  }
}
