import { it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { runSim } from './sim'

const M = GAME_CONFIG.ECONOMY.MARKET as unknown as Record<string, number>

// Opt-in tuning tool: BALANCE_SWEEP=1 npx vitest run src/systems/balance/sweep.test.ts
// Edit the lists below to explore market settings; it restores the real config afterwards.
it.skipIf(!process.env.BALANCE_SWEEP)('sweep market settings', () => {
  const orig = { ...M }
  const rows = [
    'drop  rate  | netWorth@30/60/120/240 | income@60/@240 | margin | 1000c@ 6pens@ | starve',
  ]
  for (const drop of [
    orig.DEMAND_DROP_PER_UNIT * 0.8,
    orig.DEMAND_DROP_PER_UNIT,
    orig.DEMAND_DROP_PER_UNIT * 1.3,
  ]) {
    for (const rate of [
      orig.DEMAND_RECOVERY_RATE * 0.75,
      orig.DEMAND_RECOVERY_RATE,
      orig.DEMAND_RECOVERY_RATE * 1.3,
    ]) {
      M.DEMAND_DROP_PER_UNIT = drop
      M.DEMAND_RECOVERY_RATE = rate
      const r = runSim({ minutes: 240 })
      const sales = r.totals.earned.resourceSales ?? 1
      const food = r.totals.spent.foodPurchases ?? 0
      const nw = (m: number) => Math.round(r.samples[m - 1].netWorth)
      const first = (pred: (x: (typeof r.samples)[number]) => boolean) =>
        r.samples.find(pred)?.minute ?? '-'
      rows.push(
        `${drop.toFixed(4)}  ${rate.toFixed(4)} | ${nw(30)} ${nw(60)} ${nw(120)} ${nw(240)} | ${r.samples[59].incomePerMinute.toFixed(0)}/${r.final.incomePerMinute.toFixed(0)} | ${(100 * (1 - food / sales)).toFixed(0)}% | ${first((x) => x.coins >= 1000)} ${first((x) => x.pens >= 6)} | ${(r.starvingShare * 100).toFixed(0)}%`
      )
    }
  }
  Object.assign(M, orig)
  console.log(`SWEEP\n${rows.join('\n')}`)
})
