/**
 * CareSystem
 * Feeding, hunger and mood for the creatures the player owns (GDD 5.3, 5.4).
 *
 * Driven by the economy clock: once per feeding cycle every creature loses some fullness,
 * eats from its pen's trough if it is hungry and there is food, and its happiness drifts
 * toward the pen's quality score. Failure is soft by design: a hungry or neglected creature
 * produces less and sulks, but is never harmed, removed or lost.
 *
 * A creature without a closed pen (never assigned, or its pen is currently open) is not
 * looked after: it keeps its assignment but doesn't eat and its mood sinks to a low level
 * until the pen is closed again.
 */

import { GAME_CONFIG } from '@core/constants'
import { dietEfficiency, getFoodPerCycle, rankFoods } from '@systems/economy'
import { FOOD_ITEMS } from '@systems/food'
import { type PenGrid, type PenQualityReport, scorePen } from '@systems/park'
import type { OwnedCreature, Roster } from '@systems/roster'

const { FEED_CYCLE_TICKS } = GAME_CONFIG.ECONOMY
const CARE = GAME_CONFIG.ECONOMY.CARE

/** Servings of each food kind waiting in a pen's troughs. */
export type FoodStock = Record<string, number>

export type Reaction = 'loved' | 'liked' | 'neutral' | 'disliked'

export interface MealResult {
  creatureId: string
  foodId: string
  /** Servings actually eaten. */
  servings: number
  /** 0..1 diet efficiency of the food for this creature. */
  efficiency: number
}

export interface CycleSummary {
  tick: number
  /** Creatures that ate something this cycle. */
  fed: number
  /** Creatures in a pen that wanted to eat but had no food. */
  hungry: number
  /** Creatures without a closed pen. */
  unpenned: number
  meals: MealResult[]
}

export interface HandFeedResult {
  creatureId: string
  foodId: string
  efficiency: number
  reaction: Reaction
}

export interface CareSnapshot {
  version: 1
  troughs: Array<{ penId: string; food: FoodStock }>
  /** Feeder hopper contents. Absent in older saves. */
  hoppers?: Array<{ penId: string; food: FoodStock }>
}

