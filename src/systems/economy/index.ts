/**
 * Economy System
 * Barrel export for the park economy simulation
 */

export type {
  AgeStage,
  CreatureArchetypeId,
  CreatureEconomyProfile,
  EnclosureNeed,
  EnrichmentNeed,
  HabitatNeeds,
  RankedFood,
  RarityTier,
  RarityTierName,
  ResourceType,
  SizeClass,
  WaterNeed,
} from './creature-economy'
export {
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
export type { SimClockState, TickListener } from './SimClock'
export { SimClock } from './SimClock'
