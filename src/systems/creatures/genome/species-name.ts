import type { CreatureArchetype } from '../types'
import { choose, createSeededRandom, hashSeed } from './random'
import type { BodyPlanId, Genome } from './types'

const SYLLABLES: Record<CreatureArchetype, { start: string[]; mid: string[]; end: string[] }> = {
  terrestrial: {
    start: ['Bor', 'Gru', 'Tum', 'Wom', 'Kel', 'Mog', 'Dun', 'Rok'],
    mid: ['a', 'o', 'u', 'em'],
    end: ['bat', 'rin', 'duk', 'mus', 'gor', 'bek'],
  },
  aerial: {
    start: ['Fli', 'Zep', 'Lir', 'Pip', 'Sky', 'Tre', 'Wis', 'Cal'],
    mid: ['e', 'i', 'ra', 'li'],
    end: ['ra', 'wing', 'let', 'sa', 'ki', 'ore'],
  },
  aquatic: {
    start: ['Nau', 'Mar', 'Bri', 'Sal', 'Oro', 'Lum', 'Tid', 'Kor'],
    mid: ['a', 'i', 'o', 'el'],
    end: ['lu', 'fin', 'ora', 'sel', 'mos', 'dra'],
  },
  ethereal: {
    start: ['Vel', 'Ily', 'Nyx', 'Sel', 'Ae', 'Lun', 'Wyl', 'Ori'],
    mid: ['a', 'i', 'e', 'yu'],
    end: ['ra', 'lis', 'eth', 'nia', 'wen', 'ae'],
  },
  crystalline: {
    start: ['Qua', 'Prs', 'Kri', 'Zel', 'Vex', 'Ort', 'Cyn', 'Ber'],
    mid: ['a', 'i', 'y', 'o'],
    end: ['ix', 'ite', 'orb', 'yth', 'ax', 'ulm'],
  },
}

const PLAN_NOUNS: Record<BodyPlanId, string[]> = {
  quadruped: ['Trotter', 'Grazer', 'Prowler'],
  biped: ['Strider', 'Hopper', 'Wanderer'],
  hexapod: ['Skitterer', 'Crawler', 'Scuttler'],
  serpent: ['Coil', 'Slider', 'Wyrm'],
  winged_biped: ['Glider', 'Flitter', 'Soarer'],
  swimmer: ['Finback', 'Darter', 'Drifter'],
  floater: ['Wisp', 'Bloom', 'Drifter'],
  cluster: ['Shard', 'Prism', 'Geode'],
}

/**
 * Stable species name derived from the genome's structure.
 * Creatures with the same structure share a name; the rarity tag is left to the UI.
 */
export function generateSpeciesName(genome: Genome): string {
  const rand = createSeededRandom(hashSeed(genome.speciesId, 0x4e41))
  const set = SYLLABLES[genome.archetype]
  const middle = rand() < 0.5 ? choose(rand, set.mid) : ''
  const word = `${choose(rand, set.start)}${middle}${choose(rand, set.end)}`
  const noun = choose(rand, PLAN_NOUNS[genome.bodyPlan])
  return `${word} ${noun}`
}
