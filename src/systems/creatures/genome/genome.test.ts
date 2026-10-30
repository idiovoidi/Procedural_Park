import { describe, expect, it } from 'vitest'
import { BODY_PLANS } from './body-plans'
import { crossover, mutate } from './breed'
import { generateGenome } from './genome'
import { createSeededRandom, hashSeed, pickWeighted } from './random'
import { generateSpeciesName } from './species-name'
import { validateGenome } from './validate'

const SEEDS = Array.from({ length: 2000 }, (_, i) => i)

describe('seeded random helpers', () => {
  it('produces the same stream for the same seed and stays in [0, 1)', () => {
    const a = createSeededRandom(42)
    const b = createSeededRandom(42)
    for (let i = 0; i < 100; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('hashSeed separates nearby inputs', () => {
    expect(hashSeed(1337, 0)).not.toBe(hashSeed(1337, 1))
    expect(hashSeed(1, 2)).not.toBe(hashSeed(2, 1))
  })

  it('pickWeighted respects zero-ish weights and ordering', () => {
    const rand = createSeededRandom(7)
    const counts = { common: 0, rare: 0 }
    for (let i = 0; i < 2000; i++) {
      counts[
        pickWeighted(rand, [
          ['common', 9],
          ['rare', 1],
        ] as const)
      ]++
    }
    expect(counts.common).toBeGreaterThan(counts.rare * 4)
  })
})

describe('generateGenome', () => {
  it('is deterministic and survives a JSON round trip', () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const genome = generateGenome(seed)
      expect(generateGenome(seed)).toEqual(genome)
      expect(JSON.parse(JSON.stringify(genome))).toEqual(genome)
    }
  })

  it('never violates body-plan rules', () => {
    for (const seed of SEEDS) {
      expect(validateGenome(generateGenome(seed)), `seed ${seed}`).toEqual([])
    }
  })

  it('gives each part family its own seed', () => {
    const genome = generateGenome(5)
    const seeds = Object.values(genome.partSeeds)
    expect(new Set(seeds).size).toBe(seeds.length)
  })

  it('uses every body plan across a large sample', () => {
    const used = new Set(SEEDS.map((seed) => generateGenome(seed).bodyPlan))
    expect([...used].sort()).toEqual(Object.keys(BODY_PLANS).sort())
  })

  it('spends a bigger feature budget on rarer creatures', () => {
    const featureCount = (seed: number) => {
      const g = generateGenome(seed)
      return (
        Number(g.horns.count > 0) +
        Number(g.ears.count > 0) +
        Number(g.antennae.count > 0) +
        Number(g.spines.count > 0) +
        Number(g.furTufts) +
        Number(g.scales)
      )
    }
    const common: number[] = []
    const rare: number[] = []
    for (const seed of SEEDS) {
      const rarity = generateGenome(seed).rarity
      if (rarity < 0.3) common.push(featureCount(seed))
      else if (rarity > 0.9) rare.push(featureCount(seed))
    }
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
    expect(mean(rare)).toBeGreaterThan(mean(common) + 0.8)
  })

  it('only gives glow to rare creatures', () => {
    for (const seed of SEEDS.slice(0, 500)) {
      const g = generateGenome(seed)
      expect(g.genes.glow > 0).toBe(g.rarity > 0.75)
    }
  })
})

describe('species names', () => {
  it('are stable for a genome and shared by identical structure', () => {
    const genome = generateGenome(11)
    expect(generateSpeciesName(genome)).toBe(generateSpeciesName(structuredClone(genome)))
    expect(generateSpeciesName(genome)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })
})

describe('breeding', () => {
  it('produces valid, reproducible children and mutants', () => {
    for (let i = 0; i < 500; i++) {
      const a = generateGenome(i * 2)
      const b = generateGenome(i * 2 + 1)
      const child = crossover(a, b, 9000 + i)
      expect(crossover(a, b, 9000 + i)).toEqual(child)
      expect(validateGenome(child), `child ${i}`).toEqual([])

      const mutant = mutate(child, 0.4, 5000 + i)
      expect(validateGenome(mutant), `mutant ${i}`).toEqual([])
    }
  })

  it('inherits its body from one of its parents', () => {
    for (let i = 0; i < 100; i++) {
      const a = generateGenome(i)
      const b = generateGenome(i + 1000)
      const child = crossover(a, b, i)
      expect([a.bodyPlan, b.bodyPlan]).toContain(child.bodyPlan)
      expect([a.torsoShape, b.torsoShape]).toContain(child.torsoShape)
    }
  })

  it('does not change a genome when the mutation rate is zero apart from its seed', () => {
    const genome = generateGenome(3)
    const mutant = mutate(genome, 0, 3)
    expect(mutant.genes).toEqual(genome.genes)
    expect(mutant.bodyPlan).toBe(genome.bodyPlan)
    expect(mutant.palette).toEqual(genome.palette)
  })
})
