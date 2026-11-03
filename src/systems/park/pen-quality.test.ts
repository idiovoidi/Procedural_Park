import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import type { Genome } from '../creatures/genome'
import { generateGenome } from '../creatures/genome'
import {
  canAddOccupant,
  findConflicts,
  freeAreaM2,
  type Pen,
  PenGrid,
  type PenOccupant,
  scorePen,
  statusFor,
} from './index'

const { QUALITY_WEIGHTS, STATUS_THRESHOLDS } = GAME_CONFIG.PARK

const baseGenome = generateGenome(1)
const genome = (overrides: Partial<Genome> = {}): Genome => ({
  ...baseGenome,
  // A calm, undemanding medium walker that is happy on meadow unless a test says otherwise.
  archetype: 'terrestrial',
  size: 'medium',
  temperament: 'shy',
  locomotion: 'walk',
  bodyPlan: 'quadruped',
  speciesId: 1,
  ...overrides,
})

let nextId = 1
const occupant = (overrides: Partial<Genome> = {}): PenOccupant => ({
  id: `c${nextId++}`,
  genome: genome(overrides),
})

/** A literal pen so each requirement can be tested in isolation. 36 m² of meadow, fenced. */
const pen = (overrides: Partial<Pen> = {}): Pen => ({
  id: 'p',
  cells: [],
  areaM2: 36,
  waterShallowFraction: 0,
  waterDeepFraction: 0,
  groundFractions: { meadow: 1 },
  enclosure: 'fenced',
  props: {
    toy: 0,
    shelter: 0,
    plant: 0,
    trough: 0,
    hopper: 0,
    bin: 0,
    collector: 0,
    silo: 0,
    valve: 0,
    den: 0,
  },
  gateCount: 0,
  ...overrides,
})

const only = (report: ReturnType<typeof scorePen>) => report.occupants[0]

describe('statusFor', () => {
  it('maps scores to green / amber / red at the configured thresholds', () => {
    expect(statusFor(1)).toBe('good')
    expect(statusFor(STATUS_THRESHOLDS.good)).toBe('good')
    expect(statusFor(STATUS_THRESHOLDS.good - 0.01)).toBe('warn')
    expect(statusFor(STATUS_THRESHOLDS.warn)).toBe('warn')
    expect(statusFor(STATUS_THRESHOLDS.warn - 0.01)).toBe('bad')
    expect(statusFor(0)).toBe('bad')
  })
})

describe('quality weights', () => {
  it('sum to 1 so a perfect pen scores exactly 1', () => {
    const total = Object.values(QUALITY_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 10)
  })
})

describe('scorePen basics', () => {
  it('reports no occupants and all the floor for an empty pen', () => {
    const report = scorePen(pen(), [])
    expect(report.occupants).toEqual([])
    expect(report.conflicts).toEqual([])
    expect(report.freeAreaM2).toBe(36)
  })

  it('scores a well-suited creature 1 with every requirement green', () => {
    const c = occupant()
    const q = only(scorePen(pen(), [c]))
    expect(q.creatureId).toBe(c.id)
    expect(q.quality).toBeCloseTo(1, 10)
    for (const r of Object.values(q.requirements)) {
      expect(r.score).toBe(1)
      expect(r.status).toBe('good')
      expect(r.detail.length).toBeGreaterThan(0)
    }
  })

  it('combines requirements using the configured weights', () => {
    // Aquatic creature on all-meadow dry ground: biome 0 and water 0, the rest fine.
    const c = occupant({ archetype: 'aquatic', locomotion: 'swim', bodyPlan: 'swimmer' })
    const q = only(scorePen(pen({ enclosure: 'fenced' }), [c]))
    const expected = 1 - QUALITY_WEIGHTS.water - QUALITY_WEIGHTS.biome
    expect(q.quality).toBeCloseTo(expected, 10)
  })
})

describe('space', () => {
  it('is fine until the pen is full, then falls as it crowds', () => {
    const crowd = (n: number) =>
      only(
        scorePen(
          pen(),
          Array.from({ length: n }, () => occupant())
        )
      ).requirements.space
    expect(crowd(3).score).toBe(1) // 30 of 36 m²
    expect(crowd(4).status).toBe('good') // 36/40 = 0.9
    expect(crowd(6).score).toBeCloseTo(36 / 60, 10)
    expect(crowd(6).status).toBe('warn')
    expect(crowd(12).status).toBe('bad')
  })

  it('counts big creatures as taking more room', () => {
    const huge = occupant({ size: 'huge' }) // 32 m²
    const tiny = occupant({ size: 'tiny' }) // 4 m²
    expect(only(scorePen(pen(), [huge, tiny])).requirements.space.score).toBe(1) // exactly 36
    expect(freeAreaM2(pen(), [huge, tiny])).toBe(0)
    expect(freeAreaM2(pen(), [huge, huge])).toBe(0) // never negative
  })
})

