/**
 * Stocking a pen with food (shared by the player's Stock action and by keepers)
 * Moves food its residents eat well from a bag into the pen (troughs first, then hoppers),
 * best match first. A keeper may also buy more at the store when the bag is empty.
 */

import { getCreatureEconomyProfile, getFoodPerCycle } from '@systems/economy'
import type { OwnedCreature } from '@systems/roster'
import type { CareSystem } from './CareSystem'

/** Foods a resident digests at least this well count as "theirs". */
export const STOCK_MIN_EFFICIENCY = 0.5
/** A buying keeper aims to leave this many cycles of food in the pen. */
export const BUY_CYCLES_AHEAD = 10

export interface FoodBag {
  getInventory(): Array<{ id: string; quantity: number }>
  removeFood(foodId: string, quantity: number): boolean
}

export interface StoreShelf {
  /** Price of one serving, or undefined if the store does not sell it. */
  priceOf(foodId: string): number | undefined
  /** Pay for servings; false if the player cannot afford them. */
  pay(coins: number): boolean
}

export interface StockResult {
  /** Servings taken from the bag, by food. */
  fromBag: Record<string, number>
  /** Servings bought at the store, by food. */
  bought: Record<string, number>
  coinsSpent: number
}

/** Foods the pen's residents eat well, best first. */
export function wantedFoods(residents: ReadonlyArray<Pick<OwnedCreature, 'genome'>>): string[] {
  const wanted = new Map<string, number>()
  for (const c of residents) {
    for (const d of getCreatureEconomyProfile(c.genome).diet) {
      if (d.efficiency >= STOCK_MIN_EFFICIENCY) {
        wanted.set(d.foodId, Math.max(wanted.get(d.foodId) ?? 0, d.efficiency))
      }
    }
  }
  return [...wanted].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

export function stockPen(
  care: CareSystem,
  residents: ReadonlyArray<Pick<OwnedCreature, 'genome'>>,
  penId: string,
  bag: FoodBag,
  shelf?: StoreShelf
): StockResult {
  const result: StockResult = { fromBag: {}, bought: {}, coinsSpent: 0 }
  if (residents.length === 0 || care.getTroughCapacity(penId) === 0) return result
  const order = wantedFoods(residents)

  for (const foodId of order) {
    const item = bag.getInventory().find((i) => i.id === foodId)
    if (!item) continue
    // Whole servings only: the bag never ends up with fractions of a serving.
    const room = Math.floor(roomFor(care, penId))
    const qty = Math.min(Math.floor(item.quantity), room)
    if (qty <= 0) continue
    const accepted = care.stock(penId, foodId, qty)
    if (accepted > 0 && bag.removeFood(foodId, accepted)) result.fromBag[foodId] = accepted
  }

  if (shelf) {
    // Buy the cheapest adequate food per useful serving, enough for the next few cycles.
    const need = residents.reduce((n, c) => n + getFoodPerCycle(c.genome, 1) * BUY_CYCLES_AHEAD, 0)
    const have = care.getTroughTotal(penId) + care.getHopperTotal(penId)
    let missing = Math.floor(need - have)
    if (missing > 0) {
      const options = order
        .map((id) => ({ id, price: shelf.priceOf(id) }))
        .filter((o): o is { id: string; price: number } => o.price !== undefined)
        .sort((a, b) => a.price - b.price)
      for (const o of options) {
        const room = Math.floor(
          care.getTroughCapacity(penId) + care.getHopperCapacity(penId) - have - sum(result.bought)
        )
        const qty = Math.min(missing, room)
        if (qty <= 0) break
        const cost = qty * o.price
        if (!shelf.pay(cost)) continue
        const accepted = care.stock(penId, o.id, qty)
        if (accepted > 0) {
          result.bought[o.id] = (result.bought[o.id] ?? 0) + accepted
          result.coinsSpent += accepted * o.price
          missing -= accepted
        }
        break
      }
    }
  }
  return result
}

/** Servings the pen can still take (troughs plus hoppers). */
const roomFor = (care: CareSystem, penId: string): number =>
  care.getTroughCapacity(penId) +
  care.getHopperCapacity(penId) -
  care.getTroughTotal(penId) -
  care.getHopperTotal(penId)

const sum = (r: Record<string, number>): number => Object.values(r).reduce((a, b) => a + b, 0)
