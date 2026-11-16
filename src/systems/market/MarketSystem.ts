/**
 * MarketSystem
 * Sells resources and creatures for Safari Coins (GDD 7.2, decision Q7).
 *
 * Resources sell at a base price scaled by *demand*. Each unit sold lowers demand a little
 * (and so the price of the next unit); demand creeps back up over time. Selling in
 * moderation pays best, and a park that makes one resource has to spread out, which is the
 * pressure toward variety the GDD asks for. Creatures are priced from rarity tier, size,
 * age and how many optional parts they have grown.
 */

import { GAME_CONFIG } from '@core/constants'
import type { Genome } from '@systems/creatures/genome'
import { getRarityTier, getSizeMultiplier, type ResourceType } from '@systems/economy'
import { RESOURCE_TYPES, type ResourceInventory } from '@systems/production'
import type { OwnedCreature, Roster } from '@systems/roster'

const MARKET = GAME_CONFIG.ECONOMY.MARKET

/** The part of CurrencyManager the market needs. */
export interface CoinPurse {
  addMoney(amount: number, reason?: string): void
}

export interface ResourceQuote {
  type: ResourceType
  units: number
  /** Whole coins the sale would pay. */
  coins: number
  /** Demand after the sale (0.25..1). */
  demandAfter: number
}

export interface CreatureSale {
  creatureId: string
  name: string
  coins: number
}

export interface MarketSnapshot {
  version: 1
  demand: Partial<Record<ResourceType, number>>
}

/** Optional body parts a creature has grown; each one adds a little to its price. */
export function countOptionalParts(genome: Genome): number {
  return (
    genome.wings.pairs +
    genome.tails.count +
    genome.antennae.count +
    genome.ears.count +
    genome.horns.count +
    genome.spines.count +
    (genome.furTufts ? 1 : 0) +
    (genome.scales ? 1 : 0)
  )
}

/** What a creature would fetch at market. Pure: depends only on the creature itself. */
export function creatureValue(creature: Pick<OwnedCreature, 'genome' | 'ageStage'>): number {
  const { genome, ageStage } = creature
  const premium = Math.min(
    MARKET.CREATURE_MAX_PART_PREMIUM,
    countOptionalParts(genome) * MARKET.CREATURE_PART_PREMIUM
  )
  const value =
    MARKET.CREATURE_BASE_VALUE *
    getRarityTier(genome.rarity).multiplier *
    getSizeMultiplier(genome.size) *
    MARKET.CREATURE_AGE_FACTOR[ageStage] *
    (1 + premium)
  return Math.max(0, Math.round(value))
}

export class MarketSystem {
  private readonly roster: Roster
  private readonly inventory: ResourceInventory
  private readonly purse: CoinPurse
  private demand = new Map<ResourceType, number>()
  private listeners = new Set<() => void>()

  constructor(roster: Roster, inventory: ResourceInventory, purse: CoinPurse) {
    this.roster = roster
    this.inventory = inventory
    this.purse = purse
  }

  // ---- Resources -------------------------------------------------------------------------

  /** Current demand for a resource, MIN_DEMAND..1. */
  public getDemand(type: ResourceType): number {
    return this.demand.get(type) ?? 1
  }

  /** Coins the next single unit would fetch right now. */
  public getUnitPrice(type: ResourceType): number {
    return MARKET.BASE_UNIT_PRICE[type] * this.getDemand(type)
  }

  /** What selling `units` of a resource would pay, without selling anything. */
  public quoteResource(type: ResourceType, units: number): ResourceQuote {
    const count = Number.isInteger(units) && units > 0 ? units : 0
    let demand = this.getDemand(type)
    let total = 0
    for (let i = 0; i < count; i++) {
      total += MARKET.BASE_UNIT_PRICE[type] * demand
      demand = Math.max(MARKET.MIN_DEMAND, demand - MARKET.DEMAND_DROP_PER_UNIT)
    }
    return { type, units: count, coins: Math.floor(total), demandAfter: demand }
  }

  /**
   * Sell whole units from the player's inventory. Fails (returns null) if they don't have
   * that many, or the amount is invalid.
   */
  public sellResource(type: ResourceType, units: number): ResourceQuote | null {
    if (!RESOURCE_TYPES.includes(type)) return null
    if (!Number.isInteger(units) || units <= 0 || this.inventory.get(type) < units) return null

    const quote = this.quoteResource(type, units)
    this.inventory.remove(type, units)
    this.demand.set(type, quote.demandAfter)
    if (quote.coins > 0) this.purse.addMoney(quote.coins, `Sold ${units} ${type}`)
    this.notify()
    return quote
  }

  /** Sell everything the player carries, one resource at a time. */
  public sellAllResources(): ResourceQuote[] {
    const sold: ResourceQuote[] = []
    for (const type of RESOURCE_TYPES) {
      const units = this.inventory.get(type)
      if (units <= 0) continue
      const quote = this.sellResource(type, units)
      if (quote) sold.push(quote)
    }
    return sold
  }

  /** Demand recovers a share of what is missing every economy tick. Call from the clock. */
  public tick(): void {
    let changed = false
    for (const [type, value] of this.demand) {
      const next = value + MARKET.DEMAND_RECOVERY_RATE * (1 - value)
      if (next >= 1 - 1e-4) this.demand.delete(type)
      else this.demand.set(type, next)
      changed = true
    }
    if (changed) this.notify()
  }

  // ---- Creatures --------------------------------------------------------------------------

  public quoteCreature(creatureId: string): number | null {
    const creature = this.roster.get(creatureId)
    return creature ? creatureValue(creature) : null
  }

  /** Sell an owned creature: it leaves the roster and the coins arrive. */
  public sellCreature(creatureId: string): CreatureSale | null {
    const creature = this.roster.get(creatureId)
    if (!creature) return null
    const coins = creatureValue(creature)
    const name = creature.name
    this.roster.remove(creatureId)
    if (coins > 0) this.purse.addMoney(coins, `Sold ${name}`)
    this.notify()
    return { creatureId, name, coins }
  }

  // ---- Events and saves -------------------------------------------------------------------

  /** Called after any sale or demand change, so a UI can refresh. */
  public onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public serialize(): MarketSnapshot {
    const demand: MarketSnapshot['demand'] = {}
    for (const [type, value] of this.demand) demand[type] = value
    return { version: 1, demand }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<MarketSnapshot> | null
    if (!s || s.version !== 1 || typeof s.demand !== 'object' || !s.demand) return false
    this.demand = new Map()
    for (const type of RESOURCE_TYPES) {
      const value = s.demand[type]
      if (typeof value === 'number' && Number.isFinite(value) && value < 1) {
        this.demand.set(type, Math.max(MARKET.MIN_DEMAND, value))
      }
    }
    this.notify()
    return true
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
