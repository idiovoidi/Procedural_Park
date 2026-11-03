import { GAME_CONFIG } from '@core/constants'
import { describe, expect, it } from 'vitest'
import { runSim } from './sim'

/**
 * Guard rails for the economy: a bot plays four simulated hours on the real systems and the
 * curve must stay in a healthy band. If a tuning change trips one of these, run
 * `npm run balance` and read docs/BALANCE.md before loosening anything.
 */
const MARKET = GAME_CONFIG.ECONOMY.MARKET as unknown as Record<string, number>

const margin = (r: ReturnType<typeof runSim>) =>
  1 - (r.totals.spent.foodPurchases ?? 0) / (r.totals.earned.resourceSales || 1)

describe('economy balance', () => {
  const run = runSim({ minutes: 240 })
  const nw = (m: number) => run.samples[m - 1].netWorth

  it('is deterministic', () => {
    const again = runSim({ minutes: 60 })
    expect(again.samples[59]).toEqual(run.samples[59])
  })

  it('does not soft-lock the opening', () => {
    // Pen + crate cost more than the starting coins: the player must still be able to earn.
    expect(run.samples[14].coins).toBeGreaterThan(0)
    expect(run.samples[14].penned).toBeGreaterThan(0)
  })

  it('keeps growing (no stall)', () => {
    expect(nw(120)).toBeGreaterThan(nw(60) * 1.05)
    expect(nw(240)).toBeGreaterThan(nw(120) * 1.05)
  })

  it('does not run away', () => {
    expect(nw(240)).toBeLessThan(nw(60) * 6)
    expect(run.final.incomePerMinute).toBeLessThan(run.samples[59].incomePerMinute * 6)
  })

  it('leaves a profit margin over food costs, but not an absurd one', () => {
    expect(margin(run)).toBeGreaterThan(0.08)
    expect(margin(run)).toBeLessThan(0.75)
  })

  it('does not starve or waste its animals', () => {
    expect(run.starvingShare).toBeLessThan(0.03)
    expect(run.wastedShare).toBeLessThan(0.15)
  })

  it('survives a harsher market', () => {
    const orig = { ...MARKET }
    try {
      MARKET.DEMAND_DROP_PER_UNIT = orig.DEMAND_DROP_PER_UNIT * 1.3
      MARKET.DEMAND_RECOVERY_RATE = orig.DEMAND_RECOVERY_RATE * 0.75
      const harsh = runSim({ minutes: 240 })
      expect(harsh.final.netWorth).toBeGreaterThan(harsh.samples[59].netWorth * 1.05)
      expect(margin(harsh)).toBeGreaterThan(0)
    } finally {
      Object.assign(MARKET, orig)
    }
  })

  it('does not depend on how the bot sells', () => {
    const drip = runSim({ minutes: 240, policy: { selling: 'drip' } })
    expect(drip.final.netWorth).toBeGreaterThan(drip.samples[59].netWorth * 1.05)
    expect(margin(drip)).toBeGreaterThan(0.08)
  })
})
