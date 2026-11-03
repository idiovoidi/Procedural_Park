import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import type { Genome } from '../creatures/genome'
import { generateGenome } from '../creatures/genome'
import { FOOD_ITEMS } from '../food'
import {
  canShareEnclosure,
  dietEfficiency,
  getCreatureEconomyProfile,
  getFoodPerCycle,
  getHabitatNeeds,
  getRarityTier,
  getSizeMultiplier,
  PREFERRED_BIOMES,
  RESOURCE_BY_ARCHETYPE,
  rankFoods,
} from './creature-economy'

const E = GAME_CONFIG.ECONOMY

const ARCHETYPES = ['terrestrial', 'aerial', 'aquatic', 'ethereal', 'crystalline'] as const
const SIZES = ['tiny', 'small', 'medium', 'large', 'huge'] as const
const TEMPERAMENTS = ['shy', 'curious', 'aggressive', 'playful', 'territorial'] as const
const LOCOMOTIONS = ['walk', 'slither', 'swim', 'fly', 'drift', 'hover'] as const

const base = generateGenome(1)
const make = (overrides: Partial<Genome>): Genome => ({ ...base, ...overrides })

describe('getRarityTier', () => {
  it('maps rarity onto the five tiers at the configured boundaries', () => {
    const at = (r: number) => getRarityTier(r).name
    expect(at(0)).toBe('common')
    expect(at(0.39)).toBe('common')
    expect(at(0.4)).toBe('uncommon')
    expect(at(0.6)).toBe('rare')
    expect(at(0.8)).toBe('epic')
    expect(at(0.92)).toBe('legendary')
    expect(at(1)).toBe('legendary')
  })

  it('returns the tier index and multiplier', () => {
    expect(getRarityTier(0.95)).toEqual({ name: 'legendary', index: 4, multiplier: 7 })
    expect(getRarityTier(0.1)).toEqual({ name: 'common', index: 0, multiplier: 1 })
  })

  it('clamps out-of-range and non-finite rarity', () => {
    expect(getRarityTier(-3).name).toBe('common')
    expect(getRarityTier(9).name).toBe('legendary')
    expect(getRarityTier(Number.NaN).name).toBe('common')
  })
})

describe('size and resource mappings', () => {
  it('scales output by size from the config table', () => {
    for (const size of SIZES) {
      expect(getSizeMultiplier(size)).toBe(E.SIZE_MULTIPLIER[size])
    }
  })

  it('gives every archetype its own resource', () => {
    const resources = ARCHETYPES.map((a) => RESOURCE_BY_ARCHETYPE[a])
    expect(new Set(resources).size).toBe(ARCHETYPES.length)
    expect(RESOURCE_BY_ARCHETYPE.crystalline).toBe('shards')
  })

  it('gives every archetype at least one preferred biome', () => {
    for (const archetype of ARCHETYPES) {
      expect(PREFERRED_BIOMES[archetype].length).toBeGreaterThan(0)
    }
    expect(PREFERRED_BIOMES.aquatic).toEqual(['wetland'])
  })
})

