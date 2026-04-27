import { randomCenteredSeeded } from '@core/utils'
import type { Random } from '@core/types'
import type { Anatomy, CreatureArchetype } from '@systems/creatures/types'
import * as THREE from 'three'
import { createPatternTexture } from '@rendering/textures'

export interface CreaturePalette {
  base: THREE.Color
  accent: THREE.Color
}

export function makePalette(baseHue: number, rand: Random): CreaturePalette {
  const base = new THREE.Color().setHSL(baseHue, 0.6, 0.55)
  const accent = new THREE.Color().setHSL(
    (baseHue + 0.12 + randomCenteredSeeded(rand) * 0.1) % 1,
    0.7,
    0.6
  )
  return { base, accent }
}

export function getArchetypeMaterial(
  archetype: CreatureArchetype,
  palette: CreaturePalette,
  _rand: Random,
  texture?: THREE.Texture
): THREE.MeshStandardMaterial {
  const baseProps = texture ? { map: texture } : { color: palette.base }

  switch (archetype) {
    case 'terrestrial':
      return new THREE.MeshStandardMaterial({ ...baseProps, metalness: 0.1, roughness: 0.8 })
    case 'aerial':
      return new THREE.MeshStandardMaterial({ ...baseProps, metalness: 0.2, roughness: 0.6 })
    case 'aquatic':
      return new THREE.MeshStandardMaterial({ ...baseProps, metalness: 0.4, roughness: 0.3 })
    case 'ethereal':
      return new THREE.MeshStandardMaterial({
        ...baseProps,
        transparent: true,
        opacity: 0.8,
        metalness: 0.1,
        roughness: 0.9,
        emissive: new THREE.Color(palette.base).multiplyScalar(0.1),
      })
    case 'crystalline':
      return new THREE.MeshStandardMaterial({
        ...baseProps,
        metalness: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color(palette.base).multiplyScalar(0.05),
      })
  }
}

export function createCreatureMaterial(
  anatomy: Anatomy,
  palette: CreaturePalette,
  rand: Random
): THREE.MeshStandardMaterial {
  const patternTexture = createPatternTexture(
    anatomy.pattern,
    palette.base,
    anatomy.patternColor,
    anatomy.rarity * 10000
  )
  return getArchetypeMaterial(anatomy.archetype, palette, rand, patternTexture)
}
