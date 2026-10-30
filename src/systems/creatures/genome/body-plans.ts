import type { Anatomy, BodyType, CreatureArchetype } from '../types'
import { uniform, type Weighted } from './random'
import type { BodyPlanId, LimbLayout, LimbType, Locomotion } from './types'

/** Optional surface and head features a plan may grow, spent from the rarity budget. */
export type ExtraId = 'horns' | 'ears' | 'antennae' | 'spines' | 'fur' | 'scales'

export type LimbRule = {
  type: Weighted<LimbType>
  /** Total limbs in the set. Pairs lay out symmetrically; odd counts add a centerline limb. */
  count: Weighted<number>
  layout: LimbLayout
  /** Chance the set exists at all. */
  chance: number
}

export type BodyPlan = {
  id: BodyPlanId
  locomotion: Locomotion
  /** How often each archetype picks this plan. Missing archetypes never do. */
  archetypes: Partial<Record<CreatureArchetype, number>>
  torso: Weighted<Anatomy['torsoShape']>
  bodyTypes: Weighted<BodyType>
  /** Base proportions multiplied into the body-type and gene scaling. */
  proportion: { width: number; height: number; length: number }
  /** Where the head sits as a fraction of body half-height; 1 is the back line. */
  headLift: number
  headChance: number
  eyes: Weighted<number>
  limbs: LimbRule[]
  wingChance: number
  wingPairs: Weighted<number>
  tailChance: number
  extras: Weighted<ExtraId>
}

const DEFAULT_EYES: Weighted<number> = [
  [2, 84],
  [1, 6],
  [4, 8],
  [3, 2],
]

