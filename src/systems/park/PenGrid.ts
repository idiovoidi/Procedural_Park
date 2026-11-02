/**
 * PenGrid
 * The hub's build grid: fences on cell edges, ground, water, roofs and props, and the pens
 * (closed fenced regions) that result.
 *
 * Pens are derived, never placed: whenever the grid changes, closed regions are re-detected
 * with a flood fill. Each region keeps the id of the existing pen it overlaps most, so a
 * pen that grows or is reshaped stays the same pen and the creatures assigned to it stay
 * assigned. A region that touches the edge of the buildable zone through a gap in the fence
 * is open ground, not a pen.
 */

import { GAME_CONFIG } from '@core/constants'
import type { BiomeType } from '@systems/terrain'
import type {
  Cell,
  Edge,
  Fence,
  FenceOptions,
  GridBounds,
  Pen,
  PenChange,
  PenGridSnapshot,
  PenListener,
  PropKind,
  WaterLevel,
} from './types'

const { CELL_SIZE_M, INITIAL_BOUNDS } = GAME_CONFIG.PARK

const PROP_KINDS: readonly PropKind[] = ['toy', 'shelter', 'plant', 'trough', 'bin']
const BIOMES: readonly BiomeType[] = [
  'forest',
  'meadow',
  'rocky',
  'wetland',
  'crystal_cave',
  'floating_islands',
]

export const cellKey = (c: Cell): string => `${c.x},${c.z}`
export const edgeKey = (e: Edge): string => `${e.axis}${e.x},${e.z}`

/** World metres to the cell containing that point. */
export function worldToCell(x: number, z: number): Cell {
  return { x: Math.floor(x / CELL_SIZE_M), z: Math.floor(z / CELL_SIZE_M) }
}

/** World position of the centre of a cell (y is left to the caller). */
export function cellToWorld(cell: Cell): { x: number; z: number } {
  return { x: (cell.x + 0.5) * CELL_SIZE_M, z: (cell.z + 0.5) * CELL_SIZE_M }
}

/** The edge shared by two 4-adjacent cells, or null if they don't touch. */
export function edgeBetween(a: Cell, b: Cell): Edge | null {
  if (a.z === b.z && Math.abs(a.x - b.x) === 1) return { x: Math.max(a.x, b.x), z: a.z, axis: 'v' }
  if (a.x === b.x && Math.abs(a.z - b.z) === 1) return { x: a.x, z: Math.max(a.z, b.z), axis: 'h' }
  return null
}

/** The two cells an edge separates: [west|north, east|south]. */
function edgeCells(e: Edge): [Cell, Cell] {
  return e.axis === 'h'
    ? [
        { x: e.x, z: e.z - 1 },
        { x: e.x, z: e.z },
      ]
    : [
        { x: e.x - 1, z: e.z },
        { x: e.x, z: e.z },
      ]
}

/** Most destroyed pens remembered for id reuse. */
const MAX_LOST_PENS = 50

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

export class PenGrid {
  private bounds: GridBounds
  private readonly defaultGround: BiomeType
  private fences = new Map<string, Edge & Fence>()
  private ground = new Map<string, BiomeType>()
  private water = new Map<string, 'shallow' | 'deep'>()
  private roofs = new Set<string>()
  private props = new Map<string, PropKind[]>()
  private pens = new Map<string, Pen>()
  /**
   * Cells of pens that stopped being pens (a wall was opened), kept so the same pen id comes
   * back if the region is closed again. Without this, moving a wall would orphan every
   * creature assigned to the pen.
   */
  private lost = new Map<string, Cell[]>()
  private nextPenNumber = 1
  private listeners = new Set<PenListener>()

  constructor(bounds: GridBounds = INITIAL_BOUNDS, defaultGround: BiomeType = 'meadow') {
    this.bounds = { ...bounds }
    this.defaultGround = defaultGround
  }

  // ---- Bounds -------------------------------------------------------------------------

  public getBounds(): GridBounds {
    return { ...this.bounds }
  }

  public inBounds(cell: Cell): boolean {
    const b = this.bounds
    return cell.x >= b.minX && cell.x <= b.maxX && cell.z >= b.minZ && cell.z <= b.maxZ
  }

