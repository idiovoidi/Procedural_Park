/**
 * Balance bot
 * A sensible, not clever, player. Every minute of game time it collects and sells output,
 * restocks troughs with the cheapest adequate food, and, when it can afford to, captures the
 * founder with the best payback, builds pens and a den, and breeds. It uses only the real
 * rules (build costs and limits, trust from feeding, crates, pairing rules, market prices),
 * so what it earns is what a player doing the obvious thing would earn.
 */

import { GAME_CONFIG } from '@core/constants'
import { CaptureSystem, findPenFor, type WildCreature } from '@systems/capture'
import type { Genome } from '@systems/creatures/genome'
import { CURRENCY_REWARDS } from '@systems/currency/currency-rewards'
import { dietEfficiency, getFoodPerCycle, RESOURCE_BY_ARCHETYPE } from '@systems/economy'
import { STORE_ITEMS } from '@systems/food/store-data'
import { creatureValue } from '@systems/market'
import { type Cell, cellToWorld, type Edge, scorePen } from '@systems/park'
import { outputPerCycle } from '@systems/production'
import type { BalanceWorld } from './world'

const E = GAME_CONFIG.ECONOMY
const PRICE: Record<string, number> = Object.fromEntries(STORE_ITEMS.map((i) => [i.id, i.price]))
const CELL = GAME_CONFIG.PARK.CELL_SIZE_M

export interface BotPolicy {
  /** Minutes of food money kept in reserve before spending on anything else. */
  reserveMinutes: number
  /** `all` sells everything each minute; `drip` holds back when prices are depressed. */
  selling: 'all' | 'drip'
  /** With `drip`, stop selling a resource once its unit price falls below this share of base. */
  dripFloor: number
  /** Whether the bot builds dens and breeds. */
  breeds: boolean
  /** Whether the bot delivers matching creatures to the Contract Board. */
  contracts: boolean
  /** Game seconds a feeding takes (the real game enforces a 5 s cooldown per creature). */
  secondsPerFeed: number
  /** Edge length of the pens the bot builds, in cells. */
  penSize: number
}

export const DEFAULT_POLICY: BotPolicy = {
  reserveMinutes: 5,
  selling: 'all',
  dripFloor: 0.6,
  breeds: true,
  contracts: true,
  secondsPerFeed: 5,
  penSize: 4,
}

interface Wild extends WildCreature {
  index: number
}

export class Bot {
  private readonly w: BalanceWorld
  private readonly policy: BotPolicy
  private readonly capture = new CaptureSystem<Wild>(() => ({ x: 0, z: 0 }))
  private captured = new Set<number>()
  private penCount = 0
  /** Counters the report reads. */
  public readonly actions = { captures: 0, pens: 0, dens: 0, breedings: 0, feeds: 0 }

  constructor(world: BalanceWorld, policy: Partial<BotPolicy> = {}) {
    this.w = world
    this.policy = { ...DEFAULT_POLICY, ...policy }
  }

  /** One minute of play. Call after advancing the clock by a minute. */
  public step(): void {
    this.collectAndSell()
    if (this.policy.contracts) this.fulfilContracts()
    this.cull()
    this.restock()
    if (this.policy.breeds) this.maybeBreed()
    this.expand()
  }

  /**
   * Deliver creatures to the Contract Board, cheapest match first, but never the two rarest
   * adults (they are the breeding line the bot is climbing with).
   */
  private fulfilContracts(): void {
    const { roster, contracts } = this.w
    for (const contract of contracts.getContracts()) {
      const keep = new Set(
        roster
          .list()
          .filter((c) => c.ageStage === 'adult')
          .sort((a, b) => b.genome.rarity - a.genome.rarity)
          .slice(0, 2)
          .map((c) => c.id)
      )
      const pick = contracts.getCandidates(contract.id).find((c) => !keep.has(c.id))
      if (pick) contracts.fulfil(contract.id, pick.id)
    }
  }

