/**
 * Park System
 * Barrel export for the hub build grid, pens and pen quality
 */

export { cellKey, cellToWorld, edgeBetween, edgeKey, PenGrid, worldToCell } from './PenGrid'
export { clampToPen, pointInPen } from './pen-bounds'
export { canAddOccupant, findConflicts, freeAreaM2, scorePen, statusFor } from './pen-quality'
export type {
  Cell,
  Edge,
  EdgeAxis,
  EnclosureLevel,
  Fence,
  FenceOptions,
  GridBounds,
  OccupantQuality,
  Pen,
  PenChange,
  PenGridSnapshot,
  PenListener,
  PenOccupant,
  PenQualityReport,
  PropKind,
  RequirementKey,
  RequirementResult,
  RequirementStatus,
  WaterLevel,
} from './types'
export { ENRICHMENT_PROPS } from './types'
