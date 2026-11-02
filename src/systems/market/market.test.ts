import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import type { Genome } from '../creatures/genome'
import { generateGenome } from '../creatures/genome'
import { CurrencyManager } from '../currency'
import { ResourceInventory } from '../production'
import { Roster } from '../roster'
import { countOptionalParts, creatureValue, MarketSystem } from './MarketSystem'

const M = GAME_CONFIG.ECONOMY.MARKET

const base = generateGenome(1)
const plain = (overrides: Partial<Genome> = {}): Genome => ({
  ...base,
  archetype: 'terrestrial',
  size: 'medium',
  rarity: 0.1,
  wings: { ...base.wings, pairs: 0 },
  tails: { ...base.tails, count: 0 },
  antennae: { ...base.antennae, count: 0 },
  ears: { ...base.ears, count: 0 },
  horns: { ...base.horns, count: 0 },
  spines: { ...base.spines, count: 0 },
  furTufts: false,
  scales: false,
  ...overrides,
})

function setup(startingCoins = 0) {
  const roster = new Roster()
  const inventory = new ResourceInventory()
  const currency = new CurrencyManager(startingCoins)
  const market = new MarketSystem(roster, inventory, currency)
  return { roster, inventory, currency, market }
}

describe('resource pricing', () => {
  it('pays the base price per unit at full demand for the first unit', () => {
    const { market } = setup()
    for (const type of ['fibre', 'down', 'brine', 'essence', 'shards'] as const) {
      expect(market.getUnitPrice(type)).toBe(M.BASE_UNIT_PRICE[type])
    }
  })

  it('quotes a sale that gets worse with every unit sold', () => {
    const { market } = setup()
    const one = market.quoteResource('fibre', 1)
    const ten = market.quoteResource('fibre', 10)
    expect(one.coins).toBe(4)
    // 4 coins at demand 1.00, 0.99 ... 0.91 -> sum = 4 * (10 - 0.01 * 45) = 38.2
    expect(ten.coins).toBe(Math.floor(4 * (10 - M.DEMAND_DROP_PER_UNIT * 45)))
    expect(ten.coins).toBeLessThan(10 * one.coins)
    expect(ten.demandAfter).toBeCloseTo(1 - 10 * M.DEMAND_DROP_PER_UNIT, 10)
  })

  it('never lets demand fall below the floor', () => {
    const { market } = setup()
    const flood = market.quoteResource('shards', 500)
    expect(flood.demandAfter).toBe(M.MIN_DEMAND)
    // The last units sell at the floor price.
    const floorPrice = M.BASE_UNIT_PRICE.shards * M.MIN_DEMAND
    expect(flood.coins).toBeGreaterThan(300 * floorPrice)
  })

  it('treats bad unit counts as zero', () => {
    const { market } = setup()
    for (const units of [0, -3, 1.5, Number.NaN]) {
      expect(market.quoteResource('fibre', units)).toMatchObject({ units: 0, coins: 0 })
    }
  })
})

describe('selling resources', () => {
  it('moves units out of the inventory and coins into the purse', () => {
    const { market, inventory, currency } = setup(10)
    inventory.add('fibre', 8)
    const quote = market.quoteResource('fibre', 5)

    const sold = market.sellResource('fibre', 5)
    expect(sold).toEqual(quote)
    expect(inventory.get('fibre')).toBe(3)
    expect(currency.getBalance()).toBe(10 + quote.coins)
  })

  it('lowers the price of the next sale, as quoted', () => {
    const { market, inventory } = setup()
    inventory.add('fibre', 100)
    market.sellResource('fibre', 20)
    expect(market.getDemand('fibre')).toBeCloseTo(1 - 20 * M.DEMAND_DROP_PER_UNIT, 10)
    expect(market.getUnitPrice('fibre')).toBeLessThan(M.BASE_UNIT_PRICE.fibre)
  })

  it('keeps each resource’s demand separate', () => {
    const { market, inventory } = setup()
    inventory.add('fibre', 50)
    market.sellResource('fibre', 50)
    expect(market.getDemand('down')).toBe(1)
    expect(market.getUnitPrice('down')).toBe(M.BASE_UNIT_PRICE.down)
  })

  it('refuses to sell more than the player has, or invalid amounts', () => {
    const { market, inventory, currency } = setup(5)
    inventory.add('fibre', 3)
    expect(market.sellResource('fibre', 4)).toBeNull()
    expect(market.sellResource('fibre', 0)).toBeNull()
    expect(market.sellResource('fibre', -1)).toBeNull()
    expect(market.sellResource('fibre', 1.5)).toBeNull()
    expect(market.sellResource('gold' as never, 1)).toBeNull()
    expect(inventory.get('fibre')).toBe(3)
    expect(currency.getBalance()).toBe(5)
  })

  it('sells everything carried in one go', () => {
    const { market, inventory, currency } = setup()
    inventory.add('fibre', 10)
    inventory.add('shards', 4)
    const sold = market.sellAllResources()
    expect(sold.map((q) => q.type)).toEqual(['fibre', 'shards'])
    expect(inventory.total()).toBe(0)
    expect(currency.getBalance()).toBe(sold.reduce((sum, q) => sum + q.coins, 0))
    expect(market.sellAllResources()).toEqual([])
  })

  it('notifies listeners about sales', () => {
    const { market, inventory } = setup()
    let calls = 0
    const off = market.onChange(() => calls++)
    inventory.add('fibre', 5)
    market.sellResource('fibre', 2)
    expect(calls).toBe(1)
    off()
    market.sellResource('fibre', 1)
    expect(calls).toBe(1)
  })
})

