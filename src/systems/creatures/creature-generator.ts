import type { Random } from '@core/types'
import { randomCenteredSeeded } from '@core/utils'
import type { PatternType } from '@rendering/textures'
import { createRng } from '@systems/terrain/noise-utils'
import * as THREE from 'three'
import type { Anatomy, BodyType, CreatureArchetype } from './types'

export function choose<T>(rand: Random, items: T[]): T {
  return items[Math.floor(rand() * items.length)]
}

export function rangeInt(rand: Random, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

export function normalish(rand: Random): number {
  // Box–Muller-like without expensive trig; sum of uniforms -> approx normal
  return (rand() + rand() + rand() + rand()) / 4
}

export function generateAnatomy(rand: Random): Anatomy {
  const baseHue = rand()
  const rarity = rand()

  // Determine archetype first, as it influences other traits
  const archetype = choose(rand, [
    'terrestrial',
    'aerial',
    'aquatic',
    'ethereal',
    'crystalline',
  ] as const)

  // Archetype-influenced traits
  const torsoShape = getArchetypeShape(archetype, rand)
  const bodyType = getArchetypeBodyType(archetype, rand)
  const size = getArchetypeSize(archetype, rand)
  const temperament = getArchetypeTemperament(archetype, rand)

  const hasHead = archetype !== 'ethereal' || rand() > 0.3
  const eyeCount =
    archetype === 'crystalline'
      ? rangeInt(rand, 1, 8)
      : archetype === 'ethereal'
        ? rangeInt(rand, 0, 4)
        : rand() > 0.8
          ? rangeInt(rand, 3, 6)
          : 2

  const limbType = getArchetypeLimbType(archetype, rand)
  const limbCount = getArchetypeLimbCount(archetype, limbType, rand)

  const wingCount = getArchetypeWingCount(archetype, rand)
  const wingType = getArchetypeWingType(archetype, rand)

  const tailCount = rand() > 0.6 ? rangeInt(rand, 1, 2) : 0
  const tailType = getArchetypeTailType(archetype, rand)

  const antennaCount = hasHead && rand() > 0.5 ? rangeInt(rand, 1, 4) : 0
  const antennaType = getArchetypeAntennaType(archetype, rand)

  // New decorative features - increased probabilities for visibility
  const earCount = hasHead && rand() > 0.3 ? 2 : 0
  const earType = getArchetypeEarType(archetype, rand)

  const hornCount = hasHead && rand() > 0.5 ? rangeInt(rand, 1, 3) : 0
  const hornType = getArchetypeHornType(archetype, rand)

  const spineCount = rand() > 0.4 ? rangeInt(rand, 4, 10) : 0
  const spineType = getArchetypeSpineType(archetype, rand)

  const furTufts = archetype === 'terrestrial' && rand() > 0.5
  const hasScales = (archetype === 'aquatic' || archetype === 'terrestrial') && rand() > 0.4

  // Pattern and color variations
  const pattern = getArchetypePattern(archetype, rand)
  const patternColor = new THREE.Color().setHSL(
    (baseHue + 0.5 + randomCenteredSeeded(rand) * 0.2) % 1,
    0.7,
    0.4
  )
  const bellyColor = new THREE.Color().setHSL(baseHue, 0.3, 0.75)

  return {
    archetype,
    torsoShape,
    bodyType,
    hasHead,
    headSize: hasHead ? 0.5 + rand() * 0.8 : 0,
    eyeCount,
    eyeSize: hasHead ? 0.06 + rand() * 0.12 : 0,
    limbCount,
    limbType,
    wingCount,
    wingType,
    tailCount,
    tailType,
    antennaCount,
    antennaType,
    earCount,
    earType,
    hornCount,
    hornType,
    spineCount,
    spineType,
    furTufts,
    hasScales,
    pattern,
    patternColor,
    bellyColor,
    baseHue,
    rarity,
    size,
    temperament,
  }
}

function getArchetypeShape(archetype: CreatureArchetype, rand: Random): Anatomy['torsoShape'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['sphere', 'ellipsoid', 'capsule', 'box'])
    case 'aerial':
      return choose(rand, ['ellipsoid', 'capsule'])
    case 'aquatic':
      return choose(rand, ['ellipsoid', 'capsule'])
    case 'ethereal':
      return choose(rand, ['cloud', 'sphere'])
    case 'crystalline':
      return choose(rand, ['crystal', 'box'])
  }
}

function getArchetypeBodyType(archetype: CreatureArchetype, rand: Random): BodyType {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['chubby', 'muscular', 'compact', 'bulky'])
    case 'aerial':
      return choose(rand, ['sleek', 'lanky', 'compact'])
    case 'aquatic':
      return choose(rand, ['sleek', 'muscular', 'bulky'])
    case 'ethereal':
      return choose(rand, ['lanky', 'sleek', 'compact'])
    case 'crystalline':
      return choose(rand, ['compact', 'bulky', 'lanky'])
  }
}

function getArchetypeSize(archetype: CreatureArchetype, rand: Random): Anatomy['size'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['small', 'medium', 'large'])
    case 'aerial':
      return choose(rand, ['tiny', 'small', 'medium'])
    case 'aquatic':
      return choose(rand, ['medium', 'large', 'huge'])
    case 'ethereal':
      return choose(rand, ['small', 'medium', 'large'])
    case 'crystalline':
      return choose(rand, ['tiny', 'small', 'medium'])
  }
}

