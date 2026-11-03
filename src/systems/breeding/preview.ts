/**
 * Offspring preview (GDD 6.3)
 * What a pairing can produce, without deciding it. Odds are read off the same `crossover`
 * the hatching uses, so the preview never promises something the game won't do. The sample
 * children use different seeds from the real hatching, so they show the *kind* of outcome,
 * not the actual one.
 */

import { GAME_CONFIG } from '@core/constants'
import { crossover, type Genome, hashSeed } from '@systems/creatures/genome'
import { getRarityTier } from '@systems/economy'

const B = GAME_CONFIG.ECONOMY.BREEDING

export interface Outcome {
  label: string
  /** 0..1 */
  chance: number
}

export interface OffspringOdds {
  /** The body comes whole from one parent. */
  body: Outcome[]
  size: Outcome[]
  temperament: Outcome[]
  rarity: { min: number; max: number; tierMin: string; tierMax: string }
  /** Optional parts the child may have, with how often it does (only those possible). */
  parts: Outcome[]
  mutationChance: number
}

const PREVIEW_SEED = 0x70726576

/** Merge outcomes that share a label, summing their chances. */
function merge(list: Outcome[]): Outcome[] {
  const byLabel = new Map<string, number>()
  for (const o of list) byLabel.set(o.label, (byLabel.get(o.label) ?? 0) + o.chance)
  return [...byLabel]
    .map(([label, chance]) => ({ label, chance }))
    .sort((x, y) => y.chance - x.chance)
}

const PART_TESTS: Array<[string, (g: Genome) => boolean]> = [
  ['wings', (g) => g.wings.pairs > 0],
  ['tail', (g) => g.tails.count > 0],
  ['horns', (g) => g.horns.count > 0],
  ['antennae', (g) => g.antennae.count > 0],
  ['ears', (g) => g.ears.count > 0],
  ['spines', (g) => g.spines.count > 0],
  ['fur tufts', (g) => g.furTufts],
  ['scales', (g) => g.scales],
]

export function describeOffspring(
  a: Genome,
  b: Genome,
  samples: number = B.PREVIEW_SAMPLES
): OffspringOdds {
  const bodyLabel = (g: Genome) => `${g.archetype} ${g.bodyPlan.replace('_', ' ')}`
  const body = merge([
    { label: bodyLabel(a), chance: 0.5 },
    { label: bodyLabel(b), chance: 0.5 },
  ])
  const size = merge([
    { label: a.size, chance: 0.5 },
    { label: b.size, chance: 0.5 },
  ])
  const temperament = merge([
    { label: a.temperament, chance: 0.5 },
    { label: b.temperament, chance: 0.5 },
  ])

  const mean = (a.rarity + b.rarity) / 2
  const min = Math.max(0, mean - 0.05)
  const max = Math.min(1, mean + 0.05)

  // Parts depend on which parent's body the child gets, so sample the real crossover.
  const counts = PART_TESTS.map(() => 0)
  const n = Math.max(1, Math.floor(samples))
  for (let i = 0; i < n; i++) {
    const child = crossover(a, b, hashSeed(PREVIEW_SEED, i))
    PART_TESTS.forEach(([, has], index) => {
      if (has(child)) counts[index]++
    })
  }
  const parts = PART_TESTS.map(([label], index) => ({ label, chance: counts[index] / n }))
    .filter((o) => o.chance > 0)
    .sort((x, y) => y.chance - x.chance)

  return {
    body,
    size,
    temperament,
    rarity: { min, max, tierMin: getRarityTier(min).name, tierMax: getRarityTier(max).name },
    parts,
    mutationChance: B.MUTATION_CHANCE,
  }
}

/** A few example children this pairing could have. Not the actual offspring. */
export function sampleOffspring(
  a: Genome,
  b: Genome,
  count: number = B.PREVIEW_CHILDREN
): Genome[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    crossover(a, b, hashSeed(PREVIEW_SEED + 1, i))
  )
}