  /** Sell adults that lose money (saturated markets, poor pens): keeping them only costs food. */
  private cull(): void {
    const { roster, grid, market } = this.w
    for (const c of roster.list()) {
      if (c.ageStage !== 'adult' || !c.penId || !grid.getPen(c.penId)) continue
      const units = outputPerCycle({
        genome: c.genome,
        happiness: c.happiness,
        ageStage: c.ageStage,
      })
      const income = units * market.getUnitPrice(RESOURCE_BY_ARCHETYPE[c.genome.archetype])
      const food = this.foodFor(c.genome)
      const cost = food ? food.servingsPerCycle * (PRICE[food.foodId] ?? 0) : 0
      if (income < cost * 0.9) market.sellCreature(c.id)
    }
  }

  // ---- Money helpers ------------------------------------------------------------------------

  private coins(): number {
    return this.w.currency.getBalance()
  }

  /** Coins kept back so creatures are never left without food. */
  private reserve(): number {
    let perMinute = 0
    for (const c of this.w.roster.list()) {
      if (!c.penId) continue
      const best = this.cheapestFood([c.genome])
      if (best) perMinute += best.costPerCycle
    }
    return Math.ceil(perMinute * this.policy.reserveMinutes)
  }

  private spend(amount: number, reason: string): boolean {
    return this.w.currency.removeMoney(amount, reason)
  }

  // ---- Selling ------------------------------------------------------------------------------------

  private collectAndSell(): void {
    const { grid, production, resources, market } = this.w
    for (const pen of grid.getPens()) production.collect(pen.id)

    // Never sit on stock while short of food money: starvation would stop all output.
    if (this.policy.selling === 'all' || this.coins() < this.reserve()) {
      market.sellAllResources()
      return
    }
    // Drip: sell only while the price is still decent.
    for (const type of Object.keys(resources.getAll()) as Array<
      keyof ReturnType<typeof resources.getAll>
    >) {
      let units = resources.get(type)
      while (units > 0) {
        const base = E.MARKET.BASE_UNIT_PRICE[type]
        if (market.getUnitPrice(type) < base * this.policy.dripFloor) break
        const batch = Math.min(units, 5)
        if (!market.sellResource(type, batch)) break
        units -= batch
      }
    }
  }

  // ---- Food ------------------------------------------------------------------------------------------

  /** The store food that feeds these creatures adequately at the lowest cost per cycle. */
  private cheapestFood(genomes: Genome[]): { foodId: string; costPerCycle: number } | null {
    let best: { foodId: string; costPerCycle: number } | null = null
    for (const item of STORE_ITEMS) {
      let cost = 0
      let adequate = true
      for (const g of genomes) {
        const eff = dietEfficiency(g, item.id)
        if (eff < 0.25) adequate = false
        cost += getFoodPerCycle(g, eff) * item.price
      }
      if (adequate && (!best || cost < best.costPerCycle))
        best = { foodId: item.id, costPerCycle: cost }
    }
    return best
  }

  /** The food that feeds one creature at the lowest cost per cycle (falling back to its best match). */
  private foodFor(genome: Genome): { foodId: string; servingsPerCycle: number } | null {
    const options = STORE_ITEMS.map((item) => {
      const eff = dietEfficiency(genome, item.id)
      const servings = getFoodPerCycle(genome, eff)
      return { foodId: item.id, eff, servings, cost: servings * item.price }
    })
    const adequate = options.filter((o) => o.eff >= 0.25).sort((x, y) => x.cost - y.cost)
    const pick = adequate[0] ?? options.sort((x, y) => y.eff - x.eff)[0]
    return pick ? { foodId: pick.foodId, servingsPerCycle: pick.servings } : null
  }

