/**
 * Keepers (GDD 8, tier 5)
 * NPC workers assigned to pens. They do routine chores so the player does not have to, for a
 * wage: restock the troughs, collect the bin and cheer up the creatures. The player still makes
 * every real decision (what to breed, where to build, what to sell). Pure: its dependencies are
 * small interfaces, so it is tested without the game.
 */

import { GAME_CONFIG } from '@core/constants'
import { type CareSystem, type FoodBag, type StoreShelf, stockPen } from '@systems/care'
import type { PenGrid } from '@systems/park'
import type { ProductionSystem } from '@systems/production'
import type { Roster } from '@systems/roster'

const S = GAME_CONFIG.ECONOMY.STAFF
const CYCLE = GAME_CONFIG.ECONOMY.FEED_CYCLE_TICKS

export interface StaffWallet {
  canAfford(amount: number): boolean
  removeMoney(amount: number, reason?: string): boolean
}

export interface StaffDeps {
  roster: Roster
  grid: PenGrid
  care: CareSystem
  production: ProductionSystem
  wallet: StaffWallet
  bag: FoodBag
  /** Store prices, so a keeper can buy what the bag lacks. */
  prices: (foodId: string) => number | undefined
}

export interface StaffSnapshot {
  version: 1
  /** Pens that have a keeper. */
  keepers: string[]
}

export type HireResult = { ok: true } | { ok: false; reason: string }

export class StaffSystem {
  private readonly d: StaffDeps
  private keepers = new Set<string>()
  /** Keepers who could not be paid last cycle. */
  private unpaid = new Set<string>()
  private listeners = new Set<() => void>()

  constructor(deps: StaffDeps) {
    this.d = deps
  }

  public hasKeeper(penId: string): boolean {
    return this.keepers.has(penId)
  }

  public getKeepers(): string[] {
    return [...this.keepers]
  }

  /** True if the keeper missed their wage last cycle (so is not working). */
  public isUnpaid(penId: string): boolean {
    return this.unpaid.has(penId)
  }

  public hire(penId: string): HireResult {
    if (!this.d.grid.getPen(penId)) return { ok: false, reason: 'That pen is not closed' }
    if (this.keepers.has(penId)) return { ok: false, reason: 'This pen already has a keeper' }
    if (!this.d.wallet.removeMoney(S.HIRE_COST, 'Hired keeper')) {
      return { ok: false, reason: `Hiring costs ${S.HIRE_COST} coins` }
    }
    this.keepers.add(penId)
    this.notify()
    return { ok: true }
  }

  public dismiss(penId: string): void {
    if (this.keepers.delete(penId)) {
      this.unpaid.delete(penId)
      this.notify()
    }
  }

  /** Call once per economy tick; works only on feeding-cycle boundaries. */
  public tick(tick: number): void {
    if (tick <= 0 || tick % CYCLE !== 0 || this.keepers.size === 0) return
    for (const penId of [...this.keepers]) {
      // A pen that has been opened up has no keeper any more.
      if (!this.d.grid.getPen(penId)) {
        this.keepers.delete(penId)
        this.unpaid.delete(penId)
        continue
      }
      if (!this.d.wallet.removeMoney(S.WAGE_PER_CYCLE, 'Keeper wage')) {
        this.unpaid.add(penId)
        continue
      }
      this.unpaid.delete(penId)
      this.work(penId)
    }
    this.notify()
  }

  private work(penId: string): void {
    const { roster, care, production, bag, prices, wallet } = this.d
    const residents = roster.getByPen(penId)

    const shelf: StoreShelf = {
      priceOf: prices,
      pay: (coins) => (wallet.canAfford(coins) ? wallet.removeMoney(coins, 'Food') : false),
    }
    stockPen(care, residents, penId, bag, shelf)
    production.collect(penId)
    for (const c of residents) {
      roster.adjustStats(c.id, { happiness: S.ATTENTION_HAPPINESS })
    }
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

  public serialize(): StaffSnapshot {
    return { version: 1, keepers: [...this.keepers] }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<StaffSnapshot> | null
    if (!s || s.version !== 1 || !Array.isArray(s.keepers)) return false
    this.keepers = new Set(
      s.keepers.filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
    this.unpaid.clear()
    this.notify()
    return true
  }
}
