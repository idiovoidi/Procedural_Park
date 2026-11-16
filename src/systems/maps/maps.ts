/**
 * Map definitions and wild founders (GDD 10.1)
 * Each expedition map has a seed and a species lean, so the same map always holds the same
 * founders, and a shared seed reproduces them for friends.
 */

import { GAME_CONFIG } from '@core/constants'
import {
  createSeededRandom,
  type Genome,
  generateGenome,
  hashSeed,
} from '@systems/creatures/genome'

type CreatureArchetype = Genome['archetype']

export interface MapDef {
  id: string
  name: string
  description: string
  biome: string
  seed: number
  wildCount: number
  archetypeLean: Readonly<Record<CreatureArchetype, number>>
  rarityBonus: number
  unlock: { coins: number; ownedSpecies: number }
}

export const EXPEDITION_MAPS: readonly MapDef[] = GAME_CONFIG.MAPS.EXPEDITIONS as readonly MapDef[]

export const HUB_ID: string = GAME_CONFIG.MAPS.HUB_ID

export function getMapDef(id: string): MapDef | undefined {
  return EXPEDITION_MAPS.find((m) => m.id === id)
}

/** Candidate genomes tried per founder before giving up on the lean. */
const MAX_ATTEMPTS = 40

/**
 * Founder number `index` of a map. Deterministic: each founder has its own seed, so adding or
 * removing one never reshuffles the rest. Candidates whose archetype the map rarely holds are
 * skipped, then the map's rarity bonus is applied.
 */
export function generateWildForMap(map: MapDef, index: number): Genome {
  const base = hashSeed(map.seed, index)
  const rand = createSeededRandom(hashSeed(base, 0x6c65616e))
  let genome = generateGenome(hashSeed(base, 0))
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateGenome(hashSeed(base, attempt))
    genome = candidate
    if (rand() < (map.archetypeLean[candidate.archetype] ?? 0)) break
  }
  const rarity = Math.min(1, genome.rarity + map.rarityBonus)
  return {
    ...genome,
    rarity,
    // The same rule `crossover` uses, so very rare founders glow.
    genes: { ...genome.genes, glow: Math.max(0, (rarity - 0.75) / 0.25) },
  }
}

export function generateWildPopulation(map: MapDef): Genome[] {
  return Array.from({ length: map.wildCount }, (_, i) => generateWildForMap(map, i))
}