describe('getHabitatNeeds', () => {
  it('needs more room as the creature gets bigger (huge = 8x tiny)', () => {
    const areas = SIZES.map((size) => getHabitatNeeds(make({ size })).areaM2)
    expect([...areas].sort((a, b) => a - b)).toEqual(areas)
    expect(areas[4]).toBe(areas[0] * 8)
  })

  it('sends fliers to an aviary and floaters to a tall enclosure', () => {
    expect(getHabitatNeeds(make({ locomotion: 'fly' })).enclosure).toBe('roofed')
    expect(getHabitatNeeds(make({ locomotion: 'hover' })).enclosure).toBe('tall')
    expect(getHabitatNeeds(make({ locomotion: 'drift' })).enclosure).toBe('tall')
    expect(getHabitatNeeds(make({ locomotion: 'walk' })).enclosure).toBe('fenced')
    expect(getHabitatNeeds(make({ locomotion: 'slither' })).enclosure).toBe('fenced')
  })

  it('needs deep water for swimmers and shallow water for other aquatic creatures', () => {
    expect(getHabitatNeeds(make({ locomotion: 'swim', archetype: 'aquatic' })).water).toBe('deep')
    expect(getHabitatNeeds(make({ bodyPlan: 'swimmer', locomotion: 'walk' })).water).toBe('deep')
    expect(
      getHabitatNeeds(make({ archetype: 'aquatic', bodyPlan: 'serpent', locomotion: 'slither' }))
        .water
    ).toBe('shallow')
    expect(
      getHabitatNeeds(make({ archetype: 'terrestrial', bodyPlan: 'quadruped', locomotion: 'walk' }))
        .water
    ).toBe('none')
  })

  it('wants enrichment according to temperament', () => {
    expect(getHabitatNeeds(make({ temperament: 'playful' })).enrichment).toBe('high')
    expect(getHabitatNeeds(make({ temperament: 'curious' })).enrichment).toBe('medium')
    for (const t of ['shy', 'aggressive', 'territorial'] as const) {
      expect(getHabitatNeeds(make({ temperament: t })).enrichment).toBe('low')
    }
  })

  it('prefers the archetype biomes', () => {
    for (const archetype of ARCHETYPES) {
      expect(getHabitatNeeds(make({ archetype })).biomes).toEqual(PREFERRED_BIOMES[archetype])
    }
  })
})

describe('dietEfficiency and rankFoods', () => {
  const common = (archetype: Genome['archetype']) => make({ archetype, rarity: 0.1 })
  const legendary = (archetype: Genome['archetype']) => make({ archetype, rarity: 0.99 })

  it('matches the food table for a common creature', () => {
    for (const archetype of ARCHETYPES) {
      for (const [id, food] of Object.entries(FOOD_ITEMS)) {
        expect(dietEfficiency(common(archetype), id)).toBeCloseTo(food.effectiveness[archetype], 10)
      }
    }
  })

  it('ranks each archetype best food first', () => {
    const best = (a: Genome['archetype']) => rankFoods(common(a))[0].foodId
    expect(best('terrestrial')).toBe('berry')
    expect(best('aquatic')).toBe('fish')
    expect(best('crystalline')).toBe('crystal')
    expect(best('ethereal')).toBe('energy')
  })

  it('returns every food, sorted best to worst', () => {
    const ranked = rankFoods(common('aerial'))
    expect(ranked).toHaveLength(Object.keys(FOOD_ITEMS).length)
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].efficiency).toBeLessThanOrEqual(ranked[i - 1].efficiency)
    }
  })

  it('makes rarer creatures pickier about a poor match, but not about a perfect one', () => {
    const poor = dietEfficiency(common('terrestrial'), 'fish') // 0.4
    const poorLegendary = dietEfficiency(legendary('terrestrial'), 'fish')
    expect(poorLegendary).toBeLessThan(poor)
    expect(poorLegendary).toBeCloseTo(0.4 ** 2, 10) // exponent 1 + 0.25 * 4

    expect(dietEfficiency(common('terrestrial'), 'berry')).toBe(1)
    expect(dietEfficiency(legendary('terrestrial'), 'berry')).toBe(1)
  })

  it('treats an unknown food as useless', () => {
    expect(dietEfficiency(base, 'pizza')).toBe(0)
  })
})

describe('getFoodPerCycle', () => {
  it('scales with size', () => {
    expect(getFoodPerCycle(make({ size: 'medium' }), 1)).toBe(E.BASE_FOOD_PER_CYCLE)
    expect(getFoodPerCycle(make({ size: 'huge' }), 1)).toBe(E.BASE_FOOD_PER_CYCLE * 2)
  })

  it('costs more when the food is a poor match, but stays finite', () => {
    const g = make({ size: 'medium' })
    expect(getFoodPerCycle(g, 0.5)).toBeCloseTo(2, 10)
    expect(getFoodPerCycle(g, 0)).toBeCloseTo(1 / E.MIN_DIET_EFFICIENCY, 10)
    expect(getFoodPerCycle(g, Number.NaN)).toBeCloseTo(1 / E.MIN_DIET_EFFICIENCY, 10)
  })
})

