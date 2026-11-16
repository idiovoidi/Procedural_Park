/**
 * Pairing rules (GDD 6.3)
 * Pure checks for whether two creatures may breed, and what a breeding costs.
 */

import { GAME_CONFIG } from '@core/constants'
import type { Genome } from '@systems/creatures/genome'
import { canShareEnclosure, getRarityTier } from '@systems/economy'
import type { OwnedCreature } from '@systems/roster'

const B = GAME_CONFIG.ECONOMY.BREEDING

export const SIZE_ORDER = ['tiny', 'small', 'medium', 'large', 'huge'] as const

export interface PairingContext {
  /** Current economy tick. */
  tick: number
  /** Tick at which a creature may breed again (0 if it has never bred). */
  readyTick(creatureId: string): number
  /** True while a creature is part of a breeding in progress. */
  isBusy(creatureId: string): boolean
}

/** Why this pair can't breed right now, in plain language. Empty means they can. */
export function checkPairing(
  a: Readonly<OwnedCreature>,
  b: Readonly<OwnedCreature>,
  ctx: PairingContext
): string[] {
  if (a.id === b.id) return ['Pick two different creatures']

  const problems: string[] = []
  for (const c of [a, b]) {
    if (c.ageStage !== 'adult') problems.push(`${c.name} is still growing up`)
    if (c.fullness <= 0) problems.push(`${c.name} is starving`)
    else if (c.happiness < B.MIN_HAPPINESS) {
      problems.push(`${c.name} is not happy enough (needs ${B.MIN_HAPPINESS})`)
    }
    if (c.trust < B.MIN_TRUST)
      problems.push(`${c.name} does not trust you enough (needs ${B.MIN_TRUST})`)
    if (ctx.isBusy(c.id)) problems.push(`${c.name} is already breeding`)
    const wait = ctx.readyTick(c.id) - ctx.tick
    if (wait > 0) problems.push(`${c.name} needs to rest for ${Math.ceil(wait / 60)} more min`)
  }

  const gap = Math.abs(SIZE_ORDER.indexOf(a.genome.size) - SIZE_ORDER.indexOf(b.genome.size))
  if (gap > B.MAX_SIZE_GAP) problems.push('They are too different in size')
  if (!canShareEnclosure(a.genome, b.genome)) problems.push('They cannot share a pen')
  return problems
}

/** Coins to start a breeding: dearer for rarer parents. */
export function breedingCost(a: Genome, b: Genome): number {
  const avgTier = (getRarityTier(a.rarity).index + getRarityTier(b.rarity).index) / 2
  return Math.round(B.BASE_COST * (1 + B.COST_PER_TIER * avgTier))
}

/** Rarity added to a litter's average: only when both parents are good enough (the ratchet). */
export function rarityLift(a: Genome, b: Genome): number {
  const B = GAME_CONFIG.ECONOMY.BREEDING
  return Math.min(a.rarity, b.rarity) >= B.RARITY_LIFT_MIN_PARENT ? B.RARITY_LIFT : 0
}
