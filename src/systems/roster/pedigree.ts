/**
 * Pedigree (GDD 6.5)
 * Who is related to whom, and how closely. Every creature remembers its ancestors (by id and
 * how many generations back) even after they have been sold, so close relatives can be spotted
 * and the inbreeding penalty applied. Pure functions on plain objects.
 *
 * Relatedness r of two creatures is the sum, over every ancestor they share, of 0.5^(steps
 * from one + steps from the other); a creature counts as its own ancestor at 0 steps. That
 * gives the familiar numbers: parent and child 0.5, full siblings 0.5, half siblings 0.25,
 * grandparent 0.25, first cousins 0.125. A child of the two has inbreeding F = r / 2.
 */

/** Ancestor id -> generations back (1 = parent). Never contains the creature itself. */
export type Ancestry = Readonly<Record<string, number>>

/** How many generations back a creature remembers. */
export const MAX_ANCESTRY_DEPTH = 4

export interface PedigreeNode {
  id: string
  ancestry: Ancestry
}

/** The ancestry of a child of two parents: each parent at 1, theirs one step further back. */
export function childAncestry(a: PedigreeNode, b: PedigreeNode): Ancestry {
  const out: Record<string, number> = {}
  for (const parent of [a, b]) {
    out[parent.id] = Math.min(out[parent.id] ?? Infinity, 1)
    for (const [id, steps] of Object.entries(parent.ancestry)) {
      const next = steps + 1
      if (next > MAX_ANCESTRY_DEPTH) continue
      out[id] = Math.min(out[id] ?? Infinity, next)
    }
  }
  return out
}

/** Relatedness 0..1 (0 = unrelated, 0.5 = parent/child or full siblings). */
export function relatedness(a: PedigreeNode, b: PedigreeNode): number {
  if (a.id === b.id) return 1
  const withSelf = (n: PedigreeNode): Record<string, number> => ({ ...n.ancestry, [n.id]: 0 })
  const A = withSelf(a)
  const B = withSelf(b)
  let r = 0
  for (const [id, steps] of Object.entries(A)) {
    if (id in B) r += 0.5 ** (steps + B[id])
  }
  return Math.min(1, r)
}

/** Inbreeding coefficient of a child of these two parents (0 = outbred, 0.5 = parent x child). */
export function inbreedingOf(a: PedigreeNode, b: PedigreeNode): number {
  return relatedness(a, b) / 2
}

/** Plain words for how close two creatures are. */
export function describeRelation(r: number): string {
  if (r >= 0.5) return 'parent and child, or full siblings'
  if (r >= 0.25) return 'close relatives (half siblings or grandparent)'
  if (r >= 0.125) return 'cousins'
  if (r > 0) return 'distant relatives'
  return 'unrelated'
}

/** Keep a saved ancestry map to sane ids and depths; anything else is dropped. */
export function sanitizeAncestry(raw: unknown): Ancestry {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [id, steps] of Object.entries(raw)) {
    if (/^c\d+$/.test(id) && Number.isInteger(steps) && steps >= 1 && steps <= MAX_ANCESTRY_DEPTH) {
      out[id] = steps as number
    }
  }
  return out
}
