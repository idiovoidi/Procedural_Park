/**
 * ProductionSystem
 * Turns well-kept creatures into resources (GDD 7.4, 7.5).
 *
 * Once per production cycle every creature in a closed pen that isn't starving yields
 * `outputPerCycle` units of its archetype's resource into the pen's collector bin(s). Bins
 * have a capacity; output beyond it (or in a pen with no bin) is wasted, which is the soft
 * pressure to build bins and to collect. The player empties a bin into their inventory with
 * `collect`.
 */

import { GAME_CONFIG } from '@core/constants'
import { RESOURCE_BY_ARCHETYPE, type ResourceType } from '@systems/economy'
import type { PenGrid } from '@systems/park'
import type { OwnedCreature, Roster } from '@systems/roster'
import { outputPerCycle } from './output'
import { RESOURCE_TYPES, type ResourceAmounts, type ResourceInventory } from './ResourceInventory'

const { PRODUCTION_CYCLE_TICKS } = GAME_CONFIG.ECONOMY
const { BIN_CAPACITY_UNITS } = GAME_CONFIG.ECONOMY.PRODUCTION

export interface ProductionSummary {
  tick: number
  /** Units added to bins this cycle, by resource. */
  stored: ResourceAmounts
  /** Units lost because a bin was full or the pen had no bin. */
  wasted: number
  /** Creatures that produced anything. */
  producers: number
}

export interface ProductionSnapshot {
  version: 1
  bins: Array<{ penId: string; contents: ResourceAmounts }>
}

export class ProductionSystem {
  private readonly roster: Roster
  private readonly grid: PenGrid
  private readonly inventory: ResourceInventory
  /** Contents of each pen's bins; fractional until collected. */
  private bins = new Map<string, ResourceAmounts>()
  private lastSummary: ProductionSummary | null = null

  constructor(roster: Roster, grid: PenGrid, inventory: ResourceInventory) {
    this.roster = roster
    this.grid = grid
    this.inventory = inventory
  }

  // ---- Bins ----------------------------------------------------------------------------

  public getBinCapacity(penId: string): number {
    const pen = this.grid.getPen(penId)
    return pen ? pen.props.bin * BIN_CAPACITY_UNITS : 0
  }

  public getBin(penId: string): Readonly<ResourceAmounts> {
    return this.bins.get(penId) ?? {}
  }

  public getBinTotal(penId: string): number {
    return RESOURCE_TYPES.reduce((sum, type) => sum + (this.getBin(penId)[type] ?? 0), 0)
  }

  /**
   * Move every whole unit from the pen's bins into the player's inventory. Fractions stay in
   * the bin. Returns what was collected.
   */
  public collect(penId: string): ResourceAmounts {
    const bin = this.bins.get(penId)
    const collected: ResourceAmounts = {}
    if (!bin) return collected

    for (const type of RESOURCE_TYPES) {
      const amount = bin[type]
      if (amount === undefined) continue
      const whole = this.inventory.add(type, amount)
      if (whole > 0) {
        collected[type] = whole
        const rest = amount - whole
        if (rest > 1e-9) bin[type] = rest
        else delete bin[type]
      }
    }
    if (Object.keys(bin).length === 0) this.bins.delete(penId)
    return collected
  }

  // ---- The production cycle -------------------------------------------------------------

  /** Call once per economy tick; acts only on production-cycle boundaries. */
  public tick(tick: number): ProductionSummary | null {
    if (tick <= 0 || tick % PRODUCTION_CYCLE_TICKS !== 0) return null

    const summary: ProductionSummary = { tick, stored: {}, wasted: 0, producers: 0 }

    for (const creature of this.roster.list() as OwnedCreature[]) {
      const penId = creature.penId
      if (!penId || !this.grid.getPen(penId)) continue // no closed pen: nothing is produced
      if (creature.fullness <= 0) continue // starving: production stops, no harm done

      const units = outputPerCycle(creature)
      if (units <= 0) continue
      const resource: ResourceType = RESOURCE_BY_ARCHETYPE[creature.genome.archetype]

      const room = Math.max(0, this.getBinCapacity(penId) - this.getBinTotal(penId))
      const accepted = Math.min(units, room)
      summary.wasted += units - accepted
      summary.producers++
      if (accepted <= 0) continue

      const bin = this.bins.get(penId) ?? {}
      bin[resource] = (bin[resource] ?? 0) + accepted
      this.bins.set(penId, bin)
      summary.stored[resource] = (summary.stored[resource] ?? 0) + accepted
    }

    this.lastSummary = summary
    return summary
  }

  public getLastCycle(): Readonly<ProductionSummary> | null {
    return this.lastSummary
  }

  // ---- Save / load --------------------------------------------------------------------------

  public serialize(): ProductionSnapshot {
    return {
      version: 1,
      bins: [...this.bins].map(([penId, contents]) => ({ penId, contents: { ...contents } })),
    }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<ProductionSnapshot> | null
    if (!s || s.version !== 1 || !Array.isArray(s.bins)) return false

    this.bins = new Map()
    for (const entry of s.bins) {
      if (
        typeof entry?.penId !== 'string' ||
        typeof entry.contents !== 'object' ||
        !entry.contents
      ) {
        continue
      }
      const contents: ResourceAmounts = {}
      for (const type of RESOURCE_TYPES) {
        const value = entry.contents[type]
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) contents[type] = value
      }
      if (Object.keys(contents).length > 0) this.bins.set(entry.penId, contents)
    }
    this.lastSummary = null
    return true
  }
}
