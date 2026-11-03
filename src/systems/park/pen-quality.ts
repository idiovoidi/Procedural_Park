/**
 * Pen quality
 * Pure scoring of how well a pen suits the creatures living in it (GDD 5.2).
 *
 * Each creature gets six requirement scores (0..1) built from its derived needs
 * (`getHabitatNeeds`, `canShareEnclosure`) and the pen's measured profile. The weighted mean
 * is the pen quality, which later multiplies the creature's happiness and so its output.
 * Nothing here changes any state.
 */

import { GAME_CONFIG } from '@core/constants'
import type { Genome } from '@systems/creatures/genome'
import { canShareEnclosure, getHabitatNeeds } from '@systems/economy'
import {
  ENRICHMENT_PROPS,
  type EnclosureLevel,
  type OccupantQuality,
  type Pen,
  type PenOccupant,
  type PenQualityReport,
  type RequirementKey,
  type RequirementResult,
  type RequirementStatus,
} from './types'

const {
  WATER_FRACTION_REQUIRED,
  ENRICHMENT_PROPS_PER_CREATURE,
  ENCLOSURE_SHORTFALL_SCORE,
  QUALITY_WEIGHTS,
  STATUS_THRESHOLDS,
} = GAME_CONFIG.PARK

const ENCLOSURE_RANK: Record<EnclosureLevel, number> = { fenced: 0, tall: 1, roofed: 2 }

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))
const round1 = (n: number): string => (Math.round(n * 10) / 10).toString()

export function statusFor(score: number): RequirementStatus {
  if (score >= STATUS_THRESHOLDS.good) return 'good'
  if (score >= STATUS_THRESHOLDS.warn) return 'warn'
  return 'bad'
}

function result(score: number, detail: string): RequirementResult {
  const clamped = clamp01(score)
  return { score: clamped, status: statusFor(clamped), detail }
}

/** Floor area the occupants need in total, in square metres. */
function requiredAreaM2(occupants: readonly PenOccupant[]): number {
  return occupants.reduce((sum, o) => sum + getHabitatNeeds(o.genome).areaM2, 0)
}

/** Area still free once every occupant has its share (never negative). */
export function freeAreaM2(pen: Pen, occupants: readonly PenOccupant[]): number {
  return Math.max(0, pen.areaM2 - requiredAreaM2(occupants))
}

/** Pairs of occupants that can't share a pen. */
export function findConflicts(occupants: readonly PenOccupant[]): Array<[string, string]> {
  const conflicts: Array<[string, string]> = []
  for (let i = 0; i < occupants.length; i++) {
    for (let j = i + 1; j < occupants.length; j++) {
      if (!canShareEnclosure(occupants[i].genome, occupants[j].genome)) {
        conflicts.push([occupants[i].id, occupants[j].id])
      }
    }
  }
  return conflicts
}

/**
 * Could this creature be added to the pen? It must fit in the floor area and be able to
 * get along with everyone already there.
 */
export function canAddOccupant(
  pen: Pen,
  occupants: readonly PenOccupant[],
  candidate: Genome
): { ok: true } | { ok: false; reason: 'space' | 'company' } {
  if (occupants.some((o) => !canShareEnclosure(o.genome, candidate))) {
    return { ok: false, reason: 'company' }
  }
  const needed = requiredAreaM2(occupants) + getHabitatNeeds(candidate).areaM2
  if (needed > pen.areaM2) return { ok: false, reason: 'space' }
  return { ok: true }
}

function scoreOccupant(
  pen: Pen,
  occupants: readonly PenOccupant[],
  occupant: PenOccupant,
  requiredArea: number,
  conflictIds: ReadonlySet<string>
): OccupantQuality {
  const needs = getHabitatNeeds(occupant.genome)

  // Space: everyone shares the same floor, so a crowded pen hurts everyone equally.
  const space = result(
    requiredArea === 0 ? 1 : pen.areaM2 / requiredArea,
    `${round1(pen.areaM2)} m² for ${round1(requiredArea)} m² needed`
  )

  // Water: share of pen cells that are wet enough for this creature.
  let water: RequirementResult
  if (needs.water === 'none') {
    water = result(1, 'Needs no water')
  } else {
    const wet =
      needs.water === 'deep'
        ? pen.waterDeepFraction
        : pen.waterShallowFraction + pen.waterDeepFraction
    water = result(
      wet / WATER_FRACTION_REQUIRED,
      `${Math.round(wet * 100)}% ${needs.water} water (needs ${Math.round(WATER_FRACTION_REQUIRED * 100)}%)`
    )
  }

  // Enclosure: a higher level satisfies a lower need; each level short costs a lot.
  const shortfall = Math.max(0, ENCLOSURE_RANK[needs.enclosure] - ENCLOSURE_RANK[pen.enclosure])
  const enclosure = result(
    ENCLOSURE_SHORTFALL_SCORE[Math.min(shortfall, ENCLOSURE_SHORTFALL_SCORE.length - 1)],
    shortfall === 0
      ? `${pen.enclosure} enclosure is enough`
      : `Needs a ${needs.enclosure} enclosure, pen is ${pen.enclosure}`
  )

  // Enrichment: props per creature against what its temperament wants.
  const wanted = ENRICHMENT_PROPS_PER_CREATURE[needs.enrichment]
  const supplied = ENRICHMENT_PROPS.reduce((sum, kind) => sum + pen.props[kind], 0)
  const perCreature = occupants.length === 0 ? 0 : supplied / occupants.length
  const enrichment = result(
    wanted === 0 ? 1 : perCreature / wanted,
    wanted === 0
      ? 'Needs no enrichment'
      : `${round1(perCreature)} enrichment per creature (wants ${round1(wanted)})`
  )

  // Biome: share of the pen's ground this creature feels at home on.
  const comfort = needs.biomes.reduce((sum, b) => sum + (pen.groundFractions[b] ?? 0), 0)
  const biome = result(comfort, `${Math.round(comfort * 100)}% preferred ground`)

  // Company: any incompatible pen-mate ruins it for this creature.
  const company = conflictIds.has(occupant.id)
    ? result(0, 'Shares a pen with a creature it cannot tolerate')
    : result(1, 'Gets along with its pen-mates')

  const requirements: Record<RequirementKey, RequirementResult> = {
    space,
    water,
    enclosure,
    enrichment,
    biome,
    company,
  }
  const quality = (Object.keys(requirements) as RequirementKey[]).reduce(
    (sum, key) => sum + QUALITY_WEIGHTS[key] * requirements[key].score,
    0
  )

  return { creatureId: occupant.id, quality: clamp01(quality), requirements }
}

/** Score every occupant of a pen. An empty pen reports no occupants and its free area. */
export function scorePen(pen: Pen, occupants: readonly PenOccupant[]): PenQualityReport {
  const conflicts = findConflicts(occupants)
  const conflictIds = new Set(conflicts.flat())
  const requiredArea = requiredAreaM2(occupants)

  return {
    occupants: occupants.map((o) => scoreOccupant(pen, occupants, o, requiredArea, conflictIds)),
    conflicts,
    freeAreaM2: Math.max(0, pen.areaM2 - requiredArea),
  }
}
