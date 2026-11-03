import { dietEfficiency } from '@systems/economy'
import { describe, expect, it } from 'vitest'
import { createBalanceWorld } from './world'

/**
 * M2 exit: "a player can run a hands-off park for several minutes without starving creatures".
 * One pen with a trough, hopper, bin, auto-collector, food farms, a valve and a silo; the player
 * stocks it once and then does nothing at all for 90 simulated minutes.
 */

function handsOffPark(options: { farms: number }) {
  const w = createBalanceWorld()
  const g = w.grid
  // A 4x4-cell pen in the build zone.
  const x0 = -6
  const z0 = -6
  for (let i = 0; i < 4; i++) {
    g.addFence({ x: x0 + i, z: z0, axis: 'h' })
    g.addFence({ x: x0 + i, z: z0 + 4, axis: 'h' })
    g.addFence({ x: x0, z: z0 + i, axis: 'v' })
    g.addFence({ x: x0 + 4, z: z0 + i, axis: 'v' })
  }
  const props: Array<[number, number, Parameters<typeof g.addProp>[1]]> = [
    [0, 0, 'trough'],
    [1, 0, 'hopper'],
    [2, 0, 'bin'],
    [3, 0, 'collector'],
    [0, 3, 'valve'],
    [1, 3, 'silo'],
  ]
  for (let i = 0; i < options.farms; i++) props.push([i, 2, 'farm'])
  for (const [dx, dz, kind] of props) g.addProp({ x: x0 + dx, z: z0 + dz }, kind)
  const pen = g.getPens()[0]
  if (!pen) throw new Error('test setup: pen did not close')

  // Three creatures of one species that eat berries well.
  const genome = w.wild.find(
    (c) => dietEfficiency(c, 'berry') >= 0.6 && c.temperament !== 'aggressive' && c.size !== 'huge'
  )
  if (!genome) throw new Error('test setup: no berry eater among the founders')
  for (let i = 0; i < 3; i++) {
    const c = w.roster.add(genome, { stats: { fullness: 100, happiness: 100, trust: 100 } })
    if (!w.roster.assignToPen(c.id, pen.id)) throw new Error('test setup: creature did not fit')
  }
  // The one and only chore: a starting stock of food.
  w.care.stock(pen.id, 'berry', 40)
  return { w, penId: pen.id }
}

describe('a hands-off park', () => {
  it('runs for 90 minutes without starving anyone, selling by itself', () => {
    const { w } = handsOffPark({ farms: 3 })
    const start = w.currency.getBalance()
    w.advance(90 * 60)

    expect(w.stats.creatureCycles).toBeGreaterThan(0)
    expect(w.stats.starvingCreatureCycles).toBe(0)
    expect(w.currency.spent.foodPurchases ?? 0).toBe(0)
    expect(w.currency.earned.resourceSales ?? 0).toBeGreaterThan(0)
    expect(w.currency.getBalance()).toBeGreaterThan(start)
    // The valve sold what the collector gathered: the silo-less base cap was never the limit.
    expect(w.stats.wastedOutput / Math.max(1, w.stats.producedOutput)).toBeLessThan(0.1)
  })

  it('needs the farms: without them the starting stock runs out and creatures starve', () => {
    const { w } = handsOffPark({ farms: 0 })
    w.advance(90 * 60)
    expect(w.stats.starvingCreatureCycles).toBeGreaterThan(0)
  })

  it('keeps earning after it has been left alone (offline catch-up)', () => {
    const { w } = handsOffPark({ farms: 3 })
    w.advance(30 * 60)
    const earlier = w.currency.getBalance()
    w.clock.fastForward(8 * 3600) // the offline cap
    expect(w.currency.getBalance()).toBeGreaterThan(earlier)
    expect(w.stats.starvingCreatureCycles).toBe(0)
  })
})