  /** Keep every pen's troughs stocked with the right food for each resident. */
  private restock(): void {
    const { grid, roster, care, food } = this.w
    for (const pen of grid.getPens()) {
      const residents = roster.getByPen(pen.id)
      if (residents.length === 0 || pen.props.trough === 0) continue

      // How many servings of each food the residents eat per cycle.
      const perCycle = new Map<string, number>()
      for (const c of residents) {
        const f = this.foodFor(c.genome)
        if (f) perCycle.set(f.foodId, (perCycle.get(f.foodId) ?? 0) + f.servingsPerCycle)
      }
      const total = [...perCycle.values()].reduce((a, b) => a + b, 0)

      // A trough holds 20 servings: add more when the residents need more than half a trough a cycle.
      if (total * 2 > care.getTroughCapacity(pen.id) && this.coins() > E.BUILD.COSTS.trough + 30) {
        const free = pen.cells.find((c) => this.w.grid.getProps(c).length === 0)
        if (free) {
          const at = cellToWorld(free)
          this.place('trough', at.x, at.z)
        }
      }

      // Aim for several cycles of each food, scaled down if the troughs cannot hold it all.
      const capacity = care.getTroughCapacity(pen.id)
      const scale = Math.min(1, capacity / Math.max(1, total * 8))
      for (const [foodId, servings] of perCycle) {
        const target = servings * 8 * scale
        const have = care.getTroughFood(pen.id)[foodId] ?? 0
        let need = Math.ceil(target - have)
        if (need <= 0) continue

        const carried = food.getInventory().find((i) => i.id === foodId)?.quantity ?? 0
        const fromBag = Math.min(carried, need)
        if (fromBag > 0 && food.removeFood(foodId, fromBag)) {
          need -= care.addFood(pen.id, foodId, fromBag)
        }
        const price = PRICE[foodId]
        const affordable = Math.min(need, Math.floor(this.coins() / price))
        if (affordable > 0 && this.spend(affordable * price, 'Food')) {
          care.addFood(pen.id, foodId, affordable)
        }
      }
    }
  }

  // ---- Building --------------------------------------------------------------------------------------

  private edgePoint(e: Edge): [number, number] {
    return e.axis === 'h'
      ? [(e.x + 0.5) * CELL, e.z * CELL + CELL * 0.05]
      : [e.x * CELL + CELL * 0.05, (e.z + 0.5) * CELL]
  }

  private place(
    tool: Parameters<BalanceWorld['build']['setTool']>[0],
    x: number,
    z: number
  ): boolean {
    this.w.build.setTool(tool)
    return this.w.build.commit(x, z).ok
  }

  /** Where the next pen goes: 4x4 blocks on a 3x3 layout inside the 12x12 build zone. */
  private nextPenOrigin(): Cell | null {
    const b = this.w.grid.getBounds()
    const step = this.policy.penSize
    const slots: Cell[] = []
    for (let z = b.minZ; z + step - 1 <= b.maxZ; z += step) {
      for (let x = b.minX; x + step - 1 <= b.maxX; x += step) slots.push({ x, z })
    }
    return slots[this.penCount] ?? null
  }

  private penCost(): number {
    const n = this.policy.penSize
    return 4 * n * GAME_CONFIG.ECONOMY.BUILD.COSTS.fence + E.BUILD.COSTS.trough + E.BUILD.COSTS.bin
  }

  private buildPen(): boolean {
    const origin = this.nextPenOrigin()
    if (!origin) return false
    const n = this.policy.penSize
    for (let i = 0; i < n; i++) {
      this.place('fence', ...this.edgePoint({ x: origin.x + i, z: origin.z, axis: 'h' }))
      this.place('fence', ...this.edgePoint({ x: origin.x + i, z: origin.z + n, axis: 'h' }))
      this.place('fence', ...this.edgePoint({ x: origin.x, z: origin.z + i, axis: 'v' }))
      this.place('fence', ...this.edgePoint({ x: origin.x + n, z: origin.z + i, axis: 'v' }))
    }
    const centre = cellToWorld({ x: origin.x + 1, z: origin.z + 1 })
    const corner = cellToWorld({ x: origin.x + 2, z: origin.z + 1 })
    const trough = this.place('trough', centre.x, centre.z)
    const bin = this.place('bin', corner.x, corner.z)
    this.penCount++
    this.actions.pens++
    return trough && bin
  }

  private maybeBuildDen(): void {
    const { grid, roster, build } = this.w
    if (this.coins() < E.BUILD.COSTS.den + this.reserve() + 40) return
    for (const pen of grid.getPens()) {
      if (pen.props.den > 0 || pen.props.trough === 0) continue
      const adults = roster.getByPen(pen.id).filter((c) => c.ageStage === 'adult')
      if (adults.length < 2) continue
      // Put it on a free cell of the pen.
      const free = pen.cells.find((c) => grid.getProps(c).length === 0)
      if (!free) continue
      const p = cellToWorld(free)
      build.setTool('den')
      if (build.commit(p.x, p.z).ok) {
        this.actions.dens++
        return
      }
    }
  }

