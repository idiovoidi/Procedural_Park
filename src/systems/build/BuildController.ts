/**
 * BuildController
 * The rules of build mode, with no rendering: given where the player is aiming and which
 * tool they hold, work out what would be built (or removed), whether it is allowed, what
 * it costs, and then do it.
 *
 * Fences snap to the nearest cell edge; everything else snaps to a cell. The 3D layer only
 * has to turn an aim point into world x/z, draw the preview this returns, and call `commit`.
 */

import { GAME_CONFIG } from '@core/constants'
import type { Shape } from '@systems/layout/footprint'
import {
  type Cell,
  type Edge,
  type FenceOptions,
  type PenGrid,
  type PropKind,
  worldToCell,
} from '@systems/park'

const { COSTS, REFUND_FRACTION, EDGE_PICK_FRACTION } = GAME_CONFIG.ECONOMY.BUILD
const CELL = GAME_CONFIG.PARK.CELL_SIZE_M

export type BuildTool =
  | 'fence'
  | 'tallFence'
  | 'gate'
  | 'trough'
  | 'bin'
  | 'den'
  | 'toy'
  | 'shelter'
  | 'plant'
  | 'roof'
  | 'remove'

export const BUILD_TOOLS: readonly BuildTool[] = [
  'fence',
  'tallFence',
  'gate',
  'trough',
  'bin',
  'den',
  'toy',
  'shelter',
  'plant',
  'roof',
  'remove',
]

export const TOOL_LABELS: Record<BuildTool, string> = {
  fence: 'Fence',
  tallFence: 'Tall fence',
  gate: 'Gate',
  trough: 'Trough',
  bin: 'Collector bin',
  den: 'Breeding den',
  toy: 'Toy',
  shelter: 'Shelter',
  plant: 'Plant',
  roof: 'Roof',
  remove: 'Remove',
}

/** The part of CurrencyManager build mode needs. */
export interface Wallet {
  canAfford(amount: number): boolean
  removeMoney(amount: number, reason?: string): boolean
  addMoney(amount: number, reason?: string): void
}

/**
 * What stands on the ground around the build zone. Build mode asks it before allowing a
 * placement, so pens never grow into a building, the plaza or the railway.
 */
export interface BuildSite {
  /** Why a shape can't be built here (plain words), or null when the ground is free. */
  blockReason(shape: Shape): string | null
}

/** Footprint of a fence on a cell edge: a thin slab along the edge. */
function edgeShape(edge: Edge): Shape {
  const THICKNESS = 0.3
  return edge.axis === 'h'
    ? { type: 'rect', x: (edge.x + 0.5) * CELL, z: edge.z * CELL, w: CELL, d: THICKNESS, rot: 0 }
    : { type: 'rect', x: edge.x * CELL, z: (edge.z + 0.5) * CELL, w: THICKNESS, d: CELL, rot: 0 }
}

/** Footprint of one cell, inset a little so neighbours that merely touch don't count. */
function cellShape(cell: Cell): Shape {
  const INSET = 0.1
  return {
    type: 'rect',
    x: (cell.x + 0.5) * CELL,
    z: (cell.z + 0.5) * CELL,
    w: CELL - INSET,
    d: CELL - INSET,
    rot: 0,
  }
}

export type BuildKind = 'edge' | 'cell'

export interface BuildTarget {
  tool: BuildTool
  kind: BuildKind
  /** Set when `kind` is `edge`. */
  edge?: Edge
  /** The cell aimed at (for an edge, the cell whose side was chosen). */
  cell: Cell
  /** What `commit` would do: build something new, swap an existing piece, or take one away. */
  action: 'place' | 'replace' | 'remove'
  valid: boolean
  /** What the target is, in plain words ("fence", "trough"), for messages. */
  label: string
  /** Why it isn't allowed (or a hint), in plain language. */
  reason?: string
  /** Coins spent (0 for a removal). */
  cost: number
  /** Coins returned (from removing, or from replacing a piece). */
  refund: number
}

export interface BuildResult {
  ok: boolean
  message: string
  target: BuildTarget | null
}

const PROP_TOOLS: Partial<Record<BuildTool, PropKind>> = {
  trough: 'trough',
  bin: 'bin',
  den: 'den',
  toy: 'toy',
  shelter: 'shelter',
  plant: 'plant',
}

