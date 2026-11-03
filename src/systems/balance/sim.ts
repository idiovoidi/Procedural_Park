/**
 * Balance simulation
 * Plays a bot through hours of game time on the real systems and records how the economy
 * behaves: income curve, net worth, food cost, waste, starvation. Deterministic: the same
 * policy always gives the same run.
 */

import { creatureValue } from '@systems/market'
import { Bot, type BotPolicy } from './bot'
import { createBalanceWorld } from './world'

export interface Sample {
  minute: number
  coins: number
  /** Coins plus what every creature would sell for. */
  netWorth: number
  creatures: number
  penned: number
  adults: number
  pens: number
  /** Coins earned from sales (resources and creatures) over the last 10 minutes, per minute. */
  incomePerMinute: number
  /** Share of creature-cycles spent starving so far (0..1). */
  starvingShare: number
  /** Highest rarity (0..1) among owned creatures. */
  bestRarity: number
}

export interface SimReport {
  samples: Sample[]
  totals: {
    earned: Record<string, number>
    spent: Record<string, number>
  }
  wastedShare: number
  starvingShare: number
  speciesKnown: number
  actions: Bot['actions']
  final: Sample
}

export interface SimOptions {
  minutes: number
  policy?: Partial<BotPolicy>
}

export function runSim({ minutes, policy }: SimOptions): SimReport {
  const w = createBalanceWorld()
  const bot = new Bot(w, policy)
  const samples: Sample[] = []
  const salesAt: number[] = []

  const sales = () =>
    (w.currency.earned.resourceSales ?? 0) + (w.currency.earned.creatureSales ?? 0)

  for (let minute = 1; minute <= minutes; minute++) {
    w.advance(60)
    bot.step()

    salesAt.push(sales())
    const window = 10
    const past = salesAt[Math.max(0, salesAt.length - 1 - window)] ?? 0
    const span = Math.min(window, salesAt.length - 1) || 1
    const creatures = w.roster.list()
    samples.push({
      minute,
      coins: w.currency.getBalance(),
      netWorth: w.currency.getBalance() + creatures.reduce((s, c) => s + creatureValue(c), 0),
      creatures: creatures.length,
      penned: creatures.filter((c) => c.penId && w.grid.getPen(c.penId)).length,
      adults: creatures.filter((c) => c.ageStage === 'adult').length,
      pens: w.grid.getPens().length,
      incomePerMinute: (sales() - past) / span,
      starvingShare: w.stats.creatureCycles
        ? w.stats.starvingCreatureCycles / w.stats.creatureCycles
        : 0,
      bestRarity: creatures.reduce((m, c) => Math.max(m, c.genome.rarity), 0),
    })
  }

  return {
    samples,
    totals: { earned: { ...w.currency.earned }, spent: { ...w.currency.spent } },
    wastedShare: w.stats.producedOutput ? w.stats.wastedOutput / w.stats.producedOutput : 0,
    starvingShare: w.stats.creatureCycles
      ? w.stats.starvingCreatureCycles / w.stats.creatureCycles
      : 0,
    speciesKnown: w.codex.count(),
    actions: bot.actions,
    final: samples[samples.length - 1],
  }
}

/** A readable table of the run, for the console. */
export function formatReport(
  title: string,
  report: SimReport,
  marks = [5, 10, 20, 30, 60, 90, 120, 180, 240]
): string {
  const lines = [`\n=== ${title} ===`]
  lines.push('min  coins  netWorth  creatures(penned)  pens  income/min  starving')
  for (const m of marks) {
    const s = report.samples[m - 1]
    if (!s) continue
    lines.push(
      `${String(s.minute).padStart(3)}  ${String(Math.round(s.coins)).padStart(5)}  ${String(Math.round(s.netWorth)).padStart(8)}  ${String(s.creatures).padStart(9)}(${String(s.penned).padStart(3)})  ${String(s.pens).padStart(4)}  ${s.incomePerMinute.toFixed(1).padStart(10)}  ${(s.starvingShare * 100).toFixed(1)}%`
    )
  }
  const f = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([k, v]) => `${k} ${Math.round(v)}`)
      .join(', ')
  lines.push(`earned: ${f(report.totals.earned)}`)
  lines.push(`spent:  ${f(report.totals.spent)}`)
  lines.push(
    `wasted output ${(report.wastedShare * 100).toFixed(1)}%, starving ${(report.starvingShare * 100).toFixed(1)}%, species ${report.speciesKnown}, actions ${JSON.stringify(report.actions)}`
  )
  return lines.join('\n')
}
