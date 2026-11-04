import { describe, expect, it } from 'vitest'
import { applyDeadzone, BUTTON_ACTIONS, DEADZONE, mapPad, type PadState, readPad } from './gamepad'
import { lookDelta, VirtualStick } from './joystick'

const pad = (over: Partial<PadState> = {}): PadState => ({
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => false),
  ...over,
})
const press = (...indices: number[]): boolean[] =>
  Array.from({ length: 17 }, (_, i) => indices.includes(i))

describe('gamepad dead zone', () => {
  it('ignores a resting, slightly drifting stick', () => {
    expect(applyDeadzone(0.1, -0.12)).toEqual([0, 0])
    expect(applyDeadzone(DEADZONE, 0)).toEqual([0, 0])
  })

  it('starts from zero just outside the dead zone and reaches full tilt', () => {
    const [x] = applyDeadzone(DEADZONE + 0.01, 0)
    expect(x).toBeGreaterThan(0)
    expect(x).toBeLessThan(0.05)
    const [fx, fy] = applyDeadzone(1, 0)
    expect(fx).toBeCloseTo(1, 10)
    expect(fy).toBeCloseTo(0, 10)
    // A diagonal never exceeds full tilt.
    const [dx, dy] = applyDeadzone(1, 1)
    expect(Math.hypot(dx, dy)).toBeCloseTo(1, 10)
  })

  it('survives nonsense input', () => {
    expect(applyDeadzone(Number.NaN, 0)).toEqual([0, 0])
    const out = mapPad(
      { axes: [Number.NaN, 9, -9, undefined as unknown as number], buttons: [] },
      null
    )
    expect(out.moveX).toBe(0)
    expect(Number.isFinite(out.moveY)).toBe(true)
    expect(Number.isFinite(out.lookX) && Number.isFinite(out.lookY)).toBe(true)
    expect(Math.abs(out.lookX)).toBeLessThanOrEqual(1)
  })
})

describe('mapPad', () => {
  it('turns the left stick into movement (up is forward) and the right into look (up looks up)', () => {
    const out = mapPad(pad({ axes: [0, -1, 1, -1] }), null)
    expect(out.moveY).toBeCloseTo(1, 10)
    expect(out.moveX).toBe(0)
    expect(out.lookX).toBeCloseTo(Math.SQRT1_2, 5)
    expect(out.lookY).toBeGreaterThan(0)
  })

  it('reports an action only on the frame its button goes down', () => {
    const down = pad({ buttons: press(7) })
    expect(mapPad(down, pad()).pressed).toEqual(['capture.crate'])
    expect(mapPad(down, down).pressed).toEqual([]) // held
    expect(mapPad(pad(), down).pressed).toEqual([]) // released
    expect(mapPad(down, null).pressed).toEqual(['capture.crate'])
  })

  it('maps every documented button, and sprint is the stick click', () => {
    for (const [index, action] of Object.entries(BUTTON_ACTIONS)) {
      expect(mapPad(pad({ buttons: press(Number(index)) }), pad()).pressed).toEqual([action])
    }
    expect(mapPad(pad({ buttons: press(10) }), pad()).sprint).toBe(true)
    expect(mapPad(pad(), pad()).sprint).toBe(false)
  })

  it('handles pads with fewer axes or buttons than the standard layout', () => {
    expect(mapPad({ axes: [0.5], buttons: [true] }, null).pressed).toEqual(['camera.jump'])
    expect(mapPad({ axes: [], buttons: [] }, null)).toMatchObject({ moveX: 0, moveY: 0 })
  })
})

describe('readPad', () => {
  it('takes the first connected pad and counts triggers past half way as pressed', () => {
    const fake = (connected: boolean, value: number) =>
      ({ connected, axes: [0.5], buttons: [{ pressed: false, value }] }) as unknown as Gamepad
    expect(readPad([null, fake(false, 1), fake(true, 0.7)])?.buttons[0]).toBe(true)
    expect(readPad([fake(true, 0.2)])?.buttons[0]).toBe(false)
    expect(readPad([null, null])).toBeNull()
    expect(readPad([])).toBeNull()
  })
})

describe('virtual stick', () => {
  it('is zero until touched, and ends cleanly', () => {
    const s = new VirtualStick(50)
    expect(s.getAxes()).toEqual({ x: 0, y: 0 })
    s.start({ x: 100, y: 100 })
    expect(s.isActive()).toBe(true)
    s.end()
    expect(s.isActive()).toBe(false)
    expect(s.getAxes()).toEqual({ x: 0, y: 0 })
  })

  it('reads thumb travel as axes: up is forward, clamped at full tilt', () => {
    const s = new VirtualStick(50, 0)
    s.start({ x: 100, y: 100 })
    s.move({ x: 100, y: 50 })
    expect(s.getAxes()).toEqual({ x: 0, y: 1 })
    s.move({ x: 100, y: -500 }) // far past the radius
    expect(s.getAxes().y).toBeCloseTo(1, 10)
    expect(Math.hypot(s.getOffset().x, s.getOffset().y)).toBeCloseTo(50, 10)
    s.move({ x: 150, y: 100 })
    expect(s.getAxes().x).toBeCloseTo(1, 10)
  })

  it('has a dead zone, and ignores moves before a touch starts', () => {
    const s = new VirtualStick(60, 0.2)
    s.move({ x: 300, y: 300 })
    expect(s.isActive()).toBe(false)
    s.start({ x: 0, y: 0 })
    s.move({ x: 6, y: 0 })
    expect(s.getAxes()).toEqual({ x: 0, y: 0 })
  })
})

describe('look drag', () => {
  it('turns a drag into a look delta, scaled by sensitivity, and ignores bad sensitivity', () => {
    expect(lookDelta({ x: 10, y: 10 }, { x: 30, y: 5 })).toEqual({ x: 20, y: -5 })
    expect(lookDelta({ x: 0, y: 0 }, { x: 10, y: 10 }, 2)).toEqual({ x: 20, y: 20 })
    expect(lookDelta({ x: 0, y: 0 }, { x: 10, y: 10 }, -3)).toEqual({ x: 10, y: 10 })
    expect(lookDelta({ x: 0, y: 0 }, { x: 10, y: 10 }, Number.NaN)).toEqual({ x: 10, y: 10 })
  })
})
