/**
 * Keeping things inside a pen
 * Pure geometry for confining a moving creature to the cells of a pen.
 */

import { GAME_CONFIG } from '@core/constants'
import type { Cell } from './types'

const CELL = GAME_CONFIG.PARK.CELL_SIZE_M

/**
 * The world point inside the pen's cells that is closest to (x, z), kept `margin` off the
 * pen's outer walls. The margin applies only where a cell borders something outside the pen,
 * never along the shared edges between two cells of the same pen.
 */
export function clampToPen(
  cells: readonly Cell[],
  x: number,
  z: number,
  margin = 0.4
): { x: number; z: number } {
  if (cells.length === 0 || !Number.isFinite(x) || !Number.isFinite(z)) return { x, z }
  const m = Math.min(Math.max(margin, 0), CELL / 2)
  const inPen = new Set(cells.map((c) => `${c.x},${c.z}`))
  const has = (cx: number, cz: number) => inPen.has(`${cx},${cz}`)

  let best = { x, z }
  let bestDistance = Number.POSITIVE_INFINITY
  for (const cell of cells) {
    // Inset only the sides that face outside the pen.
    const minX = cell.x * CELL + (has(cell.x - 1, cell.z) ? 0 : m)
    const maxX = (cell.x + 1) * CELL - (has(cell.x + 1, cell.z) ? 0 : m)
    const minZ = cell.z * CELL + (has(cell.x, cell.z - 1) ? 0 : m)
    const maxZ = (cell.z + 1) * CELL - (has(cell.x, cell.z + 1) ? 0 : m)

    const cx = Math.min(Math.max(x, minX), maxX)
    const cz = Math.min(Math.max(z, minZ), maxZ)
    const d = (cx - x) ** 2 + (cz - z) ** 2
    if (d < bestDistance) {
      bestDistance = d
      best = { x: cx, z: cz }
      if (d === 0) break // already inside this cell
    }
  }
  return best
}

/** A repeatable spot inside the pen for a given number: spreads newcomers across the cells. */
export function pointInPen(cells: readonly Cell[], index: number): { x: number; z: number } {
  if (cells.length === 0) return { x: 0, z: 0 }
  const cell = cells[Math.abs(Math.floor(index)) % cells.length]
  return { x: (cell.x + 0.5) * CELL, z: (cell.z + 0.5) * CELL }
}
