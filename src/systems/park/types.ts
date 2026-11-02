/**
 * Park Types
 * Build grid, pens and pen-quality reports for the hub park.
 */

import type { BiomeType } from '@systems/terrain'

/** A build-grid cell. Integer coordinates; one cell is `PARK.CELL_SIZE_M` metres square. */
export interface Cell {
  x: number
  z: number
}

/**
 * A cell edge, where fences go. `h` is the edge on the north side of cell (x, z) (between
 * (x, z - 1) and (x, z)); `v` is the edge on its west side (between (x - 1, z) and (x, z)).
 */
export type EdgeAxis = 'h' | 'v'
export interface Edge {
  x: number
  z: number
  axis: EdgeAxis
}

/** Inclusive cell ranges of the buildable zone. Cells outside it count as open ground. */
export interface GridBounds {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}

export interface FenceOptions {
  /** A gate blocks creatures like a fence while closed; the player can walk through it. */
  gate?: boolean
  /** A tall fence (or dome) holds hovering/drifting creatures. */
  tall?: boolean
}

export interface Fence {
  gate: boolean
  tall: boolean
}

export type WaterLevel = 'none' | 'shallow' | 'deep'

/** Things placed on a cell. Toys, shelters and plants count as enrichment. */
export type PropKind = 'toy' | 'shelter' | 'plant' | 'trough'
export const ENRICHMENT_PROPS: readonly PropKind[] = ['toy', 'shelter', 'plant']

/** How well a pen holds a creature, lowest to highest. A higher level satisfies a lower need. */
export type EnclosureLevel = 'fenced' | 'tall' | 'roofed'

/** A closed, fenced region of the build grid. */
export interface Pen {
  /** Stable while the pen exists, even when fences are added, removed or the pen grows. */
  id: string
  cells: Cell[]
  areaM2: number
  /** Share of cells (0..1) with shallow / deep water. */
  waterShallowFraction: number
  waterDeepFraction: number
  /** Share of cells (0..1) on each ground type. */
  groundFractions: Partial<Record<BiomeType, number>>
  enclosure: EnclosureLevel
  /** How many of each prop sit inside the pen. */
  props: Record<PropKind, number>
  gateCount: number
}

/** Result of re-detecting pens after a change to the grid. */
export interface PenChange {
  created: string[]
  removed: string[]
  /** Existing pens whose cells changed (grown, shrunk or reshaped). */
  changed: string[]
}

export type PenListener = (change: PenChange) => void

export type RequirementStatus = 'good' | 'warn' | 'bad'
export type RequirementKey = 'space' | 'water' | 'enclosure' | 'enrichment' | 'biome' | 'company'

export interface RequirementResult {
  /** 0..1 */
  score: number
  status: RequirementStatus
  /** Short plain-language explanation for the pen panel. */
  detail: string
}

export interface OccupantQuality {
  creatureId: string
  /** Weighted 0..1 score; multiplies the creature's happiness (GDD 5.2). */
  quality: number
  requirements: Record<RequirementKey, RequirementResult>
}

export interface PenQualityReport {
  occupants: OccupantQuality[]
  /** Pairs of creature ids that can't share a pen. */
  conflicts: Array<[string, string]>
  /** Floor area still free after every occupant's needs, in square metres (never negative). */
  freeAreaM2: number
}

/** The part of a creature the quality scorer needs. */
export interface PenOccupant {
  id: string
  genome: import('@systems/creatures/genome').Genome
}

/** Serialised grid for saves. */
export interface PenGridSnapshot {
  version: 1
  bounds: GridBounds
  fences: Array<Edge & Fence>
  ground: Array<Cell & { biome: BiomeType }>
  water: Array<Cell & { level: Exclude<WaterLevel, 'none'> }>
  roofs: Cell[]
  props: Array<Cell & { kind: PropKind }>
  /** Cells of each known pen, so ids survive a reload. */
  pens: Array<{ id: string; cells: Cell[] }>
  /** Destroyed pens kept so their id returns if the region is closed again. */
  lostPens?: Array<{ id: string; cells: Cell[] }>
  nextPenNumber: number
}
