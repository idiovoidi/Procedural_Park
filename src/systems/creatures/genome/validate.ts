import { BODY_PLANS } from './body-plans'
import type { Genome } from './types'

/**
 * Coherence rules every generated genome must satisfy.
 * Returns human-readable violations; an empty list means the genome is valid.
 */
export function validateGenome(genome: Genome): string[] {
  const problems: string[] = []
  const plan = BODY_PLANS[genome.bodyPlan]

  if (!plan.archetypes[genome.archetype]) {
    problems.push(`plan ${plan.id} does not allow archetype ${genome.archetype}`)
  }
  if (!plan.torso.some(([shape]) => shape === genome.torsoShape)) {
    problems.push(`plan ${plan.id} does not allow torso ${genome.torsoShape}`)
  }
  if (genome.locomotion !== plan.locomotion) {
    problems.push(`locomotion ${genome.locomotion} does not match plan ${plan.id}`)
  }

  const hasLimbRules = plan.limbs.length > 0
  if (!hasLimbRules && genome.limbSets.length > 0) {
    problems.push(`plan ${plan.id} has no limbs but genome has ${genome.limbSets.length} sets`)
  }
  for (const set of genome.limbSets) {
    const rule = plan.limbs.find((r) => r.layout === set.layout)
    if (!rule) problems.push(`layout ${set.layout} not allowed by plan ${plan.id}`)
    else if (!rule.type.some(([type]) => type === set.type)) {
      problems.push(`limb type ${set.type} not allowed by plan ${plan.id}`)
    }
  }

  if (genome.wings.pairs > 0 && plan.wingChance === 0) {
    problems.push(`plan ${plan.id} cannot have wings`)
  }
  if (genome.tails.count > 0 && plan.tailChance === 0) {
    problems.push(`plan ${plan.id} cannot have tails`)
  }

  if (!genome.head.present) {
    if (genome.head.eyeCount > 0) problems.push('eyes without a head')
    if (genome.horns.count > 0) problems.push('horns without a head')
    if (genome.ears.count > 0) problems.push('ears without a head')
    if (genome.antennae.count > 0) problems.push('antennae without a head')
  }

  if (genome.spines.type === 'tail' && genome.tails.count === 0) {
    problems.push('tail spines without a tail')
  }
  if (genome.spines.count > 0 && genome.spines.type === 'none') {
    problems.push('spine count without a spine type')
  }
  if (genome.horns.count > 0 && genome.antennae.count > 0 && genome.rarity < 0.85) {
    problems.push('horns and antennae together on a non-rare creature')
  }

  return problems
}