  /** Grow the buildable zone outwards by whole cells on any side. Negative values are ignored. */
  public expandBounds(by: Partial<Record<keyof GridBounds, number>>): void {
    const grow = (n: number | undefined) => (isInt(n) && n > 0 ? n : 0)
    this.bounds = {
      minX: this.bounds.minX - grow(by.minX),
      minZ: this.bounds.minZ - grow(by.minZ),
      maxX: this.bounds.maxX + grow(by.maxX),
      maxZ: this.bounds.maxZ + grow(by.maxZ),
    }
    this.refresh()
  }

  // ---- Fences -------------------------------------------------------------------------

  /**
   * Place or update a fence. Fails for a non-integer edge, or one that doesn't border the
   * buildable zone at all. Returns whether anything changed.
   */
  public addFence(edge: Edge, options: FenceOptions = {}): boolean {
    if (!this.isValidEdge(edge)) return false
    const next = { ...edge, gate: options.gate ?? false, tall: options.tall ?? false }
    const key = edgeKey(edge)
    const existing = this.fences.get(key)
    if (existing && existing.gate === next.gate && existing.tall === next.tall) return false
    this.fences.set(key, next)
    this.refresh()
    return true
  }

  public removeFence(edge: Edge): boolean {
    if (!this.fences.delete(edgeKey(edge))) return false
    this.refresh()
    return true
  }

  public getFence(edge: Edge): Readonly<Fence> | undefined {
    return this.fences.get(edgeKey(edge))
  }

  public getFences(): ReadonlyArray<Readonly<Edge & Fence>> {
    return [...this.fences.values()]
  }

  // ---- Terrain, roofs and props ---------------------------------------------------------

  public setGround(cell: Cell, biome: BiomeType): boolean {
    if (!this.inBounds(cell)) return false
    if (this.getGround(cell) === biome) return false
    if (biome === this.defaultGround) this.ground.delete(cellKey(cell))
    else this.ground.set(cellKey(cell), biome)
    this.refresh()
    return true
  }

  public getGround(cell: Cell): BiomeType {
    return this.ground.get(cellKey(cell)) ?? this.defaultGround
  }

  public setWater(cell: Cell, level: WaterLevel): boolean {
    if (!this.inBounds(cell)) return false
    const key = cellKey(cell)
    if ((this.water.get(key) ?? 'none') === level) return false
    if (level === 'none') this.water.delete(key)
    else this.water.set(key, level)
    this.refresh()
    return true
  }

  public getWater(cell: Cell): WaterLevel {
    return this.water.get(cellKey(cell)) ?? 'none'
  }

  public setRoof(cell: Cell, roofed: boolean): boolean {
    if (!this.inBounds(cell) || this.roofs.has(cellKey(cell)) === roofed) return false
    if (roofed) this.roofs.add(cellKey(cell))
    else this.roofs.delete(cellKey(cell))
    this.refresh()
    return true
  }

  public hasRoof(cell: Cell): boolean {
    return this.roofs.has(cellKey(cell))
  }

  public addProp(cell: Cell, kind: PropKind): boolean {
    if (!this.inBounds(cell)) return false
    const key = cellKey(cell)
    this.props.set(key, [...(this.props.get(key) ?? []), kind])
    this.refresh()
    return true
  }

  /** Remove one prop of that kind from the cell. */
  public removeProp(cell: Cell, kind: PropKind): boolean {
    const key = cellKey(cell)
    const list = this.props.get(key)
    const at = list?.indexOf(kind) ?? -1
    if (!list || at < 0) return false
    list.splice(at, 1)
    if (list.length === 0) this.props.delete(key)
    this.refresh()
    return true
  }

  public getProps(cell: Cell): readonly PropKind[] {
    return this.props.get(cellKey(cell)) ?? []
  }

  // ---- Pens -----------------------------------------------------------------------------

  public getPens(): readonly Pen[] {
    return [...this.pens.values()]
  }

  public getPen(id: string): Readonly<Pen> | undefined {
    return this.pens.get(id)
  }

