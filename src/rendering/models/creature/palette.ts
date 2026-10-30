import type { Random } from '@core/types'
import { createPatternTexture } from '@rendering/textures'
import type { GenomePalette } from '@systems/creatures/genome/types'
import type { Anatomy, CreatureArchetype } from '@systems/creatures/types'
import * as THREE from 'three'

export interface CreaturePalette {
  base: THREE.Color
  accent: THREE.Color
}

export function makePalette(source: GenomePalette): CreaturePalette {
  const { saturation, lightness } = source
  return {
    base: new THREE.Color().setHSL(source.baseHue, saturation, lightness),
    accent: new THREE.Color().setHSL(
      source.accentHue,
      Math.min(0.95, saturation + 0.1),
      Math.min(0.85, lightness + 0.05)
    ),
  }
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
    anatomy.patternSeed
  )
  const material = getArchetypeMaterial(anatomy.archetype, palette, rand, patternTexture)

  // Rare creatures shimmer in their accent color.
  if (anatomy.genes.glow > 0) {
    material.emissive.copy(palette.accent)
    material.emissiveIntensity = 0.35 * anatomy.genes.glow
  }
  return material
}
