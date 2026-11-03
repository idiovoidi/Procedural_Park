import { describe, expect, it, vi } from 'vitest'
import { GAME_CONFIG } from '../../core/constants'
import { type Genome, generateGenome } from '../creatures/genome'
import { Roster } from '../roster'
import { Codex } from './Codex'

const NEEDED = GAME_CONFIG.ECONOMY.CODEX.STUDY_PHOTOS_REQUIRED

const g = (seed: number, over: Partial<Genome> = {}): Genome => ({
  ...generateGenome(seed),
  ...over,
})
const owned = (genome: Genome, name = 'Pet', parentIds: [string, string] | null = null) => ({
  name,
  genome,
  parentIds,
})

describe('photographing', () => {
  it('adds a new species, but does not reveal it until it has been photographed enough', () => {
    const codex = new Codex()
    const genome = g(1)
    expect(codex.recordPhoto(genome)).toBe(true)
    const entry = codex.get(genome.speciesId)
    expect(entry).toMatchObject({
      foundBy: 'photographed',
      photos: 1,
      owned: false,
      studied: false,
    })

    for (let i = 1; i < NEEDED; i++) codex.recordPhoto(genome)
    expect(codex.get(genome.speciesId)?.studied).toBe(true)
  })

  it('reports a species as new only the first time', () => {
    const codex = new Codex()
    expect(codex.recordPhoto(g(1))).toBe(true)
    expect(codex.recordPhoto(g(1))).toBe(false)
    expect(codex.count()).toBe(1)
  })
})

describe('owning', () => {
  it('records captured and bred species, and counts owning as studying', () => {
    const codex = new Codex()
    const wild = g(1)
    const bredGenome = g(2)
    expect(codex.recordOwned(owned(wild))).toBe(true)
    expect(codex.recordOwned(owned(bredGenome, 'Kid', ['c1', 'c2']))).toBe(true)

    expect(codex.get(wild.speciesId)).toMatchObject({
      foundBy: 'captured',
      owned: true,
      studied: true,
    })
    expect(codex.get(bredGenome.speciesId)).toMatchObject({
      foundBy: 'bred',
      owned: true,
      studied: true,
    })
    expect(codex.ownedCount()).toBe(2)
  })

  it('keeps how a species was first found, even if later obtained another way', () => {
    const codex = new Codex()
    const genome = g(1)
    codex.recordPhoto(genome)
    codex.recordOwned(owned(genome))
    expect(codex.get(genome.speciesId)).toMatchObject({
      foundBy: 'photographed',
      owned: true,
      studied: true,
    })
  })

  it('can learn a whole roster at once', () => {
    const roster = new Roster()
    roster.add(g(1))
    roster.add(g(2))
    const codex = new Codex()
    codex.ingestRoster(roster)
    expect(codex.ownedCount()).toBe(2)
  })
})

describe('best individual', () => {
  it('keeps the rarest creature of the species, as a copy', () => {
    const codex = new Codex()
    const base = g(1, { rarity: 0.3 })
    codex.recordOwned(owned(base, 'Plain'))
    expect(codex.get(base.speciesId)?.best.name).toBe('Plain')

    codex.recordOwned(owned({ ...base, rarity: 0.9 }, 'Shiny'))
    expect(codex.get(base.speciesId)?.best).toMatchObject({ name: 'Shiny', rarity: 0.9 })

    codex.recordOwned(owned({ ...base, rarity: 0.5 }, 'Middling'))
    expect(codex.get(base.speciesId)?.best.name).toBe('Shiny') // not replaced by a lesser one

    base.rarity = 0.01
    expect(codex.get(base.speciesId)?.best.genome.rarity).not.toBe(0.01) // a copy, not a reference
  })
})

describe('listing and events', () => {
  it('lists in order of discovery', () => {
    const codex = new Codex()
    const a = g(1)
    const b = g(2)
    const c = g(3)
    codex.recordOwned(owned(b))
    codex.recordPhoto(a)
    codex.recordOwned(owned(c))
    expect(codex.list().map((e) => e.speciesId)).toEqual([b.speciesId, a.speciesId, c.speciesId])
    expect(codex.list().map((e) => e.order)).toEqual([1, 2, 3])
  })

  it('tells listeners about every update and whether the species is new', () => {
    const codex = new Codex()
    const seen = vi.fn()
    const off = codex.onChange(seen)
    const genome = g(1)
    codex.recordPhoto(genome)
    codex.recordPhoto(genome)
    expect(seen).toHaveBeenCalledTimes(2)
    expect(seen.mock.calls[0][1]).toBe(true)
    expect(seen.mock.calls[1][1]).toBe(false)
    off()
    codex.recordPhoto(genome)
    expect(seen).toHaveBeenCalledTimes(2)
  })
})

describe('save and restore', () => {
  it('round-trips everything, including progress towards studying', () => {
    const a = new Codex()
    a.recordOwned(owned(g(1), 'Mine', ['c1', 'c2']))
    a.recordPhoto(g(2))
    const b = new Codex()
    expect(b.restore(JSON.parse(JSON.stringify(a.serialize())))).toBe(true)
    expect(b.list()).toEqual(a.list())

    b.recordPhoto(g(2)) // continues from one photo, so now studied
    expect(b.get(g(2).speciesId)?.studied).toBe(true)
    expect(b.recordPhoto(g(99))).toBe(true)
    expect(b.get(g(99).speciesId)?.order).toBe(3) // the discovery counter carried on
  })

  it('skips corrupt entries and rejects unusable snapshots', () => {
    const codex = new Codex()
    const good = new Codex()
    good.recordOwned(owned(g(1)))
    const snap = JSON.parse(JSON.stringify(good.serialize()))
    snap.entries.push(
      null,
      { speciesId: 'x' },
      { ...snap.entries[0] },
      { speciesId: 5, name: 'N', foundBy: 'dreamt', order: 2, best: {} }
    )
    expect(codex.restore(snap)).toBe(true)
    expect(codex.count()).toBe(1)

    for (const bad of [null, undefined, 3, {}, { version: 2, entries: [] }, { version: 1 }]) {
      expect(codex.restore(bad)).toBe(false)
    }
    expect(codex.count()).toBe(1) // unchanged by the bad attempts
  })

  it('recomputes "studied" from the data rather than trusting it', () => {
    const a = new Codex()
    a.recordPhoto(g(1))
    const snap = JSON.parse(JSON.stringify(a.serialize()))
    snap.entries[0].studied = true // a lie: only one photo
    const b = new Codex()
    b.restore(snap)
    expect(b.list()[0].studied).toBe(false)
  })
})
