import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { CurrencyManager } from '../currency'
import { PenGrid } from '../park'
import { inventoryCapacity, ResourceInventory } from '../production'
import { Roster } from '../roster'
import { AutoSeller } from './AutoSeller'
import { MarketSystem } from './MarketSystem'

const P = GAME_CONFIG.ECONOMY.PRODUCTION
const M = GAME_CONFIG.ECONOMY.MARKET
const CYCLE = GAME_CONFIG.ECONOMY.PRODUCTION_CYCLE_TICKS

function setup(options: { valve?: boolean; silos?: number } = {}) {
  const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 9, maxZ: 9 })
  for (let x = 1; x <= 3; x++) {
    grid.addFence({ x, z: 1, axis: 'h' })
    grid.addFence({ x, z: 4, axis: 'h' })
  }
  for (let z = 1; z <= 3; z++) {
    grid.addFence({ x: 1, z, axis: 'v' })
    grid.addFence({ x: 4, z, axis: 'v' })
  }
  if (options.valve) grid.addProp({ x: 2, z: 2 }, 'valve')
  for (let i = 0; i < (options.silos ?? 0); i++) grid.addProp({ x: 3, z: 2 }, 'silo')

  const inventory = new ResourceInventory()
  inventory.setCapacity(inventoryCapacity(grid))
  const currency = new CurrencyManager(0)
  const market = new MarketSystem(new Roster(), inventory, currency)
  const seller = new AutoSeller(market, inventory, grid)
  return { grid, inventory, currency, market, seller }
}

describe('silos', () => {
  it('cap how much of a resource can be held, and each silo raises the cap', () => {
    const none = setup()
    expect(none.inventory.add('fibre', P.INVENTORY_BASE_CAPACITY + 50)).toBe(
      P.INVENTORY_BASE_CAPACITY
    )
    expect(none.inventory.get('fibre')).toBe(P.INVENTORY_BASE_CAPACITY)

    const two = setup({ silos: 2 })
    const cap = P.INVENTORY_BASE_CAPACITY + 2 * P.SILO_CAPACITY
    expect(two.inventory.add('fibre', cap + 10)).toBe(cap)
    // The cap is per resource.
    expect(two.inventory.add('down', 5)).toBe(5)
  })
})

describe('auto-sell valve', () => {
  it('does nothing until a valve is built', () => {
    const { inventory, seller, currency } = setup()
    inventory.add('fibre', 20)
    expect(seller.isAvailable()).toBe(false)
    expect(seller.tick(CYCLE)).toBe(0)
    expect(inventory.get('fibre')).toBe(20)
    expect(currency.getBalance()).toBe(0)
  })

  it('sells only on production-cycle boundaries', () => {
    const { inventory, seller } = setup({ valve: true })
    inventory.add('fibre', 20)
    expect(seller.tick(CYCLE - 1)).toBe(0)
    expect(seller.tick(CYCLE)).toBeGreaterThan(0)
    expect(inventory.get('fibre')).toBe(0)
  })

  it('stops selling when the price would fall below the floor', () => {
    const { inventory, seller, market } = setup({ valve: true })
    seller.setFloor(0.9)
    inventory.add('fibre', 500)
    seller.tick(CYCLE)
    // 1.0 -> 0.9 takes (1 - 0.9) / drop units; it sells that many, and demand stays at the floor.
    const sold = 500 - inventory.get('fibre')
    expect(sold).toBeGreaterThan(0)
    expect(sold).toBeLessThan(500)
    expect(market.getDemand('fibre')).toBeGreaterThanOrEqual(0.9 - M.DEMAND_DROP_PER_UNIT - 1e-9)
    expect(market.getDemand('fibre')).toBeLessThan(0.9 + 1e-9)
  })

  it('a higher floor sells less than a lower one', () => {
    const run = (floor: number) => {
      const { inventory, seller } = setup({ valve: true })
      seller.setFloor(floor)
      inventory.add('fibre', 500)
      seller.tick(CYCLE)
      return 500 - inventory.get('fibre')
    }
    expect(run(0.95)).toBeLessThan(run(0.5))
  })

  it('keeps the floor in range and in whole steps, and saves it', () => {
    const { seller } = setup()
    seller.setFloor(5)
    expect(seller.getFloor()).toBe(1)
    seller.setFloor(0)
    expect(seller.getFloor()).toBeCloseTo(0.3, 10)
    seller.setFloor(0.72)
    expect(seller.getFloor()).toBeCloseTo(0.7, 10)
    seller.setFloor(Number.NaN)
    expect(seller.getFloor()).toBeCloseTo(0.7, 10)

    const other = setup().seller
    expect(other.restore(JSON.parse(JSON.stringify(seller.serialize())))).toBe(true)
    expect(other.getFloor()).toBeCloseTo(0.7, 10)
    expect(other.restore({ version: 1, floor: 'x' })).toBe(false)
    expect(other.restore(null)).toBe(false)
  })
})