function getArchetypeTemperament(
  archetype: CreatureArchetype,
  rand: Random
): Anatomy['temperament'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['shy', 'curious', 'territorial'])
    case 'aerial':
      return choose(rand, ['playful', 'curious', 'shy'])
    case 'aquatic':
      return choose(rand, ['curious', 'territorial', 'aggressive'])
    case 'ethereal':
      return choose(rand, ['shy', 'playful', 'curious'])
    case 'crystalline':
      return choose(rand, ['territorial', 'aggressive', 'curious'])
  }
}

function getArchetypeLimbType(archetype: CreatureArchetype, rand: Random): Anatomy['limbType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['leg', 'arm'])
    case 'aerial':
      return choose(rand, ['leg', 'arm'])
    case 'aquatic':
      return choose(rand, ['fin', 'tendril'])
    case 'ethereal':
      return choose(rand, ['tendril', 'arm'])
    case 'crystalline':
      return choose(rand, ['crystal_shard', 'leg'])
  }
}

function getArchetypeLimbCount(
  archetype: CreatureArchetype,
  limbType: Anatomy['limbType'],
  rand: Random
): number {
  switch (archetype) {
    case 'terrestrial':
      // Most terrestrial animals have 4 legs, some have 2 or 6
      if (limbType === 'leg') {
        const roll = rand()
        if (roll < 0.7) return 4 // Most common
        if (roll < 0.85) return 2 // Bipedal
        return 6 // Insect-like
      }
      return rangeInt(rand, 0, 2)
    case 'aerial':
      // Birds typically have 2 legs
      if (limbType === 'leg') return 2
      return rangeInt(rand, 0, 2)
    case 'aquatic':
      // Fish have fins, varying amounts
      return rangeInt(rand, 2, 6)
    case 'ethereal':
      // Ethereal creatures can have any number
      return rangeInt(rand, 0, 6)
    case 'crystalline':
      // Crystalline creatures have many shards
      return rangeInt(rand, 3, 12)
  }
}

function getArchetypeWingCount(archetype: CreatureArchetype, rand: Random): number {
  switch (archetype) {
    case 'terrestrial':
      return rand() > 0.8 ? rangeInt(rand, 2, 4) : 0
    case 'aerial':
      return rangeInt(rand, 2, 6)
    case 'aquatic':
      return rand() > 0.7 ? rangeInt(rand, 2, 4) : 0
    case 'ethereal':
      return rangeInt(rand, 0, 8)
    case 'crystalline':
      return rand() > 0.6 ? rangeInt(rand, 2, 6) : 0
  }
}

function getArchetypeWingType(archetype: CreatureArchetype, rand: Random): Anatomy['wingType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['feather', 'membrane'])
    case 'aerial':
      return choose(rand, ['feather', 'membrane'])
    case 'aquatic':
      return choose(rand, ['membrane', 'feather'])
    case 'ethereal':
      return choose(rand, ['energy', 'membrane'])
    case 'crystalline':
      return choose(rand, ['crystal', 'membrane'])
  }
}

function getArchetypeTailType(archetype: CreatureArchetype, rand: Random): Anatomy['tailType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['fur', 'scale'])
    case 'aerial':
      return choose(rand, ['feather', 'fur'])
    case 'aquatic':
      return choose(rand, ['scale', 'fur'])
    case 'ethereal':
      return choose(rand, ['energy', 'fur'])
    case 'crystalline':
      return choose(rand, ['crystal', 'scale'])
  }
}

function getArchetypeAntennaType(
  archetype: CreatureArchetype,
  rand: Random
): Anatomy['antennaType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['simple', 'feathered'])
    case 'aerial':
      return choose(rand, ['feathered', 'simple'])
    case 'aquatic':
      return choose(rand, ['simple', 'feathered'])
    case 'ethereal':
      return choose(rand, ['energy', 'simple'])
    case 'crystalline':
      return choose(rand, ['crystal', 'simple'])
  }
}

function getArchetypeEarType(archetype: CreatureArchetype, rand: Random): Anatomy['earType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['pointed', 'round', 'floppy'])
    case 'aerial':
      return choose(rand, ['pointed', 'round'])
    case 'aquatic':
      return choose(rand, ['fin', 'none'])
    case 'ethereal':
      return choose(rand, ['pointed', 'none'])
    case 'crystalline':
      return 'none'
  }
}

function getArchetypeHornType(archetype: CreatureArchetype, rand: Random): Anatomy['hornType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['straight', 'curved', 'antler'])
    case 'aerial':
      return choose(rand, ['straight', 'curved'])
    case 'aquatic':
      return choose(rand, ['straight', 'spiral'])
    case 'ethereal':
      return choose(rand, ['spiral', 'straight'])
    case 'crystalline':
      return choose(rand, ['straight', 'spiral'])
  }
}

function getArchetypeSpineType(archetype: CreatureArchetype, rand: Random): Anatomy['spineType'] {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['back', 'neck'])
    case 'aerial':
      return choose(rand, ['neck', 'tail'])
    case 'aquatic':
      return choose(rand, ['back', 'tail'])
    case 'ethereal':
      return 'none'
    case 'crystalline':
      return choose(rand, ['back', 'neck', 'tail'])
  }
}

function getArchetypePattern(archetype: CreatureArchetype, rand: Random): PatternType {
  switch (archetype) {
    case 'terrestrial':
      return choose(rand, ['solid', 'spots', 'stripes', 'patches', 'tiger', 'leopard'])
    case 'aerial':
      return choose(rand, ['solid', 'gradient', 'stripes', 'spots'])
    case 'aquatic':
      return choose(rand, ['solid', 'stripes', 'gradient', 'spots'])
    case 'ethereal':
      return choose(rand, ['gradient', 'solid'])
    case 'crystalline':
      return choose(rand, ['solid', 'gradient'])
  }
}
