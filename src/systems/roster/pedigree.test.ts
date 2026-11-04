import { describe, expect, it } from 'vitest'
import { generateGenome } from '../creatures/genome'
import {
  childAncestry,
  describeRelation,
  inbreedingOf,
  MAX_ANCESTRY_DEPTH,
  relatedness,
  sanitizeAncestry,
} from './pedigree'
import { Roster } from './Roster'

const node = (id: string, ancestry: Record<string, number> = {}) => ({ id, ancestry })

/** A small family built with the real roster: two founders, their children, and so on. */
function family() {
  const r = new Roster()
  const g = generateGenome(1)
  const f1 = r.add(g, { name: 'F1' })
  const f2 = r.add(g, { name: 'F2' })
  const f3 = r.add(g, { name: 'F3' })
  const kid1 = r.add(g, { parentIds: [f1.id, f2.id] })
  const kid2 = r.add(g, { parentIds: [f1.id, f2.id] })
  const half = r.add(g, { parentIds: [f1.id, f3.id] })
  return { r, f1, f2, f3, kid1, kid2, half, g }
}

describe('relatedness', () => {
  it('matches the textbook numbers', () => {
    const { r, f1, kid1, kid2, half, f3 } = family()
    const n = (id: string) => ({ id, ancestry: r.get(id)?.ancestry ?? {} })
    expect(relatedness(n(f1.id), n(f3.id))).toBe(0) // unrelated founders
    expect(relatedness(n(f1.id), n(kid1.id))).toBe(0.5) // parent and child
    expect(relatedness(n(kid1.id), n(kid2.id))).toBe(0.5) // full siblings
    expect(relatedness(n(kid1.id), n(half.id))).toBe(0.25) // half siblings
    expect(relatedness(n(kid1.id), n(kid1.id))).toBe(1)
  })

  it('gives grandparents 0.25 and first cousins 0.125', () => {
    const r = new Roster()
    const g = generateGenome(2)
    const [a, b, c, d] = [1, 2, 3, 4].map(() => r.add(g))
    const p1 = r.add(g, { parentIds: [a.id, b.id] })
    const p2 = r.add(g, { parentIds: [a.id, b.id] })
    const o1 = r.add(g, { parentIds: [p1.id, c.id] })
    const o2 = r.add(g, { parentIds: [p2.id, d.id] })
    const n = (id: string) => ({ id, ancestry: r.get(id)?.ancestry ?? {} })
    expect(relatedness(n(a.id), n(o1.id))).toBe(0.25)
    expect(relatedness(n(o1.id), n(o2.id))).toBe(0.125)
  })

  it('child inbreeding is half the parents’ relatedness', () => {
    const { r, f1, kid1, kid2 } = family()
    const n = (id: string) => ({ id, ancestry: r.get(id)?.ancestry ?? {} })
    expect(inbreedingOf(n(kid1.id), n(kid2.id))).toBe(0.25)
    expect(inbreedingOf(n(f1.id), n(kid1.id))).toBe(0.25)
    expect(inbreedingOf(n(f1.id), n('c999'))).toBe(0)
  })

  it('describes closeness in plain words', () => {
    expect(describeRelation(0)).toBe('unrelated')
    expect(describeRelation(0.06)).toBe('distant relatives')
    expect(describeRelation(0.125)).toBe('cousins')
    expect(describeRelation(0.25)).toContain('close relatives')
    expect(describeRelation(0.5)).toContain('siblings')
  })
})

describe('ancestry bookkeeping', () => {
  it('remembers ancestors after they are sold, and stops at the depth limit', () => {
    const { r, f1, f2, kid1, g } = family()
    const grandkid = r.add(g, { parentIds: [kid1.id, f2.id] })
    r.remove(f1.id)
    r.remove(kid1.id)
    expect(r.get(grandkid.id)?.ancestry[f1.id]).toBe(2)

    // Chain far past the limit: nothing older than MAX_ANCESTRY_DEPTH is kept.
    let a = f2.id
    let b = r.add(g).id
    for (let i = 0; i < MAX_ANCESTRY_DEPTH + 3; i++) {
      const child = r.add(g, { parentIds: [a, b] })
      a = child.id
      b = r.add(g).id
    }
    const deepest = Math.max(...Object.values(r.get(a)?.ancestry ?? {}))
    expect(deepest).toBeLessThanOrEqual(MAX_ANCESTRY_DEPTH)
  })

  it('childAncestry takes the shortest path to a shared ancestor', () => {
    const out = childAncestry(node('c1', { c9: 2 }), node('c2', { c9: 1 }))
    expect(out).toEqual({ c1: 1, c2: 1, c9: 2 })
  })

  it('round-trips through a roster save, and old saves load as outbred', () => {
    const { r, kid1 } = family()
    const snap = JSON.parse(JSON.stringify(r.serialize()))
    const other = new Roster()
    expect(other.restore(snap).valid).toBe(true)
    expect(other.get(kid1.id)?.ancestry).toEqual(r.get(kid1.id)?.ancestry)

    for (const c of snap.creatures) {
      delete c.ancestry
      delete c.inbreeding
    }
    const old = new Roster()
    expect(old.restore(snap).valid).toBe(true)
    expect(old.get(kid1.id)?.ancestry).toEqual({})
    expect(old.get(kid1.id)?.inbreeding).toBe(0)
  })

  it('sanitises junk ancestry', () => {
    expect(sanitizeAncestry(null)).toEqual({})
    expect(sanitizeAncestry([1, 2])).toEqual({})
    expect(sanitizeAncestry({ c1: 1, c2: 0, c3: 99, x: 1, c4: 1.5, c5: 4 })).toEqual({
      c1: 1,
      c5: 4,
    })
  })
})
