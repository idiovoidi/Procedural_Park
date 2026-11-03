import {
  type Footprint,
  type FootprintKind,
  rectCorners,
  type Shape,
  shapesOverlap,
} from './footprint'

/** Kinds that occupy ground and so must not overlap each other. */
const SOLID: ReadonlySet<FootprintKind> = new Set([
  'gate',
  'plaza',
  'building',
  'landmark',
  'station',
  'track',
  'build-zone',
])

export interface OverlapPair {
  a: Footprint
  b: Footprint
}

/**
 * WorldLayout
 * The registry of everything standing on the park's ground. The world map draws it, and
 * anything that wants to place a building or lay track asks it first, so structures and
 * railway can no longer land on top of each other.
 */
export class WorldLayout {
  private footprints = new Map<string, Footprint>()
  private listeners = new Set<() => void>()

  /** Adds a footprint, replacing any with the same id. */
  public add(...items: Footprint[]): void {
    for (const item of items) this.footprints.set(item.id, item)
    this.notify()
  }

  public remove(id: string): boolean {
    const removed = this.footprints.delete(id)
    if (removed) this.notify()
    return removed
  }

  public get(id: string): Footprint | undefined {
    return this.footprints.get(id)
  }

  public list(): Footprint[] {
    return [...this.footprints.values()]
  }

  public listByKind(...kinds: FootprintKind[]): Footprint[] {
    return this.list().filter((f) => kinds.includes(f.kind))
  }

  public onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Solid footprints that a candidate shape would touch (or come within `margin` of). */
  public overlapsFor(shape: Shape, margin = 0, ignoreIds: readonly string[] = []): Footprint[] {
    return this.list().filter(
      (f) => SOLID.has(f.kind) && !ignoreIds.includes(f.id) && shapesOverlap(shape, f.shape, margin)
    )
  }

  /** Whether a shape fits inside the park fence and clear of everything solid. */
  public canPlace(shape: Shape, margin = 0, ignoreIds: readonly string[] = []): boolean {
    return this.insideBoundary(shape) && this.overlapsFor(shape, margin, ignoreIds).length === 0
  }

  /** Whether a shape lies wholly inside the boundary fence (true if there is no fence). */
  public insideBoundary(shape: Shape): boolean {
    const fence = this.listByKind('boundary')[0]
    if (!fence || fence.shape.type !== 'circle') return true
    const { x, z, r } = fence.shape
    const pad = shape.type === 'circle' ? shape.r : shape.type === 'path' ? shape.halfWidth : 0
    const points =
      shape.type === 'circle'
        ? [{ x: shape.x, z: shape.z }]
        : shape.type === 'rect'
          ? rectCorners(shape)
          : shape.points
    return points.every((p) => Math.hypot(p.x - x, p.z - z) + pad <= r)
  }

  /** Every pair of solid footprints that overlap. Empty means the layout is clean. */
  public findOverlaps(margin = 0): OverlapPair[] {
    const solid = this.list().filter((f) => SOLID.has(f.kind))
    const pairs: OverlapPair[] = []
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i] as Footprint
        const b = solid[j] as Footprint
        if (shapesOverlap(a.shape, b.shape, margin)) pairs.push({ a, b })
      }
    }
    return pairs
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