const refundFor = (cost: number): number => Math.floor(cost * REFUND_FRACTION)

/** The cell edge nearest a point, and how far away it is (in cells). */
export function nearestEdge(x: number, z: number): { edge: Edge; cell: Cell; distance: number } {
  const cell = worldToCell(x, z)
  const u = x / CELL - cell.x // 0..1 across the cell, west to east
  const v = z / CELL - cell.z // 0..1 across the cell, north to south
  const sides: Array<{ edge: Edge; distance: number }> = [
    { edge: { x: cell.x, z: cell.z, axis: 'h' }, distance: v }, // north
    { edge: { x: cell.x, z: cell.z + 1, axis: 'h' }, distance: 1 - v }, // south
    { edge: { x: cell.x, z: cell.z, axis: 'v' }, distance: u }, // west
    { edge: { x: cell.x + 1, z: cell.z, axis: 'v' }, distance: 1 - u }, // east
  ]
  sides.sort((a, b) => a.distance - b.distance)
  return { edge: sides[0].edge, cell, distance: sides[0].distance }
}

function fenceOptionsFor(tool: BuildTool): FenceOptions {
  if (tool === 'gate') return { gate: true, tall: false }
  if (tool === 'tallFence') return { tall: true }
  return {}
}

/** The tool whose cost applies to a fence that is already built. */
function toolForFence(fence: { gate: boolean; tall: boolean }): 'gate' | 'tallFence' | 'fence' {
  if (fence.gate) return 'gate'
  return fence.tall ? 'tallFence' : 'fence'
}

export class BuildController {
  private readonly grid: PenGrid
  private readonly wallet: Wallet
  private readonly site: BuildSite | null
  private tool: BuildTool = 'fence'

  constructor(grid: PenGrid, wallet: Wallet, site: BuildSite | null = null) {
    this.grid = grid
    this.wallet = wallet
    this.site = site
  }

  public getTool(): BuildTool {
    return this.tool
  }

  public setTool(tool: BuildTool): void {
    if (BUILD_TOOLS.includes(tool)) this.tool = tool
  }

  /** Describe what the current tool would do at a world position. Changes nothing. */
  public preview(x: number, z: number): BuildTarget | null {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null
    if (this.tool === 'remove') return this.previewRemove(x, z)
    if (this.tool === 'fence' || this.tool === 'tallFence' || this.tool === 'gate') {
      return this.previewFence(x, z)
    }
    if (this.tool === 'roof') return this.previewRoof(x, z)
    return this.previewProp(x, z)
  }

  /** Build or remove at a world position, charging or refunding coins. */
  public commit(x: number, z: number): BuildResult {
    const target = this.preview(x, z)
    if (!target) return { ok: false, message: 'Aim at the ground', target: null }
    if (!target.valid) return { ok: false, message: target.reason ?? 'Cannot build here', target }

    if (target.cost > 0 && !this.wallet.removeMoney(target.cost, `Built ${target.label}`)) {
      return { ok: false, message: 'Not enough coins', target: { ...target, valid: false } }
    }
    this.apply(target)
    if (target.refund > 0) this.wallet.addMoney(target.refund, 'Build refund')

    const verb = target.action === 'remove' ? 'Removed' : 'Built'
    return { ok: true, message: `${verb} ${target.label}`, target }
  }

  // ---- Previews ---------------------------------------------------------------------------

  private previewFence(x: number, z: number): BuildTarget | null {
    const { edge, cell } = nearestEdge(x, z)
    const options = fenceOptionsFor(this.tool)
    const cost = COSTS[this.tool as 'fence' | 'tallFence' | 'gate']
    const existing = this.grid.getFence(edge)

    const base = {
      tool: this.tool,
      kind: 'edge' as const,
      edge,
      cell,
      cost,
      label: TOOL_LABELS[this.tool].toLowerCase(),
    }
    if (!this.grid.canPlaceFence(edge, options)) {
      return {
        ...base,
        action: 'place',
        valid: false,
        reason: existing ? 'Already built' : 'Outside the build zone',
        refund: 0,
      }
    }
    const blocked = this.site?.blockReason(edgeShape(edge))
    if (blocked) {
      return { ...base, action: 'place', valid: false, reason: blocked, refund: 0 }
    }
    const refund = existing ? refundFor(COSTS[toolForFence(existing)]) : 0
    return this.withAffordability({
      ...base,
      action: existing ? 'replace' : 'place',
      valid: true,
      refund,
    })
  }

