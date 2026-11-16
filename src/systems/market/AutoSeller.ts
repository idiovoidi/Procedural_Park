/**
 * Auto-sell valve (GDD 8, tier 3)
 * While at least one valve stands in the park, every production cycle the valve sells each
 * resource the player holds for as long as its price stays at or above the floor (a share of
 * the base price). The player chooses the floor, so selling is automated but the *when* is
 * still a decision: a high floor waits for good prices and fills the silos instead.
 */

import { GAME_CONFIG } from '@core/constants'
import type { ResourceType } from '@systems/economy'
import type { PenGrid } from '@systems/park'
import { RESOURCE_TYPES, type ResourceInventory } from '@systems/production'
import type { MarketSystem } from './MarketSystem'

const MARKET = GAME_CONFIG.ECONOMY.MARKET
const CYCLE = GAME_CONFIG.ECONOMY.PRODUCTION_CYCLE_TICKS
const AUTO = GAME_CONFIG.ECONOMY.PRODUCTION.AUTO_SELL

export interface AutoSellSnapshot {
  version: 1
  floor: number
}

export class AutoSeller {
  private readonly market: MarketSystem
  private readonly inventory: ResourceInventory
  private readonly grid: PenGrid
  private floor: number = AUTO.DEFAULT_FLOOR
  private listeners = new Set<() => void>()

  constructor(market: MarketSystem, inventory: ResourceInventory, grid: PenGrid) {
    this.market = market
    this.inventory = inventory
    this.grid = grid
  }

  /** True while at least one valve stands in a closed pen. */
  public isAvailable(): boolean {
    return this.grid.getPens().some((p) => p.props.valve > 0)
  }

  public getFloor(): number {
    return this.floor
  }

  public setFloor(floor: number): void {
    if (!Number.isFinite(floor)) return
    const clamped = Math.min(AUTO.MAX_FLOOR, Math.max(AUTO.MIN_FLOOR, floor))
    // Keep to whole steps so repeated nudges never drift (0.7 + 0.05 + ... stays tidy).
    this.floor = Math.round(clamped / AUTO.FLOOR_STEP) * AUTO.FLOOR_STEP
    this.notify()
  }

  /** Call once per economy tick; sells only on production-cycle boundaries. Returns coins made. */
  public tick(tick: number): number {
    if (tick <= 0 || tick % CYCLE !== 0 || !this.isAvailable()) return 0

    let coins = 0
    for (const type of RESOURCE_TYPES) {
      const units = this.unitsAboveFloor(type)
      if (units > 0) coins += this.market.sellResource(type, units)?.coins ?? 0
    }
    return coins
  }

  /** How many held units can be sold before the price would drop below the floor. */
  private unitsAboveFloor(type: ResourceType): number {
    const held = this.inventory.get(type)
    let demand = this.market.getDemand(type)
    let count = 0
    while (count < held && demand >= this.floor - 1e-9) {
      count++
      demand = Math.max(MARKET.MIN_DEMAND, demand - MARKET.DEMAND_DROP_PER_UNIT)
    }
    return count
  }

  public onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  public serialize(): AutoSellSnapshot {
    return { version: 1, floor: this.floor }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<AutoSellSnapshot> | null
    if (!s || s.version !== 1 || typeof s.floor !== 'number' || !Number.isFinite(s.floor)) {
      return false
    }
    this.setFloor(s.floor)
    return true
  }
}
