import { GAME_CONFIG } from '@core/constants'
import { describe, expect, it } from 'vitest'
import { Bot } from './bot'
import { runSim } from './sim'
import { createBalanceWorld } from './world'

/**
 * Guard rails for the economy: a bot plays four simulated hours on the real systems and the
 * curve must stay in a healthy band. If a tuning change trips one of these, run
 * `npm run balance` and read docs/BALANCE.md before loosening anything.
 */
const MARKET = GAME_CONFIG.ECONOMY.MARKET as unknown as Record<string, number>

/** Share of sales (resources, creatures, contracts) left after paying for food. */
const margin = (r: ReturnType<typeof runSim>) => {
  const e = r.totals.earned
  const sales = (e.resourceSales ?? 0) + (e.creatureSales ?? 0) + (e.contracts ?? 0)
  return 1 - (r.totals.spent.foodPurchases ?? 0) / (sales || 1)
}

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

  it('contracts make breeding worth it', () => {
    const hands = runSim({ minutes: 240, policy: { breeds: false, contracts: false } })
    expect(run.totals.earned.contracts ?? 0).toBeGreaterThan(0)
    expect(run.final.netWorth).toBeGreaterThan(hands.final.netWorth * 1.05)
    expect(run.final.netWorth).toBeLessThan(hands.final.netWorth * 3)
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

  it('breeding climbs: bred creatures end rarer than the founders', () => {
    const w = createBalanceWorld()
    const bot = new Bot(w)
    for (let m = 0; m < 240; m++) {
      w.advance(60)
      bot.step()
    }
    const avg = (xs: ReturnType<typeof w.roster.list>) =>
      xs.reduce((s, c) => s + c.genome.rarity, 0) / Math.max(1, xs.length)
    const all = w.roster.list()
    const bred = all.filter((c) => c.generation > 0)
    expect(bred.length).toBeGreaterThan(5)
    expect(avg(bred)).toBeGreaterThan(avg(all.filter((c) => c.generation === 0)))
  })
})