  // ---- Capture ----------------------------------------------------------------------------------------

  /** Feeds and coins needed to capture a wild creature, without doing it. */
  private planCapture(genome: Genome): { feeds: number; foodId: string; netCost: number } | null {
    const ranked = STORE_ITEMS.map((i) => ({
      id: i.id,
      eff: dietEfficiency(genome, i.id),
      price: i.price,
    }))
      .filter((f) => f.eff > 0.25)
      .sort((a, b) => b.eff - a.eff)
    const food = ranked[0]
    if (!food) return null

    const probe = new CaptureSystem<Wild>(() => ({ x: 0, z: 0 }))
    const creature: Wild = { genome, index: -1 }
    let feeds = 0
    while (!probe.isReady(creature) && feeds < 60) {
      probe.feed(creature, food.id)
      feeds++
    }
    if (!probe.isReady(creature)) return null

    const loved = food.eff >= 0.9
    const rewardPerFeed =
      CURRENCY_REWARDS.FEED_CREATURE + (loved ? CURRENCY_REWARDS.CREATURE_LOVED_FOOD : 0)
    // Food already in the bag is free; the rest is bought. Feeding pays a small reward back.
    const inBag = this.w.food.getInventory().find((i) => i.id === food.id)?.quantity ?? 0
    const bought = Math.max(0, feeds - inBag)
    const netCost = bought * food.price + E.CAPTURE.CRATE_COST - feeds * rewardPerFeed
    return { feeds, foodId: food.id, netCost }
  }

  /** Estimated coins per minute a creature would earn in the pen it would get. */
  private profitPerMinute(genome: Genome): number {
    const { grid, roster, market } = this.w
    let quality = 0.8 // before the first pen exists, assume an ordinary pen
    if (grid.getPens().length > 0) {
      const penId = findPenFor(grid, roster, genome)
      const pen = penId ? grid.getPen(penId) : undefined
      if (!penId || !pen) return Number.NEGATIVE_INFINITY
      const residents = roster.getByPen(penId).map((c) => ({ id: c.id, genome: c.genome }))
      const report = scorePen(pen, [...residents, { id: '__new__', genome }])
      quality = report.occupants.find((o) => o.creatureId === '__new__')?.quality ?? 0
    }
    const units = outputPerCycle({ genome, happiness: quality * 100, ageStage: 'adult' })
    const price = market.getUnitPrice(RESOURCE_BY_ARCHETYPE[genome.archetype])
    const food = this.cheapestFood([genome])
    return units * price - (food?.costPerCycle ?? 99)
  }

  /** `noRoom` means creatures worth capturing exist but no pen would take any of them. */
  private captureBest(): 'captured' | 'none' | 'noRoom' {
    const { wild, roster, food, currency } = this.w
    let best: {
      index: number
      payback: number
      plan: NonNullable<ReturnType<Bot['planCapture']>>
    } | null = null
    let anyNeedsRoom = false

    wild.forEach((genome, index) => {
      if (this.captured.has(index)) return
      const profit = this.profitPerMinute(genome)
      if (profit === Number.NEGATIVE_INFINITY) {
        anyNeedsRoom = true // it would pay, but there is no pen it could live in
        return
      }
      if (!(profit > 0)) return
      const plan = this.planCapture(genome)
      if (!plan) return
      if (plan.netCost > this.coins() - this.reserve()) return
      const payback = Math.max(plan.netCost, 1) / profit
      if (!best || payback < best.payback) best = { index, payback, plan }
    })
    if (!best) return anyNeedsRoom ? 'noRoom' : 'none'

    const { index, plan } = best as {
      index: number
      plan: NonNullable<ReturnType<Bot['planCapture']>>
    }
    const genome = wild[index]
    const creature: Wild = { genome, index }
    const price = PRICE[plan.foodId]
    const loved = dietEfficiency(genome, plan.foodId) >= 0.9
    const reward =
      CURRENCY_REWARDS.FEED_CREATURE + (loved ? CURRENCY_REWARDS.CREATURE_LOVED_FOOD : 0)

    // Feed it until it trusts the bot, paying for food not already carried, earning the rewards.
    while (!this.capture.isReady(creature)) {
      const bagged = food.getInventory().find((i) => i.id === plan.foodId)?.quantity ?? 0
      if (bagged > 0) food.removeFood(plan.foodId, 1)
      else if (!this.spend(price, 'Food')) return 'none'
      this.capture.feed(creature, plan.foodId)
      currency.addMoney(reward, `Fed ${index}`)
      this.actions.feeds++
      this.w.advance(this.policy.secondsPerFeed)
    }

    if (!this.spend(E.CAPTURE.CRATE_COST, 'Transport crate')) return 'none'
    const owned = roster.add(genome, { stats: { trust: 70 } })
    this.capture.release(creature)
    this.captured.add(index)
    const penId = findPenFor(this.w.grid, roster, genome)
    if (penId) roster.assignToPen(owned.id, penId)
    this.actions.captures++
    return 'captured'
  }

