/**
 * Creature economics
 *
 * Pure functions that turn a creature's genome into what the park cares about: what it eats,
 * where it can live, who it can share a pen with, what it produces and how much it is worth.
 * Nothing here holds state or touches the DOM/WebGL, so it is cheap to test exhaustively and
 * safe to call from any system (pens, care loop, market, breeding preview).
 *
 * All tuning numbers live in `GAME_CONFIG.ECONOMY`; this file only holds the *mapping* from
 * genome traits to needs (GDD section 4.1).
 */

import { GAME_CONFIG } from '@core/constants'
import type { Genome } from '@systems/creatures/genome'
import { FOOD_ITEMS } from '@systems/food'
import type { BiomeType } from '@systems/terrain'

const { ECONOMY } = GAME_CONFIG

export type CreatureArchetypeId = Genome['archetype']
export type SizeClass = Genome['size']
export type AgeStage = keyof typeof ECONOMY.AGE_MULTIPLIER
export type RarityTierName = (typeof ECONOMY.RARITY_TIERS)[number]['name']

/** Placeholder resource names (GDD 7.4); the mapping, not the names, is the design. */
export type ResourceType = 'fibre' | 'down' | 'brine' | 'essence' | 'shards'

export const RESOURCE_BY_ARCHETYPE: Readonly<Record<CreatureArchetypeId, ResourceType>> = {
  terrestrial: 'fibre',
  aerial: 'down',
  aquatic: 'brine',
  ethereal: 'essence',
  crystalline: 'shards',
}

/** Ground and scenery a creature feels at home on, by archetype. */
export const PREFERRED_BIOMES: Readonly<Record<CreatureArchetypeId, readonly BiomeType[]>> = {
  terrestrial: ['meadow', 'forest', 'rocky'],
  aerial: ['meadow', 'floating_islands'],
  aquatic: ['wetland'],
  ethereal: ['floating_islands', 'crystal_cave'],
  crystalline: ['crystal_cave', 'rocky'],
}

export type WaterNeed = 'none' | 'shallow' | 'deep'
/** `fenced` = ordinary fence, `tall` = high fence/dome for floaters, `roofed` = aviary. */
export type EnclosureNeed = 'fenced' | 'tall' | 'roofed'
export type EnrichmentNeed = 'low' | 'medium' | 'high'

export interface HabitatNeeds {
  /** Floor area one creature needs, in square metres. */
  areaM2: number
  water: WaterNeed
  enclosure: EnclosureNeed
  enrichment: EnrichmentNeed
  /** Scenery it prefers; a pen made mostly of these scores best. */
  biomes: readonly BiomeType[]
}

export interface RarityTier {
  name: RarityTierName
  /** 0 = common ... 4 = legendary. */
  index: number
  /** Value multiplier from the tier table. */
  multiplier: number
}

export interface RankedFood {
  foodId: string
  /** 0..1 after the creature's pickiness is applied. */
  efficiency: number
}

export interface CreatureEconomyProfile {
  sizeMultiplier: number
  rarity: RarityTier
  resource: ResourceType
  /** Units yielded per production cycle for a medium-happiness adult, before happiness/age. */
  baseOutputPerCycle: number
  /** Food servings per feeding cycle if fed its best food at 100% efficiency. */
  foodPerCycle: number
  habitat: HabitatNeeds
  /** Foods ranked best first. */
  diet: readonly RankedFood[]
}

export function getRarityTier(rarity: number): RarityTier {
  const value = Number.isFinite(rarity) ? Math.min(Math.max(rarity, 0), 1) : 0
  const tiers = ECONOMY.RARITY_TIERS
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (value >= tiers[i].min) {
      return { name: tiers[i].name, index: i, multiplier: tiers[i].multiplier }
    }
  }
  return { name: tiers[0].name, index: 0, multiplier: tiers[0].multiplier }
}

export function getSizeMultiplier(size: SizeClass): number {
  return ECONOMY.SIZE_MULTIPLIER[size]
}

export function getHabitatNeeds(genome: Genome): HabitatNeeds {
  let water: WaterNeed = 'none'
  if (genome.locomotion === 'swim' || genome.bodyPlan === 'swimmer') water = 'deep'
  else if (genome.archetype === 'aquatic') water = 'shallow'

  let enclosure: EnclosureNeed = 'fenced'
  if (genome.locomotion === 'fly') enclosure = 'roofed'
  else if (genome.locomotion === 'hover' || genome.locomotion === 'drift') enclosure = 'tall'

  let enrichment: EnrichmentNeed = 'low'
  if (genome.temperament === 'playful') enrichment = 'high'
  else if (genome.temperament === 'curious') enrichment = 'medium'

  return {
    areaM2: ECONOMY.HABITAT_AREA_M2[genome.size],
    water,
    enclosure,
    enrichment,
    biomes: PREFERRED_BIOMES[genome.archetype],
  }
}

/**
 * How well a food suits this creature, 0..1. Starts from the food's archetype effectiveness
 * and gets harsher with rarity: rarer creatures are pickier about a poor match. Unknown
 * foods give 0.
 */
export function dietEfficiency(genome: Genome, foodId: string): number {
  const food = FOOD_ITEMS[foodId]
  if (!food) return 0
  const base = food.effectiveness[genome.archetype]
  const tier = getRarityTier(genome.rarity)
  return base ** (1 + ECONOMY.DIET_PICKINESS_PER_TIER * tier.index)
}

/** Every food, best match first (ties broken by id so the order is stable). */
export function rankFoods(genome: Genome): RankedFood[] {
  return Object.keys(FOOD_ITEMS)
    .map((foodId) => ({ foodId, efficiency: dietEfficiency(genome, foodId) }))
    .sort((a, b) => b.efficiency - a.efficiency || a.foodId.localeCompare(b.foodId))
}

/**
 * Food servings eaten per feeding cycle. A poorly matched food is wasted, so use scales
 * inversely with efficiency (floored so a terrible match is costly but finite).
 */
export function getFoodPerCycle(genome: Genome, efficiency: number = 1): number {
  const eff = Math.max(
    Number.isFinite(efficiency) ? efficiency : 0,
    ECONOMY.MIN_DIET_EFFICIENCY
  )
  return (ECONOMY.BASE_FOOD_PER_CYCLE * getSizeMultiplier(genome.size)) / eff
}

/**
 * Can two creatures share a pen? Symmetric.
 *  - aggressive: never shares
 *  - territorial: only with its own species
 *  - everyone else: gets along (with anyone who isn't ruled out above)
 */
export function canShareEnclosure(a: Genome, b: Genome): boolean {
  if (a.temperament === 'aggressive' || b.temperament === 'aggressive') return false
  if (a.temperament === 'territorial' || b.temperament === 'territorial') {
    return a.speciesId === b.speciesId
  }
  return true
}

export function getCreatureEconomyProfile(genome: Genome): CreatureEconomyProfile {
  return {
    sizeMultiplier: getSizeMultiplier(genome.size),
    rarity: getRarityTier(genome.rarity),
    resource: RESOURCE_BY_ARCHETYPE[genome.archetype],
    baseOutputPerCycle: ECONOMY.BASE_OUTPUT_PER_CYCLE[genome.archetype],
    foodPerCycle: getFoodPerCycle(genome, 1),
    habitat: getHabitatNeeds(genome),
    diet: rankFoods(genome),
  }
}
