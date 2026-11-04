import { describe, expect, it } from 'vitest'
import { levelForSetting, QUALITY_PRESETS, QualityGovernor } from './QualityGovernor'

/** Feed `seconds` of frames at a steady fps, returning every level change. */
function run(g: QualityGovernor, fps: number, seconds: number): number[] {
  const changes: number[] = []
  const dt = 1 / fps
  for (let t = 0; t < seconds; t += dt) {
    const c = g.recordFrame(dt)
    if (c !== null) changes.push(c)
  }
  return changes
}

describe('quality governor', () => {
  it('stays put at a healthy frame rate', () => {
    const g = new QualityGovernor(2)
    expect(run(g, 60, 60)).toEqual([])
    expect(g.getLevel()).toBe(2)
  })

  it('steps down after a few slow seconds, then again after the cooldown, and stops at low', () => {
    const g = new QualityGovernor(2)
    expect(run(g, 20, 4)).toEqual([1])
    expect(run(g, 20, 4)).toEqual([]) // cooling down
    expect(run(g, 20, 8)).toEqual([0])
    expect(run(g, 20, 60)).toEqual([])
    expect(g.getLevel()).toBe(0)
  })

  it('does not react to a short stutter', () => {
    const g = new QualityGovernor(2)
    run(g, 60, 10)
    run(g, 15, 1) // one slow second
    expect(run(g, 60, 30)).toEqual([])
    expect(g.getLevel()).toBe(2)
  })

  it('steps back up only after a long stretch of headroom, and not past the ceiling', () => {
    const g = new QualityGovernor(0)
    expect(run(g, 60, 15)).toEqual([]) // not long enough yet
    expect(run(g, 60, 10)).toEqual([1])
    run(g, 60, 60)
    expect(g.getLevel()).toBe(2)
    g.setCeiling(1)
    expect(g.getLevel()).toBe(1)
    expect(run(g, 60, 120)).toEqual([])
  })

  it('does not flip-flop on a frame rate between the thresholds', () => {
    const g = new QualityGovernor(1)
    expect(run(g, 50, 120)).toEqual([])
  })

  it('ignores paused time, background-tab frames and nonsense', () => {
    const g = new QualityGovernor(2)
    g.setPaused(true)
    expect(run(g, 10, 30)).toEqual([])
    g.setPaused(false)
    expect(g.recordFrame(5)).toBeNull() // a frame that took five seconds
    expect(g.recordFrame(Number.NaN)).toBeNull()
    expect(g.recordFrame(-1)).toBeNull()
    expect(g.getLevel()).toBe(2)
  })

  it('a manual level sticks and restarts the timers', () => {
    const g = new QualityGovernor(2)
    g.setLevel(0)
    expect(g.getLevel()).toBe(0)
    expect(run(g, 60, 5)).toEqual([]) // cooldown after a manual change
  })
})

describe('presets and settings', () => {
  it('get cheaper as the level drops', () => {
    expect(QUALITY_PRESETS[0].pixelRatio).toBeLessThan(QUALITY_PRESETS[2].pixelRatio)
    expect(QUALITY_PRESETS[0].residentRange).toBeLessThan(QUALITY_PRESETS[2].residentRange)
    expect(QUALITY_PRESETS[0].shadows).toBe(false)
    expect(QUALITY_PRESETS[2].shadows).toBe(true)
  })

  it('a fixed setting overrides auto, and auto follows the governor', () => {
    expect(levelForSetting('low', 2)).toBe(0)
    expect(levelForSetting('medium', 0)).toBe(1)
    expect(levelForSetting('high', 0)).toBe(2)
    expect(levelForSetting('auto', 1)).toBe(1)
  })
})
