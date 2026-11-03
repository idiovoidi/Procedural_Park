/**
 * Output formula (GDD 7.5)
 *
 *   outputPerCycle = base(archetype) x sizeMult x rarityOutputMult x happinessMult x ageMult
 *
 * Pure and stateless so the production system, the pen/market UI and the balance simulation
 * all agree on what a creature is worth. The GDD's temperament bonus is left out of the
 * first slice.
 */

import { GAME_CONFIG } from '@core/constants'
import type { Genome } from '@systems/creatures/genome'
import { getRarityTier, getSizeMultiplier } from '@systems/economy'
import type { OwnedCreature } from '@systems/roster'

const { BASE_OUTPUT_PER_CYCLE, AGE_MULTIPLIER, HAPPINESS_MULTIPLIER } = GAME_CONFIG.ECONOMY

/** Happiness 0..100 mapped linearly onto the configured multiplier range. */
export function happinessMultiplier(happiness: number): number {
  const h = Number.isFinite(happiness) ? Math.min(100, Math.max(0, happiness)) : 0
  return (
    HAPPINESS_MULTIPLIER.min + (HAPPINESS_MULTIPLIER.max - HAPPINESS_MULTIPLIER.min) * (h / 100)
  )
}

export interface OutputInputs {
  genome: Genome
  happiness: number
  ageStage: OwnedCreature['ageStage']
}

/** Resource units one creature yields per production cycle. Does not check hunger or pen. */
export function outputPerCycle({ genome, happiness, ageStage }: OutputInputs): number {
  return (
    BASE_OUTPUT_PER_CYCLE[genome.archetype] *
    getSizeMultiplier(genome.size) *
    getRarityTier(genome.rarity).outputMultiplier *
    happinessMultiplier(happiness) *
    AGE_MULTIPLIER[ageStage]
  )
}
