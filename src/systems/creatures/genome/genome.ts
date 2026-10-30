import type { Random } from '@core/types'
import type { Anatomy } from '../types'
import { ARCHETYPE_THEMES, ARCHETYPES, type ArchetypeTheme } from './archetype-themes'
import { BODY_PLANS, type BodyPlan, type ExtraId, plansForArchetype } from './body-plans'
import {
  createSeededRandom,
  hashSeed,
  hashString,
  lerp,
  normalish,
  pickDistinct,
  pickWeighted,
  rangeInt,
  uniform,
  type Weighted,
} from './random'
import {
  type Genes,
  type Genome,
  type GenomePalette,
  type LimbSet,
  PART_FAMILIES,
  type PartFamily,
} from './types'

export const GENOME_VERSION = 1

/** Creatures rarer than this may combine horns with antennae. */
const RARE_THRESHOLD = 0.85

/**
 * Build a creature genome from a single seed.
 *
 * Traits are drawn in a fixed order from one stream (so a seed always yields the
 * same genome), and every choice is made from sets the body plan allows, so the
 * result is coherent by construction. Part builders use `partSeeds` rather than
 * this stream, which keeps visual details stable when generation rules change.
 */
export function generateGenome(seed: number): Genome {
  const base = seed >>> 0
  const rand = createSeededRandom(hashSeed(base, 0x6e0))

  const partSeeds = {} as Record<PartFamily, number>
  PART_FAMILIES.forEach((family, index) => {
    partSeeds[family] = hashSeed(base, index + 1)
  })

  const rarity = rand()
  const archetype = pickWeighted(rand, uniform(...ARCHETYPES))
  const theme = ARCHETYPE_THEMES[archetype]
  const plan = BODY_PLANS[pickWeighted(rand, plansForArchetype(archetype))]

  const size = pickWeighted(rand, theme.sizes)
  const temperament = pickWeighted(rand, theme.temperaments)
  const bodyType = pickWeighted(rand, plan.bodyTypes)
  const torsoShape = pickWeighted(rand, plan.torso)

  const genes = rollGenes(rand, rarity)
  const palette = rollPalette(rand, theme)
  const pattern = pickWeighted(rand, theme.patterns)

  const hasHead = rand() < plan.headChance
  const eyeCount = hasHead ? rollEyeCount(rand, plan, rarity) : 0

  const limbSets = rollLimbSets(rand, plan)

  const wingPairs = rand() < plan.wingChance ? pickWeighted(rand, plan.wingPairs) : 0
  const wingType = pickWeighted(rand, theme.wingTypes)

  const tailCount = rand() < plan.tailChance ? (rand() < 0.15 ? 2 : 1) : 0
  const tailType = pickWeighted(rand, theme.tailTypes)

  const extras = rollExtras(rand, plan, theme, hasHead, rarity)
  const earType = pickWeighted(rand, theme.earTypes)
  const hornType = pickWeighted(rand, theme.hornTypes)
  const antennaType = pickWeighted(rand, theme.antennaTypes)
  const spineType = rollSpineType(rand, theme, plan, tailCount)

  const hornCount = extras.has('horns') ? pickWeighted(rand, HORN_COUNTS) : 0
  const antennaCount = extras.has('antennae') ? pickWeighted(rand, ANTENNA_COUNTS) : 0
  const spineCount = extras.has('spines') && spineType !== 'none' ? rangeInt(rand, 5, 9) : 0
  const earCount = extras.has('ears') && earType !== 'none' ? 2 : 0

  const genome: Genome = {
    version: GENOME_VERSION,
    seed: base,
    speciesId: 0,
    archetype,
    bodyPlan: plan.id,
    locomotion: plan.locomotion,
    rarity,
    size,
    temperament,
    bodyType,
    torsoShape,
    genes,
    palette,
    pattern,
    head: { present: hasHead, eyeCount },
    limbSets,
    wings: { pairs: wingPairs, type: wingType },
    tails: { count: tailCount, type: tailType },
    antennae: { count: antennaCount, type: antennaType },
    ears: { count: earCount, type: earType },
    horns: { count: hornCount, type: hornCount > 0 ? hornType : 'none' },
    spines: { count: spineCount, type: spineCount > 0 ? spineType : 'none' },
    furTufts: extras.has('fur'),
    scales: extras.has('scales'),
    partSeeds,
  }

  genome.speciesId = computeSpeciesId(genome)
  return genome
}

// Odd and single counts are allowed, but pairs dominate so heads read as symmetric.
const HORN_COUNTS: Weighted<number> = [
  [1, 2],
  [2, 6],
  [4, 2],
]
const ANTENNA_COUNTS: Weighted<number> = [
  [1, 1],
  [2, 6],
  [4, 2],
]

