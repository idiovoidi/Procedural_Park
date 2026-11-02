/**
 * Housing
 * Picking a pen for a newly acquired creature.
 */

import type { Genome } from '@systems/creatures/genome'
import { canAddOccupant, type PenGrid, scorePen } from '@systems/park'
import type { Roster } from '@systems/roster'

/**
 * The pen where `genome` would be happiest, among pens that have room and whose residents
 * will tolerate it. Returns null when no pen fits. Ties go to the earlier pen.
 */
export function findPenFor(grid: PenGrid, roster: Roster, genome: Genome): string | null {
  let bestId: string | null = null
  let bestQuality = -1

  for (const pen of grid.getPens()) {
    const residents = roster.getByPen(pen.id).map((c) => ({ id: c.id, genome: c.genome }))
    if (!canAddOccupant(pen, residents, genome).ok) continue

    // Score the pen as it would be with the newcomer, and read off the newcomer's quality.
    const candidate = { id: '__candidate__', genome }
    const report = scorePen(pen, [...residents, candidate])
    const quality = report.occupants.find((o) => o.creatureId === candidate.id)?.quality ?? 0
    if (quality > bestQuality) {
      bestQuality = quality
      bestId = pen.id
    }
  }
  return bestId
}
