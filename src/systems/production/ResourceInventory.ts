/**
 * ResourceInventory
 * The whole units of each resource the player is carrying.
 */

import type { ResourceType } from '@systems/economy'

export const RESOURCE_TYPES: readonly ResourceType[] = [
  'fibre',
  'down',
  'brine',
  'essence',
  'shards',
]

export type ResourceAmounts = Partial<Record<ResourceType, number>>

export interface ResourceInventorySnapshot {
  version: 1
  amounts: ResourceAmounts
}

export class ResourceInventory {
  private amounts = new Map<ResourceType, number>()
  private listeners = new Set<() => void>()

  public get(type: ResourceType): number {
    return this.amounts.get(type) ?? 0
  }

  public getAll(): Readonly<Record<ResourceType, number>> {
    const all = {} as Record<ResourceType, number>
    for (const type of RESOURCE_TYPES) all[type] = this.get(type)
    return all
  }

  public total(): number {
    return RESOURCE_TYPES.reduce((sum, type) => sum + this.get(type), 0)
  }

  /** Add whole units. Fractions are floored; non-positive or invalid amounts are ignored. */
  public add(type: ResourceType, amount: number): number {
    if (!RESOURCE_TYPES.includes(type) || !Number.isFinite(amount)) return 0
    const units = Math.floor(amount)
    if (units <= 0) return 0
    this.amounts.set(type, this.get(type) + units)
    this.notify()
    return units
  }

  /** Take units if the player has enough; otherwise take nothing. */
  public remove(type: ResourceType, amount: number): boolean {
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) return false
    if (this.get(type) < amount) return false
    this.amounts.set(type, this.get(type) - amount)
    this.notify()
    return true
  }

  public onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public serialize(): ResourceInventorySnapshot {
    const amounts: ResourceAmounts = {}
    for (const type of RESOURCE_TYPES) {
      if (this.get(type) > 0) amounts[type] = this.get(type)
    }
    return { version: 1, amounts }
  }

  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<ResourceInventorySnapshot> | null
    if (!s || s.version !== 1 || typeof s.amounts !== 'object' || !s.amounts) return false
    this.amounts = new Map()
    for (const type of RESOURCE_TYPES) {
      const value = (s.amounts as ResourceAmounts)[type]
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        this.amounts.set(type, value)
      }
    }
    this.notify()
    return true
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