export function reactionFor(efficiency: number): Reaction {
  if (efficiency >= 0.9) return 'loved'
  if (efficiency >= 0.7) return 'liked'
  if (efficiency >= 0.5) return 'neutral'
  return 'disliked'
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

export class CareSystem {
  private readonly roster: Roster
  private readonly grid: PenGrid
  private troughs = new Map<string, FoodStock>()
  private hoppers = new Map<string, FoodStock>()
  private reports = new Map<string, PenQualityReport>()
  private lastSummary: CycleSummary | null = null

  constructor(roster: Roster, grid: PenGrid) {
    this.roster = roster
    this.grid = grid
  }

  // ---- Troughs ------------------------------------------------------------------------

  /** Total capacity of a pen's troughs in servings (0 if it has none or isn't a pen). */
  public getTroughCapacity(penId: string): number {
    const pen = this.grid.getPen(penId)
    return pen ? pen.props.trough * CARE.TROUGH_CAPACITY_SERVINGS : 0
  }

  public getTroughFood(penId: string): Readonly<FoodStock> {
    return this.troughs.get(penId) ?? {}
  }

  public getTroughTotal(penId: string): number {
    return Object.values(this.getTroughFood(penId)).reduce((a, b) => a + b, 0)
  }

  /**
   * Put food in a pen's troughs. Returns how many servings were accepted: the pen needs a
   * trough, the food must exist, and the troughs can only hold so much.
   */
  public addFood(penId: string, foodId: string, servings: number): number {
    if (!FOOD_ITEMS[foodId] || !Number.isFinite(servings) || servings <= 0) return 0
    const room = this.getTroughCapacity(penId) - this.getTroughTotal(penId)
    const accepted = Math.max(0, Math.min(servings, room))
    if (accepted === 0) return 0

    const stock = this.troughs.get(penId) ?? {}
    stock[foodId] = (stock[foodId] ?? 0) + accepted
    this.troughs.set(penId, stock)
    return accepted
  }

  // ---- Feeder hoppers -----------------------------------------------------------------

  /** Total capacity of a pen's feeder hoppers in servings. */
  public getHopperCapacity(penId: string): number {
    const pen = this.grid.getPen(penId)
    return pen ? pen.props.hopper * CARE.HOPPER_CAPACITY_SERVINGS : 0
  }

  public getHopperFood(penId: string): Readonly<FoodStock> {
    return this.hoppers.get(penId) ?? {}
  }

  public getHopperTotal(penId: string): number {
    return Object.values(this.getHopperFood(penId)).reduce((a, b) => a + b, 0)
  }

  /**
   * Stock a pen the way a player would: the troughs first (so the creatures can eat right
   * away), then whatever room is left in the hoppers. Returns the servings accepted.
   */
  public stock(penId: string, foodId: string, servings: number): number {
    if (!FOOD_ITEMS[foodId] || !Number.isFinite(servings) || servings <= 0) return 0
    let accepted = this.addFood(penId, foodId, servings)
    const room = this.getHopperCapacity(penId) - this.getHopperTotal(penId)
    const toHopper = Math.max(0, Math.min(servings - accepted, room))
    if (toHopper > 0) {
      const stock = this.hoppers.get(penId) ?? {}
      stock[foodId] = (stock[foodId] ?? 0) + toHopper
      this.hoppers.set(penId, stock)
      accepted += toHopper
    }
    return accepted
  }

  // ---- Food farms ---------------------------------------------------------------------

  /**
   * The food a pen's farms grow: the farmable staple its residents digest best (summed over
   * everyone living there), or null if the pen has no farm, nobody lives there, or no resident
   * eats a farmable food well enough.
   */
  public getFarmFood(penId: string): string | null {
    const pen = this.grid.getPen(penId)
    if (!pen || pen.props.farm === 0) return null
    const residents = this.roster.getByPen(penId)
    let best: { foodId: string; score: number } | null = null
    for (const foodId of CARE.FARM.FOODS) {
      let score = 0
      for (const c of residents) {
        const eff = dietEfficiency(c.genome, foodId)
        if (eff >= CARE.FARM.MIN_EFFICIENCY) score += eff
      }
      if (score > 0 && (!best || score > best.score)) best = { foodId, score }
    }
    return best?.foodId ?? null
  }

  /** Servings the pen's farms grow per feeding cycle. */
  public getFarmOutput(penId: string): number {
    const pen = this.grid.getPen(penId)
    return pen && this.getFarmFood(penId) ? pen.props.farm * CARE.FARM.SERVINGS_PER_CYCLE : 0
  }

  /** Move food from a pen's hoppers into its troughs, as far as the troughs have room. */
  private refillFromHopper(penId: string): void {
    const hopper = this.hoppers.get(penId)
    if (!hopper) return
    for (const foodId of Object.keys(hopper)) {
      const moved = this.addFood(penId, foodId, hopper[foodId])
      if (moved <= 0) continue
      hopper[foodId] -= moved
      if (hopper[foodId] <= 1e-9) delete hopper[foodId]
    }
    if (Object.keys(hopper).length === 0) this.hoppers.delete(penId)
  }

  // ---- The care cycle ---------------------------------------------------------------------

  /**
   * Call once per economy tick. Does work only on feeding-cycle boundaries, so it is safe to
   * hook straight onto `SimClock.onTick`. Returns the summary on a cycle tick, else null.
   */
  public tick(tick: number): CycleSummary | null {
    if (tick <= 0 || tick % FEED_CYCLE_TICKS !== 0) return null

    const summary: CycleSummary = { tick, fed: 0, hungry: 0, unpenned: 0, meals: [] }
    this.reports.clear()

    // Farms grow food, then hoppers top the troughs up, all before anyone eats
    for (const pen of this.grid.getPens()) {
      const food = this.getFarmFood(pen.id)
      if (food) this.stock(pen.id, food, this.getFarmOutput(pen.id))
    }
    for (const penId of [...this.hoppers.keys()]) this.refillFromHopper(penId)

    // Score each pen once, with everyone who lives there.
    const byPen = new Map<string, OwnedCreature[]>()
    for (const creature of this.roster.list() as OwnedCreature[]) {
      if (creature.penId && this.grid.getPen(creature.penId)) {
        const list = byPen.get(creature.penId) ?? []
        list.push(creature)
        byPen.set(creature.penId, list)
      }
    }
    const quality = new Map<string, number>()
    for (const [penId, members] of byPen) {
      const pen = this.grid.getPen(penId)
      if (!pen) continue
      const report = scorePen(
        pen as Parameters<typeof scorePen>[0],
        members.map((c) => ({ id: c.id, genome: c.genome }))
      )
      this.reports.set(penId, report)
      for (const o of report.occupants) quality.set(o.creatureId, o.quality)
    }

    for (const creature of this.roster.list() as OwnedCreature[]) {
      const penned = quality.has(creature.id)
      if (!penned) summary.unpenned++

      // 1. Everyone gets hungrier.
      this.roster.adjustStats(creature.id, { fullness: -CARE.FULLNESS_DECAY_PER_CYCLE })

      // 2. Penned creatures eat if they're hungry and there's food.
      let mealHappiness = 0
      if (penned && creature.fullness <= CARE.EAT_AT_OR_BELOW) {
        const meal = this.eat(creature)
        if (meal) {
          summary.fed++
          summary.meals.push(meal)
          const food = FOOD_ITEMS[meal.foodId]
          mealHappiness = food.effects.happiness * meal.efficiency * CARE.MEAL_HAPPINESS_SCALE
          this.roster.adjustStats(creature.id, {
            trust: food.effects.trustBonus * meal.efficiency * CARE.MEAL_TRUST_SCALE,
          })
        } else {
          summary.hungry++
        }
      }

      // 3. Mood drifts toward how well the pen suits it (and sinks if it is going hungry).
      const target = this.happinessTarget(creature, quality.get(creature.id))
      const drift = clamp(
        target - creature.happiness,
        -CARE.HAPPINESS_DRIFT_PER_CYCLE,
        CARE.HAPPINESS_DRIFT_PER_CYCLE
      )
      this.roster.adjustStats(creature.id, { happiness: drift + mealHappiness })
    }

    this.lastSummary = summary
    return summary
  }

  /** Eat the best food available from the pen's trough. Returns null if nothing was eaten. */
  private eat(creature: Readonly<OwnedCreature>): MealResult | null {
    const penId = creature.penId as string
    const stock = this.troughs.get(penId)
    if (!stock) return null

    // Best match among the foods actually in the trough.
    const best = rankFoods(creature.genome).find((f) => (stock[f.foodId] ?? 0) > 0)
    if (!best || best.efficiency <= 0) return null

    const needed = getFoodPerCycle(creature.genome, best.efficiency)
    const eaten = Math.min(needed, stock[best.foodId])
    stock[best.foodId] -= eaten
    if (stock[best.foodId] <= 1e-9) delete stock[best.foodId]

    // A partial meal fills proportionally less.
    this.roster.adjustStats(creature.id, { fullness: CARE.FULLNESS_PER_MEAL * (eaten / needed) })
    return {
      creatureId: creature.id,
      foodId: best.foodId,
      servings: eaten,
      efficiency: best.efficiency,
    }
  }

  private happinessTarget(creature: Readonly<OwnedCreature>, quality: number | undefined): number {
    if (quality === undefined) return CARE.UNPENNED_HAPPINESS_TARGET
    // Inbred creatures are never quite as content as their pen deserves
    const inbred =
      1 - creature.inbreeding * GAME_CONFIG.ECONOMY.BREEDING.INBREEDING.HAPPINESS_PENALTY
    const target = quality * 100 * Math.max(0, inbred)
    return creature.fullness < CARE.HUNGRY_BELOW ? target / 2 : target
  }

  // ---- Hand feeding ---------------------------------------------------------------------

  /**
   * Feed one owned creature directly. The caller removes the food from the player's
   * inventory. Returns null for an unknown creature or food.
   */
  public feedByHand(creatureId: string, foodId: string): HandFeedResult | null {
    const creature = this.roster.get(creatureId)
    const food = FOOD_ITEMS[foodId]
    if (!creature || !food) return null

    const efficiency = dietEfficiency(creature.genome, foodId)
    this.roster.adjustStats(creatureId, {
      fullness: CARE.FULLNESS_PER_MEAL * efficiency,
      happiness: food.effects.happiness * efficiency,
      trust: food.effects.trustBonus * efficiency,
    })
    return { creatureId, foodId, efficiency, reaction: reactionFor(efficiency) }
  }

  // ---- Reports ----------------------------------------------------------------------------

  /** Most recent quality report for a pen (refreshed each cycle). */
  public getPenReport(penId: string): Readonly<PenQualityReport> | undefined {
    return this.reports.get(penId)
  }

  /** Most recent 0..1 pen quality for a creature, or null if it had no closed pen. */
  public getCreatureQuality(creatureId: string): number | null {
    for (const report of this.reports.values()) {
      const found = report.occupants.find((o) => o.creatureId === creatureId)
      if (found) return found.quality
    }
    return null
  }

  public getLastCycle(): Readonly<CycleSummary> | null {
    return this.lastSummary
  }

  // ---- Save / load --------------------------------------------------------------------------

  public serialize(): CareSnapshot {
    return {
      version: 1,
      // Troughs that have been eaten empty carry no information, so they are not saved.
      troughs: [...this.troughs]
        .filter(([, food]) => Object.keys(food).length > 0)
        .map(([penId, food]) => ({ penId, food: { ...food } })),
      hoppers: [...this.hoppers]
        .filter(([, food]) => Object.keys(food).length > 0)
        .map(([penId, food]) => ({ penId, food: { ...food } })),
    }
  }

  /** Restore trough contents. Unknown foods and bad amounts are skipped; returns false if unusable. */
  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<CareSnapshot> | null
    if (!s || s.version !== 1 || !Array.isArray(s.troughs)) return false

    this.troughs = new Map()
    for (const entry of s.troughs) {
      if (typeof entry?.penId !== 'string' || typeof entry.food !== 'object' || !entry.food)
        continue
      const food: FoodStock = {}
      for (const [id, amount] of Object.entries(entry.food)) {
        if (FOOD_ITEMS[id] && typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
          food[id] = amount
        }
      }
      if (Object.keys(food).length > 0) this.troughs.set(entry.penId, food)
    }
    this.hoppers = new Map()
    for (const entry of Array.isArray(s.hoppers) ? s.hoppers : []) {
      if (typeof entry?.penId !== 'string' || typeof entry.food !== 'object' || !entry.food)
        continue
      const food: FoodStock = {}
      for (const [id, amount] of Object.entries(entry.food)) {
        if (FOOD_ITEMS[id] && typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
          food[id] = amount
        }
      }
      if (Object.keys(food).length > 0) this.hoppers.set(entry.penId, food)
    }
    this.reports.clear()
    this.lastSummary = null
    return true
  }
}