describe('demand recovery', () => {
  it('climbs back toward full demand over time and stops at 1', () => {
    const { market, inventory } = setup()
    inventory.add('fibre', 30)
    market.sellResource('fibre', 30) // demand 0.7
    const before = market.getDemand('fibre')

    market.tick()
    expect(market.getDemand('fibre')).toBeCloseTo(before + M.DEMAND_RECOVERY_PER_TICK, 10)

    for (let i = 0; i < 2000; i++) market.tick()
    expect(market.getDemand('fibre')).toBe(1)
  })

  it('does not disturb resources that are already at full demand', () => {
    const { market } = setup()
    let calls = 0
    market.onChange(() => calls++)
    market.tick()
    expect(calls).toBe(0)
    expect(market.getDemand('essence')).toBe(1)
  })
})

describe('creature value', () => {
  const adult = (g: Genome) => ({ genome: g, ageStage: 'adult' as const })

  it('is the base value for a plain, medium, common adult', () => {
    expect(creatureValue(adult(plain()))).toBe(M.CREATURE_BASE_VALUE)
  })

  it('rises with rarity tier and size', () => {
    expect(creatureValue(adult(plain({ rarity: 0.99 })))).toBe(M.CREATURE_BASE_VALUE * 7)
    expect(creatureValue(adult(plain({ rarity: 0.5 })))).toBe(M.CREATURE_BASE_VALUE * 1.6)
    expect(creatureValue(adult(plain({ size: 'huge' })))).toBe(M.CREATURE_BASE_VALUE * 2)
    expect(creatureValue(adult(plain({ size: 'tiny' })))).toBe(M.CREATURE_BASE_VALUE * 0.5)
  })

  it('falls for younger creatures', () => {
    const g = plain()
    expect(creatureValue({ genome: g, ageStage: 'hatchling' })).toBe(M.CREATURE_BASE_VALUE * 0.4)
    expect(creatureValue({ genome: g, ageStage: 'juvenile' })).toBe(M.CREATURE_BASE_VALUE * 0.7)
  })

  it('adds a premium for optional parts, capped', () => {
    const horned = plain({ horns: { ...base.horns, count: 2 } })
    expect(countOptionalParts(horned)).toBe(2)
    expect(creatureValue(adult(horned))).toBe(
      Math.round(M.CREATURE_BASE_VALUE * (1 + 2 * M.CREATURE_PART_PREMIUM))
    )

    const loaded = plain({
      wings: { ...base.wings, pairs: 5 },
      spines: { ...base.spines, count: 20 },
    })
    expect(creatureValue(adult(loaded))).toBe(
      Math.round(M.CREATURE_BASE_VALUE * (1 + M.CREATURE_MAX_PART_PREMIUM))
    )
  })

  it('counts furry and scaly bodies as parts', () => {
    expect(countOptionalParts(plain({ furTufts: true, scales: true }))).toBe(2)
  })

  it('is never negative or NaN for any real generated creature', () => {
    for (let seed = 0; seed < 300; seed++) {
      const value = creatureValue(adult(generateGenome(seed)))
      expect(Number.isFinite(value) && value > 0).toBe(true)
    }
  })
})

describe('selling creatures', () => {
  it('removes the creature and pays its value', () => {
    const { market, roster, currency } = setup(20)
    const c = roster.add(plain({ rarity: 0.99 }), { name: 'Gem' })
    expect(market.quoteCreature(c.id)).toBe(M.CREATURE_BASE_VALUE * 7)

    const sale = market.sellCreature(c.id)
    expect(sale).toEqual({ creatureId: c.id, name: 'Gem', coins: M.CREATURE_BASE_VALUE * 7 })
    expect(roster.has(c.id)).toBe(false)
    expect(currency.getBalance()).toBe(20 + M.CREATURE_BASE_VALUE * 7)
  })

  it('returns null for an unknown creature and sells each only once', () => {
    const { market, roster } = setup()
    const c = roster.add(plain())
    expect(market.quoteCreature('nope')).toBeNull()
    expect(market.sellCreature('nope')).toBeNull()
    expect(market.sellCreature(c.id)).not.toBeNull()
    expect(market.sellCreature(c.id)).toBeNull()
  })
})

describe('save and restore', () => {
  it('round-trips depressed demand', () => {
    const a = setup()
    a.inventory.add('brine', 40)
    a.market.sellResource('brine', 40)

    const b = setup()
    expect(b.market.restore(JSON.parse(JSON.stringify(a.market.serialize())))).toBe(true)
    expect(b.market.getDemand('brine')).toBeCloseTo(a.market.getDemand('brine'), 10)
  })

  it('clamps bad values and rejects unusable snapshots', () => {
    const { market } = setup()
    expect(
      market.restore({ version: 1, demand: { fibre: -5, down: 7, brine: Number.NaN, gold: 0.5 } })
    ).toBe(true)
    expect(market.getDemand('fibre')).toBe(M.MIN_DEMAND)
    expect(market.getDemand('down')).toBe(1)
    expect(market.getDemand('brine')).toBe(1)
    for (const bad of [null, undefined, 3, {}, { version: 2, demand: {} }]) {
      expect(market.restore(bad)).toBe(false)
    }
  })
})
