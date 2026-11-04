/**
 * Combat stats (GDD 11)
 * Derived from the genome alone, with no stats of their own: size sets HP, limbs set how many
 * times a creature hits, parts give specials (horns gore, spines reflect, scales shrug off
 * damage, wings dodge, a tail sweeps), temperament leans its behaviour and archetype decides
 * matchups. Because they come from the same traits that matter for the economy, the best
 * fighter is rarely the best earner (a big, many-limbed, horned brute is a poor producer).
 */

import { GAME_CONFIG } from '@core/constants'
import type { Genome } from '@systems/creatures/genome'
import { getSizeMultiplier } from '@systems/economy'

const A = GAME_CONFIG.ECONOMY.ARENA

export const ARCHETYPE_WHEEL = [
  'terrestrial',
  'aerial',
  'aquatic',
  'ethereal',
  'crystalline',
] as const
type Archetype = (typeof ARCHETYPE_WHEEL)[number]

export interface CombatStats {
  maxHp: number
  /** Damage of one hit before matchups and specials. */
  damage: number
  hits: number
  /** Higher acts first. */
  speed: number
  /** 0..1 chances. */
  dodge: number
  crit: number
  /** Share of damage taken after armour (lower is tougher). */
  damageTaken: number
  reflect: number
  /** Bonus damage multiplier on a creature's very first hit. */
  firstStrike: number
  /** Share of a hit that also hits a second enemy. */
  splash: number
  archetype: Archetype
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function deriveCombatStats(g: Genome): CombatStats {
  const size = getSizeMultiplier(g.size)
  const rarity = 1 + g.rarity * A.RARITY_BONUS
  const limbs = g.limbSets.reduce((n, set) => n + set.count, 0)

  let maxHp = A.BASE_HP * size * (1 + g.genes.girth * 0.3) * rarity
  let damage = A.BASE_DAMAGE * (0.8 + size * 0.2) * rarity
  let speed = 10 / (0.6 + size * 0.4) + g.wings.pairs * 2 + (g.tails.count > 0 ? 1 : 0)
  let dodge = g.wings.pairs > 0 ? A.WING_DODGE : 0
  let crit = 0

  switch (g.temperament) {
    case 'aggressive':
      damage *= A.AGGRESSIVE_DAMAGE
      break
    case 'shy':
      dodge += A.SHY_DODGE
      break
    case 'territorial':
      maxHp *= A.TERRITORIAL_HP
      break
    case 'curious':
      speed *= A.CURIOUS_SPEED
      break
    case 'playful':
      crit += A.PLAYFUL_CRIT
      break
  }

  return {
    maxHp: Math.round(maxHp),
    damage,
    hits: clamp(1 + Math.floor(limbs / A.LIMBS_PER_EXTRA_HIT), 1, A.MAX_HITS),
    speed,
    dodge: clamp(dodge, 0, 0.6),
    crit,
    damageTaken: g.scales ? A.SCALE_DAMAGE_TAKEN : 1,
    reflect: g.spines.count > 0 ? A.SPINE_REFLECT : 0,
    firstStrike: g.horns.count > 0 ? A.HORN_FIRST_STRIKE : 0,
    splash: g.tails.count > 0 ? A.TAIL_SWEEP_SPLASH : 0,
    archetype: g.archetype,
  }
}

/** Damage multiplier of an attacker's archetype against a defender's. */
export function typeMultiplier(attacker: Archetype, defender: Archetype): number {
  const i = ARCHETYPE_WHEEL.indexOf(attacker)
  const j = ARCHETYPE_WHEEL.indexOf(defender)
  const step = (j - i + ARCHETYPE_WHEEL.length) % ARCHETYPE_WHEEL.length
  if (step === 1 || step === 2) return A.TYPE_ADVANTAGE
  if (step === 3 || step === 4) return A.TYPE_DISADVANTAGE
  return 1
}
