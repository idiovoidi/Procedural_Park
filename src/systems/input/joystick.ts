/**
 * Virtual joystick and look-drag maths for touch screens. Pure: positions in, axes out.
 */

export interface Point {
  x: number
  y: number
}

/** A floating stick: it appears where the thumb lands, and the thumb's travel is the input. */
export class VirtualStick {
  private origin: Point | null = null
  private current: Point | null = null
  private readonly radius: number
  private readonly deadzone: number

  /** `radius` is the travel (in pixels) that counts as full tilt. */
  constructor(radius = 60, deadzone = 0.12) {
    this.radius = radius
    this.deadzone = deadzone
  }

  public start(p: Point): void {
    this.origin = { ...p }
    this.current = { ...p }
  }

  public move(p: Point): void {
    if (this.origin) this.current = { ...p }
  }

  public end(): void {
    this.origin = null
    this.current = null
  }

  public isActive(): boolean {
    return this.origin !== null
  }

  public getOrigin(): Point | null {
    return this.origin
  }

  /** The thumb's offset from the origin, clamped to the radius (for drawing the knob). */
  public getOffset(): Point {
    if (!this.origin || !this.current) return { x: 0, y: 0 }
    const dx = this.current.x - this.origin.x
    const dy = this.current.y - this.origin.y
    const mag = Math.hypot(dx, dy)
    if (mag <= this.radius || mag === 0) return { x: dx, y: dy }
    return { x: (dx / mag) * this.radius, y: (dy / mag) * this.radius }
  }

  /** Axes -1..1: x right, y forward (screen up). */
  public getAxes(): Point {
    const o = this.getOffset()
    const x = o.x / this.radius
    const y = -o.y / this.radius
    const mag = Math.hypot(x, y)
    if (mag <= this.deadzone) return { x: 0, y: 0 }
    const scaled = Math.min(1, (mag - this.deadzone) / (1 - this.deadzone))
    return { x: (x / mag) * scaled, y: (y / mag) * scaled }
  }
}

/** Pixels of finger drag per unit of mouse-like look delta. Lower = more sensitive. */
export const LOOK_PIXELS_PER_UNIT = 1

/** A drag as a look delta in "mouse pixels", scaled by a sensitivity multiplier. */
export function lookDelta(from: Point, to: Point, sensitivity = 1): Point {
  const s = Number.isFinite(sensitivity) && sensitivity > 0 ? sensitivity : 1
  return {
    x: ((to.x - from.x) / LOOK_PIXELS_PER_UNIT) * s,
    y: ((to.y - from.y) / LOOK_PIXELS_PER_UNIT) * s,
  }
}