export const BODY_PLANS: Record<BodyPlanId, BodyPlan> = {
  quadruped: {
    id: 'quadruped',
    locomotion: 'walk',
    archetypes: { terrestrial: 6, crystalline: 1, ethereal: 0.5 },
    torso: [
      ['capsule', 4],
      ['ellipsoid', 2],
      ['box', 2],
      ['sphere', 1],
    ],
    bodyTypes: [
      ['chubby', 2],
      ['muscular', 3],
      ['compact', 2],
      ['bulky', 2],
      ['sleek', 1],
      ['lanky', 1],
    ],
    proportion: { width: 1, height: 1, length: 1.1 },
    headLift: 0.35,
    headChance: 1,
    eyes: DEFAULT_EYES,
    limbs: [{ type: uniform('leg'), count: [[4, 1]], layout: 'rows', chance: 1 }],
    wingChance: 0.08,
    wingPairs: [[1, 1]],
    tailChance: 0.8,
    extras: [
      ['horns', 3],
      ['ears', 4],
      ['spines', 2],
      ['fur', 3],
      ['scales', 2],
      ['antennae', 0.5],
    ],
  },
  biped: {
    id: 'biped',
    locomotion: 'walk',
    archetypes: { terrestrial: 3, aerial: 1.5, ethereal: 1, crystalline: 1 },
    torso: [
      ['sphere', 3],
      ['capsule', 3],
      ['ellipsoid', 1],
    ],
    bodyTypes: [
      ['chubby', 2],
      ['muscular', 2],
      ['lanky', 3],
      ['compact', 2],
      ['sleek', 1],
    ],
    proportion: { width: 0.95, height: 1.35, length: 0.85 },
    headLift: 0.8,
    headChance: 1,
    eyes: DEFAULT_EYES,
    limbs: [
      { type: uniform('leg'), count: [[2, 1]], layout: 'rows', chance: 1 },
      { type: uniform('arm'), count: [[2, 1]], layout: 'shoulders', chance: 0.75 },
    ],
    wingChance: 0.1,
    wingPairs: [[1, 1]],
    tailChance: 0.55,
    extras: [
      ['horns', 3],
      ['ears', 4],
      ['antennae', 2],
      ['spines', 1.5],
      ['fur', 2],
      ['scales', 1.5],
    ],
  },
  hexapod: {
    id: 'hexapod',
    locomotion: 'walk',
    archetypes: { terrestrial: 2, crystalline: 1.5 },
    torso: [
      ['ellipsoid', 4],
      ['capsule', 2],
      ['box', 1],
    ],
    bodyTypes: [
      ['compact', 3],
      ['sleek', 2],
      ['lanky', 2],
      ['bulky', 1],
    ],
    proportion: { width: 1, height: 0.75, length: 1.25 },
    headLift: 0.3,
    headChance: 1,
    eyes: [
      [2, 45],
      [4, 40],
      [6, 15],
    ],
    limbs: [{ type: uniform('leg'), count: [[6, 1]], layout: 'rows', chance: 1 }],
    wingChance: 0.3,
    wingPairs: [[1, 1]],
    tailChance: 0.25,
    extras: [
      ['antennae', 5],
      ['horns', 2],
      ['spines', 3],
      ['scales', 3],
    ],
  },
  serpent: {
    id: 'serpent',
    locomotion: 'slither',
    archetypes: { terrestrial: 1, aquatic: 2, ethereal: 1.5 },
    torso: [['segmented', 1]],
    bodyTypes: [
      ['sleek', 4],
      ['lanky', 2],
      ['muscular', 2],
    ],
    proportion: { width: 0.9, height: 0.9, length: 1.2 },
    headLift: 0.1,
    headChance: 1,
    eyes: [
      [2, 88],
      [4, 12],
    ],
    limbs: [],
    wingChance: 0.1,
    wingPairs: [[1, 1]],
    tailChance: 0,
    extras: [
      ['spines', 5],
      ['horns', 3],
      ['scales', 4],
      ['ears', 0.5],
    ],
  },
  winged_biped: {
    id: 'winged_biped',
    locomotion: 'fly',
    archetypes: { aerial: 6, ethereal: 1, crystalline: 0.5 },
    torso: [
      ['ellipsoid', 4],
      ['sphere', 3],
      ['capsule', 2],
    ],
    bodyTypes: [
      ['sleek', 4],
      ['lanky', 2],
      ['compact', 3],
    ],
    proportion: { width: 0.85, height: 1.05, length: 1.05 },
    headLift: 0.6,
    headChance: 1,
    eyes: DEFAULT_EYES,
    limbs: [{ type: uniform('leg'), count: [[2, 1]], layout: 'rows', chance: 1 }],
    wingChance: 1,
    wingPairs: [
      [1, 6],
      [2, 3],
      [3, 1],
    ],
    tailChance: 0.85,
    extras: [
      ['antennae', 3],
      ['horns', 2],
      ['ears', 2],
      ['spines', 1.5],
    ],
  },
  swimmer: {
    id: 'swimmer',
    locomotion: 'swim',
    archetypes: { aquatic: 6, ethereal: 0.5 },
    torso: [
      ['ellipsoid', 4],
      ['capsule', 2],
    ],
    bodyTypes: [
      ['sleek', 4],
      ['muscular', 3],
      ['bulky', 2],
    ],
    proportion: { width: 0.9, height: 0.95, length: 1.25 },
    headLift: 0.05,
    headChance: 1,
    eyes: [
      [2, 90],
      [1, 5],
      [4, 5],
    ],
    limbs: [
      {
        type: uniform('fin'),
        count: [
          [2, 3],
          [4, 2],
        ],
        layout: 'sides',
        chance: 1,
      },
    ],
    wingChance: 0.08,
    wingPairs: [[1, 1]],
    tailChance: 1,
    extras: [
      ['spines', 4],
      ['scales', 4],
      ['horns', 2],
      ['ears', 1.5],
    ],
  },
  floater: {
    id: 'floater',
    locomotion: 'drift',
    archetypes: { ethereal: 5, aquatic: 1.5, crystalline: 0.5 },
    torso: [
      ['cloud', 4],
      ['sphere', 2],
    ],
    bodyTypes: [
      ['lanky', 2],
      ['sleek', 2],
      ['compact', 3],
    ],
    proportion: { width: 1, height: 1, length: 1 },
    headLift: 0.3,
    headChance: 0.55,
    eyes: [
      [1, 35],
      [2, 30],
      [3, 15],
      [4, 10],
      [0, 10],
    ],
    limbs: [
      {
        type: uniform('tendril'),
        count: [
          [3, 2],
          [4, 3],
          [5, 2],
          [6, 2],
          [8, 1],
        ],
        layout: 'underside',
        chance: 1,
      },
    ],
    wingChance: 0.3,
    wingPairs: [
      [1, 3],
      [2, 2],
      [3, 1],
    ],
    tailChance: 0.3,
    extras: [
      ['antennae', 3],
      ['horns', 2],
      ['ears', 1],
    ],
  },
  cluster: {
    id: 'cluster',
    locomotion: 'hover',
    archetypes: { crystalline: 6, ethereal: 0.5 },
    torso: [
      ['crystal', 4],
      ['box', 1],
    ],
    bodyTypes: [
      ['compact', 3],
      ['bulky', 2],
      ['lanky', 2],
    ],
    proportion: { width: 1, height: 1.1, length: 1 },
    headLift: 0.5,
    headChance: 0.6,
    eyes: [
      [1, 35],
      [2, 25],
      [3, 20],
      [4, 20],
    ],
    limbs: [
      {
        type: uniform('crystal_shard'),
        count: [
          [3, 1],
          [4, 2],
          [6, 3],
          [8, 2],
          [10, 1],
        ],
        layout: 'ring',
        chance: 1,
      },
    ],
    wingChance: 0.35,
    wingPairs: [
      [1, 4],
      [2, 2],
      [3, 1],
    ],
    tailChance: 0.3,
    extras: [
      ['horns', 3],
      ['antennae', 3],
      ['spines', 3],
    ],
  },
}

export const BODY_PLAN_IDS = Object.keys(BODY_PLANS) as BodyPlanId[]

/** Plans an archetype can use, weighted by how often it picks each one. */
export function plansForArchetype(archetype: CreatureArchetype): Weighted<BodyPlanId> {
  const entries: Array<readonly [BodyPlanId, number]> = []
  for (const id of BODY_PLAN_IDS) {
    const weight = BODY_PLANS[id].archetypes[archetype]
    if (weight) entries.push([id, weight])
  }
  return entries
}