function rollGenes(rand: Random, rarity: number): Genes {
  return {
    girth: normalish(rand),
    length: normalish(rand),
    head: normalish(rand),
    eye: normalish(rand),
    limb: normalish(rand),
    tail: normalish(rand),
    wing: normalish(rand),
    glow: Math.max(0, (rarity - 0.75) / 0.25),
  }
}

function rollPalette(rand: Random, theme: ArchetypeTheme): GenomePalette {
  const scheme = pickWeighted(rand, theme.schemes)

  // Most creatures stay in the theme's hue bands; a few break out for variety.
  const inBand = rand() < 0.85
  const band = theme.hueBands[Math.floor(rand() * theme.hueBands.length)]
  const baseHue = inBand ? lerp(band[0], band[1], rand()) % 1 : rand()

  const wrap = (hue: number) => ((hue % 1) + 1) % 1
  const jitter = (rand() - 0.5) * 0.04
  let accentHue: number
  let patternHue: number
  switch (scheme) {
    case 'analogous': {
      const direction = rand() < 0.5 ? -1 : 1
      accentHue = wrap(baseHue + direction * (0.07 + jitter))
      patternHue = wrap(baseHue - direction * (0.07 + jitter))
      break
    }
    case 'complementary':
      accentHue = wrap(baseHue + 0.5 + jitter)
      patternHue = accentHue
      break
    case 'triad':
      accentHue = wrap(baseHue + 1 / 3 + jitter)
      patternHue = wrap(baseHue + 2 / 3 + jitter)
      break
    case 'split':
      accentHue = wrap(baseHue + 0.42 + jitter)
      patternHue = wrap(baseHue + 0.58 + jitter)
      break
  }

  return {
    scheme,
    baseHue,
    accentHue,
    patternHue,
    saturation: lerp(theme.saturation[0], theme.saturation[1], rand()),
    lightness: lerp(theme.lightness[0], theme.lightness[1], rand()),
  }
}

function rollEyeCount(rand: Random, plan: BodyPlan, rarity: number): number {
  const eyes = pickWeighted(rand, plan.eyes)
  // The rarest creatures grow an extra pair, capped so faces stay readable.
  if (rarity > 0.93 && eyes >= 2 && eyes <= 4) return eyes + 2
  return eyes
}

function rollLimbSets(rand: Random, plan: BodyPlan): LimbSet[] {
  const sets: LimbSet[] = []
  for (const rule of plan.limbs) {
    if (rand() >= rule.chance) continue
    sets.push({
      type: pickWeighted(rand, rule.type),
      count: pickWeighted(rand, rule.count),
      layout: rule.layout,
    })
  }
  return sets
}

/**
 * Rarer creatures get a bigger budget of optional features (1 for common,
 * up to 4 for the rarest), drawn from what the plan and theme allow.
 */
function rollExtras(
  rand: Random,
  plan: BodyPlan,
  theme: ArchetypeTheme,
  hasHead: boolean,
  rarity: number
): Set<ExtraId> {
  const candidates: Array<readonly [ExtraId, number]> = plan.extras.filter(([extra]) => {
    switch (extra) {
      case 'horns':
      case 'ears':
      case 'antennae':
        return hasHead
      case 'fur':
        return rand() < theme.furChance
      case 'scales':
        return rand() < theme.scaleChance
      default:
        return true
    }
  })

  const budget = 1 + Math.floor(rarity * 3.2)
  const chosen = new Set(pickDistinct(rand, candidates, budget))

  // Keep faces readable: antennae and horns together are reserved for rare creatures.
  if (chosen.has('horns') && chosen.has('antennae') && rarity < RARE_THRESHOLD) {
    chosen.delete('antennae')
  }
  return chosen
}

function rollSpineType(
  rand: Random,
  theme: ArchetypeTheme,
  plan: BodyPlan,
  tailCount: number
): Anatomy['spineType'] {
  const type = pickWeighted(rand, theme.spineTypes)
  if (type === 'tail' && tailCount === 0) return 'back'
  // A serpent's neck is the whole body, so a neck ridge would look misplaced.
  if (plan.id === 'serpent' && type === 'neck') return 'back'
  return type
}

/** Same structure, same species: individuals within a species differ only in genes and colors. */
export function computeSpeciesId(genome: Genome): number {
  const limbs = genome.limbSets.map((set) => `${set.type}${set.count}`).join(',')
  return hashString(
    [
      genome.archetype,
      genome.bodyPlan,
      genome.torsoShape,
      genome.bodyType,
      genome.size,
      limbs,
      genome.wings.pairs,
      genome.tails.count > 0,
      genome.horns.count > 0,
      genome.pattern,
    ].join('|')
  )
}