  private expand(): void {
    this.house()

    // Opening: the starting bag of food pays for the first capture through feeding rewards, so
    // capture first, then build the pen.
    if (this.w.grid.getPens().length === 0) {
      this.captureBest()
      if (this.coins() >= this.penCost()) this.buildPen()
      this.house()
      return
    }

    // Several actions per minute are possible when coins allow.
    for (let guard = 0; guard < 4; guard++) {
      const result = this.captureBest()
      if (result === 'captured') continue
      // Nothing fits anywhere: build another pen if it can be paid for with a reserve left.
      if (
        result === 'noRoom' &&
        this.coins() >= this.penCost() + this.reserve() + E.CAPTURE.CRATE_COST &&
        this.buildPen()
      ) {
        continue
      }
      break
    }
    this.house()
    if (this.policy.breeds) this.maybeBuildDen()
  }

  /** Put any creature that has no pen into the best one with room; sell those that cannot be housed. */
  private house(): void {
    const { roster, grid, market } = this.w
    for (const c of roster.getUnassigned()) {
      const penId = findPenFor(grid, roster, c.genome)
      if (penId) roster.assignToPen(c.id, penId)
      else if (c.ageStage !== 'hatchling' || grid.getPens().length >= this.maxPens()) {
        // Unhoused creatures are not fed and earn nothing, so sell them.
        market.sellCreature(c.id)
      }
    }
  }

  private maxPens(): number {
    return this.nextPenOrigin() === null ? this.penCount : Number.POSITIVE_INFINITY
  }

  private freeArea(penId: string): number {
    const pen = this.w.grid.getPen(penId)
    if (!pen) return 0
    const used = this.w.roster
      .getByPen(penId)
      .reduce((s, c) => s + E.HABITAT_AREA_M2[c.genome.size], 0)
    return pen.areaM2 - used
  }

  // ---- Breeding ----------------------------------------------------------------------------------------

  private maybeBreed(): void {
    const { breeding, roster, grid } = this.w
    // No point hatching creatures that cannot be housed or fed.
    if (!grid.getPens().some((p) => this.freeArea(p.id) >= E.HABITAT_AREA_M2.medium)) return
    for (const penId of breeding.getDenPens()) {
      if (breeding.getDenStatus(penId).free === 0) continue
      const pen = grid.getPen(penId)
      if (!pen) continue

      const residents = roster.getByPen(penId)
      let best: { a: string; b: string; value: number } | null = null
      for (let i = 0; i < residents.length; i++) {
        for (let j = i + 1; j < residents.length; j++) {
          const a = residents[i]
          const b = residents[j]
          if (breeding.check(penId, a.id, b.id).length > 0) continue
          const value = a.genome.rarity + b.genome.rarity + creatureValue(a) / 1e6
          if (!best || value > best.value) best = { a: a.id, b: b.id, value }
        }
      }
      if (!best) continue
      const cost = breeding.getCost(best.a, best.b) ?? 0
      if (this.coins() < cost + this.reserve()) continue
      if (breeding.start(penId, best.a, best.b).ok) this.actions.breedings++
    }
  }
}