  public getPenAt(cell: Cell): Readonly<Pen> | undefined {
    const key = cellKey(cell)
    for (const pen of this.pens.values()) {
      if (pen.cells.some((c) => cellKey(c) === key)) return pen
    }
    return undefined
  }

  public getPenAtWorld(x: number, z: number): Readonly<Pen> | undefined {
    return this.getPenAt(worldToCell(x, z))
  }

  public onChange(listener: PenListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // ---- Save / load ------------------------------------------------------------------------

  public serialize(): PenGridSnapshot {
    const cells = (map: Map<string, unknown>) =>
      [...map.keys()].map((k) => {
        const [x, z] = k.split(',').map(Number)
        return { x, z }
      })
    return {
      version: 1,
      bounds: { ...this.bounds },
      fences: [...this.fences.values()].map((f) => ({ ...f })),
      ground: cells(this.ground).map((c) => ({
        ...c,
        biome: this.ground.get(cellKey(c)) as BiomeType,
      })),
      water: cells(this.water).map((c) => ({
        ...c,
        level: this.water.get(cellKey(c)) as 'shallow' | 'deep',
      })),
      roofs: [...this.roofs].map((k) => {
        const [x, z] = k.split(',').map(Number)
        return { x, z }
      }),
      props: [...this.props.entries()].flatMap(([k, kinds]) => {
        const [x, z] = k.split(',').map(Number)
        return kinds.map((kind) => ({ x, z, kind }))
      }),
      pens: [...this.pens.values()].map((p) => ({
        id: p.id,
        cells: p.cells.map((c) => ({ ...c })),
      })),
      lostPens: [...this.lost].map(([id, cells]) => ({ id, cells: cells.map((c) => ({ ...c })) })),
      nextPenNumber: this.nextPenNumber,
    }
  }

  /**
   * Replace the grid from a save. Bad entries are skipped individually. Returns false (and
   * changes nothing) if the snapshot as a whole is unusable.
   */
  public restore(snapshot: unknown): boolean {
    const s = snapshot as Partial<PenGridSnapshot> | null
    const b = s?.bounds
    if (
      !s ||
      s.version !== 1 ||
      !b ||
      !isInt(b.minX) ||
      !isInt(b.minZ) ||
      !isInt(b.maxX) ||
      !isInt(b.maxZ) ||
      b.minX > b.maxX ||
      b.minZ > b.maxZ
    ) {
      return false
    }

    this.bounds = { minX: b.minX, minZ: b.minZ, maxX: b.maxX, maxZ: b.maxZ }
    this.fences.clear()
    this.ground.clear()
    this.water.clear()
    this.roofs.clear()
    this.props.clear()

    const isCell = (c: unknown): c is Cell =>
      typeof c === 'object' && c !== null && isInt((c as Cell).x) && isInt((c as Cell).z)

    for (const f of s.fences ?? []) {
      if (isCell(f) && (f.axis === 'h' || f.axis === 'v') && this.isValidEdge(f)) {
        this.fences.set(edgeKey(f), {
          x: f.x,
          z: f.z,
          axis: f.axis,
          gate: !!f.gate,
          tall: !!f.tall,
        })
      }
    }
    for (const g of s.ground ?? []) {
      if (
        isCell(g) &&
        BIOMES.includes(g.biome) &&
        this.inBounds(g) &&
        g.biome !== this.defaultGround
      ) {
        this.ground.set(cellKey(g), g.biome)
      }
    }
    for (const w of s.water ?? []) {
      if (isCell(w) && (w.level === 'shallow' || w.level === 'deep') && this.inBounds(w)) {
        this.water.set(cellKey(w), w.level)
      }
    }
    for (const r of s.roofs ?? []) {
      if (isCell(r) && this.inBounds(r)) this.roofs.add(cellKey(r))
    }
    for (const p of s.props ?? []) {
      if (isCell(p) && PROP_KINDS.includes(p.kind) && this.inBounds(p)) {
        this.props.set(cellKey(p), [...(this.props.get(cellKey(p)) ?? []), p.kind])
      }
    }

    // Seed the previous pens so detection hands the same ids back to the same regions.
    this.pens = new Map()
    for (const old of s.pens ?? []) {
      if (typeof old?.id === 'string' && Array.isArray(old.cells)) {
        this.pens.set(old.id, { id: old.id, cells: old.cells.filter(isCell) } as Pen)
      }
    }
    this.lost = new Map()
    for (const old of s.lostPens ?? []) {
      if (typeof old?.id === 'string' && Array.isArray(old.cells) && !this.pens.has(old.id)) {
        this.lost.set(old.id, old.cells.filter(isCell))
      }
    }
    this.nextPenNumber = isInt(s.nextPenNumber) && s.nextPenNumber >= 1 ? s.nextPenNumber : 1
    for (const id of [...this.pens.keys(), ...this.lost.keys()]) {
      const n = Number(id.replace('pen-', ''))
      if (isInt(n)) this.nextPenNumber = Math.max(this.nextPenNumber, n + 1)
    }
    this.refresh(false)
    return true
  }

  // ---- Detection --------------------------------------------------------------------------

  private isValidEdge(edge: Edge): boolean {
    if (!isInt(edge.x) || !isInt(edge.z) || (edge.axis !== 'h' && edge.axis !== 'v')) return false
    return edgeCells(edge).some((c) => this.inBounds(c))
  }

  private isBlocked(a: Cell, b: Cell): boolean {
    const edge = edgeBetween(a, b)
    return edge !== null && this.fences.has(edgeKey(edge))
  }

  /** Flood-fill the grid into closed regions (cells sorted by z, then x). */
  private findClosedRegions(): Cell[][] {
    const { minX, minZ, maxX, maxZ } = this.bounds
    const seen = new Set<string>()
    const regions: Cell[][] = []

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (seen.has(cellKey({ x, z }))) continue

        const cells: Cell[] = []
        const queue: Cell[] = [{ x, z }]
        seen.add(cellKey({ x, z }))
        let open = false

        while (queue.length > 0) {
          const cell = queue.pop() as Cell
          cells.push(cell)
          const neighbours: Cell[] = [
            { x: cell.x, z: cell.z - 1 },
            { x: cell.x, z: cell.z + 1 },
            { x: cell.x - 1, z: cell.z },
            { x: cell.x + 1, z: cell.z },
          ]
          for (const next of neighbours) {
            if (this.isBlocked(cell, next)) continue
            if (!this.inBounds(next)) {
              open = true // a gap leads out of the buildable zone
              continue
            }
            const key = cellKey(next)
            if (!seen.has(key)) {
              seen.add(key)
              queue.push(next)
            }
          }
        }

        if (!open) {
          cells.sort((a, b) => a.z - b.z || a.x - b.x)
          regions.push(cells)
        }
      }
    }
    return regions
  }

  /** Re-detect pens, keep ids stable, and tell listeners what changed. */
  private refresh(notify = true): void {
    const regions = this.findClosedRegions()
    const previous = this.pens

    // Count how many cells each new region shares with each known pen. Live pens win over
    // tombstones where both claim a cell.
    const owner = new Map<string, string>()
    for (const [id, cells] of this.lost) {
      for (const c of cells) owner.set(cellKey(c), id)
    }
    for (const pen of previous.values()) {
      for (const c of pen.cells) owner.set(cellKey(c), pen.id)
    }
    const overlaps: Array<{ region: number; id: string; count: number }> = []
    regions.forEach((cells, region) => {
      const counts = new Map<string, number>()
      for (const c of cells) {
        const id = owner.get(cellKey(c))
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      for (const [id, count] of counts) overlaps.push({ region, id, count })
    })
    overlaps.sort(
      (a, b) =>
        b.count - a.count ||
        Number(previous.has(b.id)) - Number(previous.has(a.id)) ||
        a.id.localeCompare(b.id) ||
        a.region - b.region
    )

    const regionId = new Map<number, string>()
    const claimed = new Set<string>()
    for (const o of overlaps) {
      if (regionId.has(o.region) || claimed.has(o.id)) continue
      regionId.set(o.region, o.id)
      claimed.add(o.id)
    }

    const next = new Map<string, Pen>()
    const created: string[] = []
    const changed: string[] = []
    regions.forEach((cells, region) => {
      let id = regionId.get(region)
      if (!id) id = `pen-${this.nextPenNumber++}`
      const pen = this.buildPen(id, cells)
      const old = previous.get(id)
      if (!old) {
        created.push(id) // brand new, or a destroyed pen whose id is coming back
        this.lost.delete(id)
      } else if (!sameCells(old.cells, pen.cells)) {
        changed.push(id)
      }
      next.set(id, pen)
    })

    const removed = [...previous.keys()].filter((id) => !next.has(id))
    for (const id of removed) {
      this.lost.set(id, (previous.get(id) as Pen).cells)
    }
    // Keep the tombstone list bounded: forget the oldest.
    while (this.lost.size > MAX_LOST_PENS) {
      this.lost.delete(this.lost.keys().next().value as string)
    }
    this.pens = next

    // Props and terrain edits change a pen's profile without moving its cells.
    if (notify) {
      for (const [id, pen] of next) {
        const old = previous.get(id)
        if (old && !changed.includes(id) && !sameProfile(old, pen)) changed.push(id)
      }
      if (created.length || removed.length || changed.length) {
        const change: PenChange = { created, removed, changed }
        for (const listener of this.listeners) listener(change)
      }
    }
  }

  private buildPen(id: string, cells: Cell[]): Pen {
    const n = cells.length
    const inPen = new Set(cells.map(cellKey))

    let shallow = 0
    let deep = 0
    let roofed = 0
    const ground: Partial<Record<BiomeType, number>> = {}
    const props: Record<PropKind, number> = { toy: 0, shelter: 0, plant: 0, trough: 0, bin: 0 }

    for (const cell of cells) {
      const level = this.getWater(cell)
      if (level === 'shallow') shallow++
      else if (level === 'deep') deep++
      if (this.roofs.has(cellKey(cell))) roofed++
      const biome = this.getGround(cell)
      ground[biome] = (ground[biome] ?? 0) + 1
      for (const kind of this.getProps(cell)) props[kind]++
    }
    for (const biome of Object.keys(ground) as BiomeType[]) {
      ground[biome] = (ground[biome] as number) / n
    }

    // Boundary fences: fences on a side whose neighbour is outside the pen.
    let boundary = 0
    let allTall = true
    let gateCount = 0
    for (const cell of cells) {
      const sides: Cell[] = [
        { x: cell.x, z: cell.z - 1 },
        { x: cell.x, z: cell.z + 1 },
        { x: cell.x - 1, z: cell.z },
        { x: cell.x + 1, z: cell.z },
      ]
      for (const other of sides) {
        if (inPen.has(cellKey(other))) continue
        const edge = edgeBetween(cell, other)
        const fence = edge ? this.fences.get(edgeKey(edge)) : undefined
        if (!fence) continue
        boundary++
        if (!fence.tall) allTall = false
        if (fence.gate) gateCount++
      }
    }

    let enclosure: Pen['enclosure'] = 'fenced'
    if (roofed === n) enclosure = 'roofed'
    else if (boundary > 0 && allTall) enclosure = 'tall'

    return {
      id,
      cells,
      areaM2: n * CELL_SIZE_M * CELL_SIZE_M,
      waterShallowFraction: shallow / n,
      waterDeepFraction: deep / n,
      groundFractions: ground,
      enclosure,
      props,
      gateCount,
    }
  }
}

function sameCells(a: readonly Cell[], b: readonly Cell[]): boolean {
  if (a.length !== b.length) return false
  const keys = new Set(a.map(cellKey))
  return b.every((c) => keys.has(cellKey(c)))
}

function sameProfile(a: Pen, b: Pen): boolean {
  return (
    a.enclosure === b.enclosure &&
    a.gateCount === b.gateCount &&
    a.waterShallowFraction === b.waterShallowFraction &&
    a.waterDeepFraction === b.waterDeepFraction &&
    JSON.stringify(a.groundFractions) === JSON.stringify(b.groundFractions) &&
    JSON.stringify(a.props) === JSON.stringify(b.props)
  )
}