describe('enclosure', () => {
  const flier = () => occupant({ locomotion: 'fly', bodyPlan: 'winged_biped', archetype: 'aerial' })
  const floater = () =>
    occupant({ locomotion: 'hover', bodyPlan: 'floater', archetype: 'ethereal' })
  const enc = (p: Pen, c: PenOccupant) => only(scorePen(p, [c])).requirements.enclosure

  it('punishes a flier in an unroofed pen and is satisfied by an aviary', () => {
    expect(enc(pen({ enclosure: 'fenced' }), flier()).status).toBe('bad')
    expect(enc(pen({ enclosure: 'tall' }), flier()).score).toBe(
      GAME_CONFIG.PARK.ENCLOSURE_SHORTFALL_SCORE[1]
    )
    expect(enc(pen({ enclosure: 'roofed' }), flier()).score).toBe(1)
  })

  it('lets a floater use a tall fence, and a roof counts as taller still', () => {
    expect(enc(pen({ enclosure: 'fenced' }), floater()).score).toBe(0.4)
    expect(enc(pen({ enclosure: 'tall' }), floater()).score).toBe(1)
    expect(enc(pen({ enclosure: 'roofed' }), floater()).score).toBe(1)
  })

  it('asks nothing extra of a walker', () => {
    expect(enc(pen({ enclosure: 'fenced' }), occupant()).score).toBe(1)
  })
})

describe('water', () => {
  const swimmer = () => occupant({ archetype: 'aquatic', locomotion: 'swim', bodyPlan: 'swimmer' })
  const wader = () => occupant({ archetype: 'aquatic', locomotion: 'slither', bodyPlan: 'serpent' })
  const water = (p: Pen, c: PenOccupant) => only(scorePen(p, [c])).requirements.water

  it('is no concern for land creatures', () => {
    expect(water(pen(), occupant()).score).toBe(1)
  })

  it('needs deep water for swimmers', () => {
    expect(water(pen(), swimmer()).score).toBe(0)
    expect(water(pen({ waterDeepFraction: 0.15 }), swimmer()).score).toBe(1)
    expect(water(pen({ waterDeepFraction: 0.075 }), swimmer()).score).toBeCloseTo(0.5, 10)
    // Shallow water doesn't help a swimmer.
    expect(water(pen({ waterShallowFraction: 0.5 }), swimmer()).score).toBe(0)
  })

  it('accepts shallow or deep water for waders', () => {
    expect(water(pen({ waterShallowFraction: 0.15 }), wader()).score).toBe(1)
    expect(water(pen({ waterDeepFraction: 0.15 }), wader()).score).toBe(1)
    expect(water(pen({ waterShallowFraction: 0.1, waterDeepFraction: 0.05 }), wader()).score).toBe(
      1
    )
    expect(water(pen(), wader()).score).toBe(0)
  })
})

describe('biome', () => {
  const biome = (p: Pen, c: PenOccupant) => only(scorePen(p, [c])).requirements.biome

  it('scores the share of ground the creature prefers', () => {
    const aquatic = occupant({ archetype: 'aquatic' }) // prefers wetland
    expect(biome(pen({ groundFractions: { meadow: 1 } }), aquatic).score).toBe(0)
    expect(biome(pen({ groundFractions: { wetland: 0.5, meadow: 0.5 } }), aquatic).score).toBe(0.5)
    expect(biome(pen({ groundFractions: { wetland: 1 } }), aquatic).score).toBe(1)
  })

  it('adds up several preferred grounds', () => {
    const terrestrial = occupant() // meadow, forest, rocky
    expect(
      biome(pen({ groundFractions: { meadow: 0.4, forest: 0.4, wetland: 0.2 } }), terrestrial).score
    ).toBeCloseTo(0.8, 10)
  })
})

