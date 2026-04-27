import type { CreatureInstance } from '@systems/creatures'
import * as THREE from 'three'
import type { ScoreBreakdown } from './types'

interface ScoreComponents {
  centerBonus: number
  sizeBonus: number
  facing: number
  rarityBonus: number
}

function calculateScoreComponents(
  creature: CreatureInstance,
  camera: THREE.Camera
): ScoreComponents {
  const v = creature.group.position.clone().project(camera)
  const centerBonus = 1.0 - Math.min(1, v.distanceTo(new THREE.Vector3(0, 0, 0)))

  const dist = camera.position.distanceTo(creature.group.position)
  const sizeBonus = Math.max(0, 1.2 - dist / 20)

  const toCam = new THREE.Vector3().subVectors(camera.position, creature.group.position).normalize()
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(creature.group.quaternion)
  const facing = Math.max(0, forward.dot(toCam))

  const rarityBonus = 0.5 + creature.rarity

  return { centerBonus, sizeBonus, facing, rarityBonus }
}

/**
 * Calculate photo score for a creature
 */
export function scoreCreature(creature: CreatureInstance, camera: THREE.Camera): number {
  const { centerBonus, sizeBonus, facing, rarityBonus } = calculateScoreComponents(creature, camera)
  const score = Math.round((centerBonus * 40 + sizeBonus * 35 + facing * 25) * rarityBonus)
  return Math.max(0, score)
}

/**
 * Get detailed score breakdown for a creature
 */
export function getScoreBreakdown(
  creature: CreatureInstance,
  camera: THREE.Camera
): ScoreBreakdown {
  const { centerBonus, sizeBonus, facing, rarityBonus } = calculateScoreComponents(creature, camera)

  const centering = Math.round(centerBonus * 40 * rarityBonus)
  const size = Math.round(sizeBonus * 35 * rarityBonus)
  const facingScore = Math.round(facing * 25 * rarityBonus)
  const total = Math.max(0, centering + size + facingScore)

  return {
    centering,
    size,
    facing: facingScore,
    rarity: Math.round(creature.rarity * 100),
    total,
  }
}

/**
 * Get photo quality description based on score
 */
export function getPhotoQualityDescription(score: number): string {
  if (score >= 90) return 'Perfect Shot!'
  if (score >= 80) return 'Excellent!'
  if (score >= 70) return 'Great Shot!'
  if (score >= 60) return 'Good Photo'
  if (score >= 40) return 'Nice Try'
  if (score >= 20) return 'Could be Better'
  if (score > 0) return 'Needs Work'
  return 'No Subject'
}

/**
 * Generate a fun creature name based on its properties
 */
export function generateCreatureName(creature: CreatureInstance): string {
  const prefixes = [
    'Sparkle',
    'Fluffy',
    'Crystal',
    'Shadow',
    'Mystic',
    'Glowing',
    'Swift',
    'Gentle',
    'Wild',
    'Cosmic',
  ]
  const suffixes = ['wing', 'tail', 'eye', 'horn', 'fin', 'claw', 'beam', 'song', 'dance', 'spirit']

  // Use creature's rarity and position to determine name
  const seed = Math.floor(creature.rarity * 1000) + Math.floor(creature.group.position.x * 10)
  const prefixIndex = seed % prefixes.length
  const suffixIndex = Math.floor(seed / prefixes.length) % suffixes.length

  return `${prefixes[prefixIndex]}${suffixes[suffixIndex]}`
}
