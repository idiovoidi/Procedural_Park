import { getSizeMultiplier } from '@rendering/models/creature/body-types'
import * as THREE from 'three'
import type { Anatomy } from '../types'
import type { Genome } from './types'

/**
 * Flatten a genome into the `Anatomy` view that behavior, scoring, UI and card
 * export read. Absolute measurements are scaled from the creature's size, so a
 * tiny creature gets a proportionally small head and eyes.
 */
export function deriveAnatomy(genome: Genome): Anatomy {
  const { genes, palette, head } = genome
  const sizeMultiplier = getSizeMultiplier(genome.size)
  const primaryLimbs = genome.limbSets[0]
  const eyeCrowding = head.eyeCount > 2 ? 0.8 : 1

  return {
    archetype: genome.archetype,
    bodyPlan: genome.bodyPlan,
    locomotion: genome.locomotion,
    limbSets: genome.limbSets,
    genes,
    patternSeed: genome.partSeeds.surface,
    torsoShape: genome.torsoShape,
    bodyType: genome.bodyType,
    hasHead: head.present,
    headSize: head.present ? (0.42 + 0.3 * genes.head) * sizeMultiplier : 0,
    eyeCount: head.eyeCount,
    eyeSize: head.present
      ? (0.07 + 0.08 * genes.eye) * (0.55 + 0.45 * sizeMultiplier) * eyeCrowding
      : 0,
    limbCount: genome.limbSets.reduce((total, set) => total + set.count, 0),
    limbType: primaryLimbs?.type ?? 'leg',
    wingCount: genome.wings.pairs * 2,
    wingType: genome.wings.type,
    tailCount: genome.tails.count,
    tailType: genome.tails.type,
    antennaCount: genome.antennae.count,
    antennaType: genome.antennae.type,
    earCount: genome.ears.count,
    earType: genome.ears.type,
    hornCount: genome.horns.count,
    hornType: genome.horns.type,
    spineCount: genome.spines.count,
    spineType: genome.spines.type,
    furTufts: genome.furTufts,
    hasScales: genome.scales,
    pattern: genome.pattern,
    patternColor: new THREE.Color().setHSL(palette.patternHue, 0.7, 0.4),
    bellyColor: new THREE.Color().setHSL(palette.baseHue, 0.3, 0.75),
    baseHue: palette.baseHue,
    rarity: genome.rarity,
    size: genome.size,
    temperament: genome.temperament,
  }
}