describe('enrichment', () => {
  const enrich = (p: Pen, c: PenOccupant[]) => scorePen(p, c).occupants[0].requirements.enrichment

  it('is not needed by shy creatures', () => {
    expect(enrich(pen(), [occupant({ temperament: 'shy' })]).score).toBe(1)
  })

  it('wants a prop per playful creature and counts only enrichment props', () => {
    const playful = () => occupant({ temperament: 'playful' })
    expect(enrich(pen(), [playful()]).score).toBe(0)
    expect(
      enrich(
        pen({
          props: {
            toy: 1,
            shelter: 0,
            plant: 0,
            trough: 0,
            hopper: 0,
            bin: 0,
            collector: 0,
            silo: 0,
            valve: 0,
            den: 0,
          },
        }),
        [playful()]
      ).score
    ).toBe(1)
    // Troughs aren't enrichment.
    expect(
      enrich(
        pen({
          props: {
            toy: 0,
            shelter: 0,
            plant: 0,
            trough: 5,
            hopper: 0,
            bin: 0,
            collector: 0,
            silo: 0,
            valve: 0,
            den: 0,
          },
        }),
        [playful()]
      ).score
    ).toBe(0)
    // Two creatures sharing one toy get half.
    expect(
      enrich(
        pen({
          props: {
            toy: 1,
            shelter: 0,
            plant: 0,
            trough: 0,
            hopper: 0,
            bin: 0,
            collector: 0,
            silo: 0,
            valve: 0,
            den: 0,
          },
        }),
        [playful(), playful()]
      ).score
    ).toBe(0.5)
  })

  it('wants half a prop per curious creature', () => {
    const curious = () => occupant({ temperament: 'curious' })
    expect(
      enrich(
        pen({
          props: {
            toy: 0,
            shelter: 1,
            plant: 0,
            trough: 0,
            hopper: 0,
            bin: 0,
            collector: 0,
            silo: 0,
            valve: 0,
            den: 0,
          },
        }),
        [curious(), curious()]
      ).score
    ).toBe(1)
    expect(
      enrich(
        pen({
          props: {
            toy: 0,
            shelter: 1,
            plant: 0,
            trough: 0,
            hopper: 0,
            bin: 0,
            collector: 0,
            silo: 0,
            valve: 0,
            den: 0,
          },
        }),
        [curious(), curious(), curious(), curious()]
      ).score
    ).toBe(0.5)
  })
})

describe('company', () => {
  it('flags incompatible pen-mates and marks both creatures', () => {
    const grumpy = occupant({ temperament: 'aggressive' })
    const shy = occupant({ temperament: 'shy' })
    const report = scorePen(pen(), [grumpy, shy])

    expect(report.conflicts).toEqual([[grumpy.id, shy.id]])
    for (const o of report.occupants) {
      expect(o.requirements.company.score).toBe(0)
      expect(o.requirements.company.status).toBe('bad')
      expect(o.quality).toBeCloseTo(1 - QUALITY_WEIGHTS.company, 10)
    }
  })

  it('leaves unaffected creatures alone in a mixed pen', () => {
    const a = occupant({ temperament: 'aggressive' })
    const b = occupant({ temperament: 'shy' })
    const c = occupant({ temperament: 'playful' })
    const conflicts = findConflicts([a, b, c])
    expect(conflicts).toEqual([
      [a.id, b.id],
      [a.id, c.id],
    ])
  })

  it('lets territorial creatures share only with their own species', () => {
    const t1 = occupant({ temperament: 'territorial', speciesId: 5 })
    const t2 = occupant({ temperament: 'territorial', speciesId: 5 })
    const t3 = occupant({ temperament: 'territorial', speciesId: 6 })
    expect(findConflicts([t1, t2])).toEqual([])
    expect(findConflicts([t1, t3])).toEqual([[t1.id, t3.id]])
  })
})

describe('canAddOccupant', () => {
  it('accepts a creature that fits and gets along', () => {
    expect(canAddOccupant(pen(), [occupant()], genome())).toEqual({ ok: true })
  })

  it('refuses when the pen is full', () => {
    const full = [occupant({ size: 'huge' })] // 32 of 36 m²
    expect(canAddOccupant(pen(), full, genome({ size: 'large' }))).toEqual({
      ok: false,
      reason: 'space',
    })
    expect(canAddOccupant(pen(), full, genome({ size: 'tiny' }))).toEqual({ ok: true }) // 4 m² fits exactly
  })

  it('refuses a creature that cannot tolerate the others, before checking space', () => {
    const mates = [occupant({ temperament: 'shy' })]
    expect(canAddOccupant(pen(), mates, genome({ temperament: 'aggressive' }))).toEqual({
      ok: false,
      reason: 'company',
    })
  })
})

describe('with a real PenGrid pen', () => {
  it('scores creatures against a pen built on the grid', () => {
    const grid = new PenGrid({ minX: 0, minZ: 0, maxX: 9, maxZ: 9 })
    // 3x3 pen of wetland with a deep pond in one corner and a roof.
    for (let x = 1; x <= 3; x++) {
      grid.addFence({ x, z: 1, axis: 'h' })
      grid.addFence({ x, z: 4, axis: 'h' })
    }
    for (let z = 1; z <= 3; z++) {
      grid.addFence({ x: 1, z, axis: 'v' })
      grid.addFence({ x: 4, z, axis: 'v' })
    }
    for (let x = 1; x <= 3; x++) {
      for (let z = 1; z <= 3; z++) {
        grid.setGround({ x, z }, 'wetland')
        grid.setRoof({ x, z }, true)
      }
    }
    grid.setWater({ x: 2, z: 2 }, 'deep')
    grid.setWater({ x: 3, z: 2 }, 'deep')

    const built = grid.getPens()[0]
    expect(built.areaM2).toBe(36)

    const swimmer = occupant({ archetype: 'aquatic', locomotion: 'swim', bodyPlan: 'swimmer' })
    const q = only(scorePen(built, [swimmer]))
    expect(q.quality).toBeCloseTo(1, 10)
  })
})
