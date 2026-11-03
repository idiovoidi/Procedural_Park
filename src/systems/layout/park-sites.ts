import { GAME_CONFIG } from '@core/constants'
import type { Footprint } from './footprint'

/**
 * Where the hand-placed park structures stand. The scene builders read these positions and
 * the footprints below are derived from the same numbers, so the map and the placement
 * rules always match what is actually built.
 *
 * (The entrance plaza's props are laid out in absolute coordinates inside its builder; keep
 * `PLAZA_SITE` in step with it.)
 */
export const PARK_RADIUS = 70

/** In the fence line, just beyond the plaza (which spans z 30..60). */
export const GATE_SITE = { x: 0, z: 66, rot: Math.PI }
export const PLAZA_SITE = { x: 0, z: 45, r: 15 }
export const RANGER_SITE = { x: 25, z: 40, rot: -Math.PI / 6 }
export const STORE_SITE = { x: -25, z: 40, rot: Math.PI / 6 }
export const LAB_SITE = { x: -35, z: -20, rot: 0 }

const { CELL_SIZE_M, INITIAL_BOUNDS } = GAME_CONFIG.PARK

interface CellBounds {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}

/** The build zone for a range of grid cells (inclusive), in world metres. */
export function buildZoneFootprint(bounds: CellBounds = INITIAL_BOUNDS): Footprint {
  const minX = bounds.minX * CELL_SIZE_M
  const maxX = (bounds.maxX + 1) * CELL_SIZE_M
  const minZ = bounds.minZ * CELL_SIZE_M
  const maxZ = (bounds.maxZ + 1) * CELL_SIZE_M
  return {
    id: 'build-zone',
    label: 'Build zone',
    kind: 'build-zone',
    shape: {
      type: 'rect',
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      w: maxX - minX,
      d: maxZ - minZ,
      rot: 0,
    },
  }
}

export function parkFootprints(): Footprint[] {
  return [
    {
      id: 'boundary-fence',
      label: 'Park fence',
      kind: 'boundary',
      shape: { type: 'circle', x: 0, z: 0, r: PARK_RADIUS },
    },
    buildZoneFootprint(),
    {
      id: 'main-gate',
      label: 'Main gate',
      kind: 'gate',
      shape: { type: 'rect', x: GATE_SITE.x, z: GATE_SITE.z, w: 15, d: 3, rot: GATE_SITE.rot },
    },
    {
      id: 'entrance-plaza',
      label: 'Entrance plaza',
      kind: 'plaza',
      shape: { type: 'circle', x: PLAZA_SITE.x, z: PLAZA_SITE.z, r: PLAZA_SITE.r },
    },
    {
      id: 'ranger-station',
      label: 'Ranger station',
      kind: 'building',
      shape: {
        type: 'rect',
        x: RANGER_SITE.x,
        z: RANGER_SITE.z,
        w: 13,
        d: 13,
        rot: RANGER_SITE.rot,
      },
    },
    {
      id: 'food-store',
      label: 'Food store',
      kind: 'building',
      shape: { type: 'rect', x: STORE_SITE.x, z: STORE_SITE.z, w: 14, d: 15, rot: STORE_SITE.rot },
    },
    {
      id: 'experiment-lab',
      label: 'Experiment lab',
      kind: 'landmark',
      shape: { type: 'circle', x: LAB_SITE.x, z: LAB_SITE.z, r: 9 },
    },
  ]
}
