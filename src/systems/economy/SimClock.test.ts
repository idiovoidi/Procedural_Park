import { afterEach, describe, expect, it, vi } from 'vitest'
import { SimClock } from './SimClock'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SimClock.advance', () => {
  it('runs one tick per simulated second', () => {
    const clock = new SimClock(1)
    expect(clock.advance(1)).toBe(1)
    expect(clock.getTick()).toBe(1)
    expect(clock.getElapsedSeconds()).toBe(1)
  })

  it('carries fractional time between frames', () => {
    const clock = new SimClock(1)
    expect(clock.advance(0.4)).toBe(0)
    expect(clock.advance(0.4)).toBe(0)
    expect(clock.advance(0.4)).toBe(1) // 1.2s total
    expect(clock.getTick()).toBe(1)
  })

  it('does not lose a tick to float drift (ten 0.1s frames = one tick)', () => {
    const clock = new SimClock(1)
    let ticks = 0
    for (let i = 0; i < 10; i++) ticks += clock.advance(0.1)
    expect(ticks).toBe(1)
  })

  it('ignores zero, negative and non-finite time', () => {
    const clock = new SimClock(1)
    expect(clock.advance(0)).toBe(0)
    expect(clock.advance(-5)).toBe(0)
    expect(clock.advance(Number.NaN)).toBe(0)
    expect(clock.advance(Number.POSITIVE_INFINITY)).toBe(0)
    expect(clock.getTick()).toBe(0)
  })

  it('drops time beyond the per-call step cap instead of queueing it', () => {
    const clock = new SimClock(1, 10)
    expect(clock.advance(1000)).toBe(10)
    // Nothing is owed afterwards: the next frame starts fresh.
    expect(clock.advance(0.5)).toBe(0)
    expect(clock.getTick()).toBe(10)
  })

  it('keeps the partial step when dropping excess time', () => {
    const clock = new SimClock(1, 2)
    clock.advance(5.25) // 2 ticks run, 3.25 owed -> keeps only the 0.25 remainder
    expect(clock.getState().accumulator).toBeCloseTo(0.25, 6)
  })

  it('supports a step other than one second', () => {
    const clock = new SimClock(0.5)
    expect(clock.advance(2)).toBe(4)
    expect(clock.getElapsedSeconds()).toBe(2)
  })

  it('rejects invalid construction', () => {
    expect(() => new SimClock(0)).toThrow(RangeError)
    expect(() => new SimClock(1, 0)).toThrow(RangeError)
  })
})

describe('SimClock.advanceRealTime', () => {
  it('behaves like advance for ordinary frames', () => {
    const a = new SimClock(1)
    const b = new SimClock(1)
    for (let i = 0; i < 25; i++) {
      a.advance(0.37)
      b.advanceRealTime(0.37)
    }
    expect(b.getState()).toEqual(a.getState())
  })

  it('keeps pace with real time when frames are slow', () => {
    const clock = new SimClock(1)
    let ticks = 0
    for (let i = 0; i < 6; i++) ticks += clock.advanceRealTime(0.5) // ~2 fps for 3 s
    expect(ticks).toBe(3)
  })

  it('simulates a long gap as catch-up instead of dropping it', () => {
    const clock = new SimClock(1, 10)
    expect(clock.advanceRealTime(600.5)).toBe(600)
    expect(clock.getTick()).toBe(600)
    expect(clock.getState().accumulator).toBeCloseTo(0.5, 6)
  })

  it('caps catch-up at the offline limit', () => {
    const clock = new SimClock(1, 10)
    const eightHours = 8 * 60 * 60
    expect(clock.advanceRealTime(eightHours * 3)).toBe(eightHours)
  })

  it('applies speed and ignores pause and junk', () => {
    const clock = new SimClock(1, 10)
    clock.setSpeed(2)
    expect(clock.advanceRealTime(30)).toBe(60)

    clock.setSpeed(0)
    expect(clock.advanceRealTime(30)).toBe(0)
    clock.setSpeed(1)
    expect(clock.advanceRealTime(Number.NaN)).toBe(0)
    expect(clock.advanceRealTime(-1)).toBe(0)
  })
})