describe('canShareEnclosure', () => {
  const t = (temperament: Genome['temperament'], speciesId = 1) => make({ temperament, speciesId })

  it('never lets an aggressive creature share', () => {
    for (const other of TEMPERAMENTS) {
      expect(canShareEnclosure(t('aggressive'), t(other))).toBe(false)
      expect(canShareEnclosure(t(other), t('aggressive'))).toBe(false)
    }
  })

  it('lets territorial creatures share only with their own species', () => {
    expect(canShareEnclosure(t('territorial', 7), t('territorial', 7))).toBe(true)
    expect(canShareEnclosure(t('territorial', 7), t('territorial', 8))).toBe(false)
    expect(canShareEnclosure(t('territorial', 7), t('shy', 8))).toBe(false)
    expect(canShareEnclosure(t('playful', 8), t('territorial', 7))).toBe(false)
  })

  it('lets the friendly temperaments mix freely', () => {
    for (const a of ['shy', 'curious', 'playful'] as const) {
      for (const b of ['shy', 'curious', 'playful'] as const) {
        expect(canShareEnclosure(t(a, 1), t(b, 2))).toBe(true)
      }
    }
  })

  it('is symmetric for every temperament pairing', () => {
    for (const a of TEMPERAMENTS) {
      for (const b of TEMPERAMENTS) {
        expect(canShareEnclosure(t(a, 1), t(b, 2))).toBe(canShareEnclosure(t(b, 2), t(a, 1)))
      }
    }
  })
})

describe('getCreatureEconomyProfile', () => {
  it('produces a complete, finite profile for every archetype/size/temperament/locomotion', () => {
    let checked = 0
    for (const archetype of ARCHETYPES) {
      for (const size of SIZES) {
        for (const temperament of TEMPERAMENTS) {
          for (const locomotion of LOCOMOTIONS) {
            const p = getCreatureEconomyProfile(make({ archetype, size, temperament, locomotion }))
            expect(p.resource).toBe(RESOURCE_BY_ARCHETYPE[archetype])
            expect(p.sizeMultiplier).toBe(E.SIZE_MULTIPLIER[size])
            expect(p.baseOutputPerCycle).toBe(E.BASE_OUTPUT_PER_CYCLE[archetype])
            expect(Number.isFinite(p.foodPerCycle) && p.foodPerCycle > 0).toBe(true)
            expect(p.habitat.areaM2).toBe(E.HABITAT_AREA_M2[size])
            expect(p.diet).toHaveLength(Object.keys(FOOD_ITEMS).length)
            checked++
          }
        }
      }
    }
    expect(checked).toBe(750)
  })

  it('stays valid for 500 real generated creatures', () => {
    for (let seed = 0; seed < 500; seed++) {
      const g = generateGenome(seed)
      const p = getCreatureEconomyProfile(g)

      expect(ARCHETYPES).toContain(g.archetype)
      expect(p.resource).toBe(RESOURCE_BY_ARCHETYPE[g.archetype])
      expect(p.rarity.multiplier).toBeGreaterThanOrEqual(1)
      expect(p.habitat.areaM2).toBeGreaterThan(0)
      for (const food of p.diet) {
        expect(food.efficiency).toBeGreaterThanOrEqual(0)
        expect(food.efficiency).toBeLessThanOrEqual(1)
      }
      // The best food for the archetype is always the first choice.
      expect(p.diet[0].efficiency).toBeGreaterThanOrEqual(p.diet[p.diet.length - 1].efficiency)
      // Anything that flies or swims must get the matching habitat.
      if (g.locomotion === 'fly') expect(p.habitat.enclosure).toBe('roofed')
      if (g.locomotion === 'swim') expect(p.habitat.water).toBe('deep')
    }
  })

  it('is deterministic', () => {
    const g = generateGenome(42)
    expect(getCreatureEconomyProfile(g)).toEqual(getCreatureEconomyProfile(g))
  })
})
