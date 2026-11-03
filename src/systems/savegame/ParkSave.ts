/**
 * ParkSave
 * Captures and restores the whole ranch: coins, food, the economy clock, roster, hub grid,
 * troughs, bins, resources, market demand and which wild creatures have been crated.
 *
 * It rides inside the existing world save (`WorldState.park`) so slots, export/import and
 * localStorage handling are reused. Nothing here touches the DOM or WebGL, so it can be
 * tested by round-tripping real systems.
 *
 * Restoring is defensive: each section is restored independently, so one corrupt section
 * loses only itself rather than the whole park. After a restore the economy "catches up"
 * for the time the player was away, up to the offline cap (GDD 13.2).
 */

import { GAME_CONFIG } from '@core/constants'
import type { CareSnapshot, CareSystem } from '@systems/care'
import type { CurrencyManager } from '@systems/currency'
import type { SimClock, SimClockState } from '@systems/economy'
import type { FoodManager } from '@systems/food'
import type { MarketSnapshot, MarketSystem } from '@systems/market'
import type { PenGrid, PenGridSnapshot } from '@systems/park'
import type {
  ProductionSnapshot,
  ProductionSystem,
  ResourceInventory,
  ResourceInventorySnapshot,
} from '@systems/production'
import type { Roster, RosterSnapshot } from '@systems/roster'

export const PARK_SAVE_VERSION = 1

/** The live systems a save is read from and restored into. */
export interface ParkTargets {
  clock: SimClock
  roster: Roster
  grid: PenGrid
  care: CareSystem
  production: ProductionSystem
  resources: ResourceInventory
  market: MarketSystem
  currency: CurrencyManager
  food: FoodManager
}

export interface ParkSave {
  version: typeof PARK_SAVE_VERSION
  /** Wall-clock time of the save (ms since epoch), used to work out time spent away. */
  savedAt: number
  coins: number
  food: Array<{ id: string; quantity: number }>
  clock: SimClockState
  roster: RosterSnapshot
  grid: PenGridSnapshot
  care: CareSnapshot
  production: ProductionSnapshot
  resources: ResourceInventorySnapshot
  market: MarketSnapshot
  /** Genome seeds of wild creatures that have been crated, so they don't respawn. */
  capturedSeeds: number[]
}

export type ParkSection =
  | 'coins'
  | 'food'
  | 'roster'
  | 'grid'
  | 'care'
  | 'production'
  | 'resources'
  | 'market'
  | 'clock'
  | 'captured'

export interface ParkRestoreResult {
  /** False when the data was not a usable park save at all (nothing was changed). */
  ok: boolean
  restored: ParkSection[]
  failed: ParkSection[]
  /** Economy ticks simulated to cover the time spent away. */
  offlineTicks: number
  /** Seconds the player was away, before the cap. */
  awaySeconds: number
  capturedSeeds: number[]
}

const MAX_FOOD_STACK = 9999

export function capturePark(
  t: ParkTargets,
  capturedSeeds: Iterable<number>,
  now: number = Date.now()
): ParkSave {
  return {
    version: PARK_SAVE_VERSION,
    savedAt: now,
    coins: t.currency.getBalance(),
    food: t.food.getInventory().map((item) => ({ id: item.id, quantity: item.quantity })),
    clock: t.clock.getState(),
    roster: t.roster.serialize(),
    grid: t.grid.serialize(),
    care: t.care.serialize(),
    production: t.production.serialize(),
    resources: t.resources.serialize(),
    market: t.market.serialize(),
    capturedSeeds: [...capturedSeeds],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Restore a park from saved data. Returns what was restored and how many economy ticks were
 * simulated for the time the player was away.
 */
export function restorePark(
  t: ParkTargets,
  data: unknown,
  now: number = Date.now()
): ParkRestoreResult {
  const result: ParkRestoreResult = {
    ok: false,
    restored: [],
    failed: [],
    offlineTicks: 0,
    awaySeconds: 0,
    capturedSeeds: [],
  }
  if (!isRecord(data) || data.version !== PARK_SAVE_VERSION) return result
  result.ok = true

  const section = (name: ParkSection, run: () => boolean) => {
    try {
      if (run()) result.restored.push(name)
      else result.failed.push(name)
    } catch {
      result.failed.push(name)
    }
  }

  section('coins', () => {
    const coins = data.coins
    if (typeof coins !== 'number' || !Number.isFinite(coins) || coins < 0) return false
    t.currency.setBalance(Math.floor(coins))
    return true
  })

  section('food', () => {
    if (!Array.isArray(data.food)) return false
    t.food.clear()
    for (const entry of data.food) {
      if (!isRecord(entry) || typeof entry.id !== 'string') continue
      const qty = entry.quantity
      if (typeof qty === 'number' && Number.isInteger(qty) && qty > 0) {
        t.food.addFood(entry.id, Math.min(qty, MAX_FOOD_STACK))
      }
    }
    return true
  })

  // Roster and grid first: care/production state refers to pen and creature ids.
  section('roster', () => t.roster.restore(data.roster).valid)
  section('grid', () => t.grid.restore(data.grid))
  section('care', () => t.care.restore(data.care))
  section('production', () => t.production.restore(data.production))
  section('resources', () => t.resources.restore(data.resources))
  section('market', () => t.market.restore(data.market))

  section('captured', () => {
    if (!Array.isArray(data.capturedSeeds)) return false
    result.capturedSeeds = data.capturedSeeds.filter(
      (seed): seed is number => typeof seed === 'number' && Number.isFinite(seed)
    )
    return true
  })

  // The clock last, so catching up drives every system that was just restored.
  section('clock', () => {
    const clock = data.clock as Partial<SimClockState> | undefined
    if (!isRecord(clock)) return false
    t.clock.restore(clock)

    const savedAt = data.savedAt
    if (typeof savedAt === 'number' && Number.isFinite(savedAt) && now > savedAt) {
      result.awaySeconds = (now - savedAt) / 1000
      result.offlineTicks = t.clock.fastForward(result.awaySeconds)
    }
    return true
  })

  return result
}

/** Minutes the player was away, rounded, for a "welcome back" message. */
export function awayMinutes(result: Pick<ParkRestoreResult, 'awaySeconds'>): number {
  const cap = GAME_CONFIG.ECONOMY.OFFLINE_CAP_SECONDS
  return Math.round(Math.min(result.awaySeconds, cap) / 60)
}