  private previewProp(x: number, z: number): BuildTarget | null {
    const cell = worldToCell(x, z)
    const base = {
      tool: this.tool,
      kind: 'cell' as const,
      cell,
      action: 'place' as const,
      cost: COSTS[this.tool as keyof typeof COSTS],
      refund: 0,
      label: TOOL_LABELS[this.tool].toLowerCase(),
    }
    if (!this.grid.inBounds(cell))
      return { ...base, valid: false, reason: 'Outside the build zone' }
    const blocked = this.site?.blockReason(cellShape(cell))
    if (blocked) return { ...base, valid: false, reason: blocked }
    if (!this.grid.getPenAt(cell)) {
      return { ...base, valid: false, reason: 'Place this inside a closed pen' }
    }
    if (this.grid.getProps(cell).length > 0)
      return { ...base, valid: false, reason: 'Cell is taken' }
    return this.withAffordability({ ...base, valid: true })
  }

  private previewRoof(x: number, z: number): BuildTarget | null {
    const cell = worldToCell(x, z)
    const base = {
      tool: this.tool,
      kind: 'cell' as const,
      cell,
      action: 'place' as const,
      cost: COSTS.roof,
      refund: 0,
      label: 'roof',
    }
    if (!this.grid.inBounds(cell))
      return { ...base, valid: false, reason: 'Outside the build zone' }
    const blocked = this.site?.blockReason(cellShape(cell))
    if (blocked) return { ...base, valid: false, reason: blocked }
    if (this.grid.hasRoof(cell)) return { ...base, valid: false, reason: 'Already roofed' }
    return this.withAffordability({ ...base, valid: true })
  }

  private previewRemove(x: number, z: number): BuildTarget | null {
    const { edge, cell, distance } = nearestEdge(x, z)
    const base = {
      tool: this.tool,
      cell,
      action: 'remove' as const,
      cost: 0,
    }

    // Aiming at an edge that holds a fence removes the fence.
    const fence = this.grid.getFence(edge)
    if (fence && distance <= EDGE_PICK_FRACTION) {
      return {
        ...base,
        kind: 'edge',
        edge,
        valid: true,
        refund: refundFor(COSTS[toolForFence(fence)]),
        label: TOOL_LABELS[toolForFence(fence)].toLowerCase(),
      }
    }

    // Otherwise take the last prop in the cell, then its roof.
    const props = this.grid.getProps(cell)
    if (props.length > 0) {
      const last = props[props.length - 1]
      return {
        ...base,
        kind: 'cell',
        valid: true,
        refund: refundFor(COSTS[last]),
        label: TOOL_LABELS[last].toLowerCase(),
      }
    }
    if (this.grid.hasRoof(cell)) {
      return { ...base, kind: 'cell', valid: true, refund: refundFor(COSTS.roof), label: 'roof' }
    }
    return {
      ...base,
      kind: 'cell',
      valid: false,
      reason: 'Nothing to remove here',
      refund: 0,
      label: 'nothing',
    }
  }

  private withAffordability(target: BuildTarget): BuildTarget {
    // A replacement's refund comes back at the same time, so only the net amount must be on hand.
    const net = target.cost - target.refund
    if (net > 0 && !this.wallet.canAfford(net)) {
      return { ...target, valid: false, reason: `Need ${net} coins` }
    }
    return target
  }

  // ---- Applying ---------------------------------------------------------------------------

  private apply(target: BuildTarget): void {
    const { tool, cell, edge } = target

    if (target.action === 'remove') {
      if (target.kind === 'edge' && edge) {
        this.grid.removeFence(edge)
      } else {
        const props = this.grid.getProps(cell)
        if (props.length > 0) this.grid.removeProp(cell, props[props.length - 1])
        else this.grid.setRoof(cell, false)
      }
      return
    }

    if (edge && (tool === 'fence' || tool === 'tallFence' || tool === 'gate')) {
      this.grid.addFence(edge, fenceOptionsFor(tool))
    } else if (tool === 'roof') {
      this.grid.setRoof(cell, true)
    } else {
      const kind = PROP_TOOLS[tool]
      if (kind) this.grid.addProp(cell, kind)
    }
  }
}
