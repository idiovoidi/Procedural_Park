import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'

const E = GAME_CONFIG.ECONOMY

describe('economy config', () => {
  it('covers every creature size with a positive multiplier that grows with size', () => {
    const order = ['tiny', 'small', 'medium', 'large', 'huge'] as const
    const values = order.map((size) => E.SIZE_MULTIPLIER[size])
    expect(values.every((v) => v > 0)).toBe(true)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(E.SIZE_MULTIPLIER.medium).toBe(1) // medium is the reference body
  })

  it('has rarity tiers that start at 0, ascend, stay below 1 and pay more as they rise', () => {
    const tiers = E.RARITY_TIERS
    expect(tiers[0].min).toBe(0)
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].min).toBeGreaterThan(tiers[i - 1].min)
      expect(tiers[i].multiplier).toBeGreaterThan(tiers[i - 1].multiplier)
    }
    expect(tiers[tiers.length - 1].min).toBeLessThan(1)
    expect(tiers[0].multiplier).toBe(1)
  })

  it('has every rarity tier name that the reward table already knows', () => {
    expect(E.RARITY_TIERS.map((t) => t.name)).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ])
  })

  it('grows output with age and tops out at the adult baseline', () => {
    const a = E.AGE_MULTIPLIER
    expect(a.hatchling).toBeGreaterThan(0)
    expect(a.hatchling).toBeLessThan(a.juvenile)
    expect(a.juvenile).toBeLessThan(a.adult)
    expect(a.adult).toBe(1)
  })

  it('keeps happiness a strict, positive range that includes 1x', () => {
    const h = E.HAPPINESS_MULTIPLIER
    expect(h.min).toBeGreaterThan(0)
    expect(h.min).toBeLessThan(1)
    expect(h.max).toBeGreaterThan(1)
  })

  it('has a positive base output for each of the five archetypes', () => {
    expect(Object.keys(E.BASE_OUTPUT_PER_CYCLE).sort()).toEqual([
      'aerial',
      'aquatic',
      'crystalline',
      'ethereal',
      'terrestrial',
    ])
    for (const output of Object.values(E.BASE_OUTPUT_PER_CYCLE)) {
      expect(output).toBeGreaterThan(0)
    }
  })

  it('uses whole, positive tick counts and a sane offline cap', () => {
    expect(Number.isInteger(E.PRODUCTION_CYCLE_TICKS) && E.PRODUCTION_CYCLE_TICKS > 0).toBe(true)
    expect(Number.isInteger(E.FEED_CYCLE_TICKS) && E.FEED_CYCLE_TICKS > 0).toBe(true)
    expect(E.TICK_SECONDS).toBeGreaterThan(0)
    expect(E.MAX_STEPS_PER_FRAME).toBeGreaterThanOrEqual(1)
    expect(E.OFFLINE_CAP_SECONDS).toBe(8 * 60 * 60)
  })
})
