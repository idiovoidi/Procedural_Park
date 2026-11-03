import { scorePen } from '@systems/park'
import type { PenInspectorView, ToolBeltSlot } from '@ui/components/tool-belt'
import type { GameSystems } from '../SystemsCoordinator'

/** The actions the belt can trigger: the same ones the keyboard bindings reach. */
export interface ToolBeltActions {
  feed: () => void
  lure: () => void
  crate: () => void
  photo: () => void
  build: () => void
  breed: () => void
  market: () => void
  book: () => void
}

const SLOTS: ToolBeltSlot[] = [
  { id: 'feed', icon: '🍖', label: 'Feed', key: 'F' },
  { id: 'lure', icon: '🪤', label: 'Bait', key: 'L' },
  { id: 'crate', icon: '📦', label: 'Crate', key: 'Y' },
  { id: 'photo', icon: '📷', label: 'Photo', key: 'T' },
  { id: 'build', icon: '🔨', label: 'Build', key: 'J' },
  { id: 'breed', icon: '🥚', label: 'Breed', key: 'Z' },
  { id: 'market', icon: '💰', label: 'Market', key: 'U' },
  { id: 'book', icon: '📖', label: 'Book', key: 'K' },
]

/** How far ahead of the camera to look for a pen (metres), and how often to refresh (ms). */
const LOOK_AHEAD_M = [2, 5, 8]
const REFRESH_MS = 250

const REQUIREMENT_LABEL: Record<string, string> = {
  space: 'space',
  water: 'water',
  enclosure: 'enclosure',
  enrichment: 'enrichment',
  biome: 'ground',
  company: 'company',
}

/**
 * ToolBeltManager
 * Gives every field action a clickable slot, lights up the mode that is on, and shows the pen
 * the player is looking into (its residents' needs and what the pen is missing).
 */
export class ToolBeltManager {
  private readonly systems: GameSystems
  private readonly actions: ToolBeltActions
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(systems: GameSystems, actions: ToolBeltActions) {
    this.systems = systems
    this.actions = actions
  }

  public initialize(): void {
    const belt = this.systems.ui.getToolBelt()
    belt.setSlots(SLOTS)
    belt.setOnUse((id) => this.actions[id as keyof ToolBeltActions]?.())
    this.refresh()
    this.timer = setInterval(() => this.refresh(), REFRESH_MS)
  }

  public dispose(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  public refresh(): void {
    const { ui, build } = this.systems
    const belt = ui.getToolBelt()
    const active = new Set<string>()
    if (build.isActive()) active.add('build')
    if (ui.getMarketPanel().isOpen()) active.add('market')
    if (ui.getBreedingPanel().isOpen()) active.add('breed')
    if (ui.getRanchBook().isOpen()) active.add('book')
    belt.setActive(active)
    belt.setPen(this.inspect())
  }

  /** The pen under the camera or just ahead of it, described for the inspector. */
  private inspect(): PenInspectorView | null {
    const { camera, park, roster } = this.systems
    const cam = camera.camera
    const dir = cam.getWorldDirection(cam.position.clone())
    const points = [
      { x: cam.position.x, z: cam.position.z },
      ...LOOK_AHEAD_M.map((d) => ({
        x: cam.position.x + dir.x * d,
        z: cam.position.z + dir.z * d,
      })),
    ]
    let pen = null
    for (const p of points) {
      pen = park.getPenAtWorld(p.x, p.z)
      if (pen) break
    }
    if (!pen) return null

    const residents = roster.getByPen(pen.id)
    const report = scorePen(
      pen,
      residents.map((c) => ({ id: c.id, genome: c.genome }))
    )
    const quality = new Map(report.occupants.map((o) => [o.creatureId, o]))

    // Collect the requirements that fail for at least one resident.
    const failing = new Set<string>()
    for (const o of report.occupants) {
      for (const [key, r] of Object.entries(o.requirements)) {
        if (r.score < 0.6) failing.add(REQUIREMENT_LABEL[key] ?? key)
      }
    }
    return {
      title: pen.id,
      summary: `${residents.length} creature${residents.length === 1 ? '' : 's'} · ${Math.round(report.freeAreaM2)} m² free · ${pen.enclosure} enclosure`,
      problems: [...failing].map((k) => `needs better ${k}`),
      rows: residents.map((c) => ({
        name: c.name,
        fullness: c.fullness,
        happiness: c.happiness,
        quality: quality.get(c.id)?.quality ?? 0,
      })),
    }
  }
}
