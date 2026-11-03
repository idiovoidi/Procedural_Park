/**
 * Balance world
 * A complete headless ranch built from the real systems, wired to the economy clock exactly as
 * the game wires them, plus a ledger that sorts every coin in and out into categories. Used by
 * the balance simulation; nothing in the game imports it.
 */

import { GAME_CONFIG } from '@core/constants'
import { BreedingSystem } from '@systems/breeding'
import { BuildController } from '@systems/build'
import { CareSystem } from '@systems/care'
import { Codex } from '@systems/codex'
import { ContractBoard } from '@systems/contracts'
import type { Genome } from '@systems/creatures/genome'
import { generateGenome, hashSeed } from '@systems/creatures/genome'
import { CurrencyManager } from '@systems/currency'
import { SimClock } from '@systems/economy'
import { FoodManager } from '@systems/food'
import { AutoSeller, MarketSystem } from '@systems/market'
import { PenGrid } from '@systems/park'
import { inventoryCapacity, ProductionSystem, ResourceInventory } from '@systems/production'
import { Roster } from '@systems/roster'

export type LedgerCategory =
  | 'resourceSales'
  | 'creatureSales'
  | 'contracts'
  | 'feedRewards'
  | 'foodPurchases'
  | 'building'
  | 'breeding'
  | 'crates'
  | 'other'

/** A wallet that records where every coin came from and went. */
export class Ledger extends CurrencyManager {
  public readonly earned: Record<string, number> = {}
  public readonly spent: Record<string, number> = {}

  private categorise(reason: string): LedgerCategory {
    if (reason.startsWith('Sold ')) {
      // MarketSystem reasons: "Sold 12 fibre" (resources) or "Sold <name>" (a creature)
      return /^Sold \d+ /.test(reason) ? 'resourceSales' : 'creatureSales'
    }
    if (reason.startsWith('Contract ')) return 'contracts'
    if (reason.startsWith('Fed ')) return 'feedRewards'
    if (reason === 'Food') return 'foodPurchases'
    if (reason.startsWith('Built ')) return 'building'
    if (reason === 'Breeding') return 'breeding'
    if (reason === 'Transport crate') return 'crates'
    if (reason === 'Build refund') return 'building'
    return 'other'
  }

  public override addMoney(amount: number, reason = 'Unknown'): void {
    super.addMoney(amount, reason)
    const k = this.categorise(reason)
    this.earned[k] = (this.earned[k] ?? 0) + amount
  }

  public override removeMoney(amount: number, reason = 'Unknown'): boolean {
    const ok = super.removeMoney(amount, reason)
    if (ok) {
      const k = this.categorise(reason)
      this.spent[k] = (this.spent[k] ?? 0) + amount
    }
    return ok
  }
}

export interface BalanceWorld {
  clock: SimClock
  roster: Roster
  grid: PenGrid
  care: CareSystem
  resources: ResourceInventory
  production: ProductionSystem
  market: MarketSystem
  autoSell: AutoSeller
  contracts: ContractBoard
  breeding: BreedingSystem
  codex: Codex
  currency: Ledger
  food: FoodManager
  build: BuildController
  /** The 60 wild founders available to capture, as the game generates them. */
  wild: Genome[]
  /** Wasted output (bin full or no bin), summed over all production cycles. */
  stats: {
    wastedOutput: number
    producedOutput: number
    starvingCreatureCycles: number
    creatureCycles: number
  }
  /** Advance the economy by whole seconds of game time. */
  advance(seconds: number): void
}

export function createBalanceWorld(): BalanceWorld {
  const clock = new SimClock()
  const roster = new Roster()
  const grid = new PenGrid()
  const care = new CareSystem(roster, grid)
  const resources = new ResourceInventory()
  const production = new ProductionSystem(roster, grid, resources)
  const currency = new Ledger(GAME_CONFIG.STARTING_CURRENCY)
  const market = new MarketSystem(roster, resources, currency)
  const breeding = new BreedingSystem(roster, grid, currency, GAME_CONFIG.WORLD_SEED)
  const codex = new Codex()
  const food = new FoodManager()
  const build = new BuildController(grid, currency)

  roster.onChange((c) => {
    if (c.reason === 'added') codex.recordOwned(c.creature)
  })

  const stats = { wastedOutput: 0, producedOutput: 0, starvingCreatureCycles: 0, creatureCycles: 0 }

  clock.onTick(() => roster.advanceTicks(1))
  clock.onTick((tick) => {
    const cycle = care.tick(tick)
    if (cycle) {
      for (const c of roster.list()) {
        if (c.penId && grid.getPen(c.penId)) {
          stats.creatureCycles++
          if (c.fullness <= 0) stats.starvingCreatureCycles++
        }
      }
    }
  })
  clock.onTick((tick) => {
    const summary = production.tick(tick)
    if (summary) {
      stats.wastedOutput += summary.wasted
      stats.producedOutput +=
        summary.wasted + Object.values(summary.stored).reduce((a, b) => a + (b ?? 0), 0)
    }
  })
  clock.onTick(() => market.tick())
  resources.setCapacity(inventoryCapacity(grid))
  const autoSell = new AutoSeller(market, resources, grid)
  clock.onTick((tick) => autoSell.tick(tick))
  const contracts = new ContractBoard(roster, currency, GAME_CONFIG.WORLD_SEED)
  clock.onTick((tick) => contracts.tick(tick))
  clock.onTick((tick) => breeding.tick(tick))

  const wild = Array.from({ length: GAME_CONFIG.CREATURE_COUNT }, (_, i) =>
    generateGenome(hashSeed(GAME_CONFIG.WORLD_SEED, i))
  )

  return {
    clock,
    roster,
    grid,
    care,
    resources,
    production,
    market,
    autoSell,
    contracts,
    breeding,
    codex,
    currency,
    food,
    build,
    wild,
    stats,
    advance: (seconds) => {
      clock.advanceRealTime(seconds)
    },
  }
}
