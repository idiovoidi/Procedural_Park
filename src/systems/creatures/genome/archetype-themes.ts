import type { PatternType } from '@rendering/textures'
import type { Anatomy, CreatureArchetype } from '../types'
import { uniform, type Weighted } from './random'
import type { PaletteScheme } from './types'

/**
 * An archetype is a theme, not a body: it sets materials, palette rules and the
 * flavor of optional parts. The body plan decides which parts exist and where.
 */
export type ArchetypeTheme = {
  sizes: Weighted<Anatomy['size']>
  temperaments: Weighted<Anatomy['temperament']>
  wingTypes: Weighted<Anatomy['wingType']>
  tailTypes: Weighted<Anatomy['tailType']>
  antennaTypes: Weighted<Anatomy['antennaType']>
  earTypes: Weighted<Anatomy['earType']>
  hornTypes: Weighted<Anatomy['hornType']>
  spineTypes: Weighted<Anatomy['spineType']>
  patterns: Weighted<PatternType>
  schemes: Weighted<PaletteScheme>
  /** Preferred hue bands (0..1). Most creatures stay inside them. */
  hueBands: ReadonlyArray<readonly [number, number]>
  saturation: readonly [number, number]
  lightness: readonly [number, number]
  /** Chance that a candidate surface feature is allowed at all. */
  furChance: number
  scaleChance: number
}

export const ARCHETYPES: readonly CreatureArchetype[] = [
  'terrestrial',
  'aerial',
  'aquatic',
  'ethereal',
  'crystalline',
]

export const ARCHETYPE_THEMES: Record<CreatureArchetype, ArchetypeTheme> = {
  terrestrial: {
    sizes: uniform('small', 'medium', 'large'),
    temperaments: uniform('shy', 'curious', 'territorial'),
    wingTypes: uniform('feather', 'membrane'),
    tailTypes: uniform('fur', 'scale'),
    antennaTypes: uniform('simple', 'feathered'),
    earTypes: uniform('pointed', 'round', 'floppy'),
    hornTypes: uniform('straight', 'curved', 'antler'),
    spineTypes: uniform('back', 'neck'),
    patterns: uniform('solid', 'spots', 'stripes', 'patches', 'tiger', 'leopard'),
    schemes: [
      ['analogous', 5],
      ['complementary', 2],
      ['split', 1],
    ],
    hueBands: [
      [0.0, 0.14],
      [0.2, 0.4],
    ],
    saturation: [0.45, 0.7],
    lightness: [0.4, 0.58],
    furChance: 0.6,
    scaleChance: 0.4,
  },
  aerial: {
    sizes: uniform('tiny', 'small', 'medium'),
    temperaments: uniform('playful', 'curious', 'shy'),
    wingTypes: uniform('feather', 'membrane'),
    tailTypes: uniform('feather', 'fur'),
    antennaTypes: uniform('feathered', 'simple'),
    earTypes: uniform('pointed', 'round'),
    hornTypes: uniform('straight', 'curved'),
    spineTypes: uniform('neck', 'tail'),
    patterns: uniform('solid', 'gradient', 'stripes', 'spots'),
    schemes: [
      ['analogous', 3],
      ['complementary', 3],
      ['triad', 2],
    ],
    hueBands: [
      [0.5, 0.75],
      [0.9, 1.0],
      [0.08, 0.16],
    ],
    saturation: [0.55, 0.8],
    lightness: [0.5, 0.65],
    furChance: 0,
    scaleChance: 0,
  },
  aquatic: {
    sizes: uniform('medium', 'large', 'huge'),
    temperaments: uniform('curious', 'territorial', 'aggressive'),
    wingTypes: uniform('membrane', 'feather'),
    tailTypes: uniform('scale', 'fur'),
    antennaTypes: uniform('simple', 'feathered'),
    earTypes: uniform('fin', 'none'),
    hornTypes: uniform('straight', 'spiral'),
    spineTypes: uniform('back', 'tail'),
    patterns: uniform('solid', 'stripes', 'gradient', 'spots'),
    schemes: [
      ['analogous', 4],
      ['complementary', 2],
      ['split', 2],
    ],
    hueBands: [
      [0.45, 0.62],
      [0.3, 0.4],
    ],
    saturation: [0.5, 0.75],
    lightness: [0.4, 0.6],
    furChance: 0,
    scaleChance: 0.8,
  },
  ethereal: {
    sizes: uniform('small', 'medium', 'large'),
    temperaments: uniform('shy', 'playful', 'curious'),
    wingTypes: uniform('energy', 'membrane'),
    tailTypes: uniform('energy', 'fur'),
    antennaTypes: uniform('energy', 'simple'),
    earTypes: uniform('pointed', 'none'),
    hornTypes: uniform('spiral', 'straight'),
    spineTypes: uniform('none'),
    patterns: uniform('gradient', 'solid'),
    schemes: [
      ['analogous', 4],
      ['triad', 3],
      ['split', 1],
    ],
    hueBands: [
      [0.72, 0.95],
      [0.5, 0.58],
    ],
    saturation: [0.35, 0.6],
    lightness: [0.62, 0.78],
    furChance: 0,
    scaleChance: 0,
  },
  crystalline: {
    sizes: uniform('tiny', 'small', 'medium'),
    temperaments: uniform('territorial', 'aggressive', 'curious'),
    wingTypes: uniform('crystal', 'membrane'),
    tailTypes: uniform('crystal', 'scale'),
    antennaTypes: uniform('crystal', 'simple'),
    earTypes: uniform('none'),
    hornTypes: uniform('straight', 'spiral'),
    spineTypes: uniform('back', 'neck', 'tail'),
    patterns: uniform('solid', 'gradient'),
    schemes: [
      ['analogous', 3],
      ['triad', 3],
      ['complementary', 2],
    ],
    hueBands: [
      [0.5, 0.6],
      [0.75, 0.9],
      [0.08, 0.14],
    ],
    saturation: [0.6, 0.9],
    lightness: [0.5, 0.68],
    furChance: 0,
    scaleChance: 0.2,
  },
}
