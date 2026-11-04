import { ARCHETYPE_THEMES } from './archetype-themes'
import { BODY_PLANS } from './body-plans'
import { computeSpeciesId, GENOME_VERSION } from './genome'
import { createSeededRandom, hashSeed, lerp, pickWeighted } from './random'
import {
  type Genes,
  type Genome,
  type GenomePalette,
  PART_FAMILIES,
  type PartFamily,
} from './types'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Average two hues on the color wheel, so 0.95 and 0.05 blend to 0.0, not 0.5. */
function blendHue(a: number, b: number, weight: number): number {
  const delta = ((((b - a) % 1) + 1.5) % 1) - 0.5
  return (((a + delta * weight) % 1) + 1) % 1
}

/**
 * Cross two genomes into a child. The child keeps one parent's body (plan,
 * torso, limbs, head) so its silhouette stays coherent, then each part group
 * comes from either parent where the child's body can carry it. Genes and
 * colors blend. The same parents and seed always give the same child.
 *
 * A child is not reproducible from its seed alone (it is not `generateGenome(seed)`),
 * so store the whole genome.
 */
export function crossover(
  a: Genome,
  b: Genome,
  seed: number,
  /** Added to the parents' average rarity (the breeding ratchet). */
  rarityLift = 0
): Genome {
  const rand = createSeededRandom(hashSeed(seed, 0xb7ee))
  const bodyParent = rand() < 0.5 ? a : b
  const pick = <T>(first: T, second: T): T => (rand() < 0.5 ? first : second)

  const genes: Genes = {
    girth: clamp01(lerp(a.genes.girth, b.genes.girth, rand())),
    length: clamp01(lerp(a.genes.length, b.genes.length, rand())),
    head: clamp01(lerp(a.genes.head, b.genes.head, rand())),
    eye: clamp01(lerp(a.genes.eye, b.genes.eye, rand())),
    limb: clamp01(lerp(a.genes.limb, b.genes.limb, rand())),
    tail: clamp01(lerp(a.genes.tail, b.genes.tail, rand())),
    wing: clamp01(lerp(a.genes.wing, b.genes.wing, rand())),
    glow: 0,
  }

  const rarity = clamp01((a.rarity + b.rarity) / 2 + rarityLift + (rand() - 0.5) * 0.1)
  genes.glow = Math.max(0, (rarity - 0.75) / 0.25)

  const blend = rand()
  const palette: GenomePalette = {
    scheme: pick(a.palette.scheme, b.palette.scheme),
    baseHue: blendHue(a.palette.baseHue, b.palette.baseHue, blend),
    accentHue: blendHue(a.palette.accentHue, b.palette.accentHue, blend),
    patternHue: blendHue(a.palette.patternHue, b.palette.patternHue, blend),
    saturation: lerp(a.palette.saturation, b.palette.saturation, blend),
    lightness: lerp(a.palette.lightness, b.palette.lightness, blend),
  }

  const partSeeds = {} as Record<PartFamily, number>
  PART_FAMILIES.forEach((family, index) => {
    partSeeds[family] = hashSeed(seed, index + 1)
  })

  const child: Genome = {
    version: GENOME_VERSION,
    seed: seed >>> 0,
    speciesId: 0,
    // Body: inherited whole from one parent
    archetype: bodyParent.archetype,
    bodyPlan: bodyParent.bodyPlan,
    locomotion: bodyParent.locomotion,
    torsoShape: bodyParent.torsoShape,
    bodyType: bodyParent.bodyType,
    limbSets: bodyParent.limbSets.map((set) => ({ ...set })),
    head: { ...bodyParent.head },
    size: pick(a.size, b.size),
    temperament: pick(a.temperament, b.temperament),
    rarity,
    genes,
    palette,
    pattern: pick(a.pattern, b.pattern),
    // Part groups: from either parent, repaired below to fit the child's body
    wings: { ...pick(a.wings, b.wings) },
    tails: { ...pick(a.tails, b.tails) },
    antennae: { ...pick(a.antennae, b.antennae) },
    ears: { ...pick(a.ears, b.ears) },
    horns: { ...pick(a.horns, b.horns) },
    spines: { ...pick(a.spines, b.spines) },
    furTufts: pick(a.furTufts, b.furTufts),
    scales: pick(a.scales, b.scales),
    partSeeds,
  }

  repairGenome(child)
  child.speciesId = computeSpeciesId(child)
  return child
}

/**
 * Randomly nudge a genome: jitter genes and colors, and occasionally swap a
 * part's style for another from the archetype's theme. Rate is 0..1; 0.1 is subtle.
 */
export function mutate(genome: Genome, rate: number, seed: number): Genome {
  const rand = createSeededRandom(hashSeed(seed, 0x4d75))
  const theme = ARCHETYPE_THEMES[genome.archetype]
  const child: Genome = structuredClone(genome)
  child.seed = seed >>> 0

  const jitter = (value: number) => clamp01(value + (rand() - 0.5) * 2 * rate * 0.5)
  for (const key of ['girth', 'length', 'head', 'eye', 'limb', 'tail', 'wing'] as const) {
    child.genes[key] = jitter(child.genes[key])
  }
  child.rarity = jitter(child.rarity)
  child.genes.glow = Math.max(0, (child.rarity - 0.75) / 0.25)

  const hueShift = (rand() - 0.5) * rate * 0.3
  const wrapHue = (hue: number) => hue - Math.floor(hue)
  child.palette.baseHue = wrapHue(child.palette.baseHue + hueShift)
  child.palette.accentHue = wrapHue(child.palette.accentHue + hueShift)
  child.palette.patternHue = wrapHue(child.palette.patternHue + hueShift)

  // Style swaps: each existing part may take a different style from the theme
  if (rand() < rate) child.wings.type = pickWeighted(rand, theme.wingTypes)
  if (rand() < rate) child.tails.type = pickWeighted(rand, theme.tailTypes)
  if (rand() < rate) child.pattern = pickWeighted(rand, theme.patterns)
  if (child.horns.count > 0 && rand() < rate) child.horns.type = pickWeighted(rand, theme.hornTypes)
  if (child.antennae.count > 0 && rand() < rate) {
    child.antennae.type = pickWeighted(rand, theme.antennaTypes)
  }

  PART_FAMILIES.forEach((family, index) => {
    child.partSeeds[family] = hashSeed(seed, index + 1)
  })

  repairGenome(child)
  child.speciesId = computeSpeciesId(child)
  return child
}

