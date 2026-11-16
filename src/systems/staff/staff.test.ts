import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { CareSystem } from '../care'
import { generateGenome } from '../creatures/genome'
import { CurrencyManager } from '../currency'
import { dietEfficiency } from '../economy'
import { PenGrid } from '../park'
import { ProductionSystem, ResourceInventory } from '../production'
import { Roster } from '../roster'
import { StaffSystem } from './StaffSystem'

const S = GAME_CONFIG.ECONOMY.STAFF
const CYCLE = GAME_CONFIG.ECONOMY.FEED_CYCLE_TICKS

function setup(coins = 1000) {
  const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 9, maxZ: 9 })
  for (let x = 1; x <= 3; x++) {
    grid.addFence({ x, z: 1, axis: 'h' })
    grid.addFence({ x, z: 4, axis: 'h' })
  }
  for (let z = 1; z <= 3; z++) {
    grid.addFence({ x: 1, z, axis: 'v' })
    grid.addFence({ x: 4, z, axis: 'v' })
  }
  const penId = grid.getPens()[0].id
  grid.addProp({ x: 2, z: 2 }, 'trough')
  grid.addProp({ x: 3, z: 2 }, 'bin')

  const roster = new Roster()
  const care = new CareSystem(roster, grid)
  const inventory = new ResourceInventory()
  const production = new ProductionSystem(roster, grid, inventory)
  const wallet = new CurrencyManager(coins)
  const bag = new Map<string, number>()
  const prices: Record<string, number> = { berry: 10, meat: 25, fish: 25, crystal: 40, energy: 30 }
  const staff = new StaffSystem({
    roster,
    grid,
    care,
    production,
    wallet,
    prices: (id) => prices[id],
    bag: {
      getInventory: () => [...bag].map(([id, quantity]) => ({ id, quantity })),
      removeFood: (id, q) => {
        const have = bag.get(id) ?? 0
        if (have < q) return false
        bag.set(id, have - q)
        return true
      },
    },
  })
  const genome = {
    ...generateGenome(1),
    archetype: 'terrestrial' as const,
    size: 'medium' as const,
    temperament: 'shy' as const,
  }
  const creature = roster.add(genome, { penId, stats: { fullness: 100, happiness: 50, trust: 80 } })
  const run = (cycles: number) => {
    for (let i = 1; i <= cycles; i++) {
      care.tick(i * CYCLE)
      production.tick(i * CYCLE)
      staff.tick(i * CYCLE)
    }
  }
  return {
    grid,
    penId,
    roster,
    care,
    production,
    inventory,
    wallet,
    bag,
    staff,
    creature,
    genome,
    run,
  }
}

describe('hiring', () => {
  it('costs the hire fee, one keeper per pen, and refuses without coins or a pen', () => {
    const { staff, penId, wallet } = setup(S.HIRE_COST)
    expect(staff.hire('nope').ok).toBe(false)
    expect(staff.hire(penId).ok).toBe(true)
    expect(wallet.getBalance()).toBe(0)
    expect(staff.hasKeeper(penId)).toBe(true)
    expect(staff.hire(penId).ok).toBe(false)

    const poor = setup(S.HIRE_COST - 1)
    expect(poor.staff.hire(poor.penId).ok).toBe(false)
    expect(poor.wallet.getBalance()).toBe(S.HIRE_COST - 1)
  })

  it('dismissing stops the work and the wage', () => {
    const { staff, penId, wallet, run } = setup()
    staff.hire(penId)
    staff.dismiss(penId)
    const before = wallet.getBalance()
    run(5)
    expect(wallet.getBalance()).toBe(before)
  })
})

describe('a keeper at work', () => {
  it('buys food and keeps the creature fed with no player action, for a wage', () => {
    const { staff, penId, wallet, roster, creature, run } = setup(2000)
    staff.hire(penId)
    const before = wallet.getBalance()
    run(30)
    expect(roster.get(creature.id)?.fullness).toBeGreaterThan(0)
    expect(wallet.getBalance()).toBeLessThan(before - 30 * S.WAGE_PER_CYCLE + 1) // wages plus food
  })

  it('without a keeper the same pen starves', () => {
    const { roster, creature, run } = setup(2000)
    run(30)
    expect(roster.get(creature.id)?.fullness).toBe(0)
  })

  it('uses the player’s food bag before spending coins', () => {
    const { staff, penId, wallet, bag, genome, run, care } = setup(2000)
    const food = (['berry', 'meat', 'fish', 'crystal', 'energy'] as const)
      .map((id) => ({ id, eff: dietEfficiency(genome, id) }))
      .sort((a, b) => b.eff - a.eff)[0].id
    bag.set(food, 40)
    staff.hire(penId)
    const before = wallet.getBalance()
    run(1)
    expect(wallet.getBalance()).toBe(before - S.WAGE_PER_CYCLE) // only the wage was paid
    expect(care.getTroughTotal(penId) + care.getHopperTotal(penId)).toBeGreaterThan(0)
  })

  it('empties the bin into the inventory and cheers the creatures up', () => {
    const { staff, penId, inventory, roster, creature, run, bag, genome } = setup(2000)
    void bag
    void genome
    staff.hire(penId)
    const happy0 = roster.get(creature.id)?.happiness ?? 0
    run(12)
    expect(Object.values(inventory.getAll()).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    expect(roster.get(creature.id)?.happiness).toBeGreaterThan(happy0)
  })

  it('stops working, without harm, when the wage cannot be paid', () => {
    const { staff, penId, wallet, run, roster, creature } = setup(S.HIRE_COST)
    staff.hire(penId)
    expect(wallet.getBalance()).toBe(0)
    run(3)
    expect(staff.isUnpaid(penId)).toBe(true)
    expect(roster.has(creature.id)).toBe(true) // nothing is lost, they just do not work
    wallet.addMoney(500)
    run(1)
    // Cycle numbering restarts in this helper; pay once and the keeper is back at work.
    expect(staff.isUnpaid(penId)).toBe(false)
  })

  it('is let go when the pen is opened up', () => {
    const { staff, penId, grid, run } = setup()
    staff.hire(penId)
    grid.removeFence({ x: 1, z: 1, axis: 'h' })
    run(1)
    expect(staff.hasKeeper(penId)).toBe(false)
  })
})

describe('staff saves', () => {
  it('round-trips and ignores junk', () => {
    const { staff, penId } = setup()
    staff.hire(penId)
    const snap = JSON.parse(JSON.stringify(staff.serialize()))
    const other = setup().staff
    expect(other.restore(snap)).toBe(true)
    expect(other.getKeepers()).toEqual([penId])
    expect(other.restore(null)).toBe(false)
    expect(other.restore({ version: 1, keepers: [5, '', 'pen-9'] })).toBe(true)
    expect(other.getKeepers()).toEqual(['pen-9'])
  })
})