describe('SimClock determinism', () => {
  const run = (frames: number[]) => {
    const clock = new SimClock(1, 1000)
    const seen: number[] = []
    clock.onTick((tick) => seen.push(tick))
    for (const dt of frames) clock.advance(dt)
    return { ticks: clock.getTick(), seen }
  }

  it('gives the same ticks however the same time is split into frames', () => {
    const oneBigFrame = run([100])
    const sixtyFps = run(Array.from({ length: 6000 }, () => 1 / 60))
    const uneven = run([...Array(50).fill(0.5), ...Array(25).fill(1), ...Array(100).fill(0.5)])

    expect(oneBigFrame.ticks).toBe(100)
    expect(sixtyFps.ticks).toBe(100)
    expect(uneven.ticks).toBe(100)
    expect(sixtyFps.seen).toEqual(oneBigFrame.seen)
    expect(uneven.seen).toEqual(oneBigFrame.seen)
  })
})

describe('SimClock speed', () => {
  it('scales time and pauses at zero', () => {
    const clock = new SimClock(1)
    clock.setSpeed(4)
    expect(clock.advance(1)).toBe(4)

    clock.setSpeed(0)
    expect(clock.advance(10)).toBe(0)
    expect(clock.getTick()).toBe(4)
  })

  it('clamps speed to the configured range and ignores junk', () => {
    const clock = new SimClock(1)
    clock.setSpeed(9999)
    expect(clock.getSpeed()).toBe(8)
    clock.setSpeed(-3)
    expect(clock.getSpeed()).toBe(0)
    clock.setSpeed(2)
    clock.setSpeed(Number.NaN)
    expect(clock.getSpeed()).toBe(2)
  })
})

describe('SimClock.fastForward', () => {
  it('runs whole ticks for an offline gap', () => {
    const clock = new SimClock(1)
    expect(clock.fastForward(90.9)).toBe(90)
    expect(clock.getTick()).toBe(90)
  })

  it('clamps the gap to the offline cap', () => {
    const clock = new SimClock(1)
    const eightHours = 8 * 60 * 60
    expect(clock.fastForward(eightHours * 5)).toBe(eightHours)
  })

  it('honours an explicit cap and ignores invalid gaps', () => {
    const clock = new SimClock(1)
    expect(clock.fastForward(1000, 60)).toBe(60)
    expect(clock.fastForward(-1)).toBe(0)
    expect(clock.fastForward(Number.NaN)).toBe(0)
  })

  it('runs listeners for every catch-up tick, in order', () => {
    const clock = new SimClock(1)
    const seen: number[] = []
    clock.onTick((tick) => seen.push(tick))
    clock.fastForward(5)
    expect(seen).toEqual([1, 2, 3, 4, 5])
  })
})

describe('SimClock listeners', () => {
  it('passes the tick number and step length', () => {
    const clock = new SimClock(0.5)
    const listener = vi.fn()
    clock.onTick(listener)
    clock.advance(1)
    expect(listener).toHaveBeenNthCalledWith(1, 1, 0.5)
    expect(listener).toHaveBeenNthCalledWith(2, 2, 0.5)
  })

  it('stops calling a listener once it unsubscribes', () => {
    const clock = new SimClock(1)
    const listener = vi.fn()
    const off = clock.onTick(listener)
    clock.advance(1)
    off()
    clock.advance(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('isolates a throwing listener so the economy keeps running', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const clock = new SimClock(1)
    const healthy = vi.fn()
    clock.onTick(() => {
      throw new Error('boom')
    })
    clock.onTick(healthy)

    expect(() => clock.advance(3)).not.toThrow()
    expect(healthy).toHaveBeenCalledTimes(3)
    expect(clock.getTick()).toBe(3)
  })
})

describe('SimClock save and restore', () => {
  it('round-trips tick count and partial progress', () => {
    const a = new SimClock(1)
    a.advance(7.6)

    const b = new SimClock(1)
    b.restore(a.getState())
    expect(b.getTick()).toBe(7)
    expect(b.advance(0.4)).toBe(1) // 0.6 carried + 0.4 completes the next tick
  })

  it('falls back to a fresh clock on a corrupt save', () => {
    const clock = new SimClock(1)
    clock.advance(5)
    clock.restore({ tick: -4, accumulator: Number.NaN })
    expect(clock.getState()).toEqual({ tick: 0, accumulator: 0 })

    clock.restore(null)
    expect(clock.getTick()).toBe(0)

    clock.restore({ tick: 3.5 })
    expect(clock.getTick()).toBe(0)
  })

  it('never restores more than one step of accumulated time', () => {
    const clock = new SimClock(1)
    clock.restore({ tick: 1, accumulator: 99 })
    expect(clock.getState().accumulator).toBe(1)
  })
})
