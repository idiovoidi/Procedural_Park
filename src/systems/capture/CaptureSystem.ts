/**
 * CaptureSystem
 * Winning the trust of wild creatures so they will enter a transport crate (GDD 10.2).
 *
 * Two ways to earn trust are implemented:
 *  - Feeding: each feeding adds trust scaled by how well the food suits the creature and how
 *    readily its temperament warms up.
 *  - Lure: bait placed on the ground draws creatures within range and slowly builds their
 *    trust, best for shy ones.
 *
 * A creature is ready once its trust reaches a threshold that rises with rarity. This class
 * holds only that state and the rules; moving creatures and removing them from the world is
 * the game layer's job. It is generic over the creature type so it needs no 3D objects.
 */

import { GAME_CONFIG } from '@core/constants'
import type { Genome } from '@systems/creatures/genome'
import { dietEfficiency, getRarityTier } from '@systems/economy'
import { FOOD_ITEMS } from '@systems/food'

const CAPTURE = GAME_CONFIG.ECONOMY.CAPTURE
const LURE = CAPTURE.LURE
const MAX_TRUST = 100

export interface WildCreature {
  genome: Genome
}

export interface Point2 {
  x: number
  z: number
}

export interface Lure {
  x: number
  z: number
  foodId: string
  /** Seconds of bait left. */
  remaining: number
}

export interface FeedTrustResult {
  trust: number
  required: number
  gained: number
  ready: boolean
}

export type CaptureCheck =
  | { ok: true; trust: number }
  | {
      ok: false
      reason: 'tooFar' | 'notTrusting'
      trust: number
      required: number
      distance: number
    }

/** Founders this rare are elusive: they only appear at night (special-condition capture). */
export function requiresNight(genome: Genome): boolean {
  return genome.rarity >= CAPTURE.NIGHT_ONLY_MIN_RARITY
}

const clampTrust = (n: number): number => Math.min(MAX_TRUST, Math.max(0, n))

export class CaptureSystem<T extends WildCreature> {
  private readonly getPosition: (creature: T) => Point2
  private trust = new Map<T, number>()
  private lure: Lure | null = null

  constructor(getPosition: (creature: T) => Point2) {
    this.getPosition = getPosition
  }

  // ---- Trust -----------------------------------------------------------------------------

  public getTrust(creature: T): number {
    return this.trust.get(creature) ?? 0
  }

  /** Trust a creature needs before it will enter a crate. Rarer creatures are warier. */
  public getRequiredTrust(creature: T): number {
    const tier = getRarityTier(creature.genome.rarity)
    return Math.min(
      MAX_TRUST,
      CAPTURE.TRUST_REQUIRED_BASE + CAPTURE.TRUST_REQUIRED_PER_TIER * tier.index
    )
  }

  public isReady(creature: T): boolean {
    return this.getTrust(creature) >= this.getRequiredTrust(creature)
  }

  /** Feed a wild creature: builds trust according to the food and its temperament. */
  public feed(creature: T, foodId: string): FeedTrustResult {
    const efficiency = dietEfficiency(creature.genome, foodId)
    const bonus = foodTrustBonus(foodId)
    const gained =
      bonus *
      efficiency *
      CAPTURE.TRUST_FEED_SCALE *
      CAPTURE.TRUST_TEMPERAMENT_MULT[creature.genome.temperament]

    const trust = clampTrust(this.getTrust(creature) + gained)
    this.trust.set(creature, trust)
    return {
      trust,
      required: this.getRequiredTrust(creature),
      gained,
      ready: this.isReady(creature),
    }
  }

  /** Wary wild creatures slowly lose trust unless tended: every trust value drains over time. */
  public decay(dt: number, perSecond: number = CAPTURE.SKITTISH_TRUST_LOSS_PER_SEC): void {
    if (!Number.isFinite(dt) || dt <= 0 || perSecond <= 0) return
    for (const [creature, trust] of this.trust) {
      const next = trust - perSecond * dt
      if (next <= 0) this.trust.delete(creature)
      else this.trust.set(creature, next)
    }
  }

  // ---- Lure ----------------------------------------------------------------------------------

  public getLure(): Readonly<Lure> | null {
    return this.lure
  }

  /** Put down bait. A new lure replaces any earlier one. */
  public placeLure(x: number, z: number, foodId: string): Lure | null {
    if (!Number.isFinite(x) || !Number.isFinite(z) || !foodTrustBonus(foodId)) return null
    this.lure = { x, z, foodId, remaining: LURE.DURATION_S }
    return this.lure
  }

  /**
   * Advance the lure by `dt` seconds. Every creature within range gains trust. Returns those
   * creatures so the game can draw them toward the bait.
   */
  public update(dt: number, creatures: Iterable<T>): T[] {
    const lure = this.lure
    if (!lure || !Number.isFinite(dt) || dt <= 0) return []

    const step = Math.min(dt, lure.remaining)
    const attracted: T[] = []
    for (const creature of creatures) {
      const pos = this.getPosition(creature)
      if (Math.hypot(pos.x - lure.x, pos.z - lure.z) > LURE.RADIUS_M) continue
      attracted.push(creature)

      const gain =
        LURE.TRUST_PER_SEC *
        LURE.TEMPERAMENT_MULT[creature.genome.temperament] *
        dietEfficiency(creature.genome, lure.foodId) *
        step
      this.trust.set(creature, clampTrust(this.getTrust(creature) + gain))
    }

    lure.remaining -= step
    if (lure.remaining <= 1e-9) this.lure = null
    return attracted
  }

  // ---- Capture -------------------------------------------------------------------------------

  /** Could this creature be crated right now by a player standing at `from`? No side effects. */
  public check(creature: T, from: Point2): CaptureCheck {
    const pos = this.getPosition(creature)
    const distance = Math.hypot(pos.x - from.x, pos.z - from.z)
    const trust = this.getTrust(creature)
    const required = this.getRequiredTrust(creature)

    if (distance > CAPTURE.CAPTURE_RANGE_M) {
      return { ok: false, reason: 'tooFar', trust, required, distance }
    }
    if (trust < required) return { ok: false, reason: 'notTrusting', trust, required, distance }
    return { ok: true, trust }
  }

  /** Forget a creature once it has been captured or has left the world. */
  public release(creature: T): void {
    this.trust.delete(creature)
  }

  /** The nearest creature to a point within `maxDistance`, or null. */
  public nearest(creatures: Iterable<T>, from: Point2, maxDistance: number): T | null {
    let best: T | null = null
    let bestDistance = maxDistance
    for (const creature of creatures) {
      const pos = this.getPosition(creature)
      const d = Math.hypot(pos.x - from.x, pos.z - from.z)
      if (d <= bestDistance) {
        best = creature
        bestDistance = d
      }
    }
    return best
  }
}

/** Trust bonus a food gives per feeding, from the food table (0 for an unknown food). */
function foodTrustBonus(foodId: string): number {
  return FOOD_ITEMS[foodId]?.effects.trustBonus ?? 0
}