export interface GainedTrait {
  genome: Genome
  /** What appeared, in plain words ("horns", "wings", a new colour ...), or null if nothing could. */
  trait: string | null
}

/**
 * A mutation that gives a genome something neither parent had: a body part the plan allows, or a
 * colour outside the family's palette. The part list is shuffled by the seed and the first that
 * fits is added, so the same seed always grows the same thing. Species identity is recomputed,
 * so a gained part can make a new species.
 */
export function gainTrait(genome: Genome, seed: number): GainedTrait {
  const rand = createSeededRandom(hashSeed(seed, 0x6e6577))
  const theme = ARCHETYPE_THEMES[genome.archetype]
  const plan = BODY_PLANS[genome.bodyPlan]
  const child: Genome = structuredClone(genome)

  type Option = { name: string; apply: () => void }
  const options: Option[] = []
  if (plan.wingChance > 0 && child.wings.pairs === 0) {
    options.push({
      name: 'wings',
      apply: () => {
        child.wings = {
          pairs: pickWeighted(rand, plan.wingPairs) || 1,
          type: pickWeighted(rand, theme.wingTypes),
        }
      },
    })
  }
  if (plan.tailChance > 0 && child.tails.count === 0) {
    options.push({
      name: 'a tail',
      apply: () => {
        child.tails = { count: 1, type: pickWeighted(rand, theme.tailTypes) }
      },
    })
  }
  if (
    child.head.present &&
    child.horns.count === 0 &&
    (child.antennae.count === 0 || child.rarity >= 0.85)
  ) {
    options.push({
      name: 'horns',
      apply: () => {
        child.horns = { count: 2, type: pickWeighted(rand, theme.hornTypes) }
      },
    })
  }
  if (child.head.present && child.antennae.count === 0 && child.horns.count === 0) {
    options.push({
      name: 'antennae',
      apply: () => {
        child.antennae = { count: 2, type: pickWeighted(rand, theme.antennaTypes) }
      },
    })
  }
  if (child.head.present && child.ears.count === 0) {
    options.push({
      name: 'ears',
      apply: () => {
        // Some themes list 'none' among the ear styles; a gained ear must be a real one.
        let type = pickWeighted(rand, theme.earTypes)
        for (let i = 0; i < 8 && type === 'none'; i++) type = pickWeighted(rand, theme.earTypes)
        child.ears = { count: 2, type: type === 'none' ? 'round' : type }
      },
    })
  }
  if (child.spines.count === 0) {
    options.push({
      name: 'spines',
      apply: () => {
        child.spines = { count: 4, type: 'back' }
      },
    })
  }
  if (!child.furTufts) options.push({ name: 'fur tufts', apply: () => (child.furTufts = true) })
  if (!child.scales) options.push({ name: 'scales', apply: () => (child.scales = true) })
  // A colour the family never shows: swing the hue well outside its usual bands.
  options.push({
    name: 'a new colour',
    apply: () => {
      const swing = 0.25 + rand() * 0.3
      const wrap = (hue: number) => hue - Math.floor(hue)
      child.palette.baseHue = wrap(child.palette.baseHue + swing)
      child.palette.accentHue = wrap(child.palette.accentHue + swing)
      child.palette.patternHue = wrap(child.palette.patternHue + swing)
    },
  })

  const pick = options[Math.floor(rand() * options.length)]
  pick.apply()
  repairGenome(child)
  child.speciesId = computeSpeciesId(child)
  return { genome: child, trait: pick.name }
}

/** Bring a genome back inside the body plan's rules after parts were mixed. */
function repairGenome(genome: Genome): void {
  const plan = BODY_PLANS[genome.bodyPlan]

  if (plan.wingChance === 0) genome.wings.pairs = 0
  if (plan.tailChance === 0) genome.tails.count = 0

  if (!genome.head.present) {
    genome.head.eyeCount = 0
    genome.horns = { count: 0, type: 'none' }
    genome.ears = { count: 0, type: 'none' }
    genome.antennae.count = 0
  }

  if (genome.spines.type === 'tail' && genome.tails.count === 0) genome.spines.type = 'back'
  if (genome.spines.type === 'neck' && genome.bodyPlan === 'serpent') genome.spines.type = 'back'
  if (genome.spines.count === 0) genome.spines.type = 'none'
  if (genome.spines.count > 0 && genome.spines.type === 'none') genome.spines.count = 0

  if (genome.horns.count === 0) genome.horns.type = 'none'
  if (genome.ears.type === 'none') genome.ears.count = 0

  // Horns and antennae together are reserved for rare creatures
  if (genome.horns.count > 0 && genome.antennae.count > 0 && genome.rarity < 0.85) {
    genome.antennae.count = 0
  }
}
