import type { PatternType } from '@rendering/textures'
import type { Anatomy } from '../types'

export type BodyPlanId =
  | 'quadruped'
  | 'biped'
  | 'hexapod'
  | 'serpent'
  | 'winged_biped'
  | 'swimmer'
  | 'floater'
  | 'cluster'

export type Locomotion = 'walk' | 'slither' | 'swim' | 'fly' | 'drift' | 'hover'

export type LimbType = Anatomy['limbType']

/** Where a set of limbs attaches to the body. */
export type LimbLayout = 'rows' | 'shoulders' | 'sides' | 'underside' | 'ring'

export type LimbSet = {
  type: LimbType
  count: number
  layout: LimbLayout
}

export type PaletteScheme = 'analogous' | 'complementary' | 'triad' | 'split'

/** Colors stored as plain numbers so the genome stays JSON-safe. */
export type GenomePalette = {
  scheme: PaletteScheme
  baseHue: number
  accentHue: number
  patternHue: number
  saturation: number
  lightness: number
}

/** Each part family draws from its own seeded stream so edits never shift other parts. */
export type PartFamily =
  | 'body'
  | 'head'
  | 'limbs'
  | 'wings'
  | 'tails'
  | 'decor'
  | 'surface'
  | 'motion'
  | 'placement'
  | 'behavior'

export const PART_FAMILIES: readonly PartFamily[] = [
  'body',
  'head',
  'limbs',
  'wings',
  'tails',
  'decor',
  'surface',
  'motion',
  'placement',
  'behavior',
]

/** Continuous proportions, each in 0..1 and clustered around 0.5. */
export type Genes = {
  girth: number
  length: number
  head: number
  eye: number
  limb: number
  tail: number
  wing: number
  /** Emissive strength, only non-zero for rare creatures. */
  glow: number
}

export type Genome = {
  version: 1
  seed: number
  speciesId: number
  archetype: Anatomy['archetype']
  bodyPlan: BodyPlanId
  locomotion: Locomotion
  /** 0..1; also sets how many optional features the creature gets. */
  rarity: number
  size: Anatomy['size']
  temperament: Anatomy['temperament']
  bodyType: Anatomy['bodyType']
  torsoShape: Anatomy['torsoShape']
  genes: Genes
  palette: GenomePalette
  pattern: PatternType
  head: { present: boolean; eyeCount: number }
  limbSets: LimbSet[]
  wings: { pairs: number; type: Anatomy['wingType'] }
  tails: { count: number; type: Anatomy['tailType'] }
  antennae: { count: number; type: Anatomy['antennaType'] }
  ears: { count: number; type: Anatomy['earType'] }
  horns: { count: number; type: Anatomy['hornType'] }
  spines: { count: number; type: Anatomy['spineType'] }
  furTufts: boolean
  scales: boolean
  partSeeds: Record<PartFamily, number>
}
