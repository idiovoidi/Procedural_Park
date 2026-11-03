import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { MapManager } from './MapManager'
import {
  EXPEDITION_MAPS,
  generateWildForMap,
  generateWildPopulation,
  getMapDef,
  HUB_ID,
} from './maps'

const wallet = (coins: number) => {
  let balance = coins
  return {
    canAfford: (n: number) => balance >= n,
    removeMoney: (n: number) => {
      if (balance < n) return false
      balance -= n
      return true
    },
    balance: () => balance,
  }
}

describe('map definitions', () => {
  it('have unique ids, seeds and a hub that is not an expedition', () => {
    const ids = EXPEDITION_MAPS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(EXPEDITION_MAPS.map((m) => m.seed)).size).toBe(ids.length)
    expect(ids).not.toContain(HUB_ID)
    expect(HUB_ID).toBe(GAME_CONFIG.MAPS.HUB_ID)
  })

  it('get harder to reach as they get richer', () => {
    const costs = EXPEDITION_MAPS.map((m) => m.unlock.coins)
    expect(costs).toEqual([...costs].sort((a, b) => a - b))
    const bonus = EXPEDITION_MAPS.map((m) => m.rarityBonus)
    expect(bonus).toEqual([...bonus].sort((a, b) => a - b))
  })
})

describe('wild founders', () => {
  it('are deterministic per map and index, and differ between maps', () => {
    const [a, b] = EXPEDITION_MAPS
    expect(generateWildForMap(a, 3)).toEqual(generateWildForMap(a, 3))
    expect(generateWildForMap(a, 3)).not.toEqual(generateWildForMap(b, 3))
    expect(generateWildPopulation(a)).toHaveLength(a.wildCount)
  })

  it('lean toward the archetype the map is known for', () => {
    for (const map of EXPEDITION_MAPS) {
      const counts: Record<string, number> = {}
      for (const g of generateWildPopulation(map))
        counts[g.archetype] = (counts[g.archetype] ?? 0) + 1
      const top = Object.entries(map.archetypeLean).sort((x, y) => y[1] - x[1])[0][0]
      const mostCommon = Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0]
      // The strongest-leaning archetype is among the two most common on the map.
      const ranked = Object.entries(counts)
        .sort((x, y) => y[1] - x[1])
        .map(([k]) => k)
      expect(ranked.slice(0, 2)).toContain(top)
      expect(mostCommon).toBeTruthy()
    }
  })

  it('are rarer on richer maps and glow when rare enough', () => {
    const avg = (id: string) => {
      const pop = generateWildPopulation(getMapDef(id) as never)
      return pop.reduce((s, g) => s + g.rarity, 0) / pop.length
    }
    expect(avg('glimmer-caves')).toBeGreaterThan(avg('greenwood'))
    for (const g of generateWildPopulation(EXPEDITION_MAPS[2])) {
      expect(g.rarity).toBeLessThanOrEqual(1)
      expect(g.genes.glow > 0).toBe(g.rarity > 0.75)
    }
  })
})

describe('map manager', () => {
  const free = EXPEDITION_MAPS[0]
  const paid = EXPEDITION_MAPS[1]

  it('starts at the hub, with only the hub open', () => {
    const m = new MapManager()
    expect(m.isAtHub()).toBe(true)
    expect(m.isUnlocked(HUB_ID)).toBe(true)
    expect(m.isUnlocked(free.id)).toBe(false)
    expect(m.travel(free.id)).toBe(false)
  })

  it('unlocks for coins and codex species, charging only on success', () => {
    const m = new MapManager()
    const w = wallet(paid.unlock.coins)
    expect(m.unlock(paid.id, w, { ownedSpecies: paid.unlock.ownedSpecies - 1 }).ok).toBe(false)
    expect(w.balance()).toBe(paid.unlock.coins)
    const poor = wallet(paid.unlock.coins - 1)
    expect(m.unlock(paid.id, poor, { ownedSpecies: 99 }).ok).toBe(false)
    expect(poor.balance()).toBe(paid.unlock.coins - 1)

    expect(m.unlock(paid.id, w, { ownedSpecies: paid.unlock.ownedSpecies }).ok).toBe(true)
    expect(w.balance()).toBe(0)
    expect(m.isUnlocked(paid.id)).toBe(true)
    expect(m.unlock(paid.id, w, { ownedSpecies: 99 }).ok).toBe(false) // already unlocked
    expect(m.unlock('nowhere', w, { ownedSpecies: 99 }).ok).toBe(false)
  })

  it('travels out and back, telling listeners', () => {
    const m = new MapManager()
    m.unlock(free.id, wallet(0), { ownedSpecies: 0 })
    const trips: Array<[string, string]> = []
    m.onTravel((to, from) => trips.push([to, from]))
    expect(m.travel(free.id)).toBe(true)
    expect(m.getCurrentDef()?.id).toBe(free.id)
    expect(m.travel(free.id)).toBe(false) // already there
    expect(m.travel(HUB_ID)).toBe(true)
    expect(trips).toEqual([
      [free.id, HUB_ID],
      [HUB_ID, free.id],
    ])
  })

  it('saves what is unlocked, always restarts at the hub, and ignores bad data', () => {
    const m = new MapManager()
    m.unlock(free.id, wallet(0), { ownedSpecies: 0 })
    m.travel(free.id)
    const snap = JSON.parse(JSON.stringify(m.serialize()))
    expect(snap.current).toBe(HUB_ID)

    const other = new MapManager()
    expect(other.restore(snap)).toBe(true)
    expect(other.isUnlocked(free.id)).toBe(true)
    expect(other.isAtHub()).toBe(true)

    expect(other.restore(null)).toBe(false)
    expect(other.restore({ version: 1, unlocked: ['bogus', 5, free.id] })).toBe(true)
    expect(other.isUnlocked('bogus')).toBe(false)
    expect(other.isUnlocked(free.id)).toBe(true)
  })
})
